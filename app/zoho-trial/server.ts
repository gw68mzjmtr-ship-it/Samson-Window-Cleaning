import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {testHostAllowed,testOrigin,hostedTestAuthorized,hostedTestRouteAllowed} from './test-host';
export const trialOrigin=testOrigin();
export const callbackUrl=trialOrigin+'/api/zoho/callback';
export const readScopes=['ZohoFSM.users.READ','ZohoFSM.modules.Service_And_Parts.READ','ZohoFSM.modules.WorkOrders.READ','ZohoFSM.modules.ServiceAppointments.READ','ZohoFSM.modules.custom.READ'];
export const bookingScopes=[...readScopes,'ZohoFSM.modules.Contacts.READ','ZohoFSM.modules.Contacts.CREATE','ZohoFSM.modules.WorkOrders.CREATE','ZohoFSM.modules.ServiceAppointments.CREATE'];
export const validationScopes=[...bookingScopes,'ZohoFSM.modules.Service_And_Parts.CREATE','ZohoFSM.modules.ScheduledMaintenances.READ','ZohoFSM.modules.ScheduledMaintenances.CREATE','ZohoFSM.modules.ScheduledMaintenances.UPDATE','ZohoFSM.modules.serviceappointments.UPDATE'];
export const invoiceScopes=[...validationScopes,'ZohoInvoice.contacts.READ','ZohoInvoice.contacts.CREATE','ZohoInvoice.invoices.READ','ZohoInvoice.invoices.CREATE'];
export const paymentRecordScopes=[...invoiceScopes,'ZohoInvoice.customerpayments.READ','ZohoInvoice.customerpayments.CREATE'];
export const secretDir=path.join(process.cwd(),'.local-secrets');
export function localTrialAllowed(host:string|null){return testHostAllowed(host)}
export async function checkLocalRequest(req:Request,post=false){if(!localTrialAllowed(req.headers.get('host'))||(post&&req.headers.get('origin')!==trialOrigin))throw Error('LOCAL_ONLY');if(process.env.SAMSON_HOSTED_TEST==='1'&&(!hostedTestRouteAllowed(new URL(req.url).pathname)||!await hostedTestAuthorized(req.headers.get('authorization'))))throw Error('PRIVATE_TEST_ONLY')}
export async function clientConfig(){const config=process.env.SAMSON_HOSTED_TEST==='1'?{client_id:process.env.SAMSON_ZOHO_CLIENT_ID,client_secret:process.env.SAMSON_ZOHO_CLIENT_SECRET}:JSON.parse(await readFile(path.join(secretDir,'zoho-client.json'),'utf8'));if(typeof config.client_id!=='string'||typeof config.client_secret!=='string'||!config.client_id||!config.client_secret)throw Error('NOT_CONFIGURED');return config as {client_id:string;client_secret:string}}
type Token={access_token:string;refresh_token?:string;expires_at:number;bookingApproved?:boolean;validationApproved?:boolean;invoiceApproved?:boolean;paymentRecordsApproved?:boolean};
let hostedToken:Token|undefined;
async function readToken():Promise<Token>{if(process.env.SAMSON_HOSTED_TEST==='1'){if(hostedToken)return hostedToken;const raw=process.env.SAMSON_ZOHO_TEST_TOKEN_JSON;if(!raw)throw Error('NOT_CONFIGURED');return hostedToken=JSON.parse(raw)}return JSON.parse(await readFile(path.join(secretDir,'zoho-token.json'),'utf8'))}
export async function paymentRecordAccessApproved(){return (await readToken()).paymentRecordsApproved===true}
export async function saveToken(token:Token){if(process.env.SAMSON_HOSTED_TEST==='1'){hostedToken=token;return}await mkdir(secretDir,{recursive:true});const destination=path.join(secretDir,'zoho-token.json'),temp=destination+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(token),{mode:0o600});await rename(temp,destination)}
export async function connectionStatus(){let configured=false,connected=false,bookingApproved=false,validationApproved=false,invoiceApproved=false;try{await clientConfig();configured=true}catch{}try{const token=await readToken();connected=!!token.refresh_token||token.expires_at>Date.now();bookingApproved=connected&&token.bookingApproved===true;validationApproved=connected&&token.validationApproved===true;invoiceApproved=connected&&token.invoiceApproved===true}catch{}return {configured,connected,bookingApproved,validationApproved,invoiceApproved}}
export async function tokenRequest(params:Record<string,string>){const response=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',body:new URLSearchParams(params),cache:'no-store',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok||typeof result.access_token!=='string')throw Error('TOKEN_EXCHANGE_FAILED');return {access_token:result.access_token,refresh_token:result.refresh_token as string|undefined,expires_at:Date.now()+Number(result.expires_in??3600)*1000-60000}}
let refreshing:Promise<Token>|null=null;
async function accessToken(){const token=await readToken();if(token.expires_at>Date.now())return token.access_token;if(!token.refresh_token)throw Error('RECONNECT_REQUIRED');if(!refreshing){refreshing=(async()=>{const client=await clientConfig();const updated:Token=await tokenRequest({...client,grant_type:'refresh_token',refresh_token:token.refresh_token!});updated.refresh_token=updated.refresh_token||token.refresh_token;updated.bookingApproved=token.bookingApproved;updated.validationApproved=token.validationApproved;updated.invoiceApproved=token.invoiceApproved;updated.paymentRecordsApproved=token.paymentRecordsApproved;await saveToken(updated);return updated})().finally(()=>{refreshing=null})}return (await refreshing).access_token}
export class ZohoQueryError extends Error {constructor(public code:string){super('Zoho request failed')}}
async function api(endpoint:string,method:'GET'|'POST'|'PUT',body?:object){
 const token=await accessToken();
 const response=await fetch('https://fsm.zoho.com/fsm/v1/'+endpoint,{method,headers:{Authorization:'Zoho-oauthtoken '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(response.status===204)return {};
 const result=await response.json();
 if(!response.ok||result.status==='error'||(result.code&&result.code!=='SUCCESS'&&!result.data&&!result.users))throw new ZohoQueryError(typeof result.code==='string'?result.code:'API_ERROR');
 return result;
}
type ReadEndpoint='users'|'Contacts'|'Service_And_Parts'|'Work_Orders'|'Service_Appointments'|'Service_Resources/Available_TimeSlots';
// Only fixed collection reads, plus the availability query, are exposed.
export async function trialRead(endpoint:ReadEndpoint,body?:object){return api(endpoint,body?'POST':'GET',body)}
// The isolated fictional-booking test is the only caller; no arbitrary endpoint or update access.
export async function trialCreate(endpoint:'Contacts'|'Work_Orders'|'Service_Appointments',body:object){
 if(!(await connectionStatus()).bookingApproved)throw Error('BOOKING_PERMISSION_REQUIRED');
 return api(endpoint,'POST',body);
}



export async function trialValidationApi(endpoint:string,method:'GET'|'POST'|'PUT',body?:object){
 if(!(await connectionStatus()).validationApproved)throw Error('VALIDATION_PERMISSION_REQUIRED');
 const collection=endpoint==='Scheduled_Maintenances'||endpoint==='Service_And_Parts';
 const appointmentAction=/^Service_Appointments\/[0-9]+\/actions\/blueprint(?:\/transitions)?$/.test(endpoint);
 const maintenanceAction=/^Scheduled_Maintenances\/[0-9]+\/(?:enable|disable)$/.test(endpoint);
 if(!(collection&&method!=='PUT')&&!(appointmentAction&&(method==='GET'||method==='PUT'))&&!(maintenanceAction&&method==='PUT'))throw Error('TEST_ENDPOINT_NOT_ALLOWED');
 return api(endpoint,method,body);
}


// Read every appointment page before deriving occupied capacity; never silently ignore later pages.
export async function trialAppointments(){const records=[];for(let page=1;page<=5;page++){const result=await api('Service_Appointments?page='+page+'&per_page=200','GET');records.push(...(result.data||[]));if(!result.info?.more_records)return records;}throw Error('Appointment pagination limit reached');}

// Fixed organization and narrow endpoints: no manual payments, refunds, email or deletion.
export async function trialInvoiceApi(endpoint:string,method:'GET'|'POST',body?:object){
 if(!(await connectionStatus()).invoiceApproved)throw Error('INVOICE_PERMISSION_REQUIRED');
 const read=method==='GET'&&/^(?:contacts\/[0-9]+|invoices\/[0-9]+(?:\/payments)?)$/.test(endpoint);
 const markSent=method==='POST'&&/^invoices\/[0-9]+\/status\/sent$/.test(endpoint);
 const paymentRecord=(method==='POST'&&endpoint==='customerpayments')||(method==='GET'&&/^customerpayments\/[0-9]+$/.test(endpoint));
 if(paymentRecord&&!(await readToken()).paymentRecordsApproved)throw Error('PAYMENT_RECORD_PERMISSION_REQUIRED');
 if(!read&&!markSent&&!paymentRecord&&!(method==='POST'&&(endpoint==='invoices'||endpoint==='contacts')))throw Error('INVOICE_ENDPOINT_NOT_ALLOWED');
 const token=await accessToken();
 const response=await fetch('https://www.zohoapis.com/invoice/v3/'+endpoint,{method,headers:{Authorization:'Zoho-oauthtoken '+token,'X-com-zoho-invoice-organizationid':'944362366','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok||result.code!==0)throw Error('INVOICE_REQUEST_FAILED');
 return result;
}

export async function trialRecord(collection:'Work_Orders'|'Contacts',id:string){if(!/^[0-9]+$/.test(id))throw Error('Invalid record');return api(collection+'/'+id,'GET')}



