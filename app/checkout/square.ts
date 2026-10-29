import type {LivePayment} from './payment-service';
export function liveSquareConfig(){
 const config={applicationId:process.env.SAMSON_SQUARE_LIVE_APP_ID||'',accessToken:process.env.SAMSON_SQUARE_LIVE_ACCESS_TOKEN||'',locationId:process.env.SAMSON_SQUARE_LIVE_LOCATION_ID||'',merchantId:process.env.SAMSON_SQUARE_LIVE_MERCHANT_ID||''};
 if(!/^sq0idp-/.test(config.applicationId)||config.accessToken.length<20||!config.locationId||!config.merchantId)throw Error('Live Square connection is not configured');return config;
}
export async function liveSquareRequest(endpoint:string,body?:object){
 const allowed=body?endpoint==='payments':/^(?:payments|locations)\/[A-Za-z0-9_-]{1,200}$/.test(endpoint);if(!allowed)throw Error('Square operation is not allowed');
 const config=liveSquareConfig(),response=await fetch('https://connect.squareup.com/v2/'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.accessToken,'Square-Version':'2026-09-16','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)});
 const value=await response.json();if(!response.ok||value.errors?.length)throw Error('Square transaction could not be confirmed');return value;
}
let lastLocationCheck=0;
export async function confirmLiveLocation(){
 if(Date.now()-lastLocationCheck<30000)return;
 const config=liveSquareConfig(),value=await liveSquareRequest('locations/'+config.locationId),location=value.location;
 if(location?.id!==config.locationId||location.merchant_id!==config.merchantId||location.status!=='ACTIVE'||location.currency!=='USD'||location.country!=='US'||!location.capabilities?.includes('CREDIT_CARD_PROCESSING'))throw Error('Square location is not ready for card payments');lastLocationCheck=Date.now();
}
export const readLivePayment=async(id:string):Promise<LivePayment>=>(await liveSquareRequest('payments/'+id)).payment;
export const createLivePayment=async(body:object):Promise<LivePayment>=>{await confirmLiveLocation();return (await liveSquareRequest('payments',body)).payment};
