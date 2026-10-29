import {open,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {saveSquareState,squareStateLock} from './runtime-store';
import {paymentRecordAccessApproved,trialInvoiceApi,secretDir} from './server';
import {bookingWorkflow,publicBooking} from './booking-adapter';
import {squareSandboxConfig,sandboxPaymentResult,validSandboxPayment,type SandboxResult} from './square-sandbox';
// Sandbox payments are fictional. This explicit, separately approved step creates clearly
// labelled TEST accounting records; it must never represent a real receipt of funds.
export async function synchronizeSandboxTest(id:string){
 if(!await paymentRecordAccessApproved())return {permissionRequired:true,notice:'Additional Zoho permission is required to create the fictional test receipt. No record changed.'};
 const workflow=bookingWorkflow(),b=await workflow.read(id),state=await sandboxPaymentResult(id);
 if(!b.invoice||!b.customer.email.endsWith('@example.invalid')||state?.phase!=='completed'||state.environment!=='sandbox'||state.bookingId!==b.id||state.invoiceId!==b.invoice.id||state.amountCents!==b.snapshot.initialTotalCents||!state.paymentId)throw Error('Matching sandbox payment required');
 if(state.zoho?.phase==='verified')return {sandbox:state,booking:publicBooking(await workflow.reconcile(id))};
 if(state.zoho)throw Error('Prior accounting transfer needs review; do not create another receipt');
 const config=await squareSandboxConfig(),response=await fetch('https://connect.squareupsandbox.com/v2/payments/'+encodeURIComponent(state.paymentId),{headers:{Authorization:'Bearer '+config.accessToken,'Square-Version':'2026-09-16'},cache:'no-store',signal:AbortSignal.timeout(15000)}),verifiedSquare=await response.json();
 if(!response.ok||!validSandboxPayment(verifiedSquare.payment,id,state.amountCents,config.locationId))throw Error('Square sandbox status could not be verified');
 const invoice=(await trialInvoiceApi('invoices/'+b.invoice.id,'GET')).invoice,contact=(await trialInvoiceApi('contacts/'+invoice.customer_id,'GET')).contact;
 const email=contact.email||contact.contact_persons?.find((p:{is_primary_contact:boolean})=>p.is_primary_contact)?.email;
 if(email!==b.customer.email||!contact.contact_name?.startsWith('SAMSON TEST')||invoice.invoice_number!==b.invoice.number||invoice.currency_code!=='USD'||Math.round(Number(invoice.total)*100)!==state.amountCents||Math.round(Number(invoice.balance)*100)!==state.amountCents)throw Error('Fictional invoice/customer/amount could not be verified');
 const unlock=await squareStateLock(id);
 async function save(){await saveSquareState(id,state!)}
 try{
  const latest=await sandboxPaymentResult(id);if(latest?.zoho)throw Error('An accounting transfer already exists');
  await workflow.labelSandbox(id);
  state.zoho={phase:'pending',notice:'Fictional Square sandbox receipt transfer in progress. No real funds received.'};await save();
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const reference='SQUARE-SANDBOX-'+state.paymentId;
  const payment=(await trialInvoiceApi('customerpayments','POST',{customer_id:invoice.customer_id,payment_mode:'Square Sandbox Test',amount:state.amountCents/100,date,reference_number:reference,description:'FICTIONAL SANDBOX TEST ONLY — no real funds received. Private booking '+id+'. Square sandbox payment '+state.paymentId+'. Do not treat as business revenue.',invoices:[{invoice_id:invoice.invoice_id,amount_applied:state.amountCents/100}]})).payment;
  if(!payment?.payment_id)throw Error('Test receipt not confirmed');
  state.zoho.paymentId=payment.payment_id;await save();
  const [receipt,updated,payments]=await Promise.all([trialInvoiceApi('customerpayments/'+payment.payment_id,'GET'),trialInvoiceApi('invoices/'+invoice.invoice_id,'GET'),trialInvoiceApi('invoices/'+invoice.invoice_id+'/payments','GET')]);
  const record=receipt.payment;
  if(record.reference_number!==reference||record.customer_id!==invoice.customer_id||record.currency_code!=='USD'||record.payment_mode!=='Square Sandbox Test'||Math.round(Number(record.amount)*100)!==state.amountCents||record.invoices?.length!==1||record.invoices[0].invoice_id!==invoice.invoice_id||Math.round(Number(record.invoices[0].amount_applied)*100)!==state.amountCents||updated.invoice.status!=='paid'||Number(updated.invoice.balance)!==0||!payments.payments?.some((p:{payment_id:string;amount:number})=>p.payment_id===record.payment_id&&Math.round(Number(p.amount)*100)===state.amountCents))throw Error('Exact test receipt/invoice match failed');
  state.zoho.phase='verified';state.zoho.notice='Fictional sandbox receipt matched this exact Zoho invoice. No real funds received.';await save();
 }catch{if(state.zoho){state.zoho.phase='review_required';state.zoho.notice='Fictional receipt transfer needs review. Existing records were preserved; no automatic repeat.';await save()}throw Error('Sandbox bookkeeping result needs review')}finally{await unlock()}
 return {sandbox:state,booking:publicBooking(await workflow.reconcile(id))};
}
