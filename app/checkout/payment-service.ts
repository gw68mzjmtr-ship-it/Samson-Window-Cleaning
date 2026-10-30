import {createHash} from 'node:crypto';
import type {Booking} from '../zoho-trial/booking-workflow';
export type LivePayment={id:string;status:string;source_type:string;location_id:string;reference_id:string;amount_money:{amount:number;currency:string};receipt_url?:string};
export type LivePaymentState={environment:'production';bookingId:string;invoiceId:string;reference:string;amountCents:number;phase:'pending'|'completed'|'declined'|'review_required';attempt:number;paymentId?:string;receipt?:{phase:'pending'|'verified'|'review_required';id?:string};notice:string};
export type LiveStateStore={read(id:string):Promise<LivePaymentState|null>;save(id:string,state:LivePaymentState):Promise<void>;lock(id:string):Promise<()=>Promise<void>>};
export type LivePaymentDependencies={booking(id:string):Promise<Booking>;available(booking:Booking):Promise<boolean>;createPayment(body:object):Promise<LivePayment>;readPayment(id:string):Promise<LivePayment>;recordReceipt(booking:Booking,state:LivePaymentState):Promise<string>;confirmBooking(id:string):Promise<Booking>;locationId:string};
export const liveReference=(id:string)=>'SLIVE-'+createHash('sha256').update(id).digest('hex').slice(0,32);
export function matchesLivePayment(payment:LivePayment,booking:Booking,location:string){return !!payment.id&&payment.status==='COMPLETED'&&payment.source_type==='CARD'&&payment.location_id===location&&payment.reference_id===liveReference(booking.id)&&payment.amount_money?.currency==='USD'&&payment.amount_money.amount===booking.snapshot.initialTotalCents}
function sameState(state:LivePaymentState,booking:Booking){return state.environment==='production'&&state.bookingId===booking.id&&state.invoiceId===booking.invoice?.id&&state.reference===liveReference(booking.id)&&state.amountCents===booking.snapshot.initialTotalCents}
export class LivePaymentService{
 constructor(private store:LiveStateStore,private deps:LivePaymentDependencies){}
 async pay(id:string,source:unknown){
  if(typeof source!=='string'||!source||source.length>1000||/^(?:CASH|EXTERNAL|ccof:)/.test(source)||/^cnon:card-nonce-/.test(source))throw Error('Use the secure live card form');
  const unlock=await this.store.lock(id);
  try{
   const booking=await this.deps.booking(id);if(!booking.context||booking.paymentEnvironment!=='production'||!booking.invoice)throw Error('Live booking required');
   const prior=await this.store.read(id);if(prior){if(!sameState(prior,booking))throw Error('Payment record mismatch');return prior}
   if(booking.phase!=='awaiting_payment'||(booking.expiresAt&&Date.parse(booking.expiresAt)<=Date.now())||!await this.deps.available(booking))throw Error('The selected schedule needs review before payment');
   const state:LivePaymentState={environment:'production',bookingId:id,invoiceId:booking.invoice.id,reference:liveReference(id),amountCents:booking.snapshot.initialTotalCents,phase:'pending',attempt:1,notice:'Payment is being checked. Do not submit a second payment.'};
   await this.store.save(id,state);
   try{
    const payment=await this.deps.createPayment({source_id:source,idempotency_key:createHash('sha256').update('samson-live-v1:'+id).digest('hex').slice(0,40),amount_money:{amount:state.amountCents,currency:'USD'},location_id:this.deps.locationId,reference_id:state.reference,autocomplete:true,note:'Samson website invoice '+booking.invoice.number});
    if(payment.id){state.paymentId=payment.id;await this.store.save(id,state)}
    if(!payment.id)throw Error('Payment identification missing');
    const verified=await this.deps.readPayment(payment.id);if(verified.id!==payment.id)throw Error('Different payment returned');
    if(['FAILED','CANCELED'].includes(verified.status)){state.phase='declined';state.notice='This payment did not complete. No new payment will be submitted automatically.';await this.store.save(id,state);return state}
    if(!matchesLivePayment(verified,booking,this.deps.locationId))throw Error('Payment verification failed');
    state.phase='completed';state.notice='Payment received. We are confirming your receipt and booking.';await this.store.save(id,state);return state;
   }catch{state.phase='review_required';state.notice='The payment result needs review. Do not pay again; we will check the existing transaction.';await this.store.save(id,state);return state}
  }finally{await unlock()}
 }
 async synchronize(id:string,paymentId?:string){
  const unlock=await this.store.lock(id);let state:LivePaymentState;
  try{
   const booking=await this.deps.booking(id),saved=await this.store.read(id);if(!saved||!sameState(saved,booking)||!booking.context||booking.paymentEnvironment!=='production')throw Error('Matching live payment record required');state=saved;
   if(paymentId&&state.paymentId&&paymentId!==state.paymentId)throw Error('Different payment requires review');
   const key=state.paymentId||paymentId;if(!key)throw Error('Payment identification needs review');
   const proof=await this.deps.readPayment(key);if(proof.id!==key||!matchesLivePayment(proof,booking,this.deps.locationId))throw Error('Payment not independently verified');
   state.paymentId=key;state.phase='completed';await this.store.save(id,state);
   if(state.receipt?.phase==='pending'||state.receipt?.phase==='review_required')throw Error('Earlier receipt update needs review; do not duplicate it');
   if(!state.receipt){
    state.receipt={phase:'pending'};await this.store.save(id,state);
    try{state.receipt.id=await this.deps.recordReceipt(booking,state);state.receipt.phase='verified';await this.store.save(id,state)}catch{state.receipt.phase='review_required';state.notice='Payment received; receipt reconciliation needs attention. No second payment is required.';await this.store.save(id,state);throw Error('Receipt needs review')}
   }
  }finally{await unlock()}
  const booking=await this.deps.confirmBooking(id);return {payment:state,booking};
 }
}
