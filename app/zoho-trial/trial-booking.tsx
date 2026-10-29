'use client';
import {useState} from 'react';
type Result={error?:string;phase?:string;total?:number;contactId?:string;orderId?:string;appointmentId?:string;notice?:string};
export default function TrialBooking({approved}:{approved:boolean}){
 const [busy,setBusy]=useState(false),[result,setResult]=useState<Result|null>(null);
 async function run(){setBusy(true);try{const response=await fetch('/api/zoho/booking-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:'CREATE_ONE_FICTIONAL_TEST_BOOKING'})});setResult(await response.json())}catch{setResult({error:'The result could not be confirmed. Review Zoho before retrying.'})}finally{setBusy(false)}}
 return <section className="bwPanel" style={{marginTop:24}}>
 <h2>Next test: one website selection → one Zoho booking</h2>
 <p>This controlled trial creates a fictional contact, a work order and a scheduled appointment. It uses the selection below, without entering those details again inside Zoho.</p>
 <div style={{padding:20,border:'1px solid #405063',borderRadius:12}}>
 <p><strong>Fictional customer:</strong> SAMSON TEST Website Booking</p>
 <p><strong>Contact:</strong> samson-website-trial@example.invalid · not a deliverable email</p>
 <p><strong>Address:</strong> A clearly labeled fictional test address in Raleigh.</p>
 <p>Premium exterior cleaning: $599<br/>2 standard interior windows: $20<br/><strong>Test job total: $619</strong></p>
 <p><strong>Requested window:</strong> Friday, October 30, 2026 · 8–11 a.m. Eastern</p>
 </div>
 <p>The test checks availability again before creating records and asks Zoho to reject an overlapping appointment. A private progress record blocks repeated submissions. No invoice, payment, dispatch or customer message is requested.</p>
 {!approved?<><p><strong>Additional permission required:</strong> read contacts and create contacts, work orders and appointments. This adds persistent record-creation access; it does not grant editing, deletion, invoicing or payment access.</p><form action="/api/zoho/connect?mode=booking" method="post"><button className="bwPrimary">Review additional Zoho permissions →</button></form></>:<button className="bwPrimary" onClick={run} disabled={busy||!!result}>{busy?'Creating the fictional test booking…':'Create the single fictional test booking'}</button>}
 {result&&<div aria-live="polite" style={{marginTop:20}}>{result.error?<p role="alert">{result.error}</p>:<><h3>Test booking created</h3><p>Total: ${result.total?.toFixed(2)} · No payment taken.</p><p>{result.notice}</p>{result.orderId&&<a href={'https://fsm.zoho.com/fsm/944363020#/tab/Work_Orders/'+result.orderId+'?tab=Service_Appointments'}>Open the test booking in Zoho →</a>}</>}<p>Test status: {result.phase||'unconfirmed'}</p></div>}
 </section>
}

