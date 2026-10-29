import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {localTrialAllowed} from '../server';
import ResidentialBuilder from '../../residential/ResidentialBuilder';
import '../../residential/residential.css';
import '../../pricing-overview.css';
import '../../booking/walkthrough/walkthrough.css';
export const dynamic='force-dynamic';
export const metadata={title:'Private Residential Calculator Trial | Samson',robots:{index:false,follow:false}};
export default async function Page(){if(!localTrialAllowed((await headers()).get('host')))notFound();return <main className="residentialPage"><p className="poEyebrow">PRIVATE PROFESSIONAL TRIAL · NO PAYMENTS</p><h1>Try your calculator<br/><span>with Zoho availability.</span></h1><p><Link href="/zoho-trial">Back to test results →</Link></p><ResidentialBuilder trialMode/></main>}

