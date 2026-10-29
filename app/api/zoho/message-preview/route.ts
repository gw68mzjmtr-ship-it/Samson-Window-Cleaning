import {checkLocalRequest} from '../../../zoho-trial/server';
import {routineAnswer} from '../../../zoho-trial/operations-model';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Private preview only'},{status:403})}
 try{const input=await req.json();if(typeof input.message!=='string'||input.message.length>2000)throw Error();return Response.json(routineAnswer(input.message),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Enter a message of up to 2,000 characters.'},{status:400})}
}
