import {notFound} from 'next/navigation';
import LiveCalculator from '../LiveCalculator';
import '../../residential/residential.css';
import '../../booking/walkthrough/walkthrough.css';
export const dynamic='force-dynamic';
export const metadata={title:'Owner payment verification | Samson',robots:{index:false,follow:false}};
export default function Page(){if(process.env.SAMSON_LIVE_CHECKOUT_MODE!=='owner-test')notFound();return <main className="residentialPage"><p className="poEyebrow">PRIVATE OWNER PAYMENT CHECK</p><h1>Verify real payments.</h1><LiveCalculator ownerVerification selection={{homeSize:2500,screenCount:0,interiorRequested:false,interiorQuantities:Array(8).fill(0),stepLadder:false,twoStoryLadder:false,specialtyAccess:false,exteriorSpecialty:false,maintenanceId:'once',billingMode:'per-visit'}}/></main>}
