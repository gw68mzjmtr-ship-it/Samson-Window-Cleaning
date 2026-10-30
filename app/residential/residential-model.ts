export const residentialPlans=[
 {name:'Premium',minSqft:1,maxSqft:2500,price:599,image:'standard',description:'Well-appointed homes'},
 {name:'Executive',minSqft:2501,maxSqft:3500,price:699,image:'premium',description:'Spacious homes'},
 {name:'Executive',minSqft:3501,maxSqft:4500,price:799,image:'premium',description:'Large homes'},
 {name:'Elite',minSqft:4501,maxSqft:5500,price:899,image:'executive',description:'Expansive homes'},
 {name:'Elite',minSqft:5501,maxSqft:10000,price:999,image:'executive',description:'Estate homes'},
] as const;
export const residentialPlanGroups=[
 {name:'Premium',minSqft:1,maxSqft:2500,minPrice:599,maxPrice:599,image:'standard',description:'Well-appointed homes'},
 {name:'Executive',minSqft:2501,maxSqft:4500,minPrice:599.10,maxPrice:799,image:'premium',description:'Large homes'},
 {name:'Elite',minSqft:4501,maxSqft:10000,minPrice:799.10,maxPrice:1349,image:'executive',description:'Estate homes'},
] as const;
export function residentialPlanForSize(squareFeet:number){
 if(!Number.isInteger(squareFeet)||squareFeet<1||squareFeet>10000)return null;
 const plan=residentialPlans.find(plan=>squareFeet>=plan.minSqft&&squareFeet<=plan.maxSqft);
 return plan?{...plan,price:(59900+Math.max(0,squareFeet-2500)*10)/100}:null;
}
export const residentialMinimum=599;
export const residentialMaintenance=[
 {id:'once',label:'One-time cleaning',visits:1,months:0,discount:0},
 {id:'annual',label:'Annual maintenance',visits:1,months:12,discount:3},
 {id:'six-month',label:'Every six months',visits:2,months:6,discount:5},
 {id:'quarterly',label:'Quarterly maintenance',visits:4,months:3,discount:10},
] as const;
// Conservative saved-card cost assumption for internal planning, not a customer surcharge.
// Confirm actual provider/account rates before enabling live payments.
export function estimateResidentialProcessing(amount:number,rate=0.0349){
 if(!Number.isFinite(amount)||amount<0||!Number.isFinite(rate)||rate<0||rate>=1)throw new Error('Invalid processing cost inputs.');
 const grossCents=Math.round(amount*100),feeCents=Math.round(grossCents*rate);
 return {fee:feeCents/100,netBeforeJobCosts:(grossCents-feeCents)/100};
}
export const residentialInteriorTypes=[
 {id:'transom',name:'Small fixed / transom',rate:5,unit:'pane',detail:'Each glass piece up to 6 sq ft.'},
 {id:'double-hung',name:'Single / double-hung',rate:10,unit:'window',detail:'One complete standard window, including both ordinary sashes.'},
 {id:'casement',name:'Casement',rate:20,unit:'panel',detail:'Each opening glass panel.'},
 {id:'picture',name:'Picture window',rate:40,unit:'pane',detail:'One fixed pane over 6–21 sq ft.'},
 {id:'oversized-picture',name:'Oversized picture',rate:75,unit:'pane',detail:'One fixed pane over 21–50 sq ft.'},
 {id:'sliding-door',name:'Sliding glass door',rate:35,unit:'panel',detail:'Count each glass panel, including the stationary panel.'},
 {id:'french-divided-light',name:'French / divided-light',rate:5,unit:'pane',detail:'$5 for each individual small pane with true raised dividers. Count all panes across the windows and doors you want cleaned.'},
 {id:'skylight',name:'Skylight · interior',rate:75,unit:'skylight',detail:'One standard skylight with straightforward access; high or difficult access needs a quote.'},
] as const;
export type AddonVisits=Record<string,number[]>;
export type ResidentialBillingMode='per-visit'|'annual-prepay';
export function calculateResidentialQuote(squareFeet:number,options:{interiorRequested:boolean;stepLadder:boolean;twoStoryLadder:boolean;interiorQuantities?:number[];specialtyAccess?:boolean;exteriorSpecialty?:boolean;maintenanceId?:string;screenCount?:number;addonVisits?:AddonVisits;billingMode?:ResidentialBillingMode;upfrontDiscount?:boolean}){
 const plan=residentialPlanForSize(squareFeet);
 if(!plan)return null;
 const quantities=options.interiorQuantities??residentialInteriorTypes.map(()=>0);
 if(quantities.length!==8||quantities.some(q=>!Number.isInteger(q)||q<0||q>100))throw new Error('Use valid whole window quantities and pane counts.');
 const selectedScreens=options.screenCount??0;
 if(!Number.isInteger(selectedScreens)||selectedScreens<0||selectedScreens>500)throw new Error('Use a whole screen count from 0 to 500.');
 const schedule=residentialMaintenance.find(s=>s.id===(options.maintenanceId??'once'));
 if(!schedule)throw new Error('Choose a valid maintenance schedule.');
 const billingMode=options.billingMode??'per-visit',prepaid=billingMode==='annual-prepay';
 if(!['per-visit','annual-prepay'].includes(billingMode)||(prepaid&&schedule.id==='once'))throw Error('Choose maintenance before paying for the year.');
 const prepaidVisitCount=prepaid?schedule.visits:1;
 const visitCount=schedule.months?(prepaid&&schedule.id!=='annual'?schedule.visits:schedule.visits+1):1;
 const addonVisits=options.addonVisits??{};
 const keys=[...residentialInteriorTypes.map(t=>t.id),'screens','interior-ladder','exterior-ladder'];
 if(!addonVisits||typeof addonVisits!=='object'||Array.isArray(addonVisits)||Object.entries(addonVisits).some(([key,visits])=>!keys.includes(key)||!Array.isArray(visits)||new Set(visits).size!==visits.length||visits.some(i=>!Number.isInteger(i)||i<0||i>=visitCount)))throw Error('Choose valid add-on visits.');
 const included=(key:string,index:number,fallback:boolean)=>addonVisits[key]===undefined?fallback:addonVisits[key].includes(index);
 const repeatExterior=Math.round(plan.price*100*(100-schedule.discount)/100)/100;
 const annualMaintenanceCents=Math.round(repeatExterior*100)*(prepaid?prepaidVisitCount:visitCount);
 const prepaidExteriorTotal=Math.round(annualMaintenanceCents*95/100),prepaidExteriorFloor=Math.floor(prepaidExteriorTotal/prepaidVisitCount),prepaidRemainder=prepaidExteriorTotal%prepaidVisitCount;
 const visitPricing=Array.from({length:visitCount},(_,index)=>{
  const interiorQuantities=quantities.map((q,i)=>options.interiorRequested&&included(residentialInteriorTypes[i].id,index,index===0)?q:0);
  const interiorCount=interiorQuantities.reduce((sum,q)=>sum+q,0),interiorGlass=interiorQuantities.reduce((sum,q,i)=>sum+q*residentialInteriorTypes[i].rate,0);
  const screenCount=included('screens',index,true)?selectedScreens:0,screenFee=screenCount*10;
  const exteriorLadderFee=options.twoStoryLadder&&included('exterior-ladder',index,true)?100:0;
  const interiorLadderFee=(interiorCount>0||screenCount>0)&&options.stepLadder&&included('interior-ladder',index,index===0||selectedScreens>0)?50:0;
  const prepaidVisit=prepaid&&index<prepaidVisitCount;
  const exteriorCents=prepaidVisit?prepaidExteriorFloor+(index<prepaidRemainder?1:0):Math.round((index===0&&!options.upfrontDiscount?plan.price:repeatExterior)*100);
  const subtotalCents=exteriorCents+Math.round((interiorGlass+screenFee+exteriorLadderFee+interiorLadderFee)*100);
  const minimumAdjustmentCents=prepaidVisit?0:Math.max(0,59900-subtotalCents),total=(subtotalCents+minimumAdjustmentCents)/100;
  return {index,includedInInitialPayment:index===0||prepaidVisit,interiorQuantities,interiorCount,interiorGlass,screenCount,screenFee,exteriorLadderFee,interiorLadderFee,exteriorCents,minimumAdjustmentCents,total};
 });
 const annualTotalCents=visitPricing.filter(v=>!prepaid||v.includedInInitialPayment).reduce((sum,v)=>sum+Math.round(v.total*100),0);
 const billing={mode:billingMode,visitsIncluded:prepaid?prepaidVisitCount:1,extraDiscountPercent:prepaid?5:0,regularExteriorCents:Math.round(plan.price*100)*(prepaid?prepaidVisitCount:visitCount),maintenanceSavingsCents:Math.round(plan.price*100)*(prepaid?prepaidVisitCount:visitCount)-annualMaintenanceCents,prepaySavingsCents:prepaid?annualMaintenanceCents-prepaidExteriorTotal:0,addonCents:visitPricing.filter(v=>!prepaid||v.includedInInitialPayment).reduce((sum,v)=>sum+Math.round((v.interiorGlass+v.screenFee+v.interiorLadderFee+v.exteriorLadderFee)*100),0),annualTotalCents:prepaid?annualTotalCents:0};
 const initial=visitPricing[0],next=visitPricing[1],knownSubtotal=prepaid?annualTotalCents/100:initial.total,workSubtotal=initial.total,minimumAdjustment=initial.minimumAdjustmentCents/100;
 const nextVisitTotal=next?.total??repeatExterior;
 return {plan,...initial,billing,visitPricing,repeatStepLadderFee:next?.interiorLadderFee??0,workSubtotal,minimumAdjustment,knownSubtotal,
  maintenance:{...schedule,repeatExterior,discountAmount:Math.round((plan.price-repeatExterior)*100)/100,nextVisitTotal},
  initialProcessing:estimateResidentialProcessing(knownSubtotal),repeatProcessing:estimateResidentialProcessing(nextVisitTotal),
  requiresScopeQuote:!!(squareFeet>6500||(options.interiorRequested&&options.specialtyAccess)||options.exteriorSpecialty)};
}
export function calendarCells(year:number,month:number){
 const firstDay=new Date(Date.UTC(year,month,1)).getUTCDay();
 const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return [...Array(firstDay).fill(null),...Array.from({length:days},(_,i)=>`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)] as (string|null)[];
}
export function sampleDateAvailable(date:string,today:string){
 const stamp=new Date(`${date}T12:00:00Z`);const weekday=stamp.getUTCDay();
 const offset=(stamp.getTime()-new Date(`${today}T12:00:00Z`).getTime())/86400000;
 return weekday>0&&weekday<6&&offset>=2&&offset<=60&&!isServiceClosureDay(date);
}
const holidayCache=new Map<number,Map<string,string>>();
export function serviceHolidayName(date:string){
 const year=Number(date.slice(0,4));if(!Number.isInteger(year))return null;
 if(!holidayCache.has(year)){
  const holidays=new Map<string,string>();
  const iso=(d:Date)=>d.toISOString().slice(0,10);
  const nth=(y:number,m:number,weekday:number,n:number)=>new Date(Date.UTC(y,m,1+(weekday-new Date(Date.UTC(y,m,1)).getUTCDay()+7)%7+7*(n-1),12));
  for(const y of [year-1,year,year+1]){
   for(const [month,day,name] of [[0,1,"New Year’s Day"],[5,19,'Juneteenth'],[6,4,'Independence Day'],[10,11,'Veterans Day'],[11,25,'Christmas Day']] as const){
    const actual=new Date(Date.UTC(y,month,day,12));holidays.set(iso(actual),name);
    const observed=new Date(actual);if(actual.getUTCDay()===6)observed.setUTCDate(observed.getUTCDate()-1);if(actual.getUTCDay()===0)observed.setUTCDate(observed.getUTCDate()+1);if(iso(observed)!==iso(actual))holidays.set(iso(observed),name+' (observed)');
   }
   const memorial=new Date(Date.UTC(y,5,0,12));memorial.setUTCDate(memorial.getUTCDate()-(memorial.getUTCDay()+6)%7);
   holidays.set(iso(nth(y,0,1,3)),'Martin Luther King Jr. Day');holidays.set(iso(nth(y,1,1,3)),'Washington’s Birthday');
   holidays.set(iso(memorial),'Memorial Day');holidays.set(iso(nth(y,8,1,1)),'Labor Day');holidays.set(iso(nth(y,9,1,2)),'Columbus Day');holidays.set(iso(nth(y,10,4,4)),'Thanksgiving Day');
  }
  holidayCache.set(year,holidays);
 }
 return holidayCache.get(year)!.get(date)||null;
}
export function isServiceClosureDay(date:string){const day=new Date(date+'T12:00:00Z');if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date)return true;return day.getUTCDay()===0||day.getUTCDay()===6||!!serviceHolidayName(date);}
export function serviceDateClosureReason(date:string,today:string,initial=true){
 const day=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date)return 'Unavailable';
 const holiday=serviceHolidayName(date);if(holiday)return holiday;
 if(day.getUTCDay()===0||day.getUTCDay()===6)return 'Weekend';
 if(date<today)return 'Past date';
 const days=(day.getTime()-new Date(today+'T12:00:00Z').getTime())/86400000;
 if(initial&&days<2)return '2-day advance notice';
 if(initial&&days>60)return 'Outside booking window';
 return null;
}




