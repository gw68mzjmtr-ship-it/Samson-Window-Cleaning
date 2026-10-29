import {guardCheckout,checkoutJson,validBookingAccess,privateHeaders} from '../../../checkout/security';
import {readLiveBooking,publicLiveOrder,livePaymentService,limitCheckout} from '../../../checkout/engine';
import {liveSquareConfig} from '../../../checkout/square';
import {squareBillingContact} from '../../../zoho-trial/square-sandbox';
export const runtime='nodejs';
export async function GET(req:Request){try{await guardCheckout(req);const id=new URL(req.url).searchParams.get('id')||'';if(!validBookingAccess(id,req.headers.get('x-samson-booking-access')))throw Error();const booking=await readLiveBooking(id),config=liveSquareConfig();return Response.json({applicationId:config.applicationId,locationId:config.locationId,amountCents:booking.snapshot.initialTotalCents,billingContact:squareBillingContact(booking.customer),order:await publicLiveOrder(booking)},{headers:privateHeaders})}catch{return Response.json({error:'The secure payment form is not ready. No payment was submitted.'},{status:503,headers:privateHeaders})}}
export async function POST(req:Request){
 try{await guardCheckout(req,true);await limitCheckout(req,'payment');const body=await checkoutJson(req);if(!validBookingAccess(body.id,req.headers.get('x-samson-booking-access')))throw Error('Order access required');
 const service=livePaymentService();let payment;
 if(body.action==='check'){const result=await service.synchronize(body.id);return Response.json(await publicLiveOrder(result.booking),{headers:privateHeaders})}
 payment=await service.pay(body.id,body.sourceId);if(payment.phase==='completed'){try{await service.synchronize(body.id)}catch{ /* Payment is already saved. The owner can resolve scheduling or receipt issues. */ }}
 return Response.json(await publicLiveOrder(await readLiveBooking(body.id)),{headers:privateHeaders});
 }catch{return Response.json({error:'The result needs review. Check this order before submitting another payment; do not pay twice.'},{status:409,headers:privateHeaders})}
}
