const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports}
const {LivePaymentService,liveReference,matchesLivePayment}=load('app/checkout/payment-service.ts');
function fixture(){
 const booking={id:'a'.repeat(48),context:{purpose:'customer',termsVersion:'approved-test'},paymentEnvironment:'production',customer:{email:'customer@example.com'},phase:'awaiting_payment',invoice:{id:'invoice-expected',number:'INV-EXPECTED'},snapshot:{initialTotalCents:70630}},state={value:null,locked:false},count={charge:0,read:0,receipt:0,appointment:0};
 const payment={id:'payment-expected',status:'COMPLETED',source_type:'CARD',location_id:'location-expected',reference_id:liveReference(booking.id),amount_money:{amount:70630,currency:'USD'}};
 const store={read:async()=>state.value,save:async(id,value)=>{assert(state.locked);state.value=structuredClone(value)},lock:async()=>{if(state.locked)throw Error('Busy');state.locked=true;return async()=>{state.locked=false}}};
 const deps={locationId:'location-expected',booking:async()=>booking,available:async()=>true,createPayment:async body=>{count.charge++;assert.equal(state.value.phase,'pending');assert.equal(body.amount_money.amount,70630);assert.equal(body.amount_money.currency,'USD');assert.equal(body.reference_id,liveReference(booking.id));assert(body.idempotency_key.length<=45);assert(!JSON.stringify(state.value).includes('source_id'));return payment},readPayment:async()=>{count.read++;return payment},recordReceipt:async b=>{count.receipt++;assert.equal(state.value.receipt.phase,'pending');assert.equal(b.invoice.id,'invoice-expected');return 'receipt-expected'},confirmBooking:async()=>{if(booking.phase!=='confirmed'){count.appointment++;booking.phase='confirmed'}return booking}};
 return {booking,payment,state,count,store,deps,service:new LivePaymentService(store,deps)};
}
(async()=>{
 let f=fixture();for(const source of ['CASH','EXTERNAL','ccof:saved-card','cnon:card-nonce-ok',''])await assert.rejects(f.service.pay(f.booking.id,source));assert.equal(f.count.charge,0);
 const source='cnon:live-sdk-fixture';let paid=await f.service.pay(f.booking.id,source);assert.equal(paid.phase,'completed');assert.equal(f.count.read,1);
 await f.service.pay(f.booking.id,source);assert.equal(f.count.charge,1);
 await f.service.synchronize(f.booking.id);await f.service.synchronize(f.booking.id);assert.equal(f.count.receipt,1);assert.equal(f.count.appointment,1);
 await f.service.pay(f.booking.id,source);assert.equal(f.count.charge,1);
 for(const patch of [{status:'APPROVED'},{source_type:'EXTERNAL'},{location_id:'wrong'},{reference_id:'wrong'},{amount_money:{amount:1,currency:'USD'}},{amount_money:{amount:70630,currency:'CAD'}}])assert(!matchesLivePayment({...f.payment,...patch},f.booking,'location-expected'));
 f=fixture();f.deps.available=async()=>false;await assert.rejects(f.service.pay(f.booking.id,source));assert.equal(f.count.charge,0);assert.equal(f.state.value,null);
 f=fixture();f.deps.readPayment=async()=>{throw Error('Network result unknown')};paid=await f.service.pay(f.booking.id,source);assert.equal(paid.phase,'review_required');assert.equal(paid.paymentId,'payment-expected');await f.service.pay(f.booking.id,source);assert.equal(f.count.charge,1);
 f.deps.readPayment=async()=>f.payment;await f.service.synchronize(f.booking.id,'payment-expected');assert.equal(f.count.receipt,1);assert.equal(f.count.appointment,1);
 f=fixture();await f.service.pay(f.booking.id,source);f.deps.recordReceipt=async()=>{f.count.receipt++;throw Error('Zoho outcome ambiguous')};await assert.rejects(f.service.synchronize(f.booking.id));await assert.rejects(f.service.synchronize(f.booking.id));assert.equal(f.count.receipt,1);assert.equal(f.count.appointment,0);assert.equal(f.state.value.receipt.phase,'review_required');
 f=fixture();await f.service.pay(f.booking.id,source);f.state.value.invoiceId='different-invoice';await assert.rejects(f.service.synchronize(f.booking.id));assert.equal(f.count.receipt,0);
 f=fixture();await f.service.pay(f.booking.id,source);await assert.rejects(f.service.synchronize(f.booking.id,'different-payment'));assert.equal(f.count.receipt,0);
 f=fixture();f.payment.amount_money.amount=1;paid=await f.service.pay(f.booking.id,source);assert.equal(paid.phase,'review_required');await assert.rejects(f.service.synchronize(f.booking.id));assert.equal(f.count.receipt,0);
 f=fixture();f.booking.context=undefined;await assert.rejects(f.service.pay(f.booking.id,source));assert.equal(f.count.charge,0);
 f=fixture();f.deps.readPayment=async()=>({...f.payment,id:'different-payment'});paid=await f.service.pay(f.booking.id,source);assert.equal(paid.phase,'review_required');await assert.rejects(f.service.synchronize(f.booking.id));assert.equal(f.count.receipt,0);
 console.log('PASS: production tokens only, no external/cash/saved-card/sandbox sources, pending-before-charge, exact amount/currency/location/reference, independent provider read, repeat clicks/webhooks do not duplicate charges/receipts/jobs, conflicts checked before charge, ambiguous charge recovered only by exact provider proof, ambiguous Zoho writes never repeated. Mocked providers; zero funds or network calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
