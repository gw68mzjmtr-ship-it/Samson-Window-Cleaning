import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {residentialOrderSnapshot,type ResidentialSelection} from '../residential/residential-integration';
import {validateVisitSeries,type ResidentialVisit} from '../residential/residential-scheduling';
import type {BookingStore} from './booking-store';
import type {BookingSnapshot} from '../checkout/order-snapshot';

export type BookingCustomer={name:string;email:string;phone:string;street:string;city:string;state:string;zip:string;businessName?:string};
export type BookingContext={purpose:'customer'|'owner-verification';termsVersion:string;serviceKind?:'residential'|'storefront';billingPeriodId?:string;renewalOf?:string;invoiceCustomerId?:string};
export type Booking={schedulePending?:boolean;context?:BookingContext;acceptedAt?:string;expiresAt?:string;id:string;requestKey:string;fingerprint:string;createdAt:string;updatedAt:string;phase:'reserved'|'invoice_pending'|'awaiting_payment'|'payment_verified'|'sync_pending'|'confirmed'|'review_required'|'expired';customer:BookingCustomer;snapshot:BookingSnapshot;visits:ResidentialVisit[];invoice?:{id:string;number:string;url:string;customerId?:string};appointments:{index:number;orderId:string;appointmentId:string}[];pendingVisit?:number;error?:string;paymentEnvironment?:'sandbox'|'production'};
export type PaymentEvidence={id:string;customerEmail:string;currency:string;totalCents:number;balanceCents:number;status:string;paymentIds:string[];receivedCents:number};
export type BookingAdapter={available:(visits:ResidentialVisit[])=>Promise<boolean>;createInvoice:(booking:Booking)=>Promise<NonNullable<Booking['invoice']>>;readPayment:(booking:Booking)=>Promise<PaymentEvidence>;createAppointment:(booking:Booking,index:number)=>Promise<{orderId:string;appointmentId:string}>};
export function parseCustomer(input:unknown):BookingCustomer{
 if(!input||typeof input!=='object')throw Error('Enter your contact and service address.');
 const v=input as Record<string,unknown>,out={} as BookingCustomer;
 for(const key of ['name','email','phone','street','city','state','zip'] as const){if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>200)throw Error('Complete your contact and service address.');out[key]=v[key].trim()}
 out.email=out.email.toLowerCase();
 if(v.businessName!==undefined){if(typeof v.businessName!=='string'||!v.businessName.trim()||v.businessName.length>160)throw Error('Check the business name.');out.businessName=v.businessName.trim();}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)||out.phone.replace(/\D/g,'').length<10||!/^\d{5}(?:-\d{4})?$/.test(out.zip))throw Error('Check your email, phone and ZIP code.');
 return out;
}
export function paymentMatches(booking:Booking,evidence:PaymentEvidence){
 return !!booking.invoice&&evidence.id===booking.invoice.id&&evidence.customerEmail.toLowerCase()===booking.customer.email&&evidence.currency==='USD'&&evidence.totalCents===booking.snapshot.initialTotalCents&&evidence.receivedCents===booking.snapshot.initialTotalCents&&evidence.balanceCents===0&&evidence.status==='paid'&&evidence.paymentIds.length>0;
}
// One local process/host only. An interrupted mutation is held for review, never replayed.
// Public hosting must replace this file ledger with a transactional shared store.
export class BookingWorkflow{
 constructor(private folder:string,private adapter:BookingAdapter,private sharedStore?:BookingStore,private options?:{context:BookingContext;prepareSnapshot?:(snapshot:ReturnType<typeof residentialOrderSnapshot>)=>ReturnType<typeof residentialOrderSnapshot>;createSnapshot?:(selection:unknown,visits:ResidentialVisit[])=>BookingSnapshot;validateVisits?:(snapshot:BookingSnapshot,visits:ResidentialVisit[],today:string)=>boolean}){}
 private async save(b:Booking){b.updatedAt=new Date().toISOString();if(this.sharedStore)return this.sharedStore.save(b);const file=path.join(this.folder,b.id+'.json'),temp=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(b),{mode:0o600});await rename(temp,file)}
 async records():Promise<Booking[]>{if(this.sharedStore)return this.sharedStore.records();const {readdir}=await import('node:fs/promises');await mkdir(this.folder,{recursive:true});const names=await readdir(this.folder);return Promise.all(names.filter(n=>/^[a-f0-9]{48}\.json$/.test(n)).map(async name=>JSON.parse(await readFile(path.join(this.folder,name),'utf8'))))}
 async read(id:string):Promise<Booking>{if(!/^[a-f0-9]{48}$/.test(id))throw Error('Invalid booking reference.');if(this.sharedStore)return this.sharedStore.read(id);return JSON.parse(await readFile(path.join(this.folder,id+'.json'),'utf8'))}
 async labelSandbox(id:string){return this.locked(async()=>{const b=await this.read(id);if(!b.customer.email.endsWith('@example.invalid')||b.phase!=='awaiting_payment')throw Error('Fictional unpaid booking required');b.paymentEnvironment='sandbox';await this.save(b);return b})}
 private async locked<T>(fn:()=>Promise<T>){if(this.sharedStore)return this.sharedStore.locked(fn);await mkdir(this.folder,{recursive:true});const file=path.join(this.folder,'workflow.lock');let lock;try{lock=await open(file,'wx',0o600)}catch{throw Error('Another booking is being checked. Please try again shortly.')}try{return await fn()}finally{await lock.close();await unlink(file)}}
 async create(input:{requestKey:string;customer:unknown;selection:unknown;visits:ResidentialVisit[]},today:string){return this.locked(async()=>{
  if(!/^[a-f0-9-]{20,64}$/.test(input.requestKey))throw Error('Refresh this booking form before trying again.');
  const customer=parseCustomer(input.customer);
  let snapshot:BookingSnapshot;
  if(this.options?.createSnapshot)snapshot=this.options.createSnapshot(input.selection,input.visits);
  else{const base=residentialOrderSnapshot(input.selection,true);snapshot=this.options?.prepareSnapshot?this.options.prepareSnapshot(base):base;}
  const valid=Array.isArray(input.visits)&&(this.options?.validateVisits?this.options.validateVisits(snapshot,input.visits,today):validateVisitSeries(snapshot.maintenance.id,input.visits,today,snapshot.selection.billingMode==='annual-prepay'?'annual-prepay':'per-visit'));
  if(!valid)throw Error('Choose all required dates and service windows.');
  const visits=input.visits.map(v=>({date:v.date,period:v.period}));
  const fingerprint=createHash('sha256').update(JSON.stringify({customer,snapshot,visits,...(this.options?{context:this.options.context,...(this.options.context.purpose==='customer'?{requestKey:input.requestKey}:{})}:{})})).digest('hex');
  const existing=await this.records(),sameKey=existing.find(b=>b.requestKey===input.requestKey);
  if(sameKey){if(sameKey.fingerprint!==fingerprint)throw Error('This request belongs to an earlier selection. Start a new booking.');return sameKey}
  const same=existing.find(b=>b.fingerprint===fingerprint);if(same)return same;
  // No automatic expiry while a payable invoice exists: a late payment must never buy a released slot.
  if(existing.some(b=>!['confirmed','expired'].includes(b.phase)&&b.visits.some(v=>visits.some(next=>v.date===next.date&&v.period===next.period))))throw Error('A selected service window is held by another booking. Choose another time.');
  if(!await this.adapter.available(visits))throw Error('A selected date is no longer available. Choose another time.');
  const b:Booking={id:randomBytes(24).toString('hex'),requestKey:input.requestKey,fingerprint,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),phase:'reserved',customer,snapshot,visits,appointments:[],...(this.options?{context:this.options.context,acceptedAt:new Date().toISOString(),paymentEnvironment:'production' as const}:{})};await this.save(b);
  try{b.phase='invoice_pending';await this.save(b);b.invoice=await this.adapter.createInvoice(b);b.phase='awaiting_payment';if(b.context?.purpose==='customer')b.expiresAt=new Date(Date.now()+30*60000).toISOString();await this.save(b)}catch{b.phase='review_required';b.error='Invoice creation needs review. Do not create another invoice or release these dates.';await this.save(b)}
  return b;
 })}
 async reconcile(id:string){return this.locked(async()=>{
  const b=await this.read(id);if(['confirmed','review_required','expired'].includes(b.phase))return b;
  if(b.phase!=='awaiting_payment'&&b.phase!=='payment_verified'){b.phase='review_required';b.error='An earlier update stopped before confirmation. Review existing Zoho records; do not repeat the invoice or appointment creation.';await this.save(b);return b}
  if(!paymentMatches(b,await this.adapter.readPayment(b)))return b;
  b.phase='payment_verified';await this.save(b);
  // Recheck every date after payment. External calendar edits can conflict with a local hold.
  if(!await this.adapter.available(b.visits.filter((_,i)=>!b.appointments.some(a=>a.index===i)))){b.phase='review_required';b.error='Payment received, but a selected date needs the owner’s attention. No second payment is needed.';await this.save(b);return b}
  for(let i=0;i<b.visits.length;i++){
   if(b.appointments.some(a=>a.index===i))continue;
   b.phase='sync_pending';b.pendingVisit=i;await this.save(b);
   try{const result=await this.adapter.createAppointment(b,i);b.appointments.push({index:i,...result});delete b.pendingVisit;b.phase='payment_verified';await this.save(b)}catch{b.phase='review_required';b.error='Payment received. Zoho scheduling needs review; existing jobs were preserved and will not be duplicated.';await this.save(b);return b}
  }
  b.phase='confirmed';await this.save(b);return b;
 })}
 // Only the authorized monthly-renewal worker calls this. Remote writes keep the
 // same durable ambiguity markers used by the initial checkout.
 async stageRenewalPeriod(input:Booking){return this.locked(async()=>{
  if(input.context?.serviceKind!=='storefront'||!input.context.billingPeriodId||!input.context.renewalOf||input.snapshot.kind!=='storefront'||!(input.paymentEnvironment==='production'||(input.paymentEnvironment==='sandbox'&&input.customer.name.startsWith('SAMSON TEST')&&input.customer.email.endsWith('@example.invalid')))||input.schedulePending||input.phase!=='reserved'||!/^[a-f0-9]{48}$/.test(input.id))throw Error('Authorized renewal import required');
  const existing=(await this.records()).find(b=>b.id===input.id);if(existing){if(existing.fingerprint!==input.fingerprint)throw Error('Renewal identity changed');return existing}
  if((await this.records()).some(b=>!b.schedulePending&&!['confirmed','expired'].includes(b.phase)&&b.visits.some(v=>input.visits.some(next=>v.date===next.date&&v.period===next.period)))||!await this.adapter.available(input.visits))throw Error('Renewal windows no longer available');
  const b=structuredClone(input);await this.save(b);b.phase='invoice_pending';await this.save(b);
  try{b.invoice=await this.adapter.createInvoice(b);b.phase='awaiting_payment';await this.save(b)}catch{b.phase='review_required';b.error='Monthly subscription renewal: invoice creation needs review. Do not duplicate.';await this.save(b)}return b;
 })}
}
