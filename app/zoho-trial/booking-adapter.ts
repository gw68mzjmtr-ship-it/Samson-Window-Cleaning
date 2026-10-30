import path from 'node:path';
import {BookingWorkflow,type BookingAdapter,type Booking} from './booking-workflow';
import {trialRead,trialAppointments,trialCreate,trialRecord,trialInvoiceApi,trialValidationApi,secretDir} from './server';
import {easternServiceWindow} from '../residential/residential-integration';
import {importedWindowBlocked} from '../residential/imported-capacity';
import {hostedRuntime,sharedBookings,readSquareState} from './runtime-store';
const resource='44386000000385209';
async function territory(){const result=await trialRecord('Work_Orders','44386000000385265');const id=result.data?.[0]?.Territory?.id;if(!id)throw Error('Organization not confirmed');return id as string}
export const bookingAdapter:BookingAdapter={
 async available(visits){
  if(!visits.length)return true;
  const [territoryId,appointments]=await Promise.all([territory(),trialAppointments()]);
  for(const visit of visits){
   if(importedWindowBlocked(appointments,visit.date,visit.period))return false;
   const w=easternServiceWindow(visit.date,visit.period),result=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:w,service_resource_filter:{type:'Agent',sr_ids:[resource]},territory:{id:territoryId},time_slot:{duration:180}});
   if(!(result.data||[]).some((r:{Service_Resources?:{id:string;Time_Slots?:{start_time:string;end_time:string}[]}})=>r.Service_Resources?.id===resource&&r.Service_Resources.Time_Slots?.some(s=>Date.parse(s.start_time)<=Date.parse(w.start)&&Date.parse(s.end_time)>=Date.parse(w.end))))return false;
  }
  return true;
 },
 async createInvoice(b){
  // This adapter remains private and fictional until production hosting and terms are configured.
  if(!b.customer.email.endsWith('@example.invalid'))throw Error('Fictional trial customer required');
  const c=b.customer,parts=c.name.split(' '),contact=(await trialInvoiceApi('contacts','POST',{contact_name:'SAMSON TEST — '+c.name,customer_sub_type:'individual',contact_type:'customer',billing_address:{address:c.street,city:c.city,state:c.state,zip:c.zip,country:'U.S.A'},shipping_address:{address:c.street,city:c.city,state:c.state,zip:c.zip,country:'U.S.A'},contact_persons:[{first_name:parts[0],last_name:parts.slice(1).join(' '),email:c.email,phone:c.phone,is_primary_contact:true}]})).contact;
  if(!contact?.contact_id)throw Error('Customer not confirmed');
  const invoice=(await trialInvoiceApi('invoices','POST',{customer_id:contact.contact_id,reference_number:'SAMSON-BOOK-'+b.id,allow_partial_payments:false,line_items:b.snapshot.initialLines.map(l=>({name:l.label,quantity:l.quantity,rate:l.unitPriceCents/100})),payment_options:{payment_gateways:hostedRuntime()?[]:[{gateway_name:'square'}]},notes:'PRIVATE FICTIONAL CHECKOUT TEST. No actual service. Booking reference '+b.id+'. Customer entered details once. Selected dates and itemized visit scope:\n'+b.visits.map((v,i)=>v.date+' '+v.period+' — USD '+(b.snapshot.visitOrders[i].totalCents/100).toFixed(2)+' — '+b.snapshot.visitOrders[i].lines.map(l=>l.label+' x '+l.quantity).concat(b.snapshot.visitOrders[i].serviceNotes||[]).join('; ')).join('\n')+(b.snapshot.selection.billingMode==='annual-prepay'?'\nOnly the included first-year visits and their selected add-ons are prepaid by this invoice. Any following-year visit is billed separately. No automatic renewal is authorized.':'\nOnly the initial visit is invoiced. Future visits are billed separately; no automatic card charging is authorized.')})).invoice;
  if(!invoice?.invoice_id)throw Error('Invoice not confirmed');
  const actual=(await trialInvoiceApi('invoices/'+invoice.invoice_id,'GET')).invoice;
  if(actual.customer_id!==contact.contact_id||actual.currency_code!=='USD'||Math.round(Number(actual.total)*100)!==b.snapshot.initialTotalCents||actual.line_items?.length!==b.snapshot.initialLines.length||!b.snapshot.initialLines.every((line,i)=>Number(actual.line_items[i].quantity)===line.quantity&&Math.round(Number(actual.line_items[i].rate)*100)===line.unitPriceCents)||!actual.invoice_url)throw Error('Invoice verification failed');
  const url=new URL(actual.invoice_url);if(url.protocol!=='https:'||!['invoice.zoho.com','zohoinvoicepay.com'].includes(url.hostname))throw Error('Payment destination not verified');
  // Native hosted payment refuses drafts. This changes status only; it sends no email.
  await trialInvoiceApi('invoices/'+actual.invoice_id+'/status/sent','POST');
  const payable=(await trialInvoiceApi('invoices/'+actual.invoice_id,'GET')).invoice;
  if(payable.status!=='sent'||Math.round(Number(payable.balance)*100)!==b.snapshot.initialTotalCents)throw Error('Payable invoice not confirmed');
  return {id:actual.invoice_id,number:actual.invoice_number,url:actual.invoice_url};
 },
 async readPayment(b){
  const invoice=(await trialInvoiceApi('invoices/'+b.invoice!.id,'GET')).invoice;
  const [contact,payments]=await Promise.all([trialInvoiceApi('contacts/'+invoice.customer_id,'GET'),trialInvoiceApi('invoices/'+b.invoice!.id+'/payments','GET')]);
  let eligible=payments.payments||[];
  if(b.paymentEnvironment==='sandbox'){
   const proof=await readSquareState<{environment:string;phase:string;bookingId:string;invoiceId:string;zoho?:{phase:string;paymentId?:string}}>(b.id);
   eligible=proof?.environment==='sandbox'&&proof.phase==='completed'&&proof.bookingId===b.id&&proof.invoiceId===invoice.invoice_id&&proof.zoho?.phase==='verified'?eligible.filter((p:{payment_id:string;payment_mode:string})=>p.payment_id===proof.zoho?.paymentId&&p.payment_mode==='Square Sandbox Test'):[];
  }else eligible=eligible.filter((p:{payment_mode:string})=>p.payment_mode!=='Square Sandbox Test');
  return {id:invoice.invoice_id,customerEmail:contact.contact.email||contact.contact.contact_persons?.find((p:{is_primary_contact:boolean})=>p.is_primary_contact)?.email||'',currency:invoice.currency_code,totalCents:Math.round(Number(invoice.total)*100),balanceCents:Math.round(Number(invoice.balance)*100),status:invoice.status,paymentIds:eligible.map((p:{payment_id:string})=>p.payment_id).filter(Boolean),receivedCents:eligible.reduce((sum:number,p:{amount:number})=>sum+Math.round(Number(p.amount)*100),0)};
 },
 async createAppointment(b,index){
  const territoryId=await territory(),visit=b.visits[index],w=easternServiceWindow(visit.date,visit.period);
  let contact;
  if(index===0){
   const parts=b.customer.name.split(' '),result=await trialCreate('Contacts',{data:[{First_Name:'SAMSON TEST '+parts[0],Last_Name:parts.slice(1).join(' ')||'Website Customer',Email:b.customer.email,Phone:b.customer.phone,Service_Address:{Address_Name:'SAMSON TEST — '+b.customer.name,Street_1:b.customer.street,City:b.customer.city,State:b.customer.state,Zip_Code:b.customer.zip,Country:'United States',Territory:territoryId},Billing_Address:'$SUBLOOKUP_Service_Address'}]});
   const id=result.data?.Contacts?.[0]?.id;if(!id)throw Error('Customer not confirmed');contact=(await trialRecord('Contacts',id)).data?.[0];
  }else{const initial=(await trialRecord('Work_Orders',b.appointments[0].orderId)).data?.[0];contact=(await trialRecord('Contacts',initial.Contact.id)).data?.[0]}
  if(!contact?.id||!contact.Service_Address?.id||!contact.Billing_Address?.id)throw Error('Service address not confirmed');
  let catalogue=(await trialRead('Service_And_Parts')).data||[];
  const lines=b.snapshot.visitOrders[index].lines;
  for(const line of lines){const name='SAMSON TEST — Calculator '+line.label;if(!catalogue.some((p:{Name:string})=>p.Name===name)){await trialValidationApi('Service_And_Parts','POST',{data:[{Name:name,Type:'Service',Unit:'Each',Unit_Price:line.unitPriceCents/100,Description:'Private checkout trial only.'}]});catalogue=(await trialRead('Service_And_Parts')).data||[]}}
  const result=await trialCreate('Work_Orders',{data:[{Summary:'SAMSON TEST — Booking '+b.id+' visit '+index,Description:(b.snapshot.selection.billingMode==='annual-prepay'&&index<b.snapshot.billing.visitsIncluded?'Included in prepaid year; matching invoice '+b.invoice!.number+'. Do not invoice this visit again.':index===0?'Initial payment verified against Zoho Invoice '+b.invoice!.number+'. Do not create a duplicate invoice.':'Future maintenance visit; not paid or automatically charged. Agreed scope is itemized below.')+'\n'+(b.snapshot.visitOrders[index].serviceNotes||[]).join('\n'),Type:'Service',Contact:contact.id,Email:contact.Email,Territory:territoryId,Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:lines.map((l,i)=>({Service:catalogue.find((p:{Name:string})=>p.Name==='SAMSON TEST — Calculator '+l.label)?.id,Quantity:l.quantity,List_Price:l.unitPriceCents/100,Sequence:i+1,Description:l.label}))}]});
  const orderId=result.data?.Work_Orders?.[0]?.id,lineIds=(result.data?.Service_Line_Items||[]).map((l:{id:string})=>l.id);
  if(!orderId||lineIds.length!==lines.length)throw Error('Order not confirmed');
  const verified=(await trialRecord('Work_Orders',orderId)).data?.[0];if(Math.round(Number(verified?.Grand_Total)*100)!==b.snapshot.visitOrders[index].totalCents)throw Error('Work order price mismatch');
  const appointment=await trialCreate('Service_Appointments',{data:[{Summary:'SAMSON TEST — Booking '+b.id+' visit '+index,Scheduled_Start_Date_Time:w.start,Scheduled_End_Date_Time:w.end,Territory:territoryId,$Service_Line_Items:lineIds,$Service_Resources:[resource],$allow_overlapping:false}]});
  const appointmentId=appointment.data?.[0]?.id;if(!appointmentId)throw Error('Appointment not confirmed');return {orderId,appointmentId};
 }
};
export function bookingWorkflow(){return new BookingWorkflow(path.join(secretDir,'website-bookings'),bookingAdapter,hostedRuntime()?sharedBookings():undefined)}
export function publicBooking(b:Booking){return {id:b.id,phase:b.phase,paymentEnvironment:b.paymentEnvironment,invoice:b.invoice,initialTotalCents:b.snapshot.initialTotalCents,visits:b.visits.map((v,i)=>({...v,totalCents:b.snapshot.visitOrders[i].totalCents})),appointments:b.appointments,error:b.error,notice:b.paymentEnvironment==='sandbox'?'FICTIONAL SANDBOX TEST — no real funds received. No email sent; no automatic recurring charges.':'Private test. No email sent. Future visits do not authorize automatic card charges.'}}

