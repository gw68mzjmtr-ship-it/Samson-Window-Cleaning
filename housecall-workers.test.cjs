const assert=require('node:assert/strict'),load=require('./scripts/test-module-loader.cjs');
(async()=>{const prior={...process.env},oldFetch=global.fetch;let requests=0;try{
 process.env.SAMSON_BOOKING_PROVIDER='housecall';process.env.SAMSON_HOSTED_TEST='1';process.env.SAMSON_ZOHO_TEST_TOKEN_JSON=JSON.stringify({access_token:'fictional-read-token',expires_at:Date.now()+60000,nativeInvoiceApproved:true});
 global.fetch=async()=>{requests++;throw Error('No external requests allowed in stopped workers or writes')};
 const engine=load('app/checkout/engine.ts'),worker=load('app/checkout/storefront-worker.ts'),instrumentation=load('instrumentation.ts');
 for(const run of [()=>engine.activateStorefront('unused'),()=>engine.expireLiveOrders(),()=>engine.emailConfirmedOrder('unused'),()=>engine.processLivePaymentEvents(),()=>worker.processStorefrontRenewals(),()=>instrumentation.register()])assert.equal(await run(),undefined);
 for(const run of [()=>engine.customerWorkflow(),()=>engine.ownerWorkflow(),()=>engine.livePaymentService()])assert.throws(run,/disabled after the Housecall Pro switch/);
 const server=load('app/zoho-trial/server.ts'),zoho=load('app/checkout/zoho.ts'),native=load('app/checkout/native-invoice.ts'),square=load('app/checkout/square.ts'),{StorefrontSquare}=load('app/checkout/storefront-square.ts'),sandbox=load('app/zoho-trial/square-sandbox.ts'),bookkeeping=load('app/zoho-trial/square-test-bookkeeping.ts');
 const storedCard=new StorefrontSquare({accessToken:'fictional',locationId:'fictional',merchantId:'fictional'},global.fetch);
 for(const run of [()=>server.trialCreate('Contacts',{}),()=>server.trialValidationApi('Service_And_Parts','POST',{}),()=>server.trialInvoiceApi('invoices','POST',{}),()=>server.nativeInvoiceApi('Invoices','POST',{}),()=>zoho.invoiceApi('invoices','POST',{}),()=>zoho.createLiveInvoice({}),()=>zoho.recordLiveReceipt({},{}),()=>zoho.createLiveAppointment({},0),()=>zoho.voidUnpaidLiveInvoice({}),()=>native.configureNativeInvoice({}),()=>native.createNativeInvoice({},()=>{}),()=>native.createNativeAppointment({},0),()=>square.liveSquareRequest('payments',{}),()=>square.createLivePayment({}),()=>storedCard.request('payments',{}),()=>storedCard.request('cards',{}),()=>storedCard.request('customers',{}),()=>sandbox.createSandboxPayment('unused','unused'),()=>bookkeeping.synchronizeSandboxTest('unused')])await assert.rejects(run(),/disabled after the Housecall Pro switch/);
 assert.equal(requests,0,'All stopped entry points must return before credentials, data and provider writes');
 // Historical provider reads still work, and no mutation is sent.
 global.fetch=async(url,options)=>{requests++;assert.equal(options.method,'GET');return {ok:true,status:200,json:async()=>({data:[]})}};
 await server.trialRecord('Work_Orders','1');assert.equal(requests,1);
 // The durable cancellation operation needs no Square or Zoho credentials.
 const {cancelStoredSubscription}=load('app/checkout/storefront-subscription.ts');let state={bookingId:'a'.repeat(48),phase:'active'},stopped=false;
 const store={requestCancel:async()=>{stopped=true},locked:async(id,run)=>run(),read:async()=>state,save:async(id,value)=>{state=value}};
 await cancelStoredSubscription(store,state.bookingId);assert(stopped);assert.equal(state.phase,'canceled');assert.equal(requests,1);
 console.log('PASS: Housecall mode stops all registered workers, old-order reconciliation factories, Zoho invoice/job/receipt writes, Square card/customer/payment writes and sandbox mutations; history reads and provider-free cancellation remain available. No external calls or money.');
 }finally{global.fetch=oldFetch;for(const name of Object.keys(process.env))if(!(name in prior))delete process.env[name];Object.assign(process.env,prior)}})().catch(error=>{console.error(error);process.exitCode=1});
