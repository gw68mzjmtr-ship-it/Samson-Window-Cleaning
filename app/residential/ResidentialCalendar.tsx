'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {calendarCells,residentialMaintenance,sampleDateAvailable,serviceHolidayName,serviceDateClosureReason} from './residential-model';
import {addCalendarMonths,emptyVisit,repeatMonthOffsets,sampleRepeatDateAvailable,servicePeriods,validateVisitSeries,visitComplete,type ResidentialVisit} from './residential-scheduling';
import './scheduling.css';
const fullDate=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
const monthLabel=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2});
const windowLabel=(value:string)=>servicePeriods.find(period=>period.id===value)?.label||'';
function todayEastern(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return parts.find(p=>p.type==='year')!.value+'-'+parts.find(p=>p.type==='month')!.value+'-'+parts.find(p=>p.type==='day')!.value;}
type LiveCheck={windows:{period:string;available:boolean}[];checkedAt:string};
type Props={availabilityEndpoint?:string;checkoutMode?:boolean;billingMode?:'per-visit'|'annual-prepay';maintenanceId:string;paid:boolean;enabled:boolean;planName:string;initialTotal:number;repeatTotal:number;onSelectionChange:(visits:ResidentialVisit[],ready:boolean)=>void;onEdit:()=>void;liveAvailability?:boolean;visitTotals?:number[]};
export default function ResidentialCalendar({availabilityEndpoint='/api/zoho/availability',checkoutMode=false,billingMode='per-visit',maintenanceId,paid,enabled,planName,initialTotal,repeatTotal,onSelectionChange,onEdit,liveAvailability=false,visitTotals}:Props){
 const [today]=useState(todayEastern),[active,setActive]=useState(0),[monthOffset,setMonthOffset]=useState(0);
 const offsets=repeatMonthOffsets(maintenanceId,billingMode);const schedule=residentialMaintenance.find(s=>s.id===maintenanceId)!;
 const [visits,setVisits]=useState<ResidentialVisit[]>(()=>offsets.map(emptyVisit));
 const selected=visits[active]||emptyVisit();const initialDate=visits[0].date;
 const anchor=active===0?addCalendarMonths(today,monthOffset):initialDate?addCalendarMonths(initialDate,offsets[active]):today;
 const [checks,setChecks]=useState<Record<string,LiveCheck>>({}),[checking,setChecking]=useState(false),[availabilityError,setAvailabilityError]=useState(''),[failedDates,setFailedDates]=useState<Record<string,boolean>>({}),[refresh,setRefresh]=useState(0);
 const [year,month]=anchor.split('-').map(Number);const ready=enabled&&validateVisitSeries(maintenanceId,visits,today,billingMode)&&(!liveAvailability||visits.every(v=>checks[v.date]?.windows.some(w=>w.period===v.period&&w.available)));
 useEffect(()=>{onSelectionChange(visits,ready)},[visits,ready,onSelectionChange]);
 const available=(date:string)=>active===0?sampleDateAvailable(date,today):sampleRepeatDateAvailable(date,initialDate,offsets[active]);
 const monthDates=calendarCells(year,month-1).filter((date):date is string=>!!date&&available(date));
 const datesKey=monthDates.join(',');
 useEffect(()=>{
  if(!liveAvailability||!enabled)return;
  const dates=datesKey?datesKey.split(','):[],controller=new AbortController();let cursor=0;
  setChecking(dates.length>0);setAvailabilityError('');setFailedDates({});
  setChecks(previous=>{const next={...previous};for(const date of dates)delete next[date];return next});
  async function worker(){
   while(cursor<dates.length&&!controller.signal.aborted){const date=dates[cursor++];
    try{const response=await fetch(availabilityEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date}),signal:controller.signal});
     const result=await response.json();if(!response.ok||result.date!==date||!Array.isArray(result.windows)||!['morning','afternoon'].every(period=>result.windows.some((w:{period:string;available:boolean})=>w.period===period&&typeof w.available==='boolean')))throw Error('unavailable');
     if(controller.signal.aborted)return;setChecks(previous=>({...previous,[date]:result}));
     setVisits(previous=>previous.map(v=>v.date===date&&v.period&&!result.windows.some((w:{period:string;available:boolean})=>w.period===v.period&&w.available)?{...v,period:''}:v));
    }catch{if(controller.signal.aborted)return;setFailedDates(previous=>({...previous,[date]:true}));setAvailabilityError('Some windows could not be checked. They stay unavailable until a successful refresh.');}
   }
  }
  Promise.all([worker(),worker()]).finally(()=>{if(!controller.signal.aborted)setChecking(false)});
  return ()=>controller.abort();
 },[datesKey,liveAvailability,enabled,refresh,availabilityEndpoint]);
 function update(patch:Partial<ResidentialVisit>){setVisits(previous=>previous.map((visit,i)=>{if(i===active)return {...visit,...patch};if(active===0&&patch.date&&patch.date!==previous[0].date)return emptyVisit();return visit}));}

 return <section className="rhCalendarPanel" aria-labelledby="rh-calendar-title"><h2 id="rh-calendar-title"><CalendarDays size={25}/> Choose your cleaning dates</h2><p className="rhHelp">Choose dates and service windows before payment. Selections are not reserved until payment and booking confirmation. {liveAvailability?checkoutMode?'Available windows are checked against our live schedule.':'This private trial checks Zoho’s live availability. Selecting dates does not collect payment or reserve them.':'This preview uses sample availability, not Housecall Pro’s live calendar.'}</p>{schedule.id!=='once'&&<p className="rhScheduleScope">Select the initial clean plus {offsets.length-1} repeat {offsets.length===2?'visit':'visits'} across the following 12 months. Repeats are planned every {schedule.months} months.</p>}
 <div className="rhVisitTabs" role="group" aria-label="Visits to schedule">{visits.map((visit,i)=><button key={i} type="button" aria-pressed={active===i} disabled={paid||!enabled||(i>0&&!visitComplete(visits[0]))} onClick={()=>setActive(i)}><span>{i===0?'Initial cleaning':schedule.id==='annual'?'Next annual cleaning':'Repeat '+i}{visitComplete(visit)&&<Check size={14}/>}</span><small>{visit.date?fullDate(visit.date):(i===0?'Choose your first date':initialDate?monthLabel(addCalendarMonths(initialDate,offsets[i])):'Choose initial visit first')}</small>{visit.period&&<small>{windowLabel(visit.period)}</small>}</button>)}</div>
 {!enabled&&<p role="status">A valid plan and any required custom scope quote are needed before selecting dates.</p>}
 <div className="rhMonth"><button type="button" aria-label="Previous month" disabled={paid||!enabled||active>0||monthOffset===0} onClick={()=>setMonthOffset(value=>value-1)}><ChevronLeft size={20}/></button><h3 aria-live="polite">{monthLabel(anchor)}</h3><button type="button" aria-label="Next month" disabled={paid||!enabled||active>0||monthOffset>=2} onClick={()=>setMonthOffset(value=>value+1)}><ChevronRight size={20}/></button></div><p className="rhActiveVisit">{active===0?'Initial cleaning date':(schedule.id==='annual'?'Next annual cleaning':'Repeat '+active)+' · choose a date in '+monthLabel(anchor)}</p>
 <p className="rhHelp">Each day has two arrival windows. Choose the top half for 8–11 a.m. or the bottom half for 1–4 p.m. Eastern Time.</p>
 <div className="rhCalendar rhSplitCalendar" role="group" aria-label={liveAvailability?"Live cleaning dates and arrival windows":"Sample cleaning dates and arrival windows"}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day} className="rhDayName">{day}</span>)}{calendarCells(year,month-1).map((date,i)=>{
  if(!date)return <span key={'blank-'+i}/>;
  const eligible=available(date),holiday=serviceHolidayName(date),check=checks[date],failed=failedDates[date];
  return <div key={date} className={'rhSplitDay'+(!eligible?' closed':'')+(selected.date===date?' selected':'')} role="group" aria-label={fullDate(date)+(holiday?' · '+holiday:'')}><span className="rhSplitDayNumber">{Number(date.slice(-2))}</span>{servicePeriods.map(period=>{
   const checked=!liveAvailability||!!check;
   const open=eligible&&checked&&(!liveAvailability||!!check?.windows.some(w=>w.period===period.id&&w.available));
   const status=!eligible?(serviceDateClosureReason(date,today,active===0)||'Outside selected month'):failed?'Check failed':!checked?'Checking…':open?'Available':'Unavailable';
   const chosen=selected.date===date&&selected.period===period.id;
   return <button key={period.id} type="button" className={'rhSplitSlot '+(open?'available':'unavailable')} aria-label={fullDate(date)+' · '+period.label+' · '+status} aria-pressed={chosen} disabled={paid||!enabled||!open} title={holiday||undefined} onClick={()=>update({date,period:period.id})}><span className="rhSplitTime">{period.id==='morning'?'8–11':'1–4'}<span>{period.id==='morning'?' a.m.':' p.m.'}</span></span><span className="rhSplitStatus">{chosen?'Selected':status}</span></button>;
  })}</div>;
 })}</div>
 <p className="rhSplitKey"><span><i className="open"/> Available</span><span><i className="busy"/> Unavailable / closed</span><span><i className="chosen"/> Selected</span></p>
 {liveAvailability&&<><p className="rhHelp" role="status">{checking?'Checking this month’s available windows…':availabilityError||'Live windows checked for this month. Availability can change until booking is confirmed.'}</p><button type="button" className="rhNextVisit" disabled={checking||!enabled||paid} onClick={()=>setRefresh(value=>value+1)}>Refresh this month’s availability</button></>}
 <p className="rhHelp">Weekends and U.S. federal holidays, including observed dates, are closed. Arrival windows are Eastern Time; cleaning duration depends on scope.</p>
 {active<visits.length-1&&<button type="button" className="rhNextVisit" disabled={paid||!enabled||!visitComplete(selected)} onClick={()=>setActive(index=>index+1)}>Choose next repeat visit →</button>}
 <p className="rhBookingReady" role="status">{paid?'Demo payment complete—selected appointments confirmed.':ready?(liveAvailability?'All selected windows were available at their last checks. Nothing is reserved yet.':'All dates and service windows selected. Review the total, then pay to confirm.'):visits.filter(visitComplete).length+' of '+visits.length+' visits selected. Choose a date and service window for every visit.'}</p>
 {ready&&<div className={paid?'rhConfirmation':'rhScheduleReview'}><strong>{paid?'Demo appointments confirmed':'Your selected schedule'}</strong><ol>{visits.map((visit,i)=><li key={i}><b>{i===0?'Initial clean':schedule.id==='annual'?'Next annual cleaning':'Repeat '+i}</b><span>{fullDate(visit.date)} · {windowLabel(visit.period)}</span><small>{i===0?money(visitTotals?.[i]??initialTotal)+(billingMode==='annual-prepay'?' prepaid visit value':' initial total'):money(visitTotals?.[i]??repeatTotal)+(billingMode==='annual-prepay'?' included in yearly prepayment':' estimated visit with selected add-ons, billed separately when due')}</small></li>)}</ol><p>{planName} · {schedule.label}</p><small>{paid?'Preview only: no payment, appointment or email was created.':(liveAvailability?checkoutMode?'Your selected dates and price are rechecked before you pay. Booking confirmation follows successful payment.':'Dates remain unreserved. This private trial does not collect payment. Availability is rechecked before a test selection can proceed.':'Dates remain unreserved. Only the initial cleaning is charged at signup; repeat cleanings are billed separately. All selections are sample dates.')}</small>{paid&&<button type="button" onClick={onEdit}>Edit demo selections</button>}</div>}
 </section>;
}



