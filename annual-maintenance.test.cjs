const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file, deps = {}) {
  const m = new Module(file);
  m.require = id => deps[id] || require(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
  }).outputText, file + '.js');
  return m.exports;
}
const model = load('app/residential/residential-model.ts');
const integration = load('app/residential/residential-integration.ts', {'./residential-model': model});
const scheduling = load('app/residential/residential-scheduling.ts', {'./residential-model': model});
const {BookingWorkflow} = load('app/zoho-trial/booking-workflow.ts', {
  '../residential/residential-integration': integration,
  '../residential/residential-scheduling': scheduling
});
const {confirmationMessage} = load('app/checkout/confirmation.ts');
const selection = {homeSize: 2500, maintenanceId: 'annual', billingMode: 'annual-prepay',
  interiorRequested: false, interiorQuantities: Array(8).fill(0), screenCount: 0,
  stepLadder: false, twoStoryLadder: false, specialtyAccess: false, exteriorSpecialty: false};
const visits = [{date: '2026-11-04', period: 'morning'}, {date: '2027-11-04', period: 'afternoon'}];
(async () => {
  const snapshot = integration.residentialOrderSnapshot(selection, true);
  assert.deepEqual(scheduling.repeatMonthOffsets('annual', 'annual-prepay'), [0, 12]);
  assert(scheduling.validateVisitSeries('annual', visits, '2026-10-30', 'annual-prepay'));
  assert(!scheduling.validateVisitSeries('annual', visits.slice(0, 1), '2026-10-30', 'annual-prepay'));
  assert.equal(snapshot.billing.visitsIncluded, 1);
  assert.equal(snapshot.initialTotalCents, 55198);
  assert.equal(snapshot.repeatTotalCents, 59900);
  assert.deepEqual(snapshot.visitOrders.map(v => v.includedInInitialPayment), [true, false]);
  assert(snapshot.initialLines.every(line => line.key.startsWith('visit-0-')));
  // Future screens and ladder access must not inflate the prepaid invoice today.
  const futureAddons = integration.residentialOrderSnapshot({...selection, screenCount: 2,
    stepLadder: true, addonVisits: {screens: [1], 'interior-ladder': [1]}}, true);
  assert.equal(futureAddons.initialTotalCents, 55198);
  assert.equal(futureAddons.repeatTotalCents, 65103);
  assert.equal(futureAddons.billing.addonCents, 0);
  const records = new Map(); let received = false; const appointments = [];
  const store = {locked: fn => fn(), records: async () => [...records.values()],
    read: async id => records.get(id), save: async b => records.set(b.id, structuredClone(b))};
  const workflow = new BookingWorkflow('', {
    available: async dates => {assert.equal(dates.length, 2); return true;},
    createInvoice: async b => {assert.equal(b.snapshot.initialTotalCents, 55198);
      return {id: 'annual-test-invoice', number: 'TEST-ANNUAL', url: 'https://invoice.zoho.com/test'};},
    readPayment: async b => ({id: b.invoice.id, customerEmail: b.customer.email, currency: 'USD',
      totalCents: 55198, balanceCents: received ? 0 : 55198, status: received ? 'paid' : 'sent',
      receivedCents: received ? 55198 : 0, paymentIds: received ? ['fictional-payment'] : []}),
    createAppointment: async (b, index) => {appointments.push({index, paid: b.snapshot.visitOrders[index].includedInInitialPayment});
      return {orderId: 'work-' + index, appointmentId: 'appointment-' + index};}
  }, store);
  let booking = await workflow.create({requestKey: 'a'.repeat(24), selection, visits,
    customer: {name: 'Fictional Annual Test', email: 'annual@example.invalid', phone: '2025550100',
      street: '1 Fictional Test', city: 'Concord', state: 'NC', zip: '28025'}}, '2026-10-30');
  booking = await workflow.reconcile(booking.id);
  assert.equal(appointments.length, 0);
  received = true; booking = await workflow.reconcile(booking.id);
  assert.equal(booking.phase, 'confirmed');
  assert.deepEqual(appointments, [{index: 0, paid: true}, {index: 1, paid: false}]);
  await workflow.reconcile(booking.id); assert.equal(appointments.length, 2);
  const message = confirmationMessage(booking, {phase: 'completed', invoiceId: booking.invoice.id,
    amountCents: 55198, receipt: {phase: 'verified'}});
  assert.match(message.body, /2026-11-04.*covered by this payment/);
  assert.match(message.body, /2027-11-04.*billed separately when due; not included in this payment/);
  console.log('PASS: annual prepayment charges one cleaning, requires initial and next-year dates, excludes future add-ons, creates two appointment records only after matching payment, preserves unpaid return status and explains it in the receipt. No external calls or funds.');
})().catch(error => {console.error(error); process.exitCode = 1;});
