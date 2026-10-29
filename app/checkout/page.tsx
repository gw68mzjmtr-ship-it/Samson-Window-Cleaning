import {notFound} from 'next/navigation';
import ResidentialBuilder from '../residential/ResidentialBuilder';
import {approvedResidentialTerms} from './service-terms';
import '../residential/residential.css';
import '../pricing-overview.css';
import '../booking/walkthrough/walkthrough.css';
export const dynamic='force-dynamic';
export const metadata={title:'Book your window cleaning | Samson',robots:{index:false,follow:false}};
export default function Page(){if(!['owner-test','public'].includes(process.env.SAMSON_LIVE_CHECKOUT_MODE||''))notFound();return <main className="residentialPage"><p className="poEyebrow">SAMSON PROFESSIONAL WINDOW CLEANING</p><h1>Book your<br/><span>window cleaning.</span></h1>{process.env.SAMSON_LIVE_CHECKOUT_MODE==='owner-test'&&<p role="note">Owner preview. Public bookings remain closed while launch checks are completed.</p>}<ResidentialBuilder checkoutMode termsVersion={approvedResidentialTerms()||''}/></main>}
