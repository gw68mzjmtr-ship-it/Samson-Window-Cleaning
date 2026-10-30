// Limit display-only calendar traffic across visitors on this server. Booking
// creation and payment confirmation retain their own uncached availability reads.
let active=0;
const waiting:{start:()=>void}[]=[];
export async function withCalendarRead<T>(read:()=>Promise<T>):Promise<T>{
 if(active>=2){
  if(waiting.length>=40)throw Error('Calendar is busy; please refresh shortly.');
  await new Promise<void>((resolve,reject)=>{
   const entry={start:()=>{clearTimeout(timer);resolve()}};
   const timer=setTimeout(()=>{const index=waiting.indexOf(entry);if(index>=0)waiting.splice(index,1);reject(Error('Calendar lookup timed out; please refresh.'))},25000);
   waiting.push(entry);
  });
 }else active++;
 try{return await read()}finally{const next=waiting.shift();if(next)next.start();else active--}
}
