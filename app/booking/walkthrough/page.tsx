import type {Metadata} from 'next';
import Walkthrough from './walkthrough';
export const metadata:Metadata={title:'Booking Walkthrough | Samson',robots:{index:false,follow:false}};
export default function Page(){return <Walkthrough/>}
