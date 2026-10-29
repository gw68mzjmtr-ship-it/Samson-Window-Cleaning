import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {bookingDatabaseConnection,PostgresBookingStore} from './postgres-booking-store';
import {secretDir} from './server';
const directory=()=>path.join(secretDir,'square-tests');
let database:ReturnType<typeof bookingDatabaseConnection>|undefined;
let bookingStore:PostgresBookingStore|undefined;
const paymentLocks=new Map<string,{sql:Awaited<ReturnType<ReturnType<typeof bookingDatabaseConnection>['reserve']>>;pid:number}>();
export function hostedRuntime(){return process.env.SAMSON_HOSTED_TEST==='1'}
export function sharedDatabase(){
 if(!hostedRuntime())throw Error('Shared runtime is not enabled');
 return database??=bookingDatabaseConnection(process.env.SAMSON_BOOKING_DATABASE_URL||'');
}
export function sharedBookings(){return bookingStore??=new PostgresBookingStore(sharedDatabase())}
function validId(id:string){if(!/^[a-f0-9]{48}$/.test(id))throw Error('Invalid booking reference')}
export async function readSquareState<T>(id:string,channel:'sandbox'|'production'='sandbox'):Promise<T|null>{
 validId(id);if(channel==='production'&&!hostedRuntime())throw Error('Live payments require shared storage');
 if(hostedRuntime()){const sql=paymentLocks.get(channel+id)?.sql||sharedDatabase();const table=channel==='production'?'samson_live_payment_state':'samson_test_payment_state';const rows=await sql`SELECT record FROM ${sql(table)} WHERE booking_id=${id}`;return rows[0]?.record as T||null}
 try{return JSON.parse(await readFile(path.join(directory(),id+'.json'),'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error}
}
export async function saveSquareState(id:string,state:object,channel:'sandbox'|'production'='sandbox'){
 validId(id);if(channel==='production'&&!hostedRuntime())throw Error('Live payments require shared storage');
 if(hostedRuntime()){
  const lock=paymentLocks.get(channel+id);if(!lock)throw Error('Payment writes require the shared lock');const sql=lock.sql,lockClass=channel==='production'?726197124:726197123,table=channel==='production'?'samson_live_payment_state':'samson_test_payment_state';
  await sql.unsafe('BEGIN');try{
  const [owned]=await sql`SELECT pg_backend_pid() AS pid, EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND classid=${lockClass} AND objid=(hashtext(${id})::bigint & 4294967295)::oid AND granted) AS held`;
  if(Number(owned.pid)!==lock.pid||!owned.held)throw Error('Payment lock changed; stop for review');
  await sql`INSERT INTO ${sql(table)}(booking_id,record) VALUES(${id},${sql.json(JSON.parse(JSON.stringify(state)))}) ON CONFLICT(booking_id) DO UPDATE SET record=EXCLUDED.record,updated_at=now()`;await sql.unsafe('COMMIT');return;
  }catch(error){try{await sql.unsafe('ROLLBACK')}catch{}throw error}
 }
 await mkdir(directory(),{recursive:true});const file=path.join(directory(),id+'.json'),temp=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(state),{mode:0o600});await rename(temp,file);
}
export async function squareStateLock(id:string,channel:'sandbox'|'production'='sandbox'){
 validId(id);if(channel==='production'&&!hostedRuntime())throw Error('Live payments require shared storage');
 if(hostedRuntime()){
  if(paymentLocks.has(channel+id))throw Error('Another test payment update is running');
  const sql=await sharedDatabase().reserve(),lockClass=channel==='production'?726197124:726197123;let acquired=false;
  try{const [row]=await sql`SELECT pg_backend_pid() AS pid, pg_try_advisory_lock(${lockClass},hashtext(${id})) AS acquired`;acquired=!!row.acquired;if(!acquired)throw Error('Another test payment update is running');
   paymentLocks.set(channel+id,{sql,pid:Number(row.pid)});
   return async()=>{paymentLocks.delete(channel+id);try{await sql`SELECT pg_advisory_unlock(${lockClass},hashtext(${id}))`}finally{sql.release()}};
  }catch(error){sql.release();throw error}
 }
 await mkdir(directory(),{recursive:true});const file=path.join(directory(),id+'.json.lock'),handle=await open(file,'wx',0o600);return async()=>{await handle.close();await unlink(file)};
}
