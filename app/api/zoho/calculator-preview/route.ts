import {checkLocalRequest,trialRead,trialAppointments} from '../../../zoho-trial/server';
import {residentialOrderSnapshot,easternServiceWindow} from '../../../residential/residential-integration';
import {validateVisitSeries} from '../../../residential/residential-scheduling';
import {importedWindowBlocked} from '../../../residential/imported-capacity';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Local preview only'},{status:403})}
 try{
 const input=await req.json(),snapshot=residentialOrderSnapshot(input.selection,true);
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const today=parts.find(p=>p.type==='year')!.value+'-'+parts.find(p=>p.type==='month')!.value+'-'+parts.find(p=>p.type==='day')!.value;
 if(!Array.isArray(input.visits)||!validateVisitSeries(snapshot.maintenance.id,input.visits,today,snapshot.selection.billingMode))throw Error('Select every required weekday and service window.');
 const [orders,appointments]=await Promise.all([trialRead('Work_Orders'),trialAppointments()]);
 const baseline=(orders.data||[]).find((r:{id:string})=>r.id==='44386000000385265');
 if(!baseline?.Territory?.id)throw Error('Trial organization not verified.');
 const checks=await Promise.all(input.visits.map(async(visit:{date:string;period:string})=>{
 const window=easternServiceWindow(visit.date,visit.period);
 const result=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:window,service_resource_filter:{type:'Agent',sr_ids:['44386000000385209']},territory:{id:baseline.Territory.id},time_slot:{duration:180}});
 const available=!importedWindowBlocked(appointments,visit.date,visit.period)&&(result.data||[]).some((r:{Service_Resources?:{id:string;Time_Slots?:{start_time:string;end_time:string}[]}})=>r.Service_Resources?.id==='44386000000385209'&&r.Service_Resources.Time_Slots?.some(s=>Date.parse(s.start_time)<=Date.parse(window.start)&&Date.parse(s.end_time)>=Date.parse(window.end)));
 return available;
 }));
 if(!checks.every(Boolean))return Response.json({error:'At least one selected window is no longer available. Nothing was reserved or charged.'},{status:409});
 return Response.json({initialTotalCents:snapshot.initialTotalCents,repeatTotalCents:snapshot.repeatTotalCents,visitTotalCents:snapshot.visitOrders.map(visit=>visit.totalCents),visitCount:checks.length,checkedAt:new Date().toISOString(),created:false,paymentEnabled:false},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The services, dates or live availability could not be verified. No records or payments were created.'},{status:400,headers:{'Cache-Control':'no-store'}})}
}


