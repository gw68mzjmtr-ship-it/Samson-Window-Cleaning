import {createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {secretDir} from './server';
import {hostedRuntime,readSquareState,saveSquareState,squareStateLock} from './runtime-store';
import {bookingWorkflow} from './booking-adapter';
export type SandboxConfig={environment:'sandbox';applicationId:string;locationId:string;accessToken:string};
export async function squareSandboxConfig():Promise<SandboxConfig>{
 const c=hostedRuntime()?JSON.parse(process.env.SAMSON_SQUARE_SANDBOX_JSON||'{}'):JSON.parse(await readFile(path.join(secretDir,'square-sandbox.json'),'utf8'));
 if(c.environment!=='sandbox'||!/^sandbox-sq0idb-/.test(c.applicationId)||typeof c.locationId!=='string'||!c.locationId||typeof c.accessToken!=='string'||!c.accessToken)throw Error('Sandbox connection not configured');
 return c;
}
export function squareBillingContact(customer:{name:string;email:string;phone:string;street:string;city:string;state:string;zip:string}){const names=customer.name.trim().split(/\s+/);return {givenName:names[0],familyName:names.slice(1).join(' '),email:customer.email,phone:customer.phone,addressLines:[customer.street],city:customer.city,state:customer.state==='North Carolina'?'NC':customer.state,postalCode:customer.zip,countryCode:'US'}}
export function squareBookingReference(id:string){return 'SAMSON-'+createHash('sha256').update(id).digest('hex').slice(0,32)}
type SandboxPayment={id:string;status:string;source_type:string;location_id:string;reference_id:string;amount_money:{amount:number;currency:string}};
export function validSandboxPayment(p:SandboxPayment,bookingId:string,cents:number,locationId:string){return !!p?.id&&p.status==='COMPLETED'&&p.source_type==='CARD'&&p.reference_id===squareBookingReference(bookingId)&&p.location_id===locationId&&p.amount_money?.currency==='USD'&&p.amount_money.amount===cents}
export type SandboxResult={environment:'sandbox';phase:'pending'|'completed'|'review_required';bookingId:string;invoiceId:string;amountCents:number;paymentId?:string;notice:string;zoho?:{phase:'pending'|'verified'|'review_required';paymentId?:string;notice:string}};
export async function sandboxPaymentResult(id:string):Promise<SandboxResult|null>{return readSquareState<SandboxResult>(id)}
export async function createSandboxPayment(id:string,sourceId:unknown){
 if(typeof sourceId!=='string'||!sourceId||sourceId.length>1000||['CASH','EXTERNAL'].includes(sourceId))throw Error('Use a token from the Square test card form');
 const config=await squareSandboxConfig(),b=await bookingWorkflow().read(id);
 if(!b.customer.email.endsWith('@example.invalid')||b.phase!=='awaiting_payment'||!b.invoice)throw Error('Choose a fictional unpaid checkout');
 const unlock=await squareStateLock(id);
 let state:SandboxResult={environment:'sandbox',phase:'pending',bookingId:id,invoiceId:b.invoice.id,amountCents:b.snapshot.initialTotalCents,notice:'Square sandbox only. No real card charge. This does not mark a live Zoho invoice paid.'};
 async function save(){await saveSquareState(id,state)}
 try{
  const previous=await sandboxPaymentResult(id);if(previous)return previous;
  await save();
  const response=await fetch('https://connect.squareupsandbox.com/v2/payments',{method:'POST',headers:{Authorization:'Bearer '+config.accessToken,'Square-Version':'2026-09-16','Content-Type':'application/json'},body:JSON.stringify({source_id:sourceId,idempotency_key:createHash('sha256').update('samson-sandbox-'+id).digest('hex').slice(0,40),amount_money:{amount:b.snapshot.initialTotalCents,currency:'USD'},location_id:config.locationId,reference_id:squareBookingReference(id),autocomplete:true,note:'SAMSON PRIVATE SANDBOX TEST — Zoho invoice '+b.invoice.number+'; booking '+id}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!validSandboxPayment(result.payment,id,b.snapshot.initialTotalCents,config.locationId))throw Error('Sandbox payment not confirmed');
  // Independent server read; never trust a browser success message or creation response alone.
  const verification=await fetch('https://connect.squareupsandbox.com/v2/payments/'+encodeURIComponent(result.payment.id),{headers:{Authorization:'Bearer '+config.accessToken,'Square-Version':'2026-09-16'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  const verified=await verification.json();if(!verification.ok||!validSandboxPayment(verified.payment,id,b.snapshot.initialTotalCents,config.locationId))throw Error('Sandbox payment verification failed');
  state.phase='completed';state.paymentId=verified.payment.id;await save();return state;
 }catch{state.phase='review_required';state.notice='Square test result needs review. No automatic retry or live Zoho payment was created.';await save();return state}finally{await unlock()}
}
