const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const module = new Module(file);
  module.require = id => dependencies[id] ?? require(id);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, file);
  return module.exports;
}

const morning = { date: '2026-11-04', period: 'morning' };
const afternoon = { ...morning, period: 'afternoon' };
const nextMorning = { ...morning, date: '2026-11-05' };
const clockStart = Date.parse('2026-11-03T12:00:00Z');
const model = load('app/residential/residential-model.ts');
const integration = load('app/residential/residential-integration.ts', {
  './residential-model': model,
});
const imported = load('app/residential/imported-capacity.ts');

function fixture(t) {
  const source = { appointments: [], slotAvailable: true, holds: [], slotError: null, contextError: null };
  const calls = { territory: 0, appointments: 0, slots: [], holds: 0 };
  const zoho = load('app/checkout/zoho.ts', {
    '../residential/residential-integration': integration,
    '../residential/imported-capacity': imported,
    './order-snapshot': {},
    '../zoho-trial/server': {
      async trialRecord(endpoint) {
        assert.equal(endpoint, 'Work_Orders');
        calls.territory++;
        return { data: [{ Territory: { id: 'test-territory' } }] };
      },
      async trialAppointments() {
        calls.appointments++;
        if (source.contextError) throw source.contextError;
        return source.appointments;
      },
      async trialRead(endpoint, query) {
        assert.equal(endpoint, 'Service_Resources/Available_TimeSlots');
        assert.equal(query.territory.id, 'test-territory');
        assert.equal(query.time_slot.duration, 180);
        calls.slots.push(query.date_time_range.start);
        if (source.slotError) throw source.slotError;
        const { start, end } = query.date_time_range;
        return { data: source.slotAvailable ? [{ Service_Resources: {
          id: query.service_resource_filter.sr_ids[0],
          Time_Slots: [{ start_time: start, end_time: end }],
        } }] : [] };
      },
    },
  });
  const preview = load('app/checkout/calendar-preview.ts', { './zoho': zoho });
  const route = load('app/api/checkout/availability/route.ts', {
    '../../../checkout/security': {
      guardCheckout: async () => {},
      checkoutJson: req => req.json(),
      privateHeaders: { 'Cache-Control': 'no-store' },
    },
    '../../../checkout/engine': { limitCheckout: async () => {} },
    '../../../checkout/calendar-preview': preview,
    '../../../zoho-trial/runtime-store': {
      sharedBookings: () => ({ records: async () => { calls.holds++; return source.holds; } }),
    },
    '../../../residential/residential-model': model,
    '../../../checkout/calendar-read-queue': load('app/checkout/calendar-read-queue.ts'),
  });

  const realNow = Date.now;
  let now = clockStart;
  Date.now = () => now;
  t.after(() => { Date.now = realNow; });

  return {
    ...zoho, ...preview, source, calls,
    advance: ms => { now += ms; },
    request: date => route.POST(new Request('https://checkout.example/availability', {
      method: 'POST',
      body: JSON.stringify({ date }),
    })),
  };
}

test('preview shares concurrent and repeated window checks until the 60 second boundary', async t => {
  const { advance, calls, previewAvailability, source } = fixture(t);
  const first = previewAvailability(morning);
  const repeated = previewAvailability({ ...morning });
  assert.deepEqual(await Promise.all([
    first, repeated, previewAvailability(afternoon), previewAvailability(nextMorning),
  ]), [true, true, true, true]);
  assert.equal(calls.territory, 1);
  assert.equal(calls.appointments, 1);
  assert.deepEqual(calls.slots.sort(), [
    '2026-11-04T08:00:00-05:00', '2026-11-04T13:00:00-05:00', '2026-11-05T08:00:00-05:00',
  ]);

  source.slotAvailable = false;
  advance(59_999);
  assert.equal(await previewAvailability(morning), true);
  assert.equal(calls.slots.length, 3);
  advance(1);
  assert.deepEqual(await Promise.all([previewAvailability(morning), previewAvailability(morning)]), [false, false]);
  assert.equal(await previewAvailability(morning), false);
  assert.equal(calls.territory, 2);
  assert.equal(calls.appointments, 2);
  assert.equal(calls.slots.length, 4);
});

test('preview retries provider failures and final availability always reads live Zoho data', async t => {
  const { advance, calls, liveAvailability, previewAvailability, source } = fixture(t);
  assert.equal(await previewAvailability(morning), true);
  source.slotAvailable = false;
  assert.equal(await liveAvailability([morning]), false);
  assert.equal(await previewAvailability(morning), true);
  assert.equal(calls.slots.length, 2);
  assert.equal(calls.territory, 2);
  assert.equal(calls.appointments, 2);

  source.appointments = [{
    Summary: 'HCP #123 [November 2026 import]',
    Status: 'Scheduled',
    Scheduled_Start_Date_Time: '2026-11-04T11:00:00-05:00',
    Scheduled_End_Date_Time: '2026-11-04T12:00:00-05:00',
  }];
  source.slotAvailable = true;
  assert.equal(await liveAvailability([morning]), false);
  assert.equal(calls.appointments, 3);
  assert.equal(calls.slots.length, 2);

  advance(60_000);
  source.contextError = new Error('Appointment provider failed');
  await assert.rejects(previewAvailability(morning), source.contextError);
  assert.equal(calls.appointments, 4);
  assert.equal(calls.slots.length, 2);

  source.contextError = null;
  assert.equal(await previewAvailability(morning), false);
  assert.equal(calls.appointments, 5);
  assert.equal(calls.slots.length, 2);

  source.slotError = new Error('Slot provider failed');
  await assert.rejects(previewAvailability(afternoon), source.slotError);
  source.slotError = null;
  assert.equal(await previewAvailability(afternoon), true);
  assert.equal(calls.appointments, 5);
  assert.equal(calls.slots.length, 4);
});

test('the route checks holds every request and skips Zoho for closed or fully held dates', async t => {
  const { calls, request, source } = fixture(t);
  async function windows(date) {
    const response = await request(date);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.reserved, false);
    return body.windows.map(window => window.available);
  }

  assert.deepEqual(await windows('2026-11-11'), [false, false]);
  source.holds = [{ phase: 'reserved', visits: [morning, afternoon] }];
  assert.deepEqual(await windows(morning.date), [false, false]);
  assert.equal(calls.territory, 0);
  assert.equal(calls.appointments, 0);
  assert.equal(calls.slots.length, 0);

  source.holds = [];
  assert.deepEqual(await windows(morning.date), [true, true]);
  source.holds = [{ phase: 'reserved', visits: [morning] }];
  assert.deepEqual(await windows(morning.date), [false, true]);
  source.holds = [];
  assert.deepEqual(await windows(morning.date), [true, true]);
  assert.equal(calls.holds, 5);
  assert.equal(calls.territory, 1);
  assert.equal(calls.appointments, 1);
  assert.equal(calls.slots.length, 2);

  source.slotError = new Error('Slot provider failed');
  const failed = await request(nextMorning.date);
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get('cache-control'), 'no-store');
  source.slotError = null;
  assert.deepEqual(await windows(nextMorning.date), [true, true]);
  assert.equal(calls.appointments, 1);
});
