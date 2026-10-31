import {accessToken,nativeInvoiceApi,nativeInvoiceAccessApproved,invoiceSettingsAccessApproved,trialRead,trialRecord,trialCreate,trialValidationApi} from '../zoho-trial/server';
import type {Booking} from '../zoho-trial/booking-workflow';
import {invoiceApi} from './zoho';
import {nativeSummary,nativeVisitLines,nativeLineContent,verifyNativeBinding} from './native-invoice-model';
import {easternServiceWindow} from '../residential/residential-integration';

const money=(n:unknown)=>Math.round(Number(n)*100);
const emailOf=(c:any)=>String(c.email||c.contact_persons?.find((p:any)=>p.is_primary_contact)?.email||'').toLowerCase();
function addressMatches(b:Booking,c:any){return c.billing_address?.address?.trim().toLowerCase()===b.customer.street.trim().toLowerCase()&&String(c.billing_address?.zip||'').slice(0,5)===b.customer.zip.slice(0,5);}
export async function readNativeBinding(b:Booking){
 const p=b.nativePreparation;if(!p?.financeInvoiceId||!p.invoiceRecordId||!p.workOrderId)throw Error('Native invoice preparation incomplete');
 const [f,n,w]=await Promise.all([invoiceApi('invoices/'+p.financeInvoiceId),nativeInvoiceApi('Invoices/'+p.invoiceRecordId,'GET'),trialRecord('Work_Orders',p.workOrderId)]);
 const invoice=f.invoice,native=n.data?.[0],order=w.data?.[0];verifyNativeBinding(b,invoice,native,order);return {invoice,native,order};
}
// No arbitrary edit API is exposed. The provider requires unchanged customer
// and lines to be echoed with these two approved settings. Verify them again
// after the write, including native work-order identity and all scope/rates.
export async function configureNativeInvoice(b:Booking){
 if(!await invoiceSettingsAccessApproved())throw Error('Limited invoice settings permission required');
 const {invoice,native,order}=await readNativeBinding(b),reference='SAMSON-LIVE-'+b.id;
 const [customer,result]=await Promise.all([invoiceApi('contacts/'+invoice.customer_id),invoiceApi('invoices/'+invoice.invoice_id+'/payments')]);
 if(!['draft','sent'].includes(invoice.status)||money(invoice.balance)!==b.snapshot.initialTotalCents||(result.payments||[]).length||(invoice.reference_number&&invoice.reference_number!==reference)||emailOf(customer.contact)!==b.customer.email||!addressMatches(b,customer.contact)||(b.context?.invoiceCustomerId&&invoice.customer_id!==b.context.invoiceCustomerId))throw Error('Only the matching unpaid website invoice may be configured');
 verifyNativeBinding(b,invoice,native,order);
 const before=nativeLineContent(invoice);
 const body={customer_id:invoice.customer_id,line_items:invoice.line_items.map((line:any)=>({item_id:line.item_id,name:line.name,description:line.description,item_order:line.item_order,quantity:line.quantity,rate:line.rate,unit:line.unit,discount:line.discount,tax_id:line.tax_id})),reference_number:reference,payment_options:{payment_gateways:[]}};
 const response=await fetch('https://www.zohoapis.com/invoice/v3/invoices/'+invoice.invoice_id,{method:'PUT',headers:{Authorization:'Zoho-oauthtoken '+await accessToken(),'X-com-zoho-invoice-organizationid':'944362366','Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(25000)}),value=await response.json();
 if(!response.ok||value.code!==0)throw Error('Limited invoice settings update could not be confirmed');
 const updated=await readNativeBinding(b);
 if(nativeLineContent(updated.invoice)!==before||updated.invoice.reference_number!==reference||updated.invoice.payment_options?.payment_gateways?.some((g:any)=>g.configured))throw Error('Invoice settings or unchanged amounts could not be verified');
 return updated.invoice;
}
export async function createNativeInvoice(b:Booking,persist:()=>Promise<void>){
 if(b.nativePreparation)throw Error('Earlier native invoice creation needs review; do not replay');
 if(!await nativeInvoiceAccessApproved()||!await invoiceSettingsAccessApproved()||b.context?.purpose!=='customer'||!/^[a-f0-9]{48}$/.test(b.id))throw Error('Approved native customer invoice connection required');
 const fictional=b.paymentEnvironment==='sandbox'&&b.customer.name.startsWith('SAMSON TEST')&&b.customer.email.endsWith('@example.invalid');
 if(!fictional&&(b.paymentEnvironment!=='production'||b.customer.email.endsWith('@example.invalid')))throw Error('Real customer or explicit fictional test required');
 const lines=nativeVisitLines(b),p=b.nativePreparation={scopeVersion:'native-visits-v1',pending:'customer'} as NonNullable<Booking['nativePreparation']>;await persist();
 const territory=(await trialRecord('Work_Orders','44386000000385265')).data?.[0]?.Territory?.id;if(!territory)throw Error('Service territory unavailable');p.territoryId=territory;
 const contacts=await trialRead('Contacts');if(contacts.info?.more_records)throw Error('Complete customer lookup required');
 const matches=(contacts.data||[]).filter((c:any)=>c.Email?.toLowerCase()===b.customer.email&&(fictional||!c.First_Name?.startsWith('SAMSON TEST')));
 const bound=b.context?.fsmContactId;let contact=bound?matches.find((c:any)=>c.id===bound):matches.length===1?matches[0]:undefined;
 if(bound&&!contact||!bound&&matches.length>1)throw Error('Existing customer identity requires review');
 if(!contact){
  const c=b.customer,[first,...last]=c.name.split(' ');p.pending='create-customer';await persist();
  const made=await trialCreate('Contacts',{data:[{First_Name:fictional?'SAMSON TEST '+first:first,Last_Name:last.join(' ')||'Customer',Email:c.email,Phone:c.phone,Service_Address:{Address_Name:c.businessName||c.name,Street_1:c.street,City:c.city,State:c.state,Zip_Code:c.zip,Country:'United States',Territory:territory},Billing_Address:'$SUBLOOKUP_Service_Address'}]});
  p.contactId=made.data?.Contacts?.[0]?.id;if(!p.contactId)throw Error('Customer creation uncertain');await persist();
 }else p.contactId=contact.id;
 contact=(await trialRecord('Contacts',p.contactId!)).data?.[0];
 if(contact?.Email?.toLowerCase()!==b.customer.email||contact.Service_Address?.Street_1?.trim().toLowerCase()!==b.customer.street.trim().toLowerCase()||String(contact.Service_Address?.Zip_Code||'').slice(0,5)!==b.customer.zip.slice(0,5)||!contact.Service_Address?.id||!contact.Billing_Address?.id)throw Error('Existing service address requires review');
 const serviceName='Samson — '+(b.snapshot.kind==='storefront'?'Storefront':'Residential')+' cleaning visit';
 let catalogue=await trialRead('Service_And_Parts');if(catalogue.info?.more_records)throw Error('Complete service lookup required');
 let services=(catalogue.data||[]).filter((s:any)=>s.Name===serviceName);if(services.length>1)throw Error('Service catalogue needs review');
 if(!services.length){p.pending='create-service';await persist();await trialValidationApi('Service_And_Parts','POST',{data:[{Name:serviceName,Type:'Service',Unit:'Each',Unit_Price:1,Description:'Accepted website visit price overrides catalogue rate. Detailed window, screen, access and discount scope is retained in each visit description.'}]});catalogue=await trialRead('Service_And_Parts');services=(catalogue.data||[]).filter((s:any)=>s.Name===serviceName)}
 if(services.length!==1)throw Error('Service item not confirmed');
 const description=[fictional?'FICTIONAL SQUARE SANDBOX TEST — no real funds or cleaning.':'Website booking. Pay only through the calculator. Payment and dates are confirmed after Square verification. Do not create another invoice.', 'Order '+b.id,'Accepted '+b.context!.termsVersion+' at '+b.acceptedAt,'Selections: '+JSON.stringify(b.snapshot.selection),...b.visits.map((v,i)=>v.date+' '+v.period+' — '+(lines.some(l=>l.index===i)?'covered by this invoice':'future visit billed separately; not included')), ...lines.map(l=>l.description)].join('\n');
 if(description.length>30000)throw Error('Detailed order scope requires review');
 p.pending='create-work-order';await persist();
 const made=await trialCreate('Work_Orders',{data:[{Summary:nativeSummary(b),Description:description,Type:'Service',Contact:contact.id,Email:contact.Email,Territory:territory,Service_Address:{id:contact.Service_Address.id},Billing_Address:{id:contact.Billing_Address.id},Service_Line_Items:lines.map((line,i)=>({Service:services[0].id,Quantity:1,List_Price:line.amountCents/100,Sequence:i+1,Description:line.description}))}]});
 p.workOrderId=made.data?.Work_Orders?.[0]?.id;if(!p.workOrderId)throw Error('Work order creation uncertain');await persist();
 const order=(await trialRecord('Work_Orders',p.workOrderId)).data?.[0],actual=[...(order?.Service_Line_Items||[])].sort((a:any,c:any)=>Number(a.Sequence)-Number(c.Sequence));
 if(actual.length!==lines.length||money(order.Grand_Total)!==b.snapshot.initialTotalCents||!lines.every((l,i)=>actual[i].Description===l.description&&money(actual[i].List_Price)===l.amountCents&&Number(actual[i].Quantity)===1))throw Error('Job allocations do not match the accepted order');
 p.visitLines=lines.map((l,i)=>({index:l.index,id:actual[i].id}));p.pending='create-native-invoice';await persist();
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const created=(await nativeInvoiceApi('Invoices','POST',{data:[{Work_Order:p.workOrderId,$Service_Line_Items:p.visitLines.map(l=>l.id),$finance_data:{date,payment_terms:0,due_date:date,payment_terms_label:'Due on receipt',discount_preference:{Discount:0,Adjustment:0,Discount_Type:'Currency'}}}]})).data?.Invoices?.[0];
 p.invoiceRecordId=created?.id;p.financeInvoiceId=created?.finance_data?.Invoice_Id;if(!p.invoiceRecordId||!p.financeInvoiceId)throw Error('Native invoice creation uncertain');p.pending='configure-invoice';await persist();
 const invoice=await configureNativeInvoice(b);p.pending='mark-invoice-sent';await persist();await invoiceApi('invoices/'+invoice.invoice_id+'/status/sent','POST');
 const checked=(await readNativeBinding(b)).invoice;
 if(checked.status!=='sent'||checked.reference_number!=='SAMSON-LIVE-'+b.id||money(checked.balance)!==b.snapshot.initialTotalCents||checked.payment_options?.payment_gateways?.some((g:any)=>g.configured))throw Error('Native invoice readiness not confirmed');
 const url=new URL(checked.invoice_url);if(url.protocol!=='https:'||!['invoice.zoho.com','zohoinvoicepay.com'].includes(url.hostname))throw Error('Invoice link not verified');
 delete p.pending;p.ready=true;await persist();return {id:checked.invoice_id,number:checked.invoice_number,url:checked.invoice_url.trim(),customerId:checked.customer_id};
}
export async function createNativeAppointment(b:Booking,index:number){
 const p=b.nativePreparation,visit=b.visits[index];if(!p?.ready||p.pending||!b.invoice||!visit)throw Error('Native paid booking preparation required');
 const {invoice,native}=await readNativeBinding(b),line=p.visitLines?.find(l=>l.index===index);
 if(!line||invoice.invoice_id!==b.invoice.id||invoice.invoice_number!==b.invoice.number||invoice.reference_number!=='SAMSON-LIVE-'+b.id||invoice.status!=='paid'||Number(invoice.balance)!==0||native.Status!=='paid')throw Error('Exact paid native invoice required before scheduling');
 const window=easternServiceWindow(visit.date,visit.period),result=await trialCreate('Service_Appointments',{data:[{Summary:nativeSummary(b)+' visit '+index,Scheduled_Start_Date_Time:window.start,Scheduled_End_Date_Time:window.end,Territory:p.territoryId,$Service_Line_Items:[line.id],$Service_Resources:[process.env.SAMSON_LIVE_RESOURCE_ID||'44386000000385209'],$allow_overlapping:false}]});
 const id=result.data?.[0]?.id;if(!id)throw Error('Native appointment creation uncertain');
 return {orderId:p.workOrderId!,appointmentId:id};
}
