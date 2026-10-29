'use client';
import {useState} from 'react';
type Answer={mode:'routine'|'owner';reason:string;reply:string};
export default function MessagePreview(){
 const [message,setMessage]=useState('Do I need to remove my screens?'),[answer,setAnswer]=useState<Answer|null>(null),[busy,setBusy]=useState(false);
 async function preview(){setBusy(true);try{const response=await fetch('/api/zoho/message-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});if(!response.ok)throw Error();setAnswer(await response.json())}catch{setAnswer({mode:'owner',reason:'Preview unavailable',reply:'No message was sent. Please check the connection.'})}finally{setBusy(false)}}
 return <section className="bwPanel"><h2>Try a routine customer question</h2><p>This demonstrates the approved reply rules and sends nothing. The separate scheduled Gmail assistant handles new business email; this form remains a preview. Questions about dates need a verified customer booking; refunds, changes and complaints come to you.</p><label htmlFor="customer-question">Customer message</label><textarea id="customer-question" maxLength={2000} value={message} onChange={e=>{setMessage(e.target.value);setAnswer(null)}} rows={3} style={{display:'block',width:'100%',margin:'12px 0',padding:14,background:'#182432',color:'#fff',border:'1px solid #64748b',borderRadius:8}}/><button className="bwPrimary" onClick={()=>void preview()} disabled={busy}>{busy?'Preparing…':'Preview the response'}</button>{answer&&<div role="status" style={{padding:18,marginTop:16,border:'1px solid #64748b',borderRadius:8}}><h3>{answer.mode==='routine'?'Routine reply prepared':'Needs your attention'}</h3><p>{answer.reason}</p><p>{answer.reply}</p><small>Preview only · nothing sent</small></div>}</section>;
}

