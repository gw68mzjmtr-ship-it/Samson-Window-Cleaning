import {guardCheckout,checkoutJson,privateHeaders,bookingAccess} from '../../../checkout/security';
import {customerWorkflow,publicLiveOrder,limitCheckout} from '../../../checkout/engine';
import {confirmLiveLocation} from '../../../checkout/square';
import {storefrontReady,storefrontConsentVersion} from '../../../storefront-terms';
export const runtime='nodejs';
export async function POST(req:Request){try{
 await guardCheckout(req,true);await limitCheckout(req,'create');const input=await checkoutJson(req);
 if(!storefrontReady()||input.website||input.acceptedTerms!==true||input.termsVersion!==storefrontConsentVersion||input.selection?.subscriptionConsent!==true||input.purpose!=='customer'||!input.customer?.businessName?.trim()||!['NC','North Carolina'].includes(input.customer?.state)||input.customer?.email?.endsWith('@example.invalid'))throw Error('Storefront checkout requires review');
 const zips=(process.env.SAMSON_SERVICE_ZIPS||'').split(',').map(s=>s.trim());if(typeof input.customer.zip!=='string'||!/^\d{5}(?:-\d{4})?$/.test(input.customer.zip.trim())||!zips.includes(input.customer.zip.trim().slice(0,5)))throw Error('Service area review required');
 await confirmLiveLocation();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),booking=await customerWorkflow('storefront').create(input,today);
 return Response.json({...await publicLiveOrder(booking),access:bookingAccess(booking.id)},{headers:privateHeaders});
 }catch{return Response.json({error:'Your subscription could not be confirmed. Check your dates and service details. No card payment was submitted.'},{status:409,headers:privateHeaders})}}
