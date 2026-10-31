import {guardCheckout,checkoutJson,privateHeaders} from '../../../checkout/security';
import {limitCheckout} from '../../../checkout/engine';
import {liveAvailability} from '../../../checkout/zoho';
import {sharedBookings} from '../../../zoho-trial/runtime-store';
import {isServiceClosureDay} from '../../../residential/residential-model';
import {withCalendarRead} from '../../../checkout/calendar-read-queue';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await guardCheckout(req,true);await limitCheckout(req,'availability');const {date}=await checkoutJson(req);if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||Date.parse(date+'T12:00:00Z')<Date.now()-86400000||Date.parse(date+'T12:00:00Z')>Date.now()+400*86400000)throw Error();
 return await withCalendarRead(async()=>{
 const holds=await sharedBookings().records(),closed=isServiceClosureDay(date),windows=[];
 for(const period of ['morning','afternoon'] as const){const held=holds.some(booking=>!booking.schedulePending&&!['confirmed','expired'].includes(booking.phase)&&booking.visits.some(visit=>visit.date===date&&visit.period===period));windows.push({period,available:!closed&&!held&&await liveAvailability([{date,period}])})}
 return Response.json({date,windows,checkedAt:new Date().toISOString(),reserved:false},{headers:privateHeaders});
 });
 }catch{return Response.json({error:'These dates could not be checked. Please refresh before choosing a service window.'},{status:503,headers:privateHeaders})}
}
