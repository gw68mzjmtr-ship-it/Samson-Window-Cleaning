import {checkoutOrigin} from './security';
import {createHash} from 'node:crypto';
import {BookingWorkflow,type Booking,type BookingAdapter} from '../zoho-trial/booking-workflow';
import {sharedBookings,sharedDatabase,readSquareState,saveSquareState,squareStateLock} from '../zoho-trial/runtime-store';
import {LivePaymentService,type LivePaymentState} from './payment-service';
import {liveSquareConfig,readLivePayment,createLivePayment} from './square';
import {invoiceApi,liveAvailability,createLiveInvoice,recordLiveReceipt,createLiveAppointment,voidUnpaidLiveInvoice} from './zoho';
import {expireUnpaidOrders} from './expire-orders';
import {sendConfirmationOnce} from './confirmation';
import {approvedResidentialTerms} from './service-terms';
import {storefrontOrderSnapshot,validateStorefrontVisits,type StorefrontSelection,storefrontConsentVersion} from '../storefront-model';
import {subscriptionStore,subscriptionAccess} from './storefront-store';
import {StorefrontSubscriptionService} from './storefront-subscription';
import {liveStorefrontSquare} from './storefront-square';
import {visitCovered} from './order-snapshot';
import {invoiceLinesMatch} from './native-invoice-model';
import {ownerVerificationSnapshot} from './owner-verification';
const store=()=>sharedBookings();
export async function activateStorefront(id:string){const booking=await readLiveBooking(id);if(booking.snapshot.kind!=='storefront'||booking.context?.billingPeriodId||booking.phase!=='confirmed')return;const payment=await readSquareState<LivePaymentState>(id,'production');if(payment?.phase==='completed')return new StorefrontSubscriptionService(subscriptionStore,liveStorefrontSquare()).activate(booking,payment)}
export async function publicSubscription(id:string){const state=await subscriptionStore.read(id);return state?{phase:state.phase,monthlyCents:state.monthlyCents,nextBillingDate:state.upcomingBillingDate||state.nextBillingDate,cancelEffective:state.cancelEffective,notice:state.notice,manageAccess:subscriptionAccess(id)}:null}
const adapter:BookingAdapter={available:liveAvailability,createInvoice:(b,persist)=>createLiveInvoice(b,false,persist),createAppointment:createLiveAppointment,
 async readPayment(booking){
  const state=await readSquareState<LivePaymentState>(booking.id,'production'),invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice;
  const contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact,result=(await invoiceApi('invoices/'+booking.invoice!.id+'/payments')).payments||[];
  const eligible=state?.phase==='completed'&&state.receipt?.phase==='verified'?result.filter((p:{payment_id:string})=>p.payment_id===state.receipt!.id):[];
  return {id:invoice.invoice_id,customerEmail:contact.email||contact.contact_persons?.find((p:{is_primary_contact:boolean})=>p.is_primary_contact)?.email||'',currency:invoice.currency_code,totalCents:Math.round(Number(invoice.total)*100),balanceCents:Math.round(Number(invoice.balance)*100),status:invoice.status,paymentIds:eligible.map((p:{payment_id:string})=>p.payment_id),receivedCents:eligible.reduce((sum:number,p:{amount:number})=>sum+Math.round(Number(p.amount)*100),0)};
 }
};
export function customerWorkflow(kind:'residential'|'storefront'='residential'){
 if(kind==='storefront')return new BookingWorkflow('',adapter,store(),{context:{purpose:'customer',serviceKind:'storefront',termsVersion:storefrontConsentVersion},createSnapshot:storefrontOrderSnapshot,validateVisits:(snapshot,visits,today)=>validateStorefrontVisits(snapshot.selection as StorefrontSelection,visits,today)});
 const version=approvedResidentialTerms();if(!version)throw Error('Customer checkout terms are not approved');
 return new BookingWorkflow('',adapter,store(),{context:{purpose:'customer',termsVersion:version}});
}
export function ownerWorkflow(){return new BookingWorkflow('',adapter,store(),{context:{purpose:'owner-verification',termsVersion:'owner-live-payment-verification-v1'},prepareSnapshot:ownerVerificationSnapshot})}
export async function readLiveBooking(id:string){const booking=await store().read(id);if(booking.paymentEnvironment!=='production'||!booking.context)throw Error('Live order not found');return booking}
export function livePaymentService(){const config=liveSquareConfig();return new LivePaymentService({read:id=>readSquareState(id,'production'),save:(id,state)=>saveSquareState(id,state,'production'),lock:id=>squareStateLock(id,'production')},{booking:readLiveBooking,available:liveInvoicePayable,createPayment:createLivePayment,readPayment:readLivePayment,recordReceipt:recordLiveReceipt,confirmBooking:async id=>{const booking=await readLiveBooking(id);return (booking.context!.purpose==='owner-verification'?ownerWorkflow():customerWorkflow(booking.context!.serviceKind)).reconcile(id)},locationId:config.locationId})}
export async function publicLiveOrder(booking:Booking){const payment=await readSquareState<LivePaymentState>(booking.id,'production'),sql=sharedDatabase(),emails=await sql`SELECT phase FROM samson_confirmation_email WHERE booking_id=${booking.id}`;return {id:booking.id,purpose:booking.context!.purpose,phase:booking.phase,expiresAt:booking.expiresAt,confirmationEmail:emails[0]?.phase||null,subscription:booking.snapshot.kind==='storefront'?await publicSubscription(booking.id):undefined,invoice:booking.invoice?{id:booking.invoice.id,number:booking.invoice.number,url:booking.invoice.url}:undefined,amountCents:booking.snapshot.initialTotalCents,visits:booking.visits,includedVisitIndices:booking.snapshot.visitOrders.filter(visit=>visitCovered(booking.snapshot,visit.index)).map(visit=>visit.index),selection:booking.snapshot.selection,appointments:booking.appointments,payment:payment?{phase:payment.phase,notice:payment.notice,paymentId:payment.paymentId,receipt:payment.receipt}:null,error:booking.error,lines:booking.snapshot.initialLines}}
export async function expireLiveOrders(){return expireUnpaidOrders({store:store(),lockPayment:id=>squareStateLock(id,'production'),readPayment:id=>readSquareState(id,'production'),voidUnpaidInvoice:voidUnpaidLiveInvoice})}
export async function emailConfirmedOrder(id:string){
 const booking=await readLiveBooking(id),payment=await readSquareState<LivePaymentState>(id,'production');if(!payment||booking.phase!=='confirmed')return;
 const subscription=booking.snapshot.kind==='storefront'?await subscriptionStore.read(booking.context?.renewalOf||id):null;if(booking.snapshot.kind==='storefront'&&!subscription)return;
 const sql=sharedDatabase();
 return sendConfirmationOnce({booking,payment,subscription:subscription?{phase:subscription.phase,monthlyCents:subscription.monthlyCents,nextBillingDate:booking.snapshot.recurring!.firstPeriodEnd,manageUrl:checkoutOrigin()+'/storefront/manage#id='+(booking.context?.renewalOf||id)+'&access='+subscriptionAccess(booking.context?.renewalOf||id)}:undefined,claim:async()=>{
  const rows=await sql`INSERT INTO samson_confirmation_email(booking_id,invoice_id,recipient,phase) VALUES(${id},${booking.invoice!.id},${booking.customer.email},'pending') ON CONFLICT(booking_id) DO NOTHING RETURNING booking_id`;return rows.length===1;
 },send:async message=>{
  const invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice,contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact;
  const email=contact.email||contact.contact_persons?.find((person:{is_primary_contact:boolean})=>person.is_primary_contact)?.email;
  if(invoice.status!=='paid'||Number(invoice.balance)!==0||invoice.reference_number!=='SAMSON-LIVE-'+id||email?.toLowerCase()!==booking.customer.email)throw Error('Confirmation recipient or paid invoice mismatch');
  await invoiceApi('invoices/'+booking.invoice!.id+'/email','POST',message);
 },finish:async phase=>{await sql`UPDATE samson_confirmation_email SET phase=${phase},updated_at=now() WHERE booking_id=${id}`}});
}
export async function limitCheckout(req:Request,operation:string){
 const address=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim(),subject=createHash('sha256').update(operation+':'+address).digest('hex'),bucket=Math.floor(Date.now()/60000),sql=sharedDatabase();
 const [result]=await sql`INSERT INTO samson_checkout_rate(subject,bucket) VALUES(${subject},${bucket}) ON CONFLICT(subject,bucket) DO UPDATE SET attempts=samson_checkout_rate.attempts+1 RETURNING attempts`;
 await sql`DELETE FROM samson_checkout_rate WHERE bucket<${bucket-1440}`;
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

export async function liveInvoicePayable(booking:Booking){
 if(booking.nativePreparation)await (await import('./native-invoice')).readNativeBinding(booking);
 const invoice=(await invoiceApi('invoices/'+booking.invoice!.id)).invoice,contact=(await invoiceApi('contacts/'+invoice.customer_id)).contact;
 const email=contact.email||contact.contact_persons?.find((person:{is_primary_contact:boolean})=>person.is_primary_contact)?.email;
 if(email?.toLowerCase()!==booking.customer.email||invoice.reference_number!=='SAMSON-LIVE-'+booking.id||invoice.currency_code!=='USD'||invoice.status!=='sent'||Math.round(Number(invoice.total)*100)!==booking.snapshot.initialTotalCents||Math.round(Number(invoice.balance)*100)!==booking.snapshot.initialTotalCents||!invoiceLinesMatch(booking,invoice))return false;
 return liveAvailability(booking.visits);
}
