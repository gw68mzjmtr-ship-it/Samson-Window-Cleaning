import {redirect} from 'next/navigation';
import {publicBookingDestination} from './provider';
export const dynamic='force-dynamic';
export default async function BookingPage({searchParams}:{searchParams:Promise<{service?:string}>}){const {service}=await searchParams;redirect(publicBookingDestination(service))}
