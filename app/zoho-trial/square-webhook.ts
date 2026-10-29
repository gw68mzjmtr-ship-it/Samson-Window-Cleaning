import {createHmac,timingSafeEqual} from 'node:crypto';
export function validSquareSignature(raw:Buffer,signature:string|null,key:string,notificationUrl:string){
 if(!key||key.length<16||!signature||!/^https:\/\//.test(notificationUrl)||!/^([A-Za-z0-9+/]{43})=$/.test(signature))return false;
 const expected=createHmac('sha256',key).update(notificationUrl).update(raw).digest();
 const actual=Buffer.from(signature,'base64');return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export async function boundedWebhookBody(request:Request){
 const length=request.headers.get('content-length');if(length&&(Number(length)>65536||!/^\d+$/.test(length)))throw Error('Webhook too large');
 const reader=request.body?.getReader();if(!reader)throw Error('Webhook body missing');let size=0;const chunks:Buffer[]=[];
 try{for(;;){const result=await reader.read();if(result.done)break;size+=result.value.length;if(size>65536){await reader.cancel();throw Error('Webhook too large')}chunks.push(Buffer.from(result.value))}}finally{reader.releaseLock()}
 return Buffer.concat(chunks);
}
export function squarePaymentEvent(raw:Buffer,merchantId:string){
 let event;try{event=JSON.parse(raw.toString('utf8'))}catch{throw Error('Invalid event')}
 if(!merchantId||event.merchant_id!==merchantId)throw Error('Wrong merchant');
 if(event.type!=='payment.created'&&event.type!=='payment.updated')return null;
 if(typeof event.event_id!=='string'||event.event_id.length>200||!event.event_id||typeof event.data?.id!=='string'||event.data.id.length>200||!event.data.id||event.data.type!=='payment')throw Error('Invalid payment event');
 // Deliberately ignore browser/payload claims about totals or successful payment.
 // A separate worker must read Square and match the exact saved invoice before
 // recording payment or creating appointments.
 return {eventId:event.event_id as string,paymentId:event.data.id as string,merchantId,type:event.type as 'payment.created'|'payment.updated'};
}
export async function receiveSquareWebhook(request:Request,config:{key:string;notificationUrl:string;merchantId:string},queue:(event:NonNullable<ReturnType<typeof squarePaymentEvent>>)=>Promise<boolean>){
 const headers={'Cache-Control':'no-store'};
 let raw:Buffer;try{raw=await boundedWebhookBody(request)}catch{return Response.json({error:'Invalid notification body'},{status:413,headers})}
 if(!validSquareSignature(raw,request.headers.get('x-square-hmacsha256-signature'),config.key,config.notificationUrl))return Response.json({error:'Invalid notification signature'},{status:401,headers});
 let event;try{event=squarePaymentEvent(raw,config.merchantId)}catch{return Response.json({error:'Invalid merchant or event'},{status:400,headers})}
 if(!event)return Response.json({received:true,ignored:true},{headers});
 try{const created=await queue(event);return Response.json({received:true,queued:created,duplicate:!created},{headers})}catch{
  // Do not acknowledge an event that has not been durably saved: Square must retry.
  return Response.json({error:'Notification storage unavailable'},{status:503,headers});
 }
}
