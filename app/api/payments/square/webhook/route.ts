import {bookingDatabaseConnection,PostgresBookingStore} from '../../../../zoho-trial/postgres-booking-store';
import {receiveSquareWebhook} from '../../../../zoho-trial/square-webhook';
export const runtime='nodejs';
let store:PostgresBookingStore|undefined;
export async function POST(request:Request){
 // Prepared for hosting, but disabled until the complete production payment
 // reconciliation worker and live permissions have passed their launch checks.
 if(process.env.SAMSON_SQUARE_WEBHOOK_ENABLED!=='1')return new Response('Not found',{status:404});
 try{
  const base=new URL(process.env.SAMSON_CHECKOUT_ORIGIN||'');
  if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();
  const config={key:process.env.SAMSON_SQUARE_WEBHOOK_KEY||'',merchantId:process.env.SAMSON_SQUARE_MERCHANT_ID||'',notificationUrl:base.origin+'/api/payments/square/webhook'};
  if(config.key.length<16||!config.merchantId||!process.env.SAMSON_BOOKING_DATABASE_URL)throw Error();
  store??=new PostgresBookingStore(bookingDatabaseConnection(process.env.SAMSON_BOOKING_DATABASE_URL));
  return receiveSquareWebhook(request,config,event=>store!.queueSquareEvent(event));
 }catch{return Response.json({error:'Notification endpoint not configured'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
