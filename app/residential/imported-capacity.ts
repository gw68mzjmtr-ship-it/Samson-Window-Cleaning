type ImportedAppointment={Summary?:string;Status?:string;Scheduled_Start_Date_Time?:string;Scheduled_End_Date_Time?:string};
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function localParts(value:string){const stamp=new Date(value);if(!Number.isFinite(stamp.getTime()))throw Error('Imported appointment time missing');const p=formatter.formatToParts(stamp),get=(key:string)=>p.find(x=>x.type===key)!.value;return {date:get('year')+'-'+get('month')+'-'+get('day'),minute:Number(get('hour'))*60+Number(get('minute'))};}
// Owner-approved capacity mapping for the November migration. Appointment times remain unchanged.
export function importedWindowBlocked(records:ImportedAppointment[],date:string,period:string){
 if(period!=='morning'&&period!=='afternoon')throw Error('Invalid period');
 return records.some(record=>{
  if(!record.Summary?.startsWith('HCP #')||!record.Summary.includes('[November 2026 import]')||['Cancelled','Completed','Cannot Complete','Terminated'].includes(record.Status||''))return false;
  const start=localParts(record.Scheduled_Start_Date_Time||''),end=localParts(record.Scheduled_End_Date_Time||'');
  if(start.date>date||end.date<date)return false;
  const from=start.date<date?0:start.minute,to=end.date>date?1440:end.minute;
  return period==='morning'?from<780&&to>0:from<1440&&to>780;
 });
}
