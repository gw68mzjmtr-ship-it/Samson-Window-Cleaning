import {residentialMaintenance,sampleDateAvailable,isServiceClosureDay} from './residential-model';
export type ServicePeriod='morning'|'afternoon'|'';
export type ResidentialVisit={date:string;period:ServicePeriod};
export const servicePeriods=[{id:'morning',label:'Morning · 8–11 a.m.'},{id:'afternoon',label:'Afternoon · 1–4 p.m.'}] as const;
export const emptyVisit=():ResidentialVisit=>({date:'',period:''});
export function repeatMonthOffsets(id:string,billingMode='per-visit'){const schedule=residentialMaintenance.find(s=>s.id===id);if(!schedule)throw Error('Invalid maintenance schedule');return [0,...(schedule.months?Array.from({length:billingMode==='annual-prepay'?schedule.visits-1:schedule.visits},(_,i)=>schedule.months*(i+1)):[])];}
export function addCalendarMonths(date:string,months:number){
 const source=new Date(date+'T12:00:00Z');if(!Number.isFinite(source.getTime())||!Number.isInteger(months)||months<0)throw Error('Invalid calendar date');
 const target=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth()+months,1,12));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(source.getUTCDate(),last));return target.toISOString().slice(0,10);
}
export function sampleRepeatDateAvailable(date:string,initial:string,offset:number){
 if(!initial||offset<=0)return false;const target=addCalendarMonths(initial,offset);return date.slice(0,7)===target.slice(0,7)&&!isServiceClosureDay(date);
}
export function visitComplete(visit:ResidentialVisit){return !!visit.date&&servicePeriods.some(period=>period.id===visit.period);}
export function validateVisitSeries(id:string,visits:ResidentialVisit[],today:string,billingMode='per-visit'){
 const offsets=repeatMonthOffsets(id,billingMode);if(visits.length!==offsets.length||!visits.every(visitComplete)||!sampleDateAvailable(visits[0].date,today))return false;
 return visits.every((visit,i)=>i===0||sampleRepeatDateAvailable(visit.date,visits[0].date,offsets[i]));
}
