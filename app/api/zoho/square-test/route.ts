import {checkLocalRequest} from '../../../zoho-trial/server';
import {squareSandboxConfig,squareBillingContact,sandboxPaymentResult,createSandboxPayment} from '../../../zoho-trial/square-sandbox';
import {bookingWorkflow} from '../../../zoho-trial/booking-adapter';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(req:Request){
 try{await checkLocalRequest(req)}catch{return Response.json({error:'Private local test only'},{status:403,headers})}
 try{const config=await squareSandboxConfig(),id=new URL(req.url).searchParams.get('id')||'',b=await bookingWorkflow().read(id);if(!b.customer.email.endsWith('@example.invalid'))throw Error('Fictional customer required');return Response.json({environment:'sandbox',applicationId:config.applicationId,locationId:config.locationId,bookingId:b.id,amountCents:b.snapshot.initialTotalCents,billingContact:squareBillingContact(b.customer),result:await sandboxPaymentResult(id)},{headers})}catch{return Response.json({error:'The private Square test connection is not ready yet. Real charges are disabled.'},{status:503,headers})}
}
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Private local test only'},{status:403,headers})}
 try{const input=await req.json();if(input.confirm!=='SQUARE_SANDBOX_ONLY')throw Error('Test confirmation required');return Response.json(await createSandboxPayment(input.id,input.sourceId),{headers})}catch{return Response.json({error:'The test could not proceed. Check the saved result before another attempt. No live payment was submitted.'},{status:409,headers})}
}
