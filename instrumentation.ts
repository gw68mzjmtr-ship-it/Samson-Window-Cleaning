// The hosted trial uses durable shared records; live checkout remains disabled.
export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'){
 if(process.env.SAMSON_ZOHO_TRIAL!=='1'&&process.env.SAMSON_HOSTED_TEST!=='1')return;
 const {bookingWorkflow}=await import('./app/zoho-trial/booking-adapter');
 let running=false;const lastChecked=new Map<string,number>();
 const timer=setInterval(async()=>{
  if(running)return;running=true;
  try{const workflow=bookingWorkflow();for(const b of await workflow.records()){
   if(b.phase==='confirmed'||b.phase==='review_required')continue;
   // Older payable invoices still need reconciliation. Check them less frequently,
   // rather than silently abandoning them after the first hour.
   const interval=Date.now()-Date.parse(b.createdAt)<3600000?60000:300000;
   if(Date.now()-(lastChecked.get(b.id)||0)<interval)continue;
   lastChecked.set(b.id,Date.now());
   try{
    if(process.env.SAMSON_HOSTED_TEST==='1'){
     const {sandboxPaymentResult}=await import('./app/zoho-trial/square-sandbox');
     const proof=await sandboxPaymentResult(b.id);
     if(proof?.phase==='completed'&&!proof.zoho){const {synchronizeSandboxTest}=await import('./app/zoho-trial/square-test-bookkeeping');await synchronizeSandboxTest(b.id);continue}
    }
    await workflow.reconcile(b.id)
   }catch{console.warn('A private booking check needs attention; other checks continue.')}
  }}catch{console.warn('Private booking payment check deferred; existing bookings preserved.')}finally{running=false}
 },60000);
 timer.unref();
 }
}
