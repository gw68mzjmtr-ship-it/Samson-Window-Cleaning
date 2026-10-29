import {readFile,writeFile,open,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {checkLocalRequest,connectionStatus,secretDir,trialRead,trialCreate,trialValidationApi} from '../../../zoho-trial/server';
import {residentialOrderSnapshot} from '../../../residential/residential-integration';
import {residentialPlanForSize} from '../../../residential/residential-model';
export const runtime='nodejs';
const plans=new Set(['44386000000385358','44386000000385431','44386000000385443','44386000000386021']);
async function assertOrganization(){const result=await trialRead('Work_Orders');if(!(result.data||[]).some((r:{id:string})=>r.id==='44386000000385265'))throw Error('Wrong trial organization')}
type State={phase:string;orderId?:string;totalCents?:number;updatedAt?:string};
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Local preview only'},{status:403})}
 if(!(await connectionStatus()).validationApproved)return Response.json({error:'The additional maintenance and cancellation permissions are required first.'},{status:403});
 try{
 const input=await req.json();await assertOrganization();
 if(input.operation==='status'||input.operation==='pause-fixture-plans'){
  const result=await trialValidationApi('Scheduled_Maintenances','GET');
  let fixtures=(result.data||[]).filter((r:{id:string;Name:string})=>plans.has(r.id)&&r.Name.startsWith('SAMSON TEST'));
  if(input.operation==='pause-fixture-plans'){
   if(input.confirm!=='FICTIONAL_RECORDS_ONLY')return Response.json({error:'Explicit test confirmation required.'},{status:400});
   for(const row of fixtures)if(row.Status==='Active')await trialValidationApi('Scheduled_Maintenances/'+row.id+'/disable','PUT');
   const checked=await trialValidationApi('Scheduled_Maintenances','GET');
   fixtures=(checked.data||[]).filter((r:{id:string;Name:string})=>plans.has(r.id)&&r.Name.startsWith('SAMSON TEST'));
  }
  const appointments=await trialRead('Service_Appointments');
  return Response.json({plans:fixtures.map((r:{id:string;Name:string;Status:string})=>({id:r.id,name:r.Name,status:r.Status})),appointments:(appointments.data||[]).filter((r:{Summary?:string})=>r.Summary?.startsWith('SAMSON TEST')).map((r:{Name:string;Status:string})=>({name:r.Name,status:r.Status})),notice:'Only the named fictional trial records are included. No invoice, refund or charge was requested.'},{headers:{'Cache-Control':'no-store'}});
 }
 if(input.operation==='create-and-pause-maintenance-test'){
  if(input.confirm!=='FICTIONAL_RECORDS_ONLY')return Response.json({error:'Explicit test confirmation required.'},{status:400});
  const lockPath=path.join(secretDir,'maintenance-control-test.lock');let lock;
  try{lock=await open(lockPath,'wx',0o600)}catch{return Response.json({error:'This maintenance test is already running or needs review.'},{status:409})}
  try{
   const name='SAMSON TEST — Website maintenance pause validation';
   const prior=await trialValidationApi('Scheduled_Maintenances','GET');
   let record=(prior.data||[]).find((r:{Name:string})=>r.Name===name);
   if(!record){
    if(new Date()>=new Date('2026-11-01T00:00:00-04:00'))throw Error('This fixed-date fixture has expired');
    const contacts=await trialRead('Contacts'),orders=await trialRead('Work_Orders');
    const contact=(contacts.data||[]).find((r:{id:string;Email:string})=>r.id==='44386000000387005'&&r.Email==='samson-website-trial@example.invalid');
    const baseline=(orders.data||[]).find((r:{id:string})=>r.id==='44386000000385265');
    if(!contact?.Service_Address?.id||!contact?.Billing_Address?.id||!baseline?.Territory?.id)throw Error('Fictional fixture not verified');
    const created=await trialValidationApi('Scheduled_Maintenances','POST',{data:[{
     Name:name,Description:'Fictional Professional test only. Immediately paused by the website. No dispatch, invoice, payment or message.',
     Schedule:{Frequency:'Yearly',Interval:0.25,By_Dates:'12',By_Month:11},Batch:{Batch_Type:'SAME_DAY'},Start_Date:'2026-11-01',Ends:{End_Type:'After',Ends_After:1,Ends_After_By:'Batch'},
     $work_order_template:{Summary:name,Type:'Service',Contact:{id:contact.id},Email:contact.Email,Territory:{id:baseline.Territory.id},Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:[{Service:{id:'44386000000385250'},Quantity:1,List_Price:539.10,Amount:539.10,Line_Item_Amount:539.10,Sequence:1,Description:'Quarterly test exterior $599 less 10%.',Status:'New'}]},
     $appointment_template:{Summary:name,Contact:{id:contact.id},Email:contact.Email,Scheduled_Start_Date_Time:{relativeDateType:'SAME_DAY',relativeDateTime:'08:00 AM'},Scheduled_End_Date_Time:{relativeDateType:'SAME_DAY',relativeDateTime:'11:00 AM'},Status:'Scheduled',$Service_Resources:['44386000000385209'],Service_Line_Items:[]}
    }]});
    const id=created.data?.Scheduled_Maintenances?.[0]?.id;if(!id)throw Error('Maintenance creation not confirmed');
    record={id,Status:'Active',Name:name};
   }
   if(!/^\d+$/.test(record.id))throw Error('Invalid test ID');
   if(record.Status!=='Inactive')await trialValidationApi('Scheduled_Maintenances/'+record.id+'/disable','PUT');
   const checked=await trialValidationApi('Scheduled_Maintenances','GET');
   const verified=(checked.data||[]).find((r:{id:string})=>r.id===record.id);
   if(verified?.Status!=='Inactive')throw Error('Pause not confirmed');
   return Response.json({name,id:record.id,status:'Inactive',notice:'Website-created fictional maintenance plan paused. No appointment, invoice or charge requested.'},{headers:{'Cache-Control':'no-store'}});
  }finally{await lock.close();await unlink(lockPath)}
 }
 if(input.operation==='cancel-original-occupancy-test'){
  if(input.confirm!=='FICTIONAL_RECORDS_ONLY')return Response.json({error:'Explicit test confirmation required.'},{status:400});
  const result=await trialRead('Service_Appointments');
  const row=(result.data||[]).find((r:{Name:string;Summary?:string})=>r.Name==='AP-1'&&r.Summary?.startsWith('SAMSON TEST'));
  if(!row||!/^\d+$/.test(row.id))throw Error('Test appointment not verified');
  if(row.Status==='Cancelled')return Response.json({name:row.Name,status:'Cancelled',changed:false});
  const options=await trialValidationApi('Service_Appointments/'+row.id+'/actions/blueprint/transitions','GET');
  const cancel=(options.transitions||[]).find((r:{name:string;enabled:boolean})=>r.name==='Cancel'&&r.enabled);
  if(!cancel?.id)throw Error('Cancellation unavailable');
  await trialValidationApi('Service_Appointments/'+row.id+'/actions/blueprint','PUT',{blueprint:[{transition_id:cancel.id,data:{Notes:'SAMSON TEST ONLY — website cancellation round-trip validation. No real service, fee, invoice, refund or customer notice.'}}]});
  const updated=await trialRead('Service_Appointments');
  const verified=(updated.data||[]).find((r:{id:string})=>r.id===row.id);
  if(verified?.Status!=='Cancelled')throw Error('Cancellation result not verified');
  return Response.json({name:row.Name,status:'Cancelled',changed:true,notice:'Test appointment cancelled. No charge or refund requested.'},{headers:{'Cache-Control':'no-store'}});
 }
 if(input.operation!=='create-calculator-price-test'||input.confirm!=='FICTIONAL_RECORDS_ONLY')return Response.json({error:'Unknown test operation.'},{status:400});
 const snapshot=residentialOrderSnapshot(input.selection,true);
 const hash=createHash('sha256').update(JSON.stringify(snapshot.selection)).digest('hex').slice(0,20);
 const ledger=path.join(secretDir,'calculator-price-'+hash+'.json'),lockPath=path.join(secretDir,'calculator-price.lock');
 let lock;try{lock=await open(lockPath,'wx',0o600)}catch{return Response.json({error:'A test is running or needs review. No second test was started.'},{status:409})}
 let state:State={phase:'preflight'};
 async function save(){state.updatedAt=new Date().toISOString();const temporary=ledger+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temporary,JSON.stringify(state),{mode:0o600});await rename(temporary,ledger)}
 try{
  try{const prior=JSON.parse(await readFile(ledger,'utf8'));return Response.json(prior.phase==='completed'?prior:{error:'A previous pricing transfer stopped. Review the existing records before retrying.',phase:prior.phase},{status:prior.phase==='completed'?200:409})}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  const [contacts,orders,products]=await Promise.all([trialRead('Contacts'),trialRead('Work_Orders'),trialRead('Service_And_Parts')]);
  const contact=(contacts.data||[]).find((r:{id:string;Email:string})=>r.id==='44386000000387005'&&r.Email==='samson-website-trial@example.invalid');
  const baseline=(orders.data||[]).find((r:{id:string})=>r.id==='44386000000385265');
  if(!contact?.Service_Address?.id||!contact?.Billing_Address?.id||!baseline?.Territory?.id)throw Error('Fictional contact not verified');
  const catalogue=[...(products.data||[])];state.phase='catalogue_pending';await save();
  for(const line of snapshot.initialLines){
   const name='SAMSON TEST — Calculator '+line.label;
   if(!catalogue.some((p:{Name:string})=>p.Name===name)){
    await trialValidationApi('Service_And_Parts','POST',{data:[{Name:name,Type:'Service',Unit:'Each',Unit_Price:line.key==='exterior'?residentialPlanForSize(snapshot.selection.homeSize)!.price:line.unitPriceCents/100,Description:'Fictional Professional trial only. The work order supplies the exact calculator quantity and line price. No public service, invoice or charge.'}]});
    const refreshed=await trialRead('Service_And_Parts');catalogue.splice(0,catalogue.length,...(refreshed.data||[]));
   }
  }
  const lines=snapshot.initialLines.map((line,i)=>{const service=catalogue.find((p:{Name:string})=>p.Name==='SAMSON TEST — Calculator '+line.label);if(!service?.id)throw Error('Catalogue item not confirmed');return {Service:service.id,Quantity:line.quantity,List_Price:line.unitPriceCents/100,Description:line.label+'; '+line.quantity+' x $'+(line.unitPriceCents/100).toFixed(2)+'. Fictional trial only.',Sequence:i+1}});
  state.phase='work_order_pending';await save();
  const created=await trialCreate('Work_Orders',{data:[{Summary:'SAMSON TEST — Calculator transfer '+hash+' — no service or payment',Type:'Service',Contact:contact.id,Email:contact.Email,Territory:baseline.Territory.id,Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:lines}]});
  state.orderId=created.data?.Work_Orders?.[0]?.id;if(!state.orderId)throw Error('Work order not confirmed');
  state.phase='verify_total';await save();
  const updated=await trialRead('Work_Orders'),order=(updated.data||[]).find((r:{id:string})=>r.id===state.orderId);
  state.totalCents=Math.round(Number(order?.Grand_Total)*100);
  if(state.totalCents!==snapshot.initialTotalCents)throw Error('Zoho total did not match calculator');
  state.phase='completed';await save();
  return Response.json({...state,notice:'Fictional pricing work order only. No appointment, invoice, payment or message was requested.'},{headers:{'Cache-Control':'no-store'}});
 }catch{await save();return Response.json({error:'The pricing transfer stopped. Preserve existing test records and review before retrying.',phase:state.phase},{status:502})}
 finally{await lock.close();await unlink(lockPath)}
 }catch{return Response.json({error:'The controlled test could not complete. No financial action was requested.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}




