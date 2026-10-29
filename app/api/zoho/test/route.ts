import {checkLocalRequest, trialRead} from '../../../zoho-trial/server';
export const runtime = 'nodejs';
const resourceId = '44386000000385209';
type Slot = {start_time:string;end_time:string};
type Availability = {data?:{Service_Resources?:{id?:string;Time_Slots?:Slot[]}}[]};
export async function POST(req:Request) {
  try {await checkLocalRequest(req,true)} catch {return Response.json({error:'Local preview only'},{status:403})}
  try {
    const [services,orders,appointments,users]=await Promise.all([trialRead('Service_And_Parts'),trialRead('Work_Orders'),trialRead('Service_Appointments'),trialRead('users')]);
    const testServices=(services.data||[]).filter((r:{Name?:string})=>r.Name?.startsWith('SAMSON TEST')).map((r:{Name:string;Unit_Price:number})=>({name:r.Name,price:r.Unit_Price}));
    const order=(orders.data||[]).find((r:{id:string})=>r.id==='44386000000385265');
    const resource=(users.users||[]).find((r:{Service_Resources?:{id:string}})=>r.Service_Resources?.id===resourceId);
    if(!resource||!order?.Territory?.id)throw Error('WRONG_ORGANIZATION');
    const testAppointments=(appointments.data||[]).filter((r:{Summary?:string})=>r.Summary?.startsWith('SAMSON TEST')).map((r:{Name:string;Scheduled_Start_Date_Time:string;Scheduled_End_Date_Time:string;Status:string})=>({name:r.Name,start:r.Scheduled_Start_Date_Time,end:r.Scheduled_End_Date_Time,status:r.Status}));
    // Query each approved window separately; a full-day search can align slots differently.
    const windows=await Promise.all([
      {label:'Thursday, October 29 · Morning',start:'2026-10-29T08:00:00-04:00',end:'2026-10-29T11:00:00-04:00'},
      {label:'Thursday, October 29 · Afternoon',start:'2026-10-29T13:00:00-04:00',end:'2026-10-29T16:00:00-04:00'},
      {label:'Friday, October 30 · Morning',start:'2026-10-30T08:00:00-04:00',end:'2026-10-30T11:00:00-04:00'},
      {label:'Friday, October 30 · Afternoon',start:'2026-10-30T13:00:00-04:00',end:'2026-10-30T16:00:00-04:00'}
    ].map(async window=>{
      const result:Availability=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:{start:window.start,end:window.end},service_resource_filter:{type:'Agent',sr_ids:[resourceId]},territory:{id:order.Territory.id},time_slot:{duration:180}});
      const slots=(result.data||[]).flatMap(row=>row.Service_Resources?.id===resourceId?row.Service_Resources.Time_Slots||[]:[]);
      return {...window,available:slots.some(slot=>Date.parse(slot.start_time)<=Date.parse(window.start)&&Date.parse(slot.end_time)>=Date.parse(window.end))};
    }));
    return Response.json({checkedAt:new Date().toISOString(),readOnly:true,services:testServices,order:{reference:order.Name,total:order.Grand_Total},appointments:testAppointments,windows,notice:'Live availability check only. Nothing is reserved. Payment, recurring billing, cancellation synchronization and concurrent booking protection remain untested.'},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'The Zoho read test did not complete. No records were changed; availability is not confirmed.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}

