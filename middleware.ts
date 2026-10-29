import {NextRequest,NextResponse} from 'next/server';
import {hostedTestAuthorized,testHostAllowed,hostedTestRouteAllowed} from './app/zoho-trial/test-host';
export async function middleware(req:NextRequest){
 const privatePath=req.nextUrl.pathname.startsWith('/zoho-trial')||req.nextUrl.pathname.startsWith('/api/zoho/');
 if(process.env.SAMSON_HOSTED_TEST==='1'){
  if(!testHostAllowed(req.headers.get('host'))||!hostedTestRouteAllowed(req.nextUrl.pathname))return new NextResponse('Not found',{status:404});
  const signedPaymentHook=req.method==='POST'&&req.nextUrl.pathname==='/api/payments/square/webhook';
  const publicCheckout=process.env.SAMSON_LIVE_CHECKOUT_MODE==='public'&&process.env.SAMSON_PUBLIC_CHECKOUT_READY==='1'&&(req.nextUrl.pathname==='/checkout'||req.nextUrl.pathname==='/service-terms'||req.nextUrl.pathname.startsWith('/api/checkout/'));
  if(!signedPaymentHook&&!publicCheckout&&!await hostedTestAuthorized(req.headers.get('authorization')))return new NextResponse('Private Samson test. Sign in to continue.',{status:401,headers:{'WWW-Authenticate':'Basic realm="Samson private test", charset="UTF-8"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 }else if(privatePath&&!testHostAllowed(req.headers.get('host')))return new NextResponse('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const response=NextResponse.next();if(process.env.SAMSON_HOSTED_TEST==='1'||privatePath){response.headers.set('Cache-Control','no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');response.headers.set('Referrer-Policy','no-referrer')}return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
