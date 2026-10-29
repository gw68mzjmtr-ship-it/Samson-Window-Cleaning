import {guardCheckout,checkoutJson,bookingAccess,validBookingAccess,liveMode,privateHeaders} from '../../../checkout/security';
import {customerWorkflow,ownerWorkflow,readLiveBooking,publicLiveOrder,limitCheckout} from '../../../checkout/engine';
import {confirmLiveLocation} from '../../../checkout/square';
import {approvedResidentialTerms} from '../../../checkout/service-terms';
export const runtime='nodejs';
export async function GET(req:Request){try{await guardCheckout(req);const id=new URL(req.url).searchParams.get('id')||'';if(!validBookingAccess(id,req.headers.get('x-samson-booking-access')))throw Error();return Response.json(await publicLiveOrder(await readLiveBooking(id)),{headers:privateHeaders})}catch{return Response.json({error:'This order could not be opened. Use the same browser or contact Samson.'},{status:404,headers:privateHeaders})}}
export async function POST(req:Request){
 try{await guardCheckout(req,true);await limitCheckout(req,'create');const input=await checkoutJson(req),owner=input.purpose==='owner-verification';
 if(owner){await guardCheckout(req,true,true);if(input.acceptedTerms!==true||liveMode()!=='owner-test'||input.confirm!=='OWNER_REAL_ONE_DOLLAR'||input.customer?.email?.toLowerCase()!=='zach@samsonwindowcleaning.com'||input.selection?.maintenanceId!=='once'||input.selection?.billingMode==='annual-prepay'||input.visits?.length!==1)throw Error('Owner verification only')}
 else{
  if(input.acceptedTerms!==true||!approvedResidentialTerms()||input.termsVersion!==approvedResidentialTerms())throw Error('Customer terms not approved');
  if(!['NC','North Carolina'].includes(input.customer?.state)||input.customer?.email?.endsWith('@example.invalid'))throw Error('Service area or contact requires review');
  const zips=(process.env.SAMSON_SERVICE_ZIPS||'').split(',').map(value=>value.trim());if(!zips.includes(input.customer?.zip))throw Error('Address needs service-area review');
 }
 await confirmLiveLocation();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const booking=await(owner?ownerWorkflow():customerWorkflow()).create(input,today);return Response.json({...await publicLiveOrder(booking),access:bookingAccess(booking.id)},{headers:privateHeaders});
 }catch{return Response.json({error:'Checkout could not be confirmed. Review the dates and contact details before trying again. No card payment was submitted.'},{status:409,headers:privateHeaders})}
}
