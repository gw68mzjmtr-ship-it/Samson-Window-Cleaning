const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports;}
const model=load('app/residential/residential-model.ts');
const integration=load('app/residential/residential-integration.ts',{'./residential-model':model});
const scheduling=load('app/residential/residential-scheduling.ts',{'./residential-model':model});
const {BookingWorkflow}=load('app/zoho-trial/booking-workflow.ts',{'../residential/residential-integration':integration,'../residential/residential-scheduling':scheduling});
const {confirmationMessage}=load('app/checkout/confirmation.ts');
const base={homeSize:2500,maintenanceId:'annual',billingMode:'annual-prepay',interiorRequested:false,interiorQuantities:Array(8).fill(0),screenCount:0,stepLadder:false,twoStoryLadder:false,specialtyAccess:false,exteriorSpecialty:false};
const visit=date=>({date,period:'morning'});
const cases=[
 {id:'annual',months:[0,12],visits:['2026-11-04','2027-11-04'].map(visit),total:110396},
 {id:'six-month',months:[0,6,12],visits:['2026-11-04','2027-05-04','2027-11-04'].map(visit),total:162179},
 {id:'quarterly',months:[0,3,6,9,12],visits:['2026-11-04','2027-02-04','2027-05-04','2027-08-04','2027-11-04'].map(visit),total:256073}
];
async function run(test){
 const selection={...base,maintenanceId:test.id},snapshot=integration.residentialOrderSnapshot(selection,true),count=test.visits.length;
 assert.deepEqual(scheduling.repeatMonthOffsets(test.id,'annual-prepay'),test.months);
 assert(scheduling.validateVisitSeries(test.id,test.visits,'2026-10-30','annual-prepay'));
 assert(!scheduling.validateVisitSeries(test.id,test.visits.slice(0,-1),'2026-10-30','annual-prepay'));
 assert.equal(snapshot.billing.visitsIncluded,count);assert.equal(snapshot.initialTotalCents,test.total);assert.equal(snapshot.repeatTotalCents,0);
 assert(snapshot.visitOrders.every(v=>v.includedInInitialPayment));
 assert.equal(snapshot.initialLines.reduce((sum,line)=>sum+line.amountCents,0),test.total);
 assert.equal(snapshot.visitOrders.reduce((sum,v)=>sum+v.totalCents,0),test.total);
 const last=count-1,addons=integration.residentialOrderSnapshot({...selection,screenCount:2,stepLadder:true,addonVisits:{screens:[last],'interior-ladder':[last]}},true);
 assert.equal(addons.initialTotalCents,test.total+7000);assert.equal(addons.billing.addonCents,7000);
 assert.equal(addons.visitOrders[last].lines.filter(l=>l.key==='interior-ladder').length,1);
 assert(addons.visitOrders.slice(0,last).every(v=>!v.lines.some(l=>['screens','interior-ladder'].includes(l.key))));
 const each=integration.residentialOrderSnapshot({...selection,screenCount:1,stepLadder:true},true);
 assert.equal(each.billing.addonCents,count*6000);assert.equal(each.initialTotalCents,test.total+count*6000);
 const perVisit=integration.residentialOrderSnapshot({...selection,billingMode:'per-visit'},true);
 assert.equal(perVisit.initialTotalCents,59900);assert.equal(perVisit.billing.visitsIncluded,1);
 assert(perVisit.visitOrders.slice(1).every(v=>!v.includedInInitialPayment));
 const records=new Map(),appointments=[];let received=false;
 const store={locked:fn=>fn(),records:async()=>[...records.values()],read:async id=>records.get(id),save:async b=>records.set(b.id,structuredClone(b))};
 const workflow=new BookingWorkflow('',{
  available:async visits=>{assert.equal(visits.length,count);return true},
  createInvoice:async b=>{assert.equal(b.snapshot.initialTotalCents,test.total);return {id:'invoice-'+test.id,number:'TEST-'+test.id,url:'https://invoice.zoho.com/test'}},
  readPayment:async b=>({id:b.invoice.id,customerEmail:b.customer.email,currency:'USD',totalCents:test.total,balanceCents:received?0:test.total,status:received?'paid':'sent',receivedCents:received?test.total:0,paymentIds:received?['fictional-payment']:[]}),
  createAppointment:async(b,index)=>{assert(b.snapshot.visitOrders[index].includedInInitialPayment);appointments.push(index);return {orderId:'work-'+index,appointmentId:'appointment-'+index}}
 },store);
 let b=await workflow.create({requestKey:'c'.repeat(24),selection,visits:test.visits,customer:{name:'Fictional Prepaid Test',email:'prepaid@example.invalid',phone:'2025550100',street:'1 Fictional Test',city:'Concord',state:'NC',zip:'28025'}},'2026-10-30');
 await workflow.reconcile(b.id);assert.equal(appointments.length,0);
 received=true;b=await workflow.reconcile(b.id);assert.equal(b.phase,'confirmed');assert.equal(appointments.length,count);
 await workflow.reconcile(b.id);assert.equal(appointments.length,count);
 const message=confirmationMessage(b,{phase:'completed',invoiceId:b.invoice.id,amountCents:test.total,receipt:{phase:'verified'}});
 assert.equal((message.body.match(/— covered by this payment/g)||[]).length,count);
 assert(!message.body.includes('— billed separately when due; not included in this payment'));
 // Existing orders retain their original saved paid/unpaid allocation.
 const legacy=structuredClone(b);legacy.snapshot.billing.visitsIncluded=1;legacy.snapshot.visitOrders.forEach((v,i)=>v.includedInInitialPayment=i===0);
 const oldMessage=confirmationMessage(legacy,{phase:'completed',invoiceId:legacy.invoice.id,amountCents:test.total,receipt:{phase:'verified'}});
 assert.equal((oldMessage.body.match(/— billed separately when due; not included in this payment/g)||[]).length,count-1);
}
(async()=>{for(const test of cases)await run(test);console.log('PASS: annual 2 / six-month 3 / quarterly 5 prepaid visits; all included amounts invoice once, exact cents and undiscounted selected add-ons, matching dates, no appointments before payment, no duplicates, receipts show every covered visit, per-visit and saved-order allocations preserved. Mock providers only.');})().catch(e=>{console.error(e);process.exitCode=1});
