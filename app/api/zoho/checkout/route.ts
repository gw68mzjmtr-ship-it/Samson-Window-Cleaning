import {checkLocalRequest} from '../../../zoho-trial/server';
import {bookingWorkflow,publicBooking} from '../../../zoho-trial/booking-adapter';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(req:Request){
 try{await checkLocalRequest(req);const id=new URL(req.url).searchParams.get('id')||'';return Response.json(publicBooking(await bookingWorkflow().read(id)),{headers})}catch{return Response.json({error:'The saved booking could not be read.'},{status:404,headers})}
}
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Private local test only.'},{status:403,headers})}
 try{
  const input=await req.json();
  if(input.action==='check')return Response.json(publicBooking(await bookingWorkflow().reconcile(input.id)),{headers});
  if(input.confirm!=='FICTIONAL_CHECKOUT_ONLY'||!input.customer?.email?.endsWith('@example.invalid'))return Response.json({error:'Use a fictional example.invalid customer for this private test.'},{status:400,headers});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return Response.json(publicBooking(await bookingWorkflow().create(input,today)),{headers});
 }catch{return Response.json({error:'Checkout could not be confirmed. Your dates or an existing checkout may need review. No payment was submitted; check the booking record before retrying.'},{status:409,headers})}
}
