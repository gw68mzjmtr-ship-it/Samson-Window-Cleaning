import {createHmac,timingSafeEqual} from 'node:crypto';
import {hostedTestAuthorized} from '../zoho-trial/test-host';
export function checkoutOrigin(){const u=new URL(process.env.SAMSON_CHECKOUT_ORIGIN||(process.env.RENDER==='true'?process.env.RENDER_EXTERNAL_URL:'')||'');if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Checkout origin is not configured');return u.origin}
export function liveMode(){const mode=process.env.SAMSON_LIVE_CHECKOUT_MODE;if(!['owner-test','public'].includes(mode||''))throw Error('Live checkout is closed');return mode as 'owner-test'|'public'}
export async function guardCheckout(req:Request,post=false,owner=false){
 const origin=checkoutOrigin();if(req.headers.get('host')!==new URL(origin).host||(post&&req.headers.get('origin')!==origin))throw Error('Wrong checkout origin');
 const mode=liveMode();if((owner||mode==='owner-test')&&!await hostedTestAuthorized(req.headers.get('authorization')))throw Error('Owner sign-in required');
 if(mode==='public'&&process.env.SAMSON_PUBLIC_CHECKOUT_READY!=='1')throw Error('Public checkout is not open');
}
function capabilityKey(){const key=process.env.SAMSON_CHECKOUT_ACCESS_KEY;if(!key||key.length<43)throw Error('Checkout access is not configured');return key}
export function bookingAccess(id:string,now=Date.now()){const expires=Math.floor(now/1000)+7*86400;const text=id+':'+expires;return expires+'.'+createHmac('sha256',capabilityKey()).update(text).digest('base64url')}
export function validBookingAccess(id:string,value:string|null,now=Date.now()){
 if(!/^[a-f0-9]{48}$/.test(id)||!value||!/^\d{10}\.[A-Za-z0-9_-]{43}$/.test(value))return false;
 const [expiry,signature]=value.split('.');if(Number(expiry)<now/1000||Number(expiry)>now/1000+8*86400)return false;
 const expected=createHmac('sha256',capabilityKey()).update(id+':'+expiry).digest(),actual=Buffer.from(signature,'base64url');return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export async function checkoutJson(req:Request){
 const length=req.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>16384))throw Error('Request too large');
 const reader=req.body?.getReader();if(!reader)throw Error('Request body required');const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();throw Error('Request too large')}chunks.push(part.value)}}finally{reader.releaseLock()}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export const privateHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
