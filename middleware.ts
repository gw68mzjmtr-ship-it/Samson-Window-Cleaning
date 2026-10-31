import {NextRequest,NextResponse} from 'next/server';
import {hostedTestAuthorized,testHostAllowed,hostedTestRouteAllowed} from './app/zoho-trial/test-host';
import {publicSiteHost,publicSiteRoute} from './app/checkout/public-routes';
export async function middleware(req:NextRequest){
 const privatePath=req.nextUrl.pathname.startsWith('/zoho-trial')||req.nextUrl.pathname.startsWith('/api/zoho/');
 if(process.env.SAMSON_HOSTED_TEST==='1'){
  const publicHost=publicSiteHost(req.headers.get('host'));
  if((!testHostAllowed(req.headers.get('host'))&&!publicHost)||!hostedTestRouteAllowed(req.nextUrl.pathname))return new NextResponse('Not found',{status:404});
  const signedPaymentHook=req.method==='POST'&&req.nextUrl.pathname==='/api/payments/square/webhook';
  const publicCheckout=publicHost&&publicSiteRoute(req.nextUrl.pathname);
  if(!signedPaymentHook&&!publicCheckout&&!await hostedTestAuthorized(req.headers.get('authorization')))return new NextResponse('Private Samson test. Sign in to continue.',{status:401,headers:{'WWW-Authenticate':'Basic realm="Samson private test", charset="UTF-8"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 }else if(privatePath&&!testHostAllowed(req.headers.get('host')))return new NextResponse('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const response=NextResponse.next();if(process.env.SAMSON_HOSTED_TEST==='1'||privatePath){response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy',process.env.SAMSON_HOSTED_TEST!=='1'&&req.nextUrl.pathname==='/zoho-trial'?'same-origin':'no-referrer');if(!publicSiteHost(req.headers.get('host'))||!publicSiteRoute(req.nextUrl.pathname)||req.nextUrl.pathname.startsWith('/api/'))response.headers.set('X-Robots-Tag','noindex, nofollow')}return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
