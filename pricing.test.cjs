const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const result=ts.transpileModule(fs.readFileSync('app/commercial-pricing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}});
const m=new Module('pricing-model');m._compile(result.outputText,'pricing-model.js');
const {calculateCommercialQuote:q,storefrontPlans,schedules}=m.exports;
for(let p=0;p<5;p++)for(let s=0;s<3;s++){
 const r=q(p,s,[0,0,0,0,0],'every',true);
 assert.equal(r.monthly,storefrontPlans[p].prices[s]);assert.equal(r.oneTime,0);assert.equal(r.ladderPerVisit,0);assert.equal(r.visits,schedules[s].visits);
}
// One flat ladder fee covers every pane and setup in the same cleaning visit.
for (const quantities of [[1,0,0,0,0],[2,0,0,0,0],[10,5,8,3,2]]) {
 const withLadder=q(0,0,quantities,'once',true);
 const withoutLadder=q(0,0,quantities,'once',false);
 assert.equal(withLadder.ladderPerVisit,20);
 assert.equal(withLadder.oneTime-withoutLadder.oneTime,20);
}
const firstBillExample=q(1,0,[2,0,0,0,0],'once',true);
assert.equal(firstBillExample.firstBill,89);assert.equal(firstBillExample.monthly,49);assert.equal(firstBillExample.oneTime,40);
assert.equal(q(1,0,[2,0,0,0,0],'every',true).firstBill,89);
assert.equal(q(1,0,[0,0,0,0,0],'once',true).firstBill,49);
let r=q(1,0,[2,0,2,0,0],'once',true);
assert.equal(r.monthly,49);assert.equal(r.interiorPerVisit,70);assert.equal(r.oneTime,90);
r=q(1,1,[2,0,2,0,0],'every',true);
assert.equal(r.monthly,300);assert.equal(r.oneTime,0);assert.equal(r.recurringInterior,180);
r=q(0,2,[1,0,0,0,0],'every',true);
assert.equal(r.monthly,305);assert.equal(r.recurringInterior,130);
r=q(1,2,[0,1,0,0,0],'every',true);
assert.equal(r.recurringInterior,151.67);assert.equal(r.monthly,411.67);
assert.throws(()=>q(0,0,[-1,0,0,0,0],'once',false));
assert.throws(()=>q(0,0,[1.2,0,0,0,0],'once',false));
assert.throws(()=>q(0,0,[101,0,0,0,0],'once',false));
assert.throws(()=>q(5,0,[0,0,0,0,0],'once',false));
console.log('PASS: 15 exterior rates, all schedules, one-time/recurring interiors, ladder once per visit, rounding and invalid inputs.');