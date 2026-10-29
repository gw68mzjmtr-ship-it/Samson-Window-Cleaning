// Shared by Edge middleware and server handlers. Hosting remains opt-in and
// locked until an exact HTTPS origin and a private access key are configured.
export function hostedTestOrigin(){
 if(process.env.SAMSON_HOSTED_TEST!=='1')return null;
 try{const u=new URL(process.env.SAMSON_TEST_ORIGIN||(process.env.RENDER==='true'?process.env.RENDER_EXTERNAL_URL:'')||'');
  if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||!/^[-A-Za-z0-9_]{43,128}$/.test(process.env.SAMSON_TEST_ACCESS_KEY||''))return null;
  return u.origin;
 }catch{return null}
}
export function testHostAllowed(host:string|null){
 if(process.env.SAMSON_HOSTED_TEST==='1'){const origin=hostedTestOrigin();return !!origin&&host===new URL(origin).host}
 return process.env.SAMSON_ZOHO_TRIAL==='1'&&host==='127.0.0.1:3105';
}
export function testOrigin(){return hostedTestOrigin()||'http://127.0.0.1:3105'}
export async function hostedTestAuthorized(authorization:string|null){
 const key=process.env.SAMSON_TEST_ACCESS_KEY;
 if(!hostedTestOrigin()||!key||!authorization?.startsWith('Basic ')||authorization.length>512)return false;
 let supplied:string;try{supplied=atob(authorization.slice(6))}catch{return false}
 const encoder=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(supplied)),crypto.subtle.digest('SHA-256',encoder.encode('samson:'+key))]);
 const left=new Uint8Array(a),right=new Uint8Array(b);let difference=0;for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;
}
export function hostedTestRouteAllowed(path:string){
 // Older administrative/OAuth experiments stay local. No public mutation API.
 return !path.startsWith('/api/zoho/')||['availability','calculator-preview','checkout','square-test','square-test-sync','message-preview'].some(name=>path==='/api/zoho/'+name);
}
