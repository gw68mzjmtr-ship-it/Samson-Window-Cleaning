import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {checkLocalRequest,clientConfig,callbackUrl,readScopes,bookingScopes,validationScopes,invoiceScopes,paymentRecordScopes} from '../../../zoho-trial/server';
export const runtime='nodejs';
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return new Response('Local preview only',{status:403})}
 let client;try{client=await clientConfig()}catch{return new Response('Private client is not configured yet.',{status:503})}
 const mode=new URL(req.url).searchParams.get('mode'),paymentRecords=mode==='payment-records',invoice=paymentRecords||mode==='invoice',validation=invoice||mode==='validation',booking=validation||mode==='booking';
 const state=randomBytes(32).toString('hex'),url=new URL('https://accounts.zoho.com/oauth/v2/auth');
 url.search=new URLSearchParams({scope:(paymentRecords?paymentRecordScopes:invoice?invoiceScopes:validation?validationScopes:booking?bookingScopes:readScopes).join(','),client_id:client.client_id,response_type:'code',access_type:'offline',prompt:'consent',redirect_uri:callbackUrl,state}).toString();
 const response=NextResponse.redirect(url,303);
 const options={httpOnly:true,sameSite:'lax' as const,maxAge:600,path:'/api/zoho/callback'};
 response.cookies.set('samson_zoho_state',state,options);
 response.cookies.set('samson_zoho_permission',paymentRecords?'payment-records':invoice?'invoice':validation?'validation':booking?'booking':'read',options);
 response.headers.set('Cache-Control','no-store');return response;
}




