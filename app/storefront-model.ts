import {calculateCommercialQuote,storefrontPlans,schedules,interiorPanes,type InteriorCadence} from './commercial-pricing';
import {addCalendarMonths,type ResidentialVisit} from './residential/residential-scheduling';
import {sampleDateAvailable,isServiceClosureDay} from './residential/residential-model';
import type {BookingSnapshot} from './checkout/order-snapshot';
import type {ResidentialOrderLine} from './residential/residential-integration';
export const storefrontConsentVersion='storefront-monthly-2026-10-30-v1';
export type StorefrontSelection={kind:'storefront';planIndex:number;scheduleIndex:number;quantities:number[];cadence:InteriorCadence;ladder:boolean;billingMode:'storefront-monthly';subscriptionConsent:boolean};
export function parseStorefrontSelection(input:unknown):StorefrontSelection{
 if(!input||typeof input!=='object')throw Error('Choose your storefront subscription.');
 const s=input as StorefrontSelection;
 if(s.kind!=='storefront'||s.billingMode!=='storefront-monthly'||typeof s.ladder!=='boolean'||typeof s.subscriptionConsent!=='boolean'||!Array.isArray(s.quantities))throw Error('Check your storefront options.');
 calculateCommercialQuote(s.planIndex,s.scheduleIndex,s.quantities,s.cadence,s.ladder);
 return {kind:'storefront',planIndex:s.planIndex,scheduleIndex:s.scheduleIndex,quantities:[...s.quantities],cadence:s.cadence,ladder:s.ladder,billingMode:'storefront-monthly',subscriptionConsent:s.subscriptionConsent};
}
export function shiftStorefrontDays(date:string,days:number){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw Error('Invalid date');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function storefrontPeriodSlots(start:string,scheduleIndex:number){
 if(!schedules[scheduleIndex])throw Error('Choose a cleaning frequency.');
 const end=addCalendarMonths(start,1),offsets=scheduleIndex===0?[0]:scheduleIndex===1?[0,14]:[0,7,14,21,28];
 return offsets.map(offset=>shiftStorefrontDays(start,offset)).filter(date=>date<end).map((date,index)=>({index,min:date,max:index===0?date:[shiftStorefrontDays(date,6),shiftStorefrontDays(end,-1)].sort()[0]}));
}
export function validateStorefrontVisits(selection:StorefrontSelection,visits:ResidentialVisit[],today:string,renewal=false){
 if(!Array.isArray(visits)||!visits.length||(!renewal&&!sampleDateAvailable(visits[0]?.date,today)))return false;
 try{const slots=storefrontPeriodSlots(visits[0].date,selection.scheduleIndex);
  return visits.length===slots.length&&visits.every((visit,i)=>['morning','afternoon'].includes(visit.period)&&!isServiceClosureDay(visit.date)&&visit.date>=slots[i].min&&visit.date<=slots[i].max&&(i===0||visit.date>visits[i-1].date));
 }catch{return false;}
}
const allocate=(total:number,count:number,index:number)=>Math.floor(total/count)+(index<total%count?1:0);
const line=(key:string,label:string,cents:number,quantity=1):ResidentialOrderLine=>({key,label,quantity,unitPriceCents:cents,amountCents:cents*quantity});
export function storefrontOrderSnapshot(value:unknown,visits:ResidentialVisit[]):BookingSnapshot&{selection:StorefrontSelection}{
 const s=parseStorefrontSelection(value);if(!s.subscriptionConsent)throw Error('Monthly billing authorization is required.');
 const q=calculateCommercialQuote(s.planIndex,s.scheduleIndex,s.quantities,s.cadence,s.ladder),frequency=schedules[s.scheduleIndex],plan=storefrontPlans[s.planIndex];
 if(!visits.length||visits.length!==storefrontPeriodSlots(visits[0].date,s.scheduleIndex).length)throw Error('Select every first-month cleaning.');
 const exterior=Math.round(q.exteriorMonthly*100),interior=Math.round(q.recurringInterior*100),monthly=exterior+interior;
 const scopeNotes=[plan.name+' storefront exterior · '+plan.panels,frequency.label+' exterior service',...(q.count?[s.quantities.map((n,i)=>n?interiorPanes[i].name+' interior panes × '+n:'').filter(Boolean).join('; '),s.cadence==='every'?'Interiors on every cleaning':'Interiors on the first cleaning only',...(q.ladderPerVisit?['One $20 ladder fee covers all selected interior panes and setups per included interior visit']:[])]:[])];
 const oneTime=s.cadence==='once'?interiorPanes.flatMap((pane,i)=>s.quantities[i]?[line('interior-'+i,pane.name+' interior panes',pane.price*100,s.quantities[i])]:[]):[];
 if(s.cadence==='once'&&q.ladderPerVisit)oneTime.push(line('interior-ladder','Interior step ladder · all selected panes and setups',2000));
 const monthlyLines=[line('subscription-exterior',plan.name+' exterior subscription · first service month',exterior),...(interior?[line('subscription-interior','Recurring interior subscription coverage · first service month',interior)]:[])];
 const orders=visits.map((_,i)=>{const lines=[line('subscription-exterior',plan.name+' exterior subscription · allocated visit value',allocate(exterior,visits.length,i)),...(interior?[line('subscription-interior','Recurring interior coverage · allocated visit value',allocate(interior,visits.length,i))]:[]),...(i===0?oneTime:[])];return {index:i,includedInInitialPayment:true,lines,serviceNotes:i===0||s.cadence==='every'?scopeNotes:[scopeNotes[0],scopeNotes[1]],totalCents:lines.reduce((sum,l)=>sum+l.amountCents,0)}});
 const initialLines=[...monthlyLines,...oneTime],total=initialLines.reduce((sum,l)=>sum+l.amountCents,0);
 if(total!==Math.round(q.firstBill*100)||orders.reduce((sum,v)=>sum+v.totalCents,0)!==total)throw Error('Storefront invoice allocation mismatch');
 return {kind:'storefront',version:'storefront-monthly-v1',currency:'USD',selection:s,plan:plan.name+' storefront subscription',billing:{mode:'storefront-monthly',visitsIncluded:visits.length,extraDiscountPercent:0,regularExteriorCents:exterior,maintenanceSavingsCents:0,prepaySavingsCents:0,addonCents:interior+Math.round(q.oneTime*100),annualTotalCents:0},initialLines,initialTotalCents:total,repeatLines:monthlyLines.map(l=>({...l,label:l.label.replace('first service month','service month')})),repeatTotalCents:monthly,visitOrders:orders,maintenance:{id:frequency.id,label:frequency.label+' subscription',months:1,discountPercent:0,initialDiscountCents:0,maximumInitialDiscountReversalCents:0},upfrontDiscountPreview:false,termsDraft:false,paymentEnabled:true,recurring:{monthlyCents:monthly,firstPeriodStart:visits[0].date,firstPeriodEnd:addCalendarMonths(visits[0].date,1),autoRenewAuthorized:true,consentVersion:storefrontConsentVersion,frequency:frequency.id,scopeNotes,exteriorMonthlyCents:exterior,interiorMonthlyCents:interior}};
}
// Renewal prices come from the accepted immutable order, never today's calculator.
export function storefrontRenewalSnapshot(original:BookingSnapshot,start:string,visits:ResidentialVisit[],end=addCalendarMonths(start,1)):BookingSnapshot{
 const r=original.recurring,s=original.selection as StorefrontSelection;if(original.kind!=='storefront'||!r||!visits.length)throw Error('Storefront subscription required');
 const notes=s.cadence==='every'?r.scopeNotes:r.scopeNotes.slice(0,2),lines=[line('subscription-exterior',original.plan+' · renewed service month',r.exteriorMonthlyCents),...(r.interiorMonthlyCents?[line('subscription-interior','Recurring interior coverage · renewed service month',r.interiorMonthlyCents)]:[])];
 const visitOrders=visits.map((_,i)=>{const items=lines.map(l=>line(l.key,l.label+' · allocated visit value',allocate(l.amountCents,visits.length,i)));return {index:i,includedInInitialPayment:true,lines:items,serviceNotes:notes,totalCents:items.reduce((sum,l)=>sum+l.amountCents,0)}});
 if(lines.reduce((sum,l)=>sum+l.amountCents,0)!==r.monthlyCents)throw Error('Accepted renewal price mismatch');
 return {...original,version:'storefront-renewal-v1',initialLines:lines,initialTotalCents:r.monthlyCents,visitOrders,billing:{...original.billing,visitsIncluded:visits.length,addonCents:r.interiorMonthlyCents},recurring:{...r,firstPeriodStart:start,firstPeriodEnd:end,scopeNotes:notes}};
}
export function storefrontRenewalTargets(original:BookingSnapshot,firstVisits:ResidentialVisit[],start:string,periodEnd?:string){
 const s=original.selection as StorefrontSelection,r=original.recurring;if(!r||!firstVisits.length||start<r.firstPeriodEnd)throw Error('Renewal period mismatch');
 const end=periodEnd||addCalendarMonths(start,1);let dates:string[];
 if(s.scheduleIndex===2){const gap=Math.round((Date.parse(start+'T12:00:00Z')-Date.parse(firstVisits[0].date+'T12:00:00Z'))/86400000),offset=((7-gap%7)%7);dates=[];for(let d=shiftStorefrontDays(start,offset);d<end;d=shiftStorefrontDays(d,7))dates.push(d)}
 else dates=storefrontPeriodSlots(start,s.scheduleIndex).map(row=>row.min);
 return dates.map((date,i)=>({date,period:firstVisits[i%firstVisits.length].period,max:[shiftStorefrontDays(date,6),shiftStorefrontDays(end,-1)].sort()[0]}));
}
