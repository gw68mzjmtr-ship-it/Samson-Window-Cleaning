'use client';
import {useCallback,useState,useEffect,useRef} from 'react';
import ResidentialCalendar from '../residential/ResidentialCalendar';
import {residentialOrderSnapshot,type ResidentialSelection} from '../residential/residential-integration';
import type {ResidentialVisit} from '../residential/residential-scheduling';
import TrialInvoice from './trial-invoice';
import TrialCheckout from './trial-checkout';
const usd=(cents:number)=>(cents/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default function TrialCalculator({selection}:{selection:ResidentialSelection}){
 const [visits,setVisits]=useState<ResidentialVisit[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState<{error?:string;initialTotalCents?:number;repeatTotalCents?:number;visitCount?:number;checkedAt?:string}|null>(null);
 const [transfer,setTransfer]=useState<{error?:string;orderId?:string;totalCents?:number;phase?:string;notice?:string}|null>(null);
 const onSelection=useCallback((next:ResidentialVisit[],valid:boolean)=>{setVisits(next);setReady(valid);setResult(null)},[]);
 const signature=JSON.stringify({selection,visits}),latest=useRef(signature);latest.current=signature;
 useEffect(()=>{setResult(null);setTransfer(null)},[signature]);
 let snapshot;try{snapshot=residentialOrderSnapshot(selection,true)}catch{return <p>Custom scope review is needed before a trial booking can proceed.</p>}
 async function validate(){const requested=signature;setBusy(true);setResult(null);try{const response=await fetch('/api/zoho/calculator-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:requested});const result=await response.json();if(latest.current===requested)setResult(result)}catch{if(latest.current===requested)setResult({error:'The selection could not be verified. No records or payments were created.'})}finally{setBusy(false)}}
 async function transferPrice(){const requested=signature;setBusy(true);try{const response=await fetch('/api/zoho/control-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'create-calculator-price-test',confirm:'FICTIONAL_RECORDS_ONLY',selection})});const value=await response.json();if(latest.current===requested)setTransfer(value)}catch{setTransfer({error:'The result could not be confirmed. Review the existing test records before retrying.'})}finally{setBusy(false)}}
 return <section style={{marginTop:36}}>
 <h2>Private integration trial</h2><p>Uses your actual calculator choices. This section previews the proposed upfront maintenance discount. No payment, fee or saved-card authorization is active.</p>
 <dl>{snapshot.initialLines.map(line=><div key={line.key} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'8px 0'}}><dt>{line.label} · {line.quantity} × {usd(line.unitPriceCents)}</dt><dd>{usd(line.amountCents)}</dd></div>)}</dl>
 {snapshot.visitOrders.map(visit=>(visit.serviceNotes||[]).map(note=><p key={visit.index+'-'+note}>{visit.index===0?'Initial cleaning':'Repeat '+visit.index}: {note}</p>))}<p><strong>{selection.billingMode==='annual-prepay'?'Prepaid year due today':'Trial initial total'}: {usd(snapshot.initialTotalCents)}</strong></p>
 {snapshot.maintenance.id!=='once'&&(selection.billingMode!=='annual-prepay'||snapshot.maintenance.id==='annual')&&<><p>Exterior maintenance discount: {snapshot.maintenance.discountPercent}% · {usd(snapshot.maintenance.initialDiscountCents)} on the first visit.</p><div><strong>Estimated repeat visits</strong>{snapshot.visitOrders.slice(1).map(visit=><p key={visit.index}>Repeat {visit.index}: {usd(visit.totalCents)} · {visit.lines.map(line=>line.label).join("; ")}</p>)}</div><p>Proposed maximum first-visit discount adjustment: {usd(snapshot.maintenance.maximumInitialDiscountReversalCents)}, only under accepted terms after a completed first cleaning. Draft policy only; no adjustment will be charged by this trial.</p></>}
 <TrialInvoice key={JSON.stringify(selection)} selection={selection}/>
 <div style={{maxWidth:760}}><ResidentialCalendar key={selection.maintenanceId+'-'+selection.billingMode} billingMode={selection.billingMode} maintenanceId={selection.maintenanceId} paid={false} enabled={true} planName={snapshot.plan} initialTotal={snapshot.initialTotalCents/100} repeatTotal={snapshot.repeatTotalCents/100} visitTotals={snapshot.visitOrders.map(visit=>visit.totalCents/100)} onSelectionChange={onSelection} onEdit={()=>{}} liveAvailability/></div>
 <TrialCheckout selection={selection} visits={visits} ready={ready}/>
 <button type="button" className="bwPrimary" disabled={!ready||busy} onClick={validate}>{busy?'Rechecking all dates and prices…':'Validate the complete test selection'}</button>
 {result&&<div role="status" style={{padding:20,border:'1px solid #405063',marginTop:20}}>{result.error?<p>{result.error}</p>:<><h3>Server prices and Zoho availability matched</h3><p>Initial total: {usd(result.initialTotalCents!)} · Repeat total: {usd(result.repeatTotalCents!)}</p><p>{result.visitCount} selected windows rechecked with Zoho. No appointment is reserved and no payment was taken.</p><button type="button" className="bwPrimary" disabled={busy||!!transfer} onClick={transferPrice}>Transfer pricing to a fictional Zoho work order</button><p>This next test checks every selected item and quantity inside Zoho. It uses the existing fictional contact and creates no appointment, invoice or charge. The required private trial permissions must be approved.</p></>}</div>}
 {transfer&&<div role="status">{transfer.error?<p>{transfer.error}</p>:<><h3>Calculator pricing transferred</h3><p>Verified Zoho total: {usd(transfer.totalCents!)}.</p><p>{transfer.notice}</p><a href={'https://fsm.zoho.com/fsm/944363020#/tab/Work_Orders/'+transfer.orderId}>Open the fictional pricing work order →</a></>}</div>}
 </section>
}




