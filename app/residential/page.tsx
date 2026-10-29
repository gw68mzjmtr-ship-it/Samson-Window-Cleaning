import type {Metadata} from 'next';
import Link from 'next/link';
import ResidentialBuilder from './ResidentialBuilder';
import '../pricing-overview.css';
import './residential.css';
export const metadata:Metadata={title:'Residential Window Cleaning Plans | Samson',description:'Choose a residential exterior window cleaning plan and request a preferred cleaning day.'};
export default function ResidentialPage(){return <><header className="cpPageHeader"><Link href="/" aria-label="Samson home"><img src="/samson-approved-logo.png" alt="Samson Professional Window Cleaning"/></Link><nav aria-label="Residential navigation"><Link href="/">Back to Home</Link><Link href="/storefront-pricing">Storefront Plans</Link></nav></header><main className="residentialPage"><p className="poEyebrow">RESIDENTIAL WINDOW CLEANING</p><h1>Your home.<br/><span>A clearer outlook.</span></h1><p className="rhLead">Choose your exterior cleaning plan and request a preferred day. We confirm your route and final offer before secure checkout.</p><p><Link href="/booking">Booking &amp; recurring cleaning options →</Link></p><ResidentialBuilder/></main><footer className="cpPageFooter">HOA or commercial project? <Link href="/commercial-assessment">Request an assessment.</Link></footer></>}

