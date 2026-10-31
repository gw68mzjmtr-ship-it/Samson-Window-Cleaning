import {accessToken,paymentRecordAccessApproved,trialRecord,trialRead,trialCreate,trialAppointments} from '../zoho-trial/server';
import {easternServiceWindow} from '../residential/residential-integration';
import {importedWindowBlocked} from '../residential/imported-capacity';
import {visitCovered} from './order-snapshot';
import type {Booking} from '../zoho-trial/booking-workflow';
import type {LivePaymentState} from './payment-service';
export async function invoiceApi(endpoint:string,method:'GET'|'POST'='GET',body?:object){
 const allowed=method==='GET'&&/^(?:contacts\?email=[^&]+&per_page=200|contacts\/[0-9]+|invoices\/[0-9]+(?:\/payments|\/email)?|customerpayments\/[0-9]+)$/.test(endpoint)||method==='POST'&&/^(?:contacts|invoices|customerpayments|invoices\/[0-9]+\/(?:status\/sent|status\/void|email))$/.test(endpoint);
 if(!allowed)throw Error('Invoice operation not allowed');
 if(endpoint==='customerpayments'&&!await paymentRecordAccessApproved())throw Error('Payment recording permission is not approved');
 const response=await fetch('https://www.zohoapis.com/invoice/v3/'+endpoint,{method,headers:{Authorization:'Zoho-oauthtoken '+await accessToken(),'X-com-zoho-invoice-organizationid':'944362366','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)});
 const value=await response.json();if(!response.ok||value.code!==0)throw Error('Zoho invoice update could not be confirmed');return value;
}
export async function voidUnpaidLiveInvoice(booking:Booking){
 if(!booking.invoice||booking.context?.purpose!=='customer'||booking.appointments.length)throw Error('Only an unpaid customer checkout may expire');
 const invoice=(await invoiceApi('invoices/'+booking.invoice.id)).invoice,payments=(await invoiceApi('invoices/'+booking.invoice.id+'/payments')).payments||[];
 if(invoice.reference_number!=='SAMSON-LIVE-'+booking.id||invoice.status!=='sent'||invoice.currency_code!=='USD'||Math.round(Number(invoice.total)*100)!==booking.snapshot.initialTotalCents||Math.round(Number(invoice.balance)*100)!==booking.snapshot.initialTotalCents||payments.length||invoice.payment_options?.payment_gateways?.some((gateway:{configured?:boolean})=>gateway.configured))throw Error('Invoice cannot be safely expired');
 await invoiceApi('invoices/'+booking.invoice.id+'/status/void','POST');
 if((await invoiceApi('invoices/'+booking.invoice.id)).invoice.status!=='void')throw Error('Invoice expiration not verified');
}
const resource=()=>process.env.SAMSON_LIVE_RESOURCE_ID||'44386000000385209';
async function territory(){const result=await trialRecord('Work_Orders','44386000000385265'),id=result.data?.[0]?.Territory?.id;if(!id)throw Error('Service territory not configured');return id as string}
export async function liveAvailability(visits:Booking['visits']){
 const [territoryId,appointments]=await Promise.all([territory(),trialAppointments()]);
 for(const visit of visits){if(importedWindowBlocked(appointments,visit.date,visit.period))return false;const window=easternServiceWindow(visit.date,visit.period),result=await trialRead('Service_Resources/Available_TimeSlots',{date_time_range:window,service_resource_filter:{type:'Agent',sr_ids:[resource()]},territory:{id:territoryId},time_slot:{duration:180}});
 if(!(result.data||[]).some((r:{Service_Resources?:{id:string;Time_Slots?:{start_time:string;end_time:string}[]}})=>r.Service_Resources?.id===resource()&&r.Service_Resources.Time_Slots?.some(slot=>Date.parse(slot.start_time)<=Date.parse(window.start)&&Date.parse(slot.end_time)>=Date.parse(window.end))))return false;
 }return true;
}
function fictionalStorefrontTest(booking:Booking,test:boolean){return test&&booking.paymentEnvironment==='sandbox'&&booking.snapshot.kind==='storefront'&&booking.customer.email.endsWith('@example.invalid')&&booking.customer.name.startsWith('SAMSON TEST')}
export async function createLiveInvoice(booking:Booking,sandboxTest=false){
 const fictional=fictionalStorefrontTest(booking,sandboxTest);if(sandboxTest&&!fictional)throw Error('Fictional storefront test required');
 if((!fictional&&booking.paymentEnvironment!=='production')||!booking.context||(!fictional&&booking.customer.email.endsWith('@example.invalid')))throw Error('Real checkout required');
 const c=booking.customer;
 const bound=booking.context.renewalOf?booking.context.invoiceCustomerId:undefined;if(booking.context.renewalOf&&(!bound||!/^\d+$/.test(bound)))throw Error('Original invoice customer binding required');
 const listed=bound?[(await invoiceApi('contacts/'+bound)).contact]:(await invoiceApi('contacts?email='+encodeURIComponent(c.email)+'&per_page=200')).contacts||[];
 const matches=listed.filter((contact:{email:string;contact_name:string})=>contact.email?.toLowerCase()===c.email&&(fictional||!/^SAMSON TEST/i.test(contact.contact_name)));if(matches.length>1)throw Error('Customer identity needs review');
 let contact=matches[0];
 if(contact){const saved=(await invoiceApi('contacts/'+contact.contact_id)).contact,address=saved.billing_address;if(address?.address?.trim().toLowerCase()!==c.street.trim().toLowerCase()||String(address?.zip||'').slice(0,5)!==c.zip.slice(0,5))throw Error('A different billing or service address needs review before payment')}
 // Stop a changed/ambiguous existing service address before creating a payable
 // invoice, rather than discovering it only after the customer has paid.
 if(booking.context.purpose==='customer'){
  const records=await trialRead('Contacts');if(records.info?.more_records)throw Error('Customer lookup requires complete pagination');
  const matches=(records.data||[]).filter((record:{Email?:string;First_Name?:string})=>record.Email?.toLowerCase()===c.email&&(fictional||!record.First_Name?.startsWith('SAMSON TEST')));
  if(matches.length>1)throw Error('Existing service address needs review before payment');
  if(matches.length===1){const record=(await trialRecord('Contacts',matches[0].id)).data?.[0];if(record?.Service_Address?.Street_1?.trim().toLowerCase()!==c.street.trim().toLowerCase()||String(record?.Service_Address?.Zip_Code||'').slice(0,5)!==c.zip.slice(0,5))throw Error('Existing service address needs review before payment')}
 }
 if(!contact){const names=c.name.split(' ');contact=(await invoiceApi('contacts','POST',{contact_name:c.businessName||c.name,customer_sub_type:c.businessName?'business':'individual',company_name:c.businessName,contact_type:'customer',billing_address:{address:c.street,city:c.city,state:c.state,zip:c.zip,country:'U.S.A'},shipping_address:{address:c.street,city:c.city,state:c.state,zip:c.zip,country:'U.S.A'},contact_persons:[{first_name:names[0],last_name:names.slice(1).join(' '),email:c.email,phone:c.phone,is_primary_contact:true}]})).contact}
 if(!contact?.contact_id)throw Error('Customer not confirmed');
 const note=fictional?'FICTIONAL SQUARE SANDBOX TEST — no real funds or service. Do not treat as business revenue.':booking.context.purpose==='owner-verification'?'OWNER CHECKOUT VERIFICATION — real $1 payment; no cleaning service purchased.':booking.snapshot.kind==='storefront'?'Storefront cleaning subscription for '+(c.businessName||c.name)+(booking.context.billingPeriodId?'. Renewed service period; one-time work is excluded. Authorized monthly renewal: ':'. First service month and selected one-time work. Authorized monthly renewal: ')+((booking.snapshot.recurring?.monthlyCents||0)/100).toFixed(2)+' USD from '+booking.snapshot.recurring?.firstPeriodEnd+'. One-time work does not renew.':'Residential window cleaning. Scope, square footage and any price change are confirmed before work. No automatic future card charges are authorized.';
 const result=(await invoiceApi('invoices','POST',{customer_id:contact.contact_id,reference_number:'SAMSON-LIVE-'+booking.id,payment_options:{payment_gateways:[]},allow_partial_payments:false,line_items:booking.snapshot.initialLines.map(line=>({name:line.label,quantity:line.quantity,rate:line.unitPriceCents/100})),notes:note+'\nOrder '+booking.id+'\n'+booking.visits.map((visit,i)=>visit.date+' '+visit.period+' — '+(booking.snapshot.visitOrders[i].totalCents/100).toFixed(2)+' USD — '+(visitCovered(booking.snapshot,i)?'covered by this invoice':'billed separately when due; not included in this invoice')+((booking.snapshot.visitOrders[i].serviceNotes||[]).length?' — '+(booking.snapshot.visitOrders[i].serviceNotes||[]).join('; '):'')).join('\n'),terms:'Accepted checkout version '+booking.context.termsVersion+' at '+booking.acceptedAt+(booking.snapshot.kind==='storefront'?'. Monthly card renewal separately authorized; one-time work excluded. Cancel through Manage subscription or email zach@samsonwindowcleaning.com.':'. Future visits are billed separately unless expressly included in a prepaid order.')})).invoice;
 const invoice=(await invoiceApi('invoices/'+result?.invoice_id)).invoice;
 if(invoice.customer_id!==contact.contact_id||invoice.currency_code!=='USD'||Math.round(Number(invoice.total)*100)!==booking.snapshot.initialTotalCents||invoice.line_items?.length!==booking.snapshot.initialLines.length||!booking.snapshot.initialLines.every((line,i)=>Number(invoice.line_items[i].quantity)===line.quantity&&Math.round(Number(invoice.line_items[i].rate)*100)===line.unitPriceCents)||invoice.payment_options?.payment_gateways?.some((g:{configured?:boolean})=>g.configured))throw Error('Invoice price or payment settings did not match');
 await invoiceApi('invoices/'+invoice.invoice_id+'/status/sent','POST');
 const url=new URL(invoice.invoice_url);if(url.protocol!=='https:'||!['invoice.zoho.com','zohoinvoicepay.com'].includes(url.hostname))throw Error('Invoice link not verified');
 return {id:invoice.invoice_id,number:invoice.invoice_number,url:invoice.invoice_url.trim(),customerId:contact.contact_id};
}
export async function recordLiveReceipt(booking:Booking,state:LivePaymentState,sandboxTest=false){
 const fictional=fictionalStorefrontTest(booking,sandboxTest);if(sandboxTest&&!fictional)throw Error('Fictional storefront test required');
 const invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice,contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact;
 const email=contact.email||contact.contact_persons?.find((p:{is_primary_contact:boolean})=>p.is_primary_contact)?.email;
 if(email?.toLowerCase()!==booking.customer.email||invoice.invoice_number!==booking.invoice!.number||invoice.currency_code!=='USD'||Math.round(Number(invoice.total)*100)!==state.amountCents||Math.round(Number(invoice.balance)*100)!==state.amountCents)throw Error('Exact invoice and customer match required');
 const reference=(fictional?'SQUARE-SANDBOX-':'SQUARE-LIVE-')+state.paymentId,date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const payment=(await invoiceApi('customerpayments','POST',{customer_id:invoice.customer_id,payment_mode:fictional?'Square Sandbox Test':'creditcard',amount:state.amountCents/100,date,reference_number:reference,description:(fictional?'FICTIONAL SANDBOX TEST — no real funds received; not business revenue. ':'Square card payment verified for website order ')+booking.id+'. Transaction '+state.paymentId+'.',invoices:[{invoice_id:invoice.invoice_id,amount_applied:state.amountCents/100}]})).payment;
 const [receipt,updated]=await Promise.all([invoiceApi('customerpayments/'+payment?.payment_id),invoiceApi('invoices/'+invoice.invoice_id)]),record=receipt.payment;
 if(record.customer_id!==invoice.customer_id||record.currency_code!=='USD'||(fictional&&record.payment_mode!=='Square Sandbox Test')||record.reference_number!==reference||Math.round(Number(record.amount)*100)!==state.amountCents||record.invoices?.length!==1||record.invoices[0].invoice_id!==invoice.invoice_id||Math.round(Number(record.invoices[0].amount_applied)*100)!==state.amountCents||updated.invoice.status!=='paid'||Number(updated.invoice.balance)!==0)throw Error('Payment receipt did not match the invoice');return record.payment_id as string;
}
export async function createLiveAppointment(booking:Booking,index:number,sandboxTest=false){
 const fictional=fictionalStorefrontTest(booking,sandboxTest);if(sandboxTest&&!fictional)throw Error('Fictional storefront test required');
 const territoryId=await territory(),visit=booking.visits[index],window=easternServiceWindow(visit.date,visit.period),owner=fictional||booking.context?.purpose==='owner-verification';
 // Reuse an exact customer and address; ambiguous matches stop for review.
 let contacts=await trialRead('Contacts');if(contacts.info?.more_records)throw Error('Customer lookup requires complete pagination');
 const matches=owner?[]:(contacts.data||[]).filter((c:{Email?:string;First_Name?:string})=>c.Email?.toLowerCase()===booking.customer.email&&!c.First_Name?.startsWith('SAMSON TEST'));
 if(matches.length>1)throw Error('Existing customer needs review');
 let contact=matches[0];
 if(contact){contact=(await trialRecord('Contacts',contact.id)).data?.[0];if(contact.Service_Address?.Street_1?.trim().toLowerCase()!==booking.customer.street.trim().toLowerCase())throw Error('Service address change needs review')}
 else{const c=booking.customer,names=c.name.split(' '),created=await trialCreate('Contacts',{data:[{First_Name:owner?'SAMSON TEST '+names[0]:names[0],Last_Name:names.slice(1).join(' ')||'Customer',Email:c.email,Phone:c.phone,Service_Address:{Address_Name:c.name,Street_1:c.street,City:c.city,State:c.state,Zip_Code:c.zip,Country:'United States',Territory:territoryId},Billing_Address:'$SUBLOOKUP_Service_Address'}]});const id=created.data?.Contacts?.[0]?.id;if(!id)throw Error('Customer not confirmed');contact=(await trialRecord('Contacts',id)).data?.[0]}
 if(!contact?.Service_Address?.id||!contact.Billing_Address?.id)throw Error('Service address not confirmed');
 const {trialValidationApi}=await import('../zoho-trial/server');let catalogue=(await trialRead('Service_And_Parts')).data||[],lines=booking.snapshot.visitOrders[index].lines;
 for(const line of lines){const name='Samson — '+line.label;if(!catalogue.some((item:{Name:string})=>item.Name===name)){await trialValidationApi('Service_And_Parts','POST',{data:[{Name:name,Type:'Service',Unit:'Each',Unit_Price:line.unitPriceCents/100,Description:'Website service item; the accepted order supplies each visit’s agreed rate.'}]});catalogue=(await trialRead('Service_And_Parts')).data||[]}}
 const prefix=fictional?'SAMSON TEST — storefront sandbox — no cleaning':owner?'SAMSON TEST — owner live payment verification — no cleaning':booking.snapshot.kind==='storefront'?'Website storefront subscription':'Website cleaning';
 const result=await trialCreate('Work_Orders',{data:[{Summary:prefix+' '+booking.id+' visit '+index,Description:(owner?'Owner payment-system verification; no cleaning service.':index===0?'Paid through Square; matched Zoho Invoice '+booking.invoice!.number+'. Do not invoice again.':visitCovered(booking.snapshot,index)?'Included in prepaid invoice '+booking.invoice!.number+'. Do not invoice again.':'Future planned visit. Not yet paid and no automatic card charge authorized.')+'\n'+(booking.snapshot.visitOrders[index].serviceNotes||[]).join('\n'),Type:'Service',Contact:contact.id,Email:contact.Email,Territory:territoryId,Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:lines.map((line,i)=>({Service:catalogue.find((item:{Name:string})=>item.Name==='Samson — '+line.label)?.id,Quantity:line.quantity,List_Price:line.unitPriceCents/100,Sequence:i+1,Description:line.label}))}]});
 const orderId=result.data?.Work_Orders?.[0]?.id,lineIds=(result.data?.Service_Line_Items||[]).map((line:{id:string})=>line.id);if(!orderId||lineIds.length!==lines.length)throw Error('Work order not confirmed');
 const checked=(await trialRecord('Work_Orders',orderId)).data?.[0];if(Math.round(Number(checked?.Grand_Total)*100)!==booking.snapshot.visitOrders[index].totalCents)throw Error('Work order amount did not match');
 const created=await trialCreate('Service_Appointments',{data:[{Summary:prefix+' '+booking.id+' visit '+index,Scheduled_Start_Date_Time:window.start,Scheduled_End_Date_Time:window.end,Territory:territoryId,$Service_Line_Items:lineIds,$Service_Resources:[resource()],$allow_overlapping:false}]});const appointmentId=created.data?.[0]?.id;if(!appointmentId)throw Error('Appointment not confirmed');return {orderId,appointmentId};
}
