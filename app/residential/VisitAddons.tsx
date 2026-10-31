'use client';
import {residentialInteriorTypes,residentialMaintenance,residentialVisitCount,type AddonVisits} from './residential-model';
type Props={maintenanceId:string;billingMode?:'per-visit'|'annual-prepay';interiorRequested:boolean;interiorQuantities:number[];screenCount:number;stepLadder:boolean;twoStoryLadder:boolean;value:AddonVisits;onChange:(next:AddonVisits)=>void};
export default function VisitAddons({maintenanceId,billingMode='per-visit',interiorRequested,interiorQuantities,screenCount,stepLadder,twoStoryLadder,value,onChange}:Props){
 const schedule=residentialMaintenance.find(s=>s.id===maintenanceId)!;
 if(!schedule.months)return null;
 const all=Array.from({length:residentialVisitCount(maintenanceId,billingMode)},(_,i)=>i);
 const rows=[...residentialInteriorTypes.flatMap((type,i)=>interiorRequested&&interiorQuantities[i]>0?[{key:type.id,label:type.name+' · '+interiorQuantities[i]+' '+type.unit+'(s)',defaults:[0]}]:[]),...(screenCount>0?[{key:'screens',label:'Screen removal & replacement · '+screenCount+' screen(s)',defaults:all}]:[]),...(stepLadder?[{key:'interior-ladder',label:'Step ladder · one $50 fee per selected visit',defaults:screenCount>0?all:[0]}]:[]),...(twoStoryLadder?[{key:'exterior-ladder',label:'Exterior two-story ladder · one $100 fee per selected visit',defaults:all}]:[])];
 if(!rows.length)return null;
 return <section className="rhVisitAddons" aria-labelledby="rh-visit-addons-title"><h2 id="rh-visit-addons-title">Which visits need these add-ons?</h2><p>Your exterior cleaning stays on every visit. Choose when to include each window type, screen handling and ladder access. Quantities shown above apply only to the visits you select. You can also add or remove selected windows and add-ons on service day; we will confirm the updated scope and price before cleaning begins.</p>{rows.map(row=>{
 const selected=value[row.key]??row.defaults,every=all.every(i=>selected.includes(i));
 return <fieldset key={row.key}><legend>{row.label}</legend><label>Include on <select aria-label={row.label+' visit frequency'} value={every?'every':'selected'} onChange={e=>onChange({...value,[row.key]:e.target.value==='every'?all:[0]})}><option value="every">Every visit</option><option value="selected">Selected visits</option></select></label>{!every&&<div className="rhAddonVisitChoices">{all.map(i=><label key={i}><input type="checkbox" checked={selected.includes(i)} onChange={e=>onChange({...value,[row.key]:e.target.checked?[...selected,i].sort((a,b)=>a-b):selected.filter(v=>v!==i)})}/>{i===0?'Initial cleaning':'Repeat '+i+' · month '+i*schedule.months}</label>)}</div>}{selected.length===0&&<small>Not included on any visit. Select a visit to include this add-on.</small>}</fieldset>;
 })}<small>Step-ladder access is charged once only when selected windows or screens are included on that visit. Changing cleaning frequency resets these visit choices.</small></section>;
}

