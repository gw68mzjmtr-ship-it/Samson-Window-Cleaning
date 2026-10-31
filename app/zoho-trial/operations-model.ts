import {visitCovered} from '../checkout/order-snapshot';
import {createHash} from 'node:crypto';
import type {Booking} from './booking-workflow';

export type Appointment={id:string;Summary?:string;Status?:string;Scheduled_Start_Date_Time?:string;Scheduled_End_Date_Time?:string;Service_Resources?:unknown[]};
export type Attention={key:string;title:string;detail:string;bookingId?:string;appointmentId?:string};
export type PreparedMessage={key:string;kind:'confirmation'|'reminder';bookingId:string;visitIndex:number;subject:string;body:string;delivery:'preview_only';scheduledFor:string};
const active=new Set(['Scheduled','Dispatched','In Progress']);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,24);
export const arrivalWindow=(period:string)=>period==='morning'?'8–11 a.m. Eastern':'1–4 p.m. Eastern';
const dateLabel=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
function localDate(stamp:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp))}
export function operationsSnapshot(bookings:Booking[],appointments:Appointment[],now:string){
 const attention:Attention[]=[],messages:PreparedMessage[]=[];
 const byId=new Map(appointments.map(a=>[a.id,a]));
 for(const b of bookings){
  const issue=(code:string,title:string,detail:string,appointmentId?:string)=>attention.push({key:hash(b.id+code+(appointmentId||'')),title,detail,bookingId:b.id,appointmentId});
  if(b.phase==='review_required'){issue('review','Booking needs your decision',b.error||'Check the invoice and appointments before retrying.');continue}
  if(b.phase==='invoice_pending'||b.phase==='sync_pending'){issue('interrupted','Check an unfinished update','An invoice or appointment update may already exist in Zoho. Inspect it before retrying.');continue}
  if(b.phase==='awaiting_payment'&&Date.parse(now)-Date.parse(b.createdAt)>3600000)issue('unpaid','Unpaid checkout is holding dates','Do not release a payable invoice’s dates until its payment link is safely closed and the invoice is reviewed.');
  if(b.phase!=='confirmed')continue;
  for(let index=0;index<b.visits.length;index++){
   const visit=b.visits[index],saved=b.appointments.find(a=>a.index===index),actual=saved&&byId.get(saved.appointmentId);
   if(!actual){issue('missing-'+index,'Appointment missing from Zoho','The website booking still references a removed appointment. No replacement was created automatically.',saved?.appointmentId);continue}
   if(!active.has(actual.Status||''))continue;
   const start=actual.Scheduled_Start_Date_Time,end=actual.Scheduled_End_Date_Time;
   if(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))){issue('invalid-'+index,'Appointment time needs checking','Zoho did not return a valid service window.',actual.id);continue}
   if(Date.parse(end)<=Date.parse(now))continue;
   const expectedHour=visit.period==='morning'?'08':'13';
   const actualHour=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date(start));
   const expectedEnd=visit.period==='morning'?'11':'16';
   const actualEndHour=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date(end));
   if(localDate(start)!==visit.date||actualHour!==expectedHour||actualEndHour!==expectedEnd||Date.parse(end)-Date.parse(start)!==10800000){issue('moved-'+index,'Zoho schedule changed','The appointment no longer matches the saved customer window. Confirm the change with the customer; older reminders are suppressed.',actual.id);continue}
   const reference=b.invoice?.number||'your booking';
   const prepaid=b.snapshot.selection.billingMode==='annual-prepay';
   const paid=visitCovered(b.snapshot,index);
   const payment=b.paymentEnvironment==='sandbox'?'This is a fictional sandbox demonstration. No real payment or service.':paid?'Payment for this cleaning has been verified.':'This is a scheduled maintenance visit; no automatic card charge is authorized.';
   const scope=b.snapshot.visitOrders[index].lines.map(l=>l.label+' × '+l.quantity).concat(b.snapshot.visitOrders[index].serviceNotes||[]).join('; ');
   const body=`Your Samson window cleaning is scheduled for ${dateLabel(visit.date)}, ${arrivalWindow(visit.period)}.\n\n${payment}\nInvoice reference: ${reference}.\nSelected services: ${scope}.\n\nPlease provide safe access and secure pets. Remove any exterior screens you will handle yourself. Samson handles only the screens selected for paid removal and replacement. You can discuss changes to selected add-ons on service day; any price change needs your approval before work.\n\nQuestions or a change request? Contact zach@samsonwindowcleaning.com. Schedule changes require confirmation; no new date is promised by this message.`;
   // Preview only. Native Zoho reminder rules handle delivery; there is no second sender here.
   const key=hash(b.id+'|'+index+'|'+start+'|'+end+'|reminder-v1');
   messages.push({key,kind:'reminder',bookingId:b.id,visitIndex:index,subject:'Your Samson cleaning reminder',body,delivery:'preview_only',scheduledFor:new Date(Date.parse(start)-86400000).toISOString()});
  }
 }
 const scheduled=appointments.filter(a=>active.has(a.Status||'')&&a.Scheduled_Start_Date_Time&&a.Scheduled_End_Date_Time&&Date.parse(a.Scheduled_End_Date_Time)>Date.parse(now));
 for(let i=0;i<scheduled.length;i++)for(let j=i+1;j<scheduled.length;j++){
  const a=scheduled[i],b=scheduled[j];
  if(Date.parse(a.Scheduled_Start_Date_Time!)<Date.parse(b.Scheduled_End_Date_Time!)&&Date.parse(b.Scheduled_Start_Date_Time!)<Date.parse(a.Scheduled_End_Date_Time!))attention.push({key:hash([a.id,b.id].sort().join('|')),title:'Overlapping appointments need a check',detail:'Check crew assignments in Zoho before accepting another job in this window.',appointmentId:a.id});
 }
 return {checkedAt:now,attention,messages,scheduledCount:scheduled.length,delivery:'preview_only' as const};
}

export function routineAnswer(message:string,booking?:{phase:string;date:string;period:string}){
 const text=message.trim().toLowerCase();
 // Incoming text is untrusted content. It cannot authorize changes, charges or disclosures.
 if(!text||text.length>2000)return {mode:'owner' as const,reason:'Message needs review',reply:'Please contact Samson so we can help with your request.'};
 if(/cancel|refund|charge|reschedul|change.*date|discount|damage|broken|complaint|late|unsafe|emergency|password|token|ignore|instructions|other customer|credit card|bank/.test(text))return {mode:'owner' as const,reason:'Changes, money, safety or account access require review',reply:'Thanks for letting us know. Your request needs a review by Samson. No schedule or payment change has been made.'};
 if(/what time|when.*(coming|arriv|cleaning)|appointment time/.test(text))return booking?.phase==='confirmed'?{mode:'routine' as const,reason:'Confirmed booking facts',reply:`Your cleaning is scheduled for ${dateLabel(booking.date)}, ${arrivalWindow(booking.period)}. We will contact you if timing changes.`}:{mode:'owner' as const,reason:'No verified appointment',reply:'Your appointment is not confirmed in this view. Samson will check the schedule before confirming a date.'};
 if(/screens?/.test(text))return {mode:'routine' as const,reason:'Approved screen policy',reply:'For exterior cleaning, you can remove the screens yourself. Optional Samson removal and replacement is $10 per selected screen, per selected visit. Screen washing is not included. We agree on any changes before work begins.'};
 if(/pets?|prepare|access/.test(text))return {mode:'routine' as const,reason:'Service preparation',reply:'Please provide safe access to the selected windows and secure pets. Remove exterior screens you are handling yourself. Any additional scope or access cost is confirmed with you before work begins.'};
 return {mode:'owner' as const,reason:'No approved routine answer',reply:'Thanks for your message. Samson will review your question and respond.'};
}
