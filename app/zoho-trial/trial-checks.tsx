'use client';
import {useState} from 'react';
type Result={error?:string;checkedAt?:string;order?:{reference:string;total:number};services?:{name:string;price:number}[];windows?:{label:string;start:string;end:string;available:boolean}[];notice?:string};
export default function TrialChecks(){
 const [result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false);
 async function run(){setBusy(true);setResult(null);try{const response=await fetch('/api/zoho/test',{method:'POST'});setResult(await response.json())}catch{setResult({error:'Connection check unavailable. No records were changed.'})}finally{setBusy(false)}}
 const time=(date:string)=>new Date(date).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
 return <><button className="bwPrimary" onClick={run} disabled={busy}>{busy?'Checking Zoho…':'Read the test job, prices & availability'}</button>
 {result&&<div aria-live="polite" style={{marginTop:24}}>{result.error?<p role="alert">{result.error}</p>:<>
 <h3>Live Zoho results</h3><p>Test work order {result.order?.reference}: <strong>${result.order?.total.toFixed(2)}</strong>. No payment taken.</p>
 {result.services?.map(service=><p key={service.name}>{service.name.replace('SAMSON TEST — ','')}: <strong>${service.price.toFixed(2)}</strong></p>)}
 <h3>Your service windows · Eastern time</h3>
 {result.windows?.map(window=><div key={window.start} style={{padding:16,marginBottom:10,border:'1px solid #405063',borderRadius:10}}><strong>{window.label}</strong><br/>{time(window.start)}–{time(window.end)}<p style={{color:window.available?'#7ee7a1':'#ffae93',marginBottom:0}}>{window.available?'Available at the time of this check':'Unavailable — do not offer this window'}</p></div>)}
 <p>{result.notice}</p><p>Checked {new Date(result.checkedAt!).toLocaleString('en-US',{timeZone:'America/New_York'})} Eastern.</p>
 </>}</div>}</>
}

