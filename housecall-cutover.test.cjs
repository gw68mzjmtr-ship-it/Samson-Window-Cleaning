const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>Object.hasOwn(deps,id)?deps[id]:require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports}
(async()=>{const prior={...process.env};try{
 const housecall=load('app/booking/housecall.ts'),provider=load('app/booking/provider.ts',{'./housecall':housecall}),publicSite=load('app/checkout/public-routes.ts');
 delete process.env.SAMSON_BOOKING_PROVIDER;delete process.env.SAMSON_HOUSECALL_BOOKING_READY;
 assert.equal(provider.newOrderCutoverResponse(),null);assert.equal(provider.verifiedHousecallBookingUrl(),null);
 assert.equal(provider.publicBookingDestination(),'/residential');assert.equal(provider.publicBookingDestination('storefront'),'/storefront-pricing');
 process.env.SAMSON_HOUSECALL_BOOKING_READY='1';assert.equal(provider.verifiedHousecallBookingUrl(),null);
 process.env.SAMSON_BOOKING_PROVIDER='housecall';delete process.env.SAMSON_HOUSECALL_BOOKING_READY;
 let result=provider.newOrderCutoverResponse();assert.equal(result.status,409);assert.equal((await result.json()).bookingUrl,null);
 let calls=0;const forbidden=()=>{calls++;throw Error('Provider, data or payment operation must not run for a blocked new order')};
 const security={guardCheckout:forbidden,checkoutJson:forbidden,privateHeaders:{'Cache-Control':'no-store'}},engine=new Proxy({},{get:()=>forbidden});
 const deps={'../../../zoho-trial/square-sandbox':{squareBillingContact:forbidden},'../../../zoho-trial/server':{checkLocalRequest:forbidden},'../../../zoho-trial/booking-adapter':{bookingWorkflow:forbidden,publicBooking:forbidden},'../../../booking/provider':provider,'../../../checkout/security':security,'../../../checkout/engine':engine,'../../../checkout/square':{confirmLiveLocation:forbidden},'../../../checkout/service-terms':{approvedResidentialTerms:forbidden},'../../../storefront-terms':{storefrontReady:forbidden},'../../../checkout/calendar-preview':{previewAvailability:forbidden},'../../../zoho-trial/runtime-store':{sharedBookings:forbidden},'../../../residential/residential-model':{isServiceClosureDay:forbidden},'../../../checkout/calendar-read-queue':{withCalendarRead:forbidden}};
 const routes=['orders','storefront-orders','availability','payment'].map(name=>load('app/api/checkout/'+name+'/route.ts',deps));routes.push(load('app/api/zoho/checkout/route.ts',deps));
 const paymentRead=await routes[3].GET(new Request('https://www.samsonwindowcleaning.com/api/checkout/payment?id='+('a'.repeat(48))));assert.equal(paymentRead.status,409);
 for(const route of routes){result=await route.POST(new Request('https://www.samsonwindowcleaning.com/api/checkout/orders',{method:'POST',body:'{}'}));assert.equal(result.status,409);assert.equal((await result.json()).bookingUrl,null)}
 assert.equal(calls,0);
 process.env.SAMSON_HOUSECALL_BOOKING_READY='1';
 assert.equal(provider.verifiedHousecallBookingUrl(),housecall.housecallBookingUrl);
 assert.equal(provider.publicBookingDestination('storefront'),housecall.housecallBookingUrl);assert.equal(provider.publicBookingDestination(),housecall.housecallBookingUrl);
 for(const route of routes){result=await route.POST(new Request('https://www.samsonwindowcleaning.com/api/checkout/orders',{method:'POST',body:'{}'}));assert.equal(result.status,409);assert.equal((await result.json()).bookingUrl,housecall.housecallBookingUrl)}
 assert.equal(calls,0);
 // Cutover does not close public marketing, existing-order or cancel/manage routes.
 process.env.SAMSON_LIVE_CHECKOUT_MODE='public';process.env.SAMSON_PUBLIC_CHECKOUT_READY='1';process.env.SAMSON_CHECKOUT_ORIGIN='https://www.samsonwindowcleaning.com';
 assert(publicSite.publicSiteHost('www.samsonwindowcleaning.com'));
 for(const path of ['/','/residential','/booking','/storefront-pricing','/storefront/manage','/api/checkout/orders','/api/checkout/payment','/api/checkout/subscription'])assert(publicSite.publicSiteRoute(path));
 const oldOrder={id:'a'.repeat(48),phase:'confirmed'};let reads=0;
 const existing=load('app/api/checkout/orders/route.ts',{...deps,'../../../checkout/security':{guardCheckout:async()=>{},validBookingAccess:()=>true,privateHeaders:{'Cache-Control':'no-store'}},'../../../checkout/engine':{readLiveBooking:async()=>{reads++;return oldOrder},publicLiveOrder:async value=>value}});
 result=await existing.GET(new Request('https://www.samsonwindowcleaning.com/api/checkout/orders?id='+oldOrder.id));assert.equal(result.status,200);assert.deepEqual(await result.json(),oldOrder);assert.equal(reads,1);
 console.log('PASS: cutover blocks new orders, calendar, payment/reconciliation and private legacy checkout APIs before provider or payment operations, requires separate HCP readiness, preserves public routes and authenticated existing-order reads. No network or payment calls.');
 }finally{for(const name of Object.keys(process.env))if(!(name in prior))delete process.env[name];Object.assign(process.env,prior)}})().catch(error=>{console.error(error);process.exitCode=1});
