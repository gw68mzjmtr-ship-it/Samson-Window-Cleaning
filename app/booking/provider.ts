import {housecallBookingUrl} from './housecall';

// Cutover closes new custom orders even while native booking is being verified.
// These flags do not alter the public website host or existing order access.
export function housecallCutoverEnabled(){return process.env.SAMSON_BOOKING_PROVIDER==='housecall'}
export function assertLegacyWritesAllowed(){if(housecallCutoverEnabled())throw Error('Legacy booking, billing and payment changes are disabled after the Housecall Pro switch')}
export function verifiedHousecallBookingUrl(){
 return housecallCutoverEnabled()&&process.env.SAMSON_HOUSECALL_BOOKING_READY==='1'?housecallBookingUrl:null;
}
export function publicBookingDestination(service?:string){return verifiedHousecallBookingUrl()||(service==='storefront'?'/storefront-pricing':'/residential')}
export function newOrderCutoverResponse(){
 if(!housecallCutoverEnabled())return null;
 const bookingUrl=verifiedHousecallBookingUrl();
 return Response.json({error:bookingUrl?'Please book your cleaning through Housecall Pro. No order or payment was created here.':'Online booking is being updated. Contact Samson to arrange your cleaning. No order or payment was created here.',bookingUrl},{status:409,headers:{'Cache-Control':'no-store'}});
}
