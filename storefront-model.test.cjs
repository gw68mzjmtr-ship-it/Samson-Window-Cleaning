const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports}
const prices=load('app/commercial-pricing.ts'),res=load('app/residential/residential-model.ts'),dates=load('app/residential/residential-scheduling.ts',{'./residential-model':res});
const model=load('app/storefront-model.ts',{'./commercial-pricing':prices,'./residential/residential-scheduling':dates,'./residential/residential-model':res});
const covered=load('app/checkout/order-snapshot.ts').visitCovered;
const base={kind:'storefront',planIndex:0,scheduleIndex:0,quantities:[0,0,0,0,0],cadence:'once',ladder:false,billingMode:'storefront-monthly',subscriptionConsent:true};
function visits(start,schedule){return model.storefrontPeriodSlots(start,schedule).map(row=>({date:row.min,period:'morning'}))}
for(let plan=0;plan<5;plan++)for(let schedule=0;schedule<3;schedule++)for(const cadence of ['once','every']){
 const selection={...base,planIndex:plan,scheduleIndex:schedule,cadence,quantities:[2,1,3,1,1],ladder:true},v=visits('2026-11-02',schedule),q=prices.calculateCommercialQuote(plan,schedule,selection.quantities,cadence,true),s=model.storefrontOrderSnapshot(selection,v);
 assert.equal(s.initialTotalCents,Math.round(q.firstBill*100));
 assert.equal(s.repeatTotalCents,Math.round(q.monthly*100));
 assert.equal(s.initialLines.reduce((sum,l)=>sum+l.amountCents,0),s.initialTotalCents);
 assert.equal(s.visitOrders.reduce((sum,row)=>sum+row.totalCents,0),s.initialTotalCents);
 assert(s.visitOrders.every((row,i)=>covered(s,i)));
 assert.equal(s.recurring.firstPeriodEnd,'2026-12-02');
 assert.equal(s.recurring.autoRenewAuthorized,true);
 assert.equal(s.repeatLines.some(l=>l.key==='interior-ladder'),false);
 assert.equal(s.visitOrders.filter(row=>row.lines.some(l=>l.key==='interior-ladder')).length,cadence==='once'?1:0);
 assert(s.recurring.scopeNotes.some(note=>note.includes('Small interior panes × 2')));
}
const once=model.storefrontOrderSnapshot({...base,planIndex:1,quantities:[2,0,0,0,0],ladder:true},visits('2026-11-02',0));
assert.equal(once.initialTotalCents,8900);assert.equal(once.repeatTotalCents,4900);
assert.equal(model.storefrontPeriodSlots('2027-02-01',2).length,4);
assert.equal(model.storefrontPeriodSlots('2026-11-02',2).length,5);
assert(model.validateStorefrontVisits(base,visits('2026-11-02',0),'2026-10-30'));
assert(!model.validateStorefrontVisits(base,[{date:'2026-11-01',period:'morning'}],'2026-10-30'));
assert(!model.validateStorefrontVisits(base,[{date:'2026-11-26',period:'morning'}],'2026-10-30'));
assert(!model.validateStorefrontVisits({...base,scheduleIndex:1},[{date:'2026-11-02',period:'morning'}],'2026-10-30'));
assert(!model.validateStorefrontVisits({...base,scheduleIndex:1},[{date:'2026-11-02',period:'morning'},{date:'2026-11-02',period:'afternoon'}],'2026-10-30'));
assert.throws(()=>model.storefrontOrderSnapshot({...base,subscriptionConsent:false},visits('2026-11-02',0)));
assert.throws(()=>model.storefrontOrderSnapshot({...base,planIndex:99},visits('2026-11-02',0)));
assert.throws(()=>model.storefrontOrderSnapshot({...base,quantities:[-1,0,0,0,0]},visits('2026-11-02',0)));
assert.equal(model.storefrontOrderSnapshot({...base,price:1},visits('2026-11-02',0)).initialTotalCents,3900);
console.log('PASS: 15 storefront plan/frequency combinations; one-time and recurring interior pricing; flat ladder fee; exact invoice/visit cent allocation; 4/5 weekly visits; consent, holiday, weekend, missing-date and forged-price checks. No provider requests or money movement.');
