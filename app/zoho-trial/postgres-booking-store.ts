import postgres from 'postgres';
import type {BookingStore} from './booking-store';
import type {Booking} from './booking-workflow';

const lockKey=726197122;
export function bookingDatabaseConnection(url:string,localTest=false){
 let parsed:URL;try{parsed=new URL(url)}catch{throw Error('Booking database connection is not configured')}
 if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.username||!parsed.password||!parsed.pathname.slice(1))throw Error('Booking database configuration is incomplete');
 // Session locks require a direct connection, not a transaction-mode pooler.
 if(/pooler|pgbouncer/i.test(parsed.hostname)||parsed.port==='6543')throw Error('Use the direct booking database endpoint');
 const local=localTest&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname);
 if(!local&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname))throw Error('Local databases are allowed only in the isolated test');
 parsed.search='';
 return postgres(parsed.toString(),{max:3,prepare:false,connect_timeout:10,idle_timeout:20,ssl:local?false:{rejectUnauthorized:true},onnotice:()=>{}});
}
export class PostgresBookingStore implements BookingStore {
 private current:postgres.ReservedSql|null=null;
 private backendPid:number|null=null;
 constructor(private sql:postgres.Sql){}
 private connection(){return this.current||this.sql}
 async read(id:string){if(!/^[a-f0-9]{48}$/.test(id))throw Error('Invalid booking reference');const rows=await this.connection()`SELECT record FROM samson_bookings WHERE id=${id}`;if(rows.length!==1)throw Error('Booking not found');return rows[0].record as Booking}
 async records(){const rows=await this.connection()`SELECT record FROM samson_bookings ORDER BY updated_at,id`;return rows.map(row=>row.record as Booking)}
 async locked<T>(action:()=>Promise<T>):Promise<T>{
  if(this.current)throw Error('Another booking is being checked');
  const reserved=await this.sql.reserve();let acquired=false;
  try{
   const [state]=await reserved`SELECT pg_backend_pid() AS pid, pg_try_advisory_lock(${lockKey}) AS acquired`;
   if(!state.acquired)throw Error('Another booking is being checked. Please try again shortly.');
   acquired=true;this.current=reserved;this.backendPid=Number(state.pid);
   return await action();
  }finally{
   this.current=null;this.backendPid=null;
   try{if(acquired)await reserved`SELECT pg_advisory_unlock(${lockKey})`}finally{reserved.release()}
  }
 }
 async save(booking:Booking){
  if(!this.current||!this.backendPid)throw Error('Booking writes require the shared lock');
  const expectedPid=this.backendPid;
  // A short transaction commits each pending phase BEFORE any remote API call.
  // Wrapping the complete workflow in one transaction would erase ambiguity
  // evidence on a crash, allowing the next worker to duplicate remote records.
  const tx=this.current;
  await tx.unsafe('BEGIN');
  try{
   const [state]=await tx`SELECT pg_backend_pid() AS pid, EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND objid=${lockKey} AND granted) AS owns_lock`;
   if(Number(state.pid)!==expectedPid||!state.owns_lock)throw Error('Booking connection changed; stop for review');
   await tx`INSERT INTO samson_bookings(id,request_key,fingerprint,record) VALUES(${booking.id},${booking.requestKey},${booking.fingerprint},${tx.json(JSON.parse(JSON.stringify(booking)))}) ON CONFLICT(id) DO UPDATE SET record=EXCLUDED.record,updated_at=now()`;
   if(booking.phase==='confirmed')await tx`DELETE FROM samson_slot_claims WHERE booking_id=${booking.id}`;
   else for(const visit of booking.visits){
    const rows=await tx`INSERT INTO samson_slot_claims(service_date,period,booking_id) VALUES(${visit.date},${visit.period},${booking.id}) ON CONFLICT(service_date,period) DO UPDATE SET booking_id=EXCLUDED.booking_id WHERE samson_slot_claims.booking_id=EXCLUDED.booking_id RETURNING booking_id`;
    if(rows.length!==1)throw Error('Selected service window is held by another booking');
   }
   await tx.unsafe('COMMIT');
  }catch(error){try{await tx.unsafe('ROLLBACK')}catch{}throw error}
 }
 async queueSquareEvent(event:{eventId:string;paymentId:string;merchantId:string;type:'payment.created'|'payment.updated'}){
  const rows=await this.sql`INSERT INTO samson_square_events(event_id,payment_id,merchant_id,event_type) VALUES(${event.eventId},${event.paymentId},${event.merchantId},${event.type}) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`;
  return rows.length===1;
 }
}
