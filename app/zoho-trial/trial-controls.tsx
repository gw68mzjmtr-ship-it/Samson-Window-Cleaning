'use client';
import {useState} from 'react';
export default function TrialControls(){
 const [busy,setBusy]=useState(false),[result,setResult]=useState<unknown>(null);
 async function run(operation:string){setBusy(true);try{const response=await fetch('/api/zoho/control-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,confirm:'FICTIONAL_RECORDS_ONLY'})});setResult(await response.json())}catch{setResult({error:'Test result could not be confirmed. Review existing trial records before retrying.'})}finally{setBusy(false)}}
 return <><p>These owner-only tests affect clearly labeled fictional records. No deletion, invoice, refund or card charge is available.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button className="bwPrimary" disabled={busy} onClick={()=>run('status')}>Read maintenance and appointment test status</button><button className="bwPrimary" disabled={busy} onClick={()=>run('create-and-pause-maintenance-test')}>Test website maintenance creation and pause</button><button className="bwPrimary" disabled={busy} onClick={()=>run('cancel-original-occupancy-test')}>Test website cancellation of AP-1</button></div>{!!result&&<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:13,padding:20}}>{JSON.stringify(result,null,2)}</pre>}</>
}

