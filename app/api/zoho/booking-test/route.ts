import {open,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {checkLocalRequest,connectionStatus,secretDir,trialRead,trialCreate,ZohoQueryError} from '../../../zoho-trial/server';
export const runtime='nodejs';
const resourceId='44386000000385209',baselineOrderId='44386000000385265';
const start='2026-10-30T08:00:00-04:00',end='2026-10-30T11:00:00-04:00';
const summary='SAMSON TEST — Website single-entry booking — no service or payment';
type Ledger={phase:string;updatedAt:string;contactId?:string;orderId?:string;appointmentId?:string;total?:number;errorCode?:string};
const ledgerPath=path.join(secretDir,'zoho-booking-test.json'),lockPath=ledgerPath+'.lock';
async function save(state:Ledger){state.updatedAt=new Date().toISOString();const temp=ledgerPath+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(state),{mode:0o600});await rename(temp,ledgerPath)}
async function existing():Promise<Ledger|null>{try{return JSON.parse(await readFile(ledgerPath,'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}}
function publicState(state:Ledger){return {phase:state.phase,total:state.total,contactId:state.contactId,orderId:state.orderId,appointmentId:state.appointmentId,start,end,notice:'Fictional trial booking only. No invoice, payment, dispatch or customer message was requested.'}}
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Local preview only'},{status:403})}
 if(!(await connectionStatus()).bookingApproved)return Response.json({error:'Approve the additional Zoho booking permissions first.'},{status:403});
 let input;try{input=await req.json()}catch{return Response.json({error:'Test confirmation required.'},{status:400})}
 if(input.confirm!=='CREATE_ONE_FICTIONAL_TEST_BOOKING')return Response.json({error:'Test confirmation required.'},{status:400});
 let lock;
 try{lock=await open(lockPath,'wx',0o600)}catch{return Response.json({error:'A test is running or needs review. No second test was started.'},{status:409})}
 let state:Ledger|null=null;
 try{
  const previous=await existing();
  if(previous)return Response.json(previous.phase==='completed'?publicState(previous):{...publicState(previous),error:'A prior test stopped partway through. Review its existing records before retrying.'},{status:previous.phase==='completed'?200:409,headers:{'Cache-Control':'no-store'}});
  if(Date.parse(start)<=Date.now())return Response.json({error:'The fixed test date has passed. Choose a new controlled test before continuing.'},{status:409});
  const [orders,services,users]=await Promise.all([trialRead('Work_Orders'),trialRead('Service_And_Parts'),trialRead('users')]);
  const baseline=(orders.data||[]).find((r:{id:string})=>r.id===baselineOrderId);
  if(!baseline?.Territory?.id||!(users.users||[]).some((r:{Service_Resources?:{id:string}})=>r.Service_Resources?.id===resourceId))throw Error('WRONG_ORGANIZATION');
  // Recover conservatively: never create again when the unique test already exists.
  if((orders.data||[]).some((r:{Summary:string})=>r.Summary===summary))return Response.json({error:'This trial booking already exists in Zoho. Review it before any retry.'},{status:409});
  const exterior=(services.data||[]).find((r:{id:string})=>r.id==='44386000000385250');
  const interior=(services.data||[]).find((r:{id:string})=>r.id==='44386000000385255');
  if(Number(exterior?.Unit_Price)!==599||Number(interior?.Unit_Price)!==10)throw Error('PRICE_CHANGED');
  const available=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:{start,end},service_resource_filter:{type:'Agent',sr_ids:[resourceId]},territory:{id:baseline.Territory.id},time_slot:{duration:180}});
  const free=(available.data||[]).some((r:{Service_Resources?:{id:string;Time_Slots?:{start_time:string;end_time:string}[]}})=>r.Service_Resources?.id===resourceId&&r.Service_Resources.Time_Slots?.some(s=>Date.parse(s.start_time)<=Date.parse(start)&&Date.parse(s.end_time)>=Date.parse(end)));
  if(!free)return Response.json({error:'The test window is no longer available. No customer or job was created.'},{status:409});
  state={phase:'contact_pending',updatedAt:new Date().toISOString()};await save(state);
  const contactResult=await trialCreate('Contacts',{data:[{First_Name:'SAMSON TEST',Last_Name:'Website Booking',Email:'samson-website-trial@example.invalid',Service_Address:{Address_Name:'SAMSON TEST — not a real service address',Street_1:'SAMSON TEST — no physical service address',City:'Raleigh',State:'North Carolina',Country:'United States',Territory:baseline.Territory.id},Billing_Address:'$SUBLOOKUP_Service_Address'}]});
  state.contactId=contactResult.data?.Contacts?.[0]?.id;
  if(!state.contactId)throw Error('CONTACT_NOT_CONFIRMED');
  state.phase='contact_created';await save(state);
  const contacts=await trialRead('Contacts');
  const contact=(contacts.data||[]).find((r:{id:string})=>r.id===state!.contactId);
  if(!contact?.Service_Address?.id||!contact?.Billing_Address?.id)throw Error('ADDRESS_NOT_CONFIRMED');
  state.phase='order_pending';await save(state);
  const orderResult=await trialCreate('Work_Orders',{data:[{Summary:summary,Type:'Service',Contact:state.contactId,Territory:baseline.Territory.id,Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:[{Service:exterior.id,Quantity:1,Sequence:1},{Service:interior.id,Quantity:2,Sequence:2}]}]});
  state.orderId=orderResult.data?.Work_Orders?.[0]?.id;
  const lineIds=(orderResult.data?.Service_Line_Items||[]).map((r:{id:string})=>r.id);
  if(!state.orderId||lineIds.length!==2)throw Error('ORDER_NOT_CONFIRMED');
  state.phase='order_created';await save(state);
  const updatedOrders=await trialRead('Work_Orders');
  const created=(updatedOrders.data||[]).find((r:{id:string})=>r.id===state!.orderId);
  if(Number(created?.Grand_Total)!==619)throw Error('TOTAL_MISMATCH');
  state.total=Number(created.Grand_Total);state.phase='appointment_pending';await save(state);
  const appointment=await trialCreate('Service_Appointments',{data:[{Summary:summary,Scheduled_Start_Date_Time:start,Scheduled_End_Date_Time:end,Territory:baseline.Territory.id,$Service_Line_Items:lineIds,$Service_Resources:[resourceId],$allow_overlapping:false}]});
  state.appointmentId=appointment.data?.[0]?.id;
  if(!state.appointmentId)throw Error('APPOINTMENT_NOT_CONFIRMED');
  state.phase='completed';await save(state);
  return Response.json(publicState(state),{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(state){state.errorCode=error instanceof ZohoQueryError?error.code:error instanceof Error?error.message:'TEST_FAILED';await save(state)}
  return Response.json({error:state?'The test stopped. Existing test records were preserved for review; do not submit again.':'Preflight failed. No new test records were created.',phase:state?.phase},{status:502,headers:{'Cache-Control':'no-store'}});
 }finally{await lock.close();await unlink(lockPath)}
}

