const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript'),Module=require('node:module');
function load(file,deps={}){const m=new Module(file);m.require=id=>deps[id]||require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file+'.js');return m.exports}
const db=load('app/zoho-trial/postgres-booking-store.ts'),env=Object.fromEntries(fs.readFileSync('.local-secrets/booking-db-test.env','utf8').trim().split('\n').map(line=>line.split('=')));
const url='postgres://samson_test:'+env.POSTGRES_PASSWORD+'@127.0.0.1:55432/samson_checkout_test',a=db.bookingDatabaseConnection(url,true),b=db.bookingDatabaseConnection(url,true),id=crypto.randomBytes(24).toString('hex');
const old=process.env.SAMSON_HOSTED_TEST;let initialized=false;
(async()=>{
 assert.equal((await a`SELECT current_database() AS name`)[0].name,'samson_checkout_test');
 await a.unsafe(fs.readFileSync('database/001-booking-checkout.sql','utf8'));await a.unsafe(fs.readFileSync('database/002-private-square-test.sql','utf8'));await a.unsafe(fs.readFileSync('database/003-live-checkout.sql','utf8'));
 await a`INSERT INTO samson_bookings(id,request_key,fingerprint,record) VALUES(${id},${id},${id},${a.json({id})})`;
 initialized=true;process.env.SAMSON_HOSTED_TEST='1';
 const make=sql=>load('app/zoho-trial/runtime-store.ts',{'./server':{secretDir:'unused'},'./postgres-booking-store':{...db,bookingDatabaseConnection:()=>sql}}),first=make(a),other=make(b);
 await assert.rejects(first.saveSquareState(id,{phase:'pending'}),/shared lock/);
 const unlock=await first.squareStateLock(id);
 try{
  await assert.rejects(other.squareStateLock(id),/Another test/);
  await first.saveSquareState(id,{phase:'pending'});assert.equal((await other.readSquareState(id)).phase,'pending');
  await first.saveSquareState(id,{phase:'completed',paymentId:'fictional-payment'});assert.equal((await make(b).readSquareState(id)).paymentId,'fictional-payment');
  const lock=a`SELECT 1`;await lock;
 }finally{await unlock()}
 const sandboxUnlock=await first.squareStateLock(id);const liveUnlock=await other.squareStateLock(id,'production');try{assert.equal(await other.readSquareState(id,'production'),null);await other.saveSquareState(id,{environment:'production',phase:'pending',reference:'SLIVE-fixture'},'production');assert.equal((await first.readSquareState(id,'production')).environment,'production');assert.equal((await first.readSquareState(id)).phase,'completed')}finally{await liveUnlock();await sandboxUnlock()}
 const secondUnlock=await other.squareStateLock(id);try{assert.equal((await other.readSquareState(id)).phase,'completed')}finally{await secondUnlock()}
 console.log('PASS: real two-connection payment lock, durable pending evidence, restart reads, unlock/reacquire, and writes without a lock rejected. Local isolated database only; no funds or Zoho calls.');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{
 if(old===undefined)delete process.env.SAMSON_HOSTED_TEST;else process.env.SAMSON_HOSTED_TEST=old;
 try{if(initialized){await a`DELETE FROM samson_live_payment_state WHERE booking_id=${id}`;await a`DELETE FROM samson_test_payment_state WHERE booking_id=${id}`;await a`DELETE FROM samson_bookings WHERE id=${id}`}}finally{await Promise.all([a.end({timeout:3}),b.end({timeout:3})])}
});
