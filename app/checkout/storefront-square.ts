import {createHash} from 'node:crypto';
import {liveSquareConfig} from './square';
export type SubscriptionConfig={accessToken:string;locationId:string;merchantId:string;sandbox?:boolean};
export const subscriptionKey=(kind:string,id:string)=>createHash('sha256').update('samson-storefront-v1:'+kind+':'+id).digest('hex').slice(0,40);
const safeId=(id:string)=>{if(!/^[A-Za-z0-9_:\-]{1,200}$/.test(id))throw Error('Invalid Square reference');return encodeURIComponent(id)};
export class StorefrontSquare{
 constructor(readonly config:SubscriptionConfig,private transport:typeof fetch=fetch){}
 async request(endpoint:string,body?:object){
  if(!(body?['customers','cards','payments'].includes(endpoint):/^(?:customers|cards|payments)\/[A-Za-z0-9_%:\-]+$/.test(endpoint))||!this.config.accessToken||!this.config.locationId||!this.config.merchantId)throw Error('Subscription operation not permitted');
  const response=await this.transport((this.config.sandbox?'https://connect.squareupsandbox.com':'https://connect.squareup.com')+'/v2/'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.config.accessToken,'Square-Version':'2026-09-16','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)}),value=await response.json();
  if(!response.ok||value.errors?.length)throw Error('Square update needs review');return value;
 }
 async customer(id:string){return(await this.request('customers/'+safeId(id))).customer}
 async card(id:string){return(await this.request('cards/'+safeId(id))).card}
 async payment(id:string){return(await this.request('payments/'+safeId(id))).payment}
 async createCustomer(id:string,c:{name:string;email:string;phone:string;businessName?:string}){const [given,...family]=c.name.split(' '),value=(await this.request('customers',{idempotency_key:subscriptionKey('customer',id),given_name:given,family_name:family.join(' '),company_name:c.businessName,email_address:c.email,phone_number:(c.phone.replace(/\D/g,'').length===10?'+1':'+')+c.phone.replace(/\D/g,''),reference_id:'SAMSON-'+id})).customer;if(!value?.id)throw Error('Customer not returned');return value.id as string}
 async createCard(id:string,paymentId:string,customerId:string,name:string){const value=(await this.request('cards',{idempotency_key:subscriptionKey('card',id),source_id:paymentId,card:{customer_id:customerId,cardholder_name:name,reference_id:'SAMSON-'+id}})).card;if(!value?.id)throw Error('Card not returned');return value.id as string}
 async chargeRenewal(periodId:string,customerId:string,cardId:string,amount:number,reference:string){if(!Number.isSafeInteger(amount)||amount<=0||!cardId.startsWith('ccof:')||!/^SRENEW-[a-f0-9]{32}$/.test(reference))throw Error('Authorized stored-card renewal required');return(await this.request('payments',{idempotency_key:subscriptionKey('monthly-charge',periodId),source_id:cardId,customer_id:customerId,amount_money:{amount,currency:'USD'},location_id:this.config.locationId,reference_id:reference,autocomplete:true,customer_details:{customer_initiated:false,seller_keyed_in:false},note:'Samson authorized monthly storefront subscription. Period '+periodId})).payment}
}
export const liveStorefrontSquare=()=>new StorefrontSquare(liveSquareConfig());
