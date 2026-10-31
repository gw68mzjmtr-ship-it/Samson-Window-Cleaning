import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {checkLocalRequest,clientConfig,callbackUrl,tokenRequest,saveToken,trialOrigin} from '../../../zoho-trial/server';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 try{await checkLocalRequest(req)}catch{return new Response('Local preview only',{status:403})}
 const url=new URL(req.url),state=url.searchParams.get('state')||'',expected=req.cookies.get('samson_zoho_state')?.value||'';
 if(!/^[a-f0-9]{64}$/.test(state)||!expected||state.length!==expected.length||!timingSafeEqual(Buffer.from(state),Buffer.from(expected)))return new Response('The authorization check expired or did not match. Start again from the trial page.',{status:400,headers:{'Cache-Control':'no-store'}});
 const code=url.searchParams.get('code');let result='declined';
 if(code&&!url.searchParams.get('error')){try{const client=await clientConfig(),permission=req.cookies.get('samson_zoho_permission')?.value||'';await saveToken({...await tokenRequest({...client,grant_type:'authorization_code',code,redirect_uri:callbackUrl}),bookingApproved:['booking','validation','invoice','payment-records','native-invoice','native-invoice-edit'].includes(permission),validationApproved:['validation','invoice','payment-records','native-invoice','native-invoice-edit'].includes(permission),invoiceApproved:['invoice','payment-records','native-invoice','native-invoice-edit'].includes(permission),paymentRecordsApproved:['payment-records','native-invoice','native-invoice-edit'].includes(permission),nativeInvoiceApproved:['native-invoice','native-invoice-edit'].includes(permission),invoiceSettingsApproved:permission==='native-invoice-edit'});result='connected'}catch{result='failed'}}
 const response=NextResponse.redirect(trialOrigin+'/zoho-trial?connection='+result,303);
 response.cookies.delete('samson_zoho_state');response.cookies.delete('samson_zoho_permission');
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}



