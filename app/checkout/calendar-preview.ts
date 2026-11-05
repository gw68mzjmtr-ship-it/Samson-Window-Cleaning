import {checkAvailabilityWindow,readAvailabilityContext} from './zoho';

const previewLifetimeMs=60_000;
type PreviewSnapshot={
 expiresAt:number;
 context:ReturnType<typeof readAvailabilityContext>;
 windows:Map<string,Promise<boolean>>;
};
let snapshot:PreviewSnapshot|undefined;

// Calendar browsing shares Zoho reads. Checkout and payment use liveAvailability
// instead, and the preview route checks current booking holds on every request.
export function previewAvailability(visit:Parameters<typeof checkAvailabilityWindow>[0]){
 const now=Date.now();
 if(!snapshot||now>=snapshot.expiresAt){
  const fresh:PreviewSnapshot={
   expiresAt:now+previewLifetimeMs,
   context:readAvailabilityContext(),
   windows:new Map(),
  };
  snapshot=fresh;
  void fresh.context.catch(()=>{if(snapshot===fresh)snapshot=undefined});
 }
 const current=snapshot;
 const key=visit.date+'/'+visit.period;
 const existing=current.windows.get(key);
 if(existing)return existing;
 const check=current.context.then(context=>checkAvailabilityWindow(visit,context));
 current.windows.set(key,check);
 void check.catch(()=>{current.windows.delete(key)});
 return check;
}
