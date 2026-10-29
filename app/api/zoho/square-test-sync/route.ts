import {checkLocalRequest} from '../../../zoho-trial/server';
import {synchronizeSandboxTest} from '../../../zoho-trial/square-test-bookkeeping';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Private local test only'},{status:403})}
 try{const input=await req.json();if(input.confirm!=='FICTIONAL_SANDBOX_BOOKKEEPING')throw Error();return Response.json(await synchronizeSandboxTest(input.id),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'The test transfer could not be confirmed. Review the saved invoice and test receipt before retrying. No real card was charged.'},{status:409,headers:{'Cache-Control':'no-store'}})}
}
