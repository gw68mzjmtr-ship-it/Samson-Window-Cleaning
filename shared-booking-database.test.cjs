const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module'),postgres=require('postgres');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||(id.startsWith('.')?require('./scripts/test-module-loader.cjs')(require('node:path').resolve(require('node:path').dirname(file),id+'.ts')):require(id));m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports}
const model=load('app/residential/residential-model.ts'),integration=load('app/residential/residential-integration.ts',{'./residential-model':model}),schedule=load('app/residential/residential-scheduling.ts',{'./residential-model':model});
const {BookingWorkflow}=load('app/zoho-trial/booking-workflow.ts',{'../residential/residential-integration':integration,'../residential/residential-scheduling':schedule});
const {PostgresBookingStore,bookingDatabaseConnection}=load('app/zoho-trial/postgres-booking-store.ts');
const env=Object.fromEntries(fs.readFileSync('.local-secrets/booking-db-test.env','utf8').trim().split('\n').map(line=>line.split('=')));
const url='postgres://samson_test:'+env.POSTGRES_PASSWORD+'@127.0.0.1:55432/samson_checkout_test';
const a=bookingDatabaseConnection(url,true),b=bookingDatabaseConnection(url,true);
const customer={name:'Database Test Only',email:'database-test@example.invalid',phone:'2025550100',street:'No actual service address',city:'Concord',state:'NC',zip:'28025'};
const selection={homeSize:2500,screenCount:0,interiorRequested:false,interiorQuantities:Array(8).fill(0),stepLadder:false,twoStoryLadder:false,specialtyAccess:false,exteriorSpecialty:false,maintenanceId:'once'};
const input={customer,selection,requestKey:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',visits:[{date:'2026-11-04',period:'morning'}]};
(async()=>{
 await a.unsafe(fs.readFileSync('database/001-booking-checkout.sql','utf8'));
 assert.throws(()=>bookingDatabaseConnection(url));assert.throws(()=>bookingDatabaseConnection('postgres://a:b@test-pooler.example/db'));
 let created=0,appointments=0,paid=false,conflict=false,paused,release;
 const reached=new Promise(resolve=>paused=resolve),wait=new Promise(resolve=>release=resolve);
 const adapter={available:async()=>!conflict,createInvoice:async()=>{created++;paused();await wait;return {id:'invoice-test',number:'DB-TEST',url:'https://invoice.zoho.com/test'}},readPayment:async booking=>({id:booking.invoice.id,customerEmail:customer.email,currency:'USD',totalCents:booking.snapshot.initialTotalCents,balanceCents:paid?0:59900,status:paid?'paid':'sent',paymentIds:paid?['payment-test']:[],receivedCents:paid?59900:0}),createAppointment:async()=>{appointments++;return {orderId:'order-test',appointmentId:'appointment-test'}}};
 const firstStore=new PostgresBookingStore(a),otherStore=new PostgresBookingStore(b),first=new BookingWorkflow('',adapter,firstStore),other=new BookingWorkflow('',adapter,otherStore);
 const pending=first.create(input,'2026-10-29');await reached;
 // Another database connection sees the committed ambiguity marker BEFORE the remote operation ends.
 const inFlight=await b`SELECT record FROM samson_bookings`;assert.equal(inFlight[0].record.phase,'invoice_pending');
 await assert.rejects(other.create({...input,requestKey:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'},'2026-10-29'),/Another booking/);
 release();const booking=await pending;assert.equal(booking.phase,'awaiting_payment');assert.equal(created,1);assert.equal(booking.snapshot.initialTotalCents,59900);
 assert.equal((await other.create(input,'2026-10-29')).id,booking.id);assert.equal(created,1);
 await assert.rejects(other.create({...input,customer:{...customer,name:'Another Customer'},requestKey:'cccccccc-cccc-cccc-cccc-cccccccccccc'},'2026-10-29'));assert.equal(created,1);
 const [claims]=await b`SELECT count(*)::int AS count FROM samson_slot_claims`;assert.equal(claims.count,1);
 // A new process/connection retains the same hold and invoice; no local disk dependency.
 assert.equal((await other.read(booking.id)).invoice.number,'DB-TEST');
 paid=true;assert.equal((await other.reconcile(booking.id)).phase,'confirmed');assert.equal(appointments,1);assert.equal((await first.reconcile(booking.id)).phase,'confirmed');assert.equal(appointments,1);
 const [released]=await a`SELECT count(*)::int AS count FROM samson_slot_claims`;assert.equal(released.count,0);
 const event={eventId:'event-test',paymentId:'payment-test',merchantId:'merchant-test',type:'payment.updated'};
 assert.equal(await firstStore.queueSquareEvent(event),true);assert.equal(await otherStore.queueSquareEvent(event),false);
 assert.equal((await b`SELECT phase FROM samson_square_events`)[0].phase,'queued');
 // An unknown remote result remains durable; retries must never create a second invoice.
 adapter.createInvoice=async()=>{created++;throw Error('Remote outcome unknown')};
 const failedInput={...input,requestKey:'dddddddd-dddd-dddd-dddd-dddddddddddd',visits:[{date:'2026-11-05',period:'afternoon'}]};
 const failed=await first.create(failedInput,'2026-10-29');assert.equal(failed.phase,'review_required');assert.equal((await other.create(failedInput,'2026-10-29')).id,failed.id);assert.equal(created,2);
 await assert.rejects(firstStore.save({...failed,id:'f'.repeat(48)}),/shared lock/);
 console.log('PASS: actual PostgreSQL two-connection contention; durable pending phase before remote call; one invoice per request; occupied-window rejection; $599 exact totals; restart persistence; exact paid-booking confirmation once; claim release only after confirmation; duplicate Square events queued once; ambiguous remote outcome retained. No real customer, Square or Zoho requests.');
})().catch(error=>{console.error('Database test failed:',error.message);process.exitCode=1}).finally(async()=>{await Promise.all([a.end({timeout:3}),b.end({timeout:3})])});
