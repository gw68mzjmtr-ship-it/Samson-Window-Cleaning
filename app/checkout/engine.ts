import {createHash} from 'node:crypto';
import {BookingWorkflow,type Booking,type BookingAdapter} from '../zoho-trial/booking-workflow';
import {sharedBookings,sharedDatabase,readSquareState,saveSquareState,squareStateLock} from '../zoho-trial/runtime-store';
import {LivePaymentService,type LivePaymentState} from './payment-service';
import {liveSquareConfig,readLivePayment,createLivePayment} from './square';
import {invoiceApi,liveAvailability,createLiveInvoice,recordLiveReceipt,createLiveAppointment} from './zoho';
import {approvedResidentialTerms} from './service-terms';
import {ownerVerificationSnapshot} from './owner-verification';
const store=()=>sharedBookings();
const adapter:BookingAdapter={available:liveAvailability,createInvoice:createLiveInvoice,createAppointment:createLiveAppointment,
 async readPayment(booking){
  const state=await readSquareState<LivePaymentState>(booking.id,'production'),invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice;
  const contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact,result=(await invoiceApi('invoices/'+booking.invoice!.id+'/payments')).payments||[];
  const eligible=state?.phase==='completed'&&state.receipt?.phase==='verified'?result.filter((p:{payment_id:string})=>p.payment_id===state.receipt!.id):[];
  return {id:invoice.invoice_id,customerEmail:contact.email||contact.contact_persons?.find((p:{is_primary_contact:boolean})=>p.is_primary_contact)?.email||'',currency:invoice.currency_code,totalCents:Math.round(Number(invoice.total)*100),balanceCents:Math.round(Number(invoice.balance)*100),status:invoice.status,paymentIds:eligible.map((p:{payment_id:string})=>p.payment_id),receivedCents:eligible.reduce((sum:number,p:{amount:number})=>sum+Math.round(Number(p.amount)*100),0)};
 }
};
export function customerWorkflow(){
 const version=approvedResidentialTerms();if(!version)throw Error('Customer checkout terms are not approved');
 return new BookingWorkflow('',adapter,store(),{context:{purpose:'customer',termsVersion:version}});
}
export function ownerWorkflow(){return new BookingWorkflow('',adapter,store(),{context:{purpose:'owner-verification',termsVersion:'owner-live-payment-verification-v1'},prepareSnapshot:ownerVerificationSnapshot})}
export async function readLiveBooking(id:string){const booking=await store().read(id);if(booking.paymentEnvironment!=='production'||!booking.context)throw Error('Live order not found');return booking}
export function livePaymentService(){const config=liveSquareConfig();return new LivePaymentService({read:id=>readSquareState(id,'production'),save:(id,state)=>saveSquareState(id,state,'production'),lock:id=>squareStateLock(id,'production')},{booking:readLiveBooking,available:async booking=>{
 const invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice,contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact;
 const email=contact.email||contact.contact_persons?.find((person:{is_primary_contact:boolean})=>person.is_primary_contact)?.email;
 if(email?.toLowerCase()!==booking.customer.email||invoice.reference_number!=='SAMSON-LIVE-'+booking.id||invoice.currency_code!=='USD'||invoice.status!=='sent'||Math.round(Number(invoice.total)*100)!==booking.snapshot.initialTotalCents||Math.round(Number(invoice.balance)*100)!==booking.snapshot.initialTotalCents||invoice.line_items?.length!==booking.snapshot.initialLines.length||!booking.snapshot.initialLines.every((line,i)=>Math.round(Number(invoice.line_items[i].rate)*100)===line.unitPriceCents&&Number(invoice.line_items[i].quantity)===line.quantity))return false;
 return liveAvailability(booking.visits);
},createPayment:createLivePayment,readPayment:readLivePayment,recordReceipt:recordLiveReceipt,confirmBooking:async id=>{const booking=await readLiveBooking(id);return (booking.context!.purpose==='owner-verification'?ownerWorkflow():customerWorkflow()).reconcile(id)},locationId:config.locationId})}
export async function publicLiveOrder(booking:Booking){const payment=await readSquareState<LivePaymentState>(booking.id,'production');return {id:booking.id,purpose:booking.context!.purpose,phase:booking.phase,invoice:booking.invoice,amountCents:booking.snapshot.initialTotalCents,visits:booking.visits,selection:booking.snapshot.selection,appointments:booking.appointments,payment:payment?{phase:payment.phase,notice:payment.notice,paymentId:payment.paymentId,receipt:payment.receipt}:null,error:booking.error,lines:booking.snapshot.initialLines}}
export async function limitCheckout(req:Request,operation:string){
 const address=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim(),subject=createHash('sha256').update(operation+':'+address).digest('hex'),bucket=Math.floor(Date.now()/60000),sql=sharedDatabase();
 const [result]=await sql`INSERT INTO samson_checkout_rate(subject,bucket) VALUES(${subject},${bucket}) ON CONFLICT(subject,bucket) DO UPDATE SET attempts=samson_checkout_rate.attempts+1 RETURNING attempts`;
 if(result.attempts>(operation==='create'?5:operation==='payment'?10:90))throw Error('Please wait a minute before trying again');
}
export async function processLivePaymentEvents(){
 const sql=sharedDatabase(),events=await sql`SELECT event_id,payment_id FROM samson_square_events WHERE phase='queued' ORDER BY received_at LIMIT 25`;
 for(const event of events){
  try{
   const payment=await readLivePayment(event.payment_id);if(!payment.reference_id?.startsWith('SLIVE-')){await sql`UPDATE samson_square_events SET phase='verified' WHERE event_id=${event.event_id}`;continue}
   const matches=await sql`SELECT booking_id FROM samson_live_payment_state WHERE record->>'reference'=${payment.reference_id}`;
   if(matches.length!==1){await sql`UPDATE samson_square_events SET phase='review_required' WHERE event_id=${event.event_id}`;continue}
   if(payment.status==='COMPLETED'){await livePaymentService().synchronize(matches[0].booking_id,payment.id);await sql`UPDATE samson_square_events SET phase='verified' WHERE event_id=${event.event_id}`}
   else if(['FAILED','CANCELED'].includes(payment.status))await sql`UPDATE samson_square_events SET phase='verified' WHERE event_id=${event.event_id}`;
  }catch{ /* Leave queued for the next worker. Stored ambiguity markers prevent repeats. */ }
 }
}
