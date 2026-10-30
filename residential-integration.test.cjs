const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file+'.js');return m.exports}
const model=load('app/residential/residential-model.ts'),integration=load('app/residential/residential-integration.ts',{'./residential-model':model});
const {residentialOrderSnapshot:snapshot,easternServiceWindow:window}=integration;
const base={homeSize:2500,screenCount:0,interiorRequested:false,interiorQuantities:Array(8).fill(0),stepLadder:false,twoStoryLadder:false,specialtyAccess:false,exteriorSpecialty:false,maintenanceId:'once'};
for(const [homeSize,price]of [[2500,59900],[2501,59910],[3501,69910],[4501,79910],[5501,89910]])for(const [maintenanceId,discount]of [['once',0],['annual',3],['six-month',5],['quarterly',10]]){
 const s=snapshot({...base,homeSize,maintenanceId,screenCount:3,interiorRequested:true,interiorQuantities:[0,2,0,0,0,0,0,0],stepLadder:true,twoStoryLadder:true},true);
 const exterior=Math.round(price*(100-discount)/100);
 assert.equal(s.initialTotalCents,exterior+2000+3000+5000+10000);
 assert.equal(s.repeatTotalCents,maintenanceId==='once'?0:exterior+3000+10000+5000);
 assert.equal(s.maintenance.initialDiscountCents,price-exterior);
 assert.equal(s.maintenance.maximumInitialDiscountReversalCents,price-exterior);
 assert.equal(s.initialLines.filter(x=>x.key==='interior-ladder').length,1);
 assert.equal(s.repeatLines.some(x=>x.key==='double-hung'),false);
}
const six=snapshot({...base,maintenanceId:'six-month',screenCount:3,interiorRequested:true,interiorQuantities:[0,2,0,0,0,0,0,0]},true);
assert.equal(six.initialTotalCents,61905);assert.equal(six.repeatTotalCents,59905);assert.equal(six.maintenance.maximumInitialDiscountReversalCents,2995);
const french=snapshot({...base,interiorRequested:true,interiorQuantities:[0,0,0,0,0,0,1,0]});assert.equal(french.initialTotalCents,60400);
for(const [index,type]of model.residentialInteriorTypes.entries()){const quantities=Array(8).fill(0);quantities[index]=2;const s=snapshot({...base,interiorRequested:true,interiorQuantities:quantities});assert.equal(s.initialLines.find(x=>x.key===type.id).amountCents,type.rate*200)}
assert.equal(snapshot({...base,interiorRequested:false,interiorQuantities:Array(8).fill(10),stepLadder:true}).initialTotalCents,59900);
for(const change of [{homeSize:6501},{screenCount:-1},{interiorQuantities:[1]},{interiorQuantities:[0,-1,0,0,0,0,0,0]},{interiorRequested:'yes'},{screenCount:'2'},{maintenanceId:'bad'},{exteriorSpecialty:true},{interiorRequested:true,specialtyAccess:true}])assert.throws(()=>snapshot({...base,...change}));
assert.deepEqual(window('2026-10-30','morning'),{start:'2026-10-30T08:00:00-04:00',end:'2026-10-30T11:00:00-04:00'});
assert.deepEqual(window('2026-11-02','afternoon'),{start:'2026-11-02T13:00:00-05:00',end:'2026-11-02T16:00:00-05:00'});
assert.equal(window('2027-03-15','morning').start,'2027-03-15T08:00:00-04:00');
for(const date of ['2026-10-31','2026-11-26','2027-02-30','not-a-date'])assert.throws(()=>window(date,'morning'));
assert.throws(()=>window('2026-10-30','evening'));
console.log('PASS: all tiers, maintenance frequencies, upfront-discount preview, cents, per-pane French pricing, all interior types, flat ladder fees, screen charges, repeat exclusions, invalid/specialty inputs, Eastern daylight saving time, weekends and holidays. No external records or charges.');


const screenAccess=snapshot({...base,screenCount:2,stepLadder:true,maintenanceId:'quarterly'},true);assert.equal(screenAccess.initialTotalCents,60910);assert.equal(screenAccess.repeatTotalCents,60910);assert.equal(screenAccess.initialLines.filter(x=>x.key==='interior-ladder').length,1);assert.equal(screenAccess.repeatLines.filter(x=>x.key==='interior-ladder').length,1);
const windowAccess=snapshot({...base,interiorRequested:true,interiorQuantities:[0,2,0,0,0,0,0,0],stepLadder:true,maintenanceId:'quarterly'},true);assert.equal(windowAccess.repeatLines.some(x=>x.key==='interior-ladder'),false);
const tailored=snapshot({...base,maintenanceId:'quarterly',interiorRequested:true,interiorQuantities:[0,2,0,0,0,0,0,0],screenCount:3,stepLadder:true,twoStoryLadder:true,addonVisits:{'double-hung':[0,2],screens:[1,3],'interior-ladder':[0,1,2,3,4],'exterior-ladder':[0,3]}},true);
assert.deepEqual(tailored.visitOrders.map(v=>v.totalCents),[70910,61910,60910,71910,59900]);assert.equal(tailored.visitOrders[0].lines.some(l=>l.key==='screens'),false);assert.equal(tailored.visitOrders[2].lines.find(l=>l.key==='double-hung').quantity,2);assert.deepEqual(tailored.visitOrders[4].lines.map(l=>l.key),['exterior','visit-minimum']);
console.log('PASS: exact per-visit invoice snapshots preserve optional window, screen and ladder selections.');






const scented={...base,maintenanceId:'quarterly',interiorRequested:true,interiorQuantities:[0,2,0,0,0,0,0,0],addonVisits:{'double-hung':[0,2]}};
const plainScentOrder=snapshot(scented,true),lemonScentOrder=snapshot({...scented,lemonScent:true},true);
assert.equal(lemonScentOrder.selection.lemonScent,true);
assert.equal(lemonScentOrder.initialTotalCents,plainScentOrder.initialTotalCents);
assert.deepEqual(lemonScentOrder.visitOrders.map(v=>v.totalCents),plainScentOrder.visitOrders.map(v=>v.totalCents));
assert.deepEqual(lemonScentOrder.visitOrders.map(v=>v.serviceNotes.length),[1,0,1,0,0]);
assert.match(lemonScentOrder.visitOrders[0].serviceNotes[0],/Lemon scent.*Free/);
assert.equal(snapshot({...base,lemonScent:true}).selection.lemonScent,undefined);
assert.equal(snapshot({...base,lemonScent:true,screenCount:2,interiorRequested:true}).selection.lemonScent,undefined);
assert.throws(()=>snapshot({...base,lemonScent:'yes'}));
assert.deepEqual(snapshot({...scented,billingMode:'annual-prepay',lemonScent:true},true).visitOrders.map(v=>v.serviceNotes.length),[1,0,1,0]);
console.log('PASS: optional free lemon scent preserves every price, follows interior-cleaning visits, excludes screen-only/exterior work and rejects invalid selections.');
