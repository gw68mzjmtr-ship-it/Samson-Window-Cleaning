const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const m=new Module('calendar-read-queue');m._compile(ts.transpileModule(fs.readFileSync('app/checkout/calendar-read-queue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'calendar-read-queue.js');
const {withCalendarRead}=m.exports;
(async()=>{let active=0,maximum=0;const started=[],releases=[];
const tasks=Array.from({length:6},(_,i)=>withCalendarRead(async()=>{active++;maximum=Math.max(maximum,active);started.push(i);try{await new Promise(resolve=>releases.push(resolve));if(i===2)throw Error('Provider failure');return i}finally{active--}}));
const settled=Promise.allSettled(tasks);
await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(started,[0,1]);
for(let i=0;i<6;i++){assert(releases[i]);releases[i]();await new Promise(resolve=>setImmediate(resolve))}
const results=await settled;assert.equal(maximum,2);assert.equal(active,0);assert.deepEqual(started,[0,1,2,3,4,5]);assert.equal(results.filter(r=>r.status==='fulfilled').length,5);assert.equal(results[2].reason.message,'Provider failure');assert.equal(await withCalendarRead(async()=>42),42);
console.log('PASS: six concurrent calendar readers are limited to two, preserve FIFO order, surface provider failures and release capacity after errors. No availability caching or external calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
