import type {Booking} from './booking-workflow';
export interface BookingStore {
 read(id:string):Promise<Booking>;
 records():Promise<Booking[]>;
 save(booking:Booking):Promise<void>;
 locked<T>(action:()=>Promise<T>):Promise<T>;
}
