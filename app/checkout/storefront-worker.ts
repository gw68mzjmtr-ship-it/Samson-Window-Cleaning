import {sharedDatabase,sharedBookings,readSquareState,saveSquareState,squareStateLock} from '../zoho-trial/runtime-store';
import {subscriptionStore} from './storefront-store';
import {StorefrontRenewalService,nextStorefrontBill} from './storefront-renewal';
import {liveStorefrontSquare} from './storefront-square';
import {customerWorkflow,readLiveBooking,emailConfirmedOrder,liveInvoicePayable} from './engine';
import {liveAvailability,recordLiveReceipt} from './zoho';
import type {LivePaymentState} from './payment-service';
let checkedAt=0;
export async function processStorefrontRenewals(){
 if(Date.now()-checkedAt<60000)return;checkedAt=Date.now();const sql=sharedDatabase(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),rows=await sql`SELECT booking_id FROM samson_storefront_subscriptions WHERE record->>'phase'='active' AND COALESCE(record->>'upcomingBillingDate',record->>'nextBillingDate')<=${today} ORDER BY updated_at LIMIT 100`,provider=liveStorefrontSquare();
 for(const row of rows)try{await subscriptionStore.locked(row.booking_id,async()=>{
  const state=await subscriptionStore.read(row.booking_id);if(!state)return;if(state.phase!=='active'||state.cancelRequestedAt){if(state.cancelRequestedAt){state.phase='canceled';await subscriptionStore.save(state.bookingId,state)}return}
  const workflow=customerWorkflow('storefront'),service=new StorefrontRenewalService(provider,{read:id=>subscriptionStore.renewal(id,state.bookingId),save:r=>subscriptionStore.saveRenewal(r),source:readLiveBooking,available:liveAvailability,held:async(date,period)=>(await sql`SELECT 1 FROM samson_slot_claims WHERE service_date=${date} AND period=${period}`).length>0,importBooking:b=>workflow.stageRenewalPeriod(b),payable:liveInvoicePayable,canCharge:async id=>{const current=await subscriptionStore.read(id);return current?.phase==='active'&&!current.cancelRequestedAt},writePayment:async(id,record)=>{const unlock=await squareStateLock(id,'production');try{const old=await readSquareState<LivePaymentState>(id,'production');if(old&&(old.paymentId!==record.paymentId||old.invoiceId!==record.invoiceId||old.amountCents!==record.amountCents))throw Error('Renewal payment identity changed');await saveSquareState(id,record,'production')}finally{await unlock()}},recordReceipt:recordLiveReceipt,schedule:id=>workflow.reconcile(id),email:emailConfirmedOrder});
  const result=await service.reconcile(state,today);state.checkedAt=new Date().toISOString();
  if(result.phase==='completed'){state.upcomingBillingDate=nextStorefrontBill((await readLiveBooking(state.bookingId)).snapshot,result.periodStart);state.notice='Monthly payment and cleanings verified. Next scheduled charge: '+state.upcomingBillingDate+'.'}else{state.phase=result.phase==='canceled'?'canceled':'review_required';state.notice=result.notice}
  await subscriptionStore.save(state.bookingId,state);
 })}catch{console.warn('A storefront monthly billing check needs review.');try{await subscriptionStore.locked(row.booking_id,async()=>{const s=await subscriptionStore.read(row.booking_id);if(s){s.phase='review_required';s.notice='Monthly billing check stopped. Review existing Square and Zoho records before another payment.';await subscriptionStore.save(s.bookingId,s)}})}catch{}}
}
