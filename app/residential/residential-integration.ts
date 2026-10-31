import {calculateResidentialQuote,isServiceClosureDay,residentialInteriorTypes} from './residential-model';
export type ResidentialSelection={homeSize:number;screenCount:number;interiorRequested:boolean;interiorQuantities:number[];lemonScent?:boolean;stepLadder:boolean;twoStoryLadder:boolean;specialtyAccess:boolean;exteriorSpecialty:boolean;maintenanceId:string;addonVisits?:Record<string,number[]>;billingMode?:'per-visit'|'annual-prepay'};
export type ResidentialOrderLine={key:string;label:string;quantity:number;unitPriceCents:number;amountCents:number};
export function parseResidentialSelection(value:unknown):ResidentialSelection {
 if(!value||typeof value!=='object')throw Error('Choose valid services.');
 const input=value as Record<string,unknown>;
 for(const key of ['homeSize','screenCount'])if(typeof input[key]!=='number'||!Number.isInteger(input[key]))throw Error('Use whole-number home size and screen count.');
 for(const key of ['interiorRequested','stepLadder','twoStoryLadder','specialtyAccess','exteriorSpecialty'])if(typeof input[key]!=='boolean')throw Error('Choose valid service options.');
 if(typeof input.maintenanceId!=='string'||!Array.isArray(input.interiorQuantities)||input.interiorQuantities.some(q=>typeof q!=='number'))throw Error('Choose valid interior quantities and frequency.');
 const selection=input as unknown as ResidentialSelection;
 if(selection.lemonScent!==undefined&&typeof selection.lemonScent!=='boolean')throw Error('Choose a valid lemon scent option.');
 if(selection.billingMode!==undefined&&!['per-visit','annual-prepay'].includes(selection.billingMode))throw Error('Choose a valid payment option.');
 const quote=calculateResidentialQuote(selection.homeSize,selection);
 if(!quote)throw Error('A custom estimate is required for this home size.');
 if(selection.homeSize>6500)throw Error('Homes over 6,500 sq ft need a scope assessment before booking; the displayed square-foot price is a starting estimate.');
 if(quote.requiresScopeQuote)throw Error('Specialty glass or access needs assessment before booking.');
 return {homeSize:selection.homeSize,screenCount:selection.screenCount,interiorRequested:selection.interiorRequested,interiorQuantities:[...selection.interiorQuantities],...(selection.lemonScent===true&&selection.interiorRequested&&selection.interiorQuantities.some(q=>q>0)?{lemonScent:true}:{}),stepLadder:selection.stepLadder,twoStoryLadder:selection.twoStoryLadder,specialtyAccess:selection.specialtyAccess,exteriorSpecialty:selection.exteriorSpecialty,maintenanceId:selection.maintenanceId,billingMode:selection.billingMode??'per-visit',...(selection.addonVisits?{addonVisits:structuredClone(selection.addonVisits)}:{})};
}
export function residentialOrderSnapshot(value:unknown,upfrontDiscountPreview=false){
 const selection=parseResidentialSelection(value),quote=calculateResidentialQuote(selection.homeSize,{...selection,upfrontDiscount:upfrontDiscountPreview})!;
 const initialExteriorCents=quote.visitPricing[0].exteriorCents;
 const first=quote.visitPricing[0];
 const initialDiscountCents=Math.max(0,Math.round((quote.plan.price+first.interiorGlass+first.screenFee+first.interiorLadderFee+first.exteriorLadderFee-first.total)*100));
 const visitOrders=quote.visitPricing.map((visit,index)=>{
 const exterior=visit.exteriorCents;
 const lines:ResidentialOrderLine[]=[{key:'exterior',label:quote.plan.name+' exterior cleaning',quantity:1,unitPriceCents:exterior,amountCents:exterior}];
 residentialInteriorTypes.forEach((type,i)=>{const quantity=visit.interiorQuantities[i];if(quantity)lines.push({key:type.id,label:type.name+' · interior',quantity,unitPriceCents:type.rate*100,amountCents:quantity*type.rate*100})});
 if(visit.screenCount)lines.push({key:'screens',label:'Screen removal and replacement',quantity:visit.screenCount,unitPriceCents:1000,amountCents:visit.screenCount*1000});
 if(visit.interiorLadderFee)lines.push({key:'interior-ladder',label:'Step ladder · selected windows and screens · all setups for this visit',quantity:1,unitPriceCents:5000,amountCents:5000});
 if(visit.exteriorLadderFee)lines.push({key:'exterior-ladder',label:'Exterior two-story ladder · all setups for this visit',quantity:1,unitPriceCents:10000,amountCents:10000});
 if(visit.minimumAdjustmentCents)lines.push({key:'visit-minimum',label:'$599 minimum per cleaning visit',quantity:1,unitPriceCents:visit.minimumAdjustmentCents,amountCents:visit.minimumAdjustmentCents});
 const serviceNotes=selection.lemonScent&&visit.interiorCount>0?['Lemon scent · Free · selected interior glass only']:[];
 return {index,includedInInitialPayment:visit.includedInInitialPayment,lines,serviceNotes,totalCents:lines.reduce((sum,line)=>sum+line.amountCents,0)};
 });
 const prepaid=selection.billingMode==='annual-prepay';
 const initialLines=prepaid?visitOrders.filter(visit=>visit.includedInInitialPayment).flatMap(visit=>visit.lines.map(line=>({...line,key:'visit-'+visit.index+'-'+line.key,label:(visit.index===0?'Initial cleaning':'Repeat '+visit.index)+' · '+line.label}))):visitOrders[0].lines,repeatLines=visitOrders.find(visit=>!visit.includedInInitialPayment)?.lines??[];
 return {version:'residential-sqft-599-prepaid-packages-2026-10-30',currency:'USD',selection,plan:quote.plan.name,billing:quote.billing,initialLines,initialTotalCents:initialLines.reduce((sum,l)=>sum+l.amountCents,0),repeatLines,repeatTotalCents:visitOrders.find(visit=>!visit.includedInInitialPayment)?.totalCents??0,visitOrders,maintenance:{id:quote.maintenance.id,label:quote.maintenance.label,months:quote.maintenance.months,discountPercent:quote.maintenance.discount,initialDiscountCents,maximumInitialDiscountReversalCents:prepaid?0:initialDiscountCents},upfrontDiscountPreview,termsDraft:true,paymentEnabled:false};
}
export function easternServiceWindow(date:string,period:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isServiceClosureDay(date))throw Error('Choose an available weekday outside holidays.');
 if(period!=='morning'&&period!=='afternoon')throw Error('Choose morning or afternoon.');
 const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(new Date(date+'T12:00:00Z')).find(p=>p.type==='timeZoneName')!.value;
 const match=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset);
 if(!match)throw Error('Eastern time offset unavailable.');
 const zone=match[1]+match[2].padStart(2,'0')+':'+(match[3]||'00');
 return {start:date+'T'+(period==='morning'?'08':'13')+':00:00'+zone,end:date+'T'+(period==='morning'?'11':'16')+':00:00'+zone};
}

