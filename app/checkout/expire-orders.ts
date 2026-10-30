import type {Booking} from '../zoho-trial/booking-workflow';
import type {BookingStore} from '../zoho-trial/booking-store';
import type {LivePaymentState} from './payment-service';
export type ExpiryDependencies={store:BookingStore;lockPayment(id:string):Promise<()=>Promise<void>>;readPayment(id:string):Promise<LivePaymentState|null>;voidUnpaidInvoice(booking:Booking):Promise<void>};
// The global booking lock prevents reuse until void verification commits. The
// payment lock prevents expiration racing a charge. Any attempted payment or
// ambiguous provider operation retains its claim for review.
export async function expireUnpaidOrders(deps:ExpiryDependencies,now=Date.now()){
 return deps.store.locked(async()=>{
  let expired=0;
  for(const candidate of await deps.store.records()){
   if(candidate.context?.purpose!=='customer'||candidate.phase!=='awaiting_payment'||!candidate.expiresAt||Date.parse(candidate.expiresAt)>now)continue;
   const unlock=await deps.lockPayment(candidate.id);
   try{
    const booking=await deps.store.read(candidate.id);
    if(booking.phase!=='awaiting_payment'||await deps.readPayment(booking.id))continue;
    booking.phase='review_required';booking.error='Unpaid checkout expiration is being verified. Do not pay or release these dates.';await deps.store.save(booking);
    try{await deps.voidUnpaidInvoice(booking);booking.phase='expired';booking.error='This unpaid checkout expired. No card payment was submitted. Choose your dates again.';expired++}catch{booking.error='Unpaid checkout expiration needs review. Dates remain held; no payment was submitted by the expiration process.'}
    booking.updatedAt=new Date(now).toISOString();await deps.store.save(booking);
   }finally{await unlock()}
  }
  return expired;
 });
}
