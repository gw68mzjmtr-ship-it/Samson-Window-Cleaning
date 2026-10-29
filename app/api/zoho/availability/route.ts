import {checkLocalRequest,trialRead,trialAppointments} from '../../../zoho-trial/server';
import {easternServiceWindow} from '../../../residential/residential-integration';
import {importedWindowBlocked} from '../../../residential/imported-capacity';
import {bookingWorkflow} from '../../../zoho-trial/booking-adapter';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Local preview only'},{status:403})}
 try{
 const input=await req.json(),date=input.date;
 if(typeof date!=='string')throw Error('Invalid date');
 const requested=Date.parse(date+'T12:00:00Z'),today=Date.now();
 if(requested<today-86400000||requested>today+400*86400000)throw Error('Choose a date within the trial horizon.');
 const morning=easternServiceWindow(date,'morning'),afternoon=easternServiceWindow(date,'afternoon');
 const [orders,appointments,holds]=await Promise.all([trialRead('Work_Orders'),trialAppointments(),bookingWorkflow().records()]);
 const baseline=(orders.data||[]).find((r:{id:string})=>r.id==='44386000000385265');
 if(!baseline?.Territory?.id)throw Error('Trial organization not verified.');
 const windows=await Promise.all([{period:'morning',...morning},{period:'afternoon',...afternoon}].map(async w=>{
 const result=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:{start:w.start,end:w.end},service_resource_filter:{type:'Agent',sr_ids:['44386000000385209']},territory:{id:baseline.Territory.id},time_slot:{duration:180}});
 const available=!holds.some(b=>b.phase!=='confirmed'&&b.visits.some(v=>v.date===date&&v.period===w.period))&&!importedWindowBlocked(appointments,date,w.period)&&(result.data||[]).some((r:{Service_Resources?:{id:string;Time_Slots?:{start_time:string;end_time:string}[]}})=>r.Service_Resources?.id==='44386000000385209'&&r.Service_Resources.Time_Slots?.some(s=>Date.parse(s.start_time)<=Date.parse(w.start)&&Date.parse(s.end_time)>=Date.parse(w.end)));
 return {...w,available};
 }));
 return Response.json({date,windows,checkedAt:new Date().toISOString(),reserved:false},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Availability could not be verified. Do not offer or confirm this date.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}

