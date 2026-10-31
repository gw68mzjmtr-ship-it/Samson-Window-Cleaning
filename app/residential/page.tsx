import type {Metadata} from 'next';
import Link from 'next/link';
import ResidentialBuilder from './ResidentialBuilder';
import {approvedResidentialTerms} from '../checkout/service-terms';
import {publicSiteReady} from '../checkout/public-routes';
import '../pricing-overview.css';
import './residential.css';
export const metadata:Metadata={title:'Home Window Cleaning Subscriptions | Samson',description:'Build your home window cleaning subscription, choose available dates and pay securely. One-time cleaning and maintenance options available.'};
export const dynamic='force-dynamic';
export default function ResidentialPage(){const live=publicSiteReady()&&!!approvedResidentialTerms();return <><header className="cpPageHeader"><Link href="/" aria-label="Samson home"><img src="/samson-approved-logo.png" alt="Samson Professional Window Cleaning"/></Link><nav aria-label="Residential navigation"><Link href="/">Back to Home</Link><Link href="/storefront-pricing">Storefront Plans</Link></nav></header><main className="residentialPage"><p className="poEyebrow">RESIDENTIAL WINDOW CLEANING</p><h1>Your home.<br/><span>A clearer outlook.</span></h1><p className="rhLead">{live?'Choose your exterior cleaning, optional services and available dates. Enter your details once and pay securely to confirm.':'Build your estimate and explore cleaning options. Online booking is being prepared.'}</p><p><Link href="/booking">Booking &amp; recurring cleaning options →</Link></p><ResidentialBuilder checkoutMode={live} termsVersion={approvedResidentialTerms()||''}/></main><footer className="cpPageFooter">HOA or commercial project? <Link href="/commercial-assessment">Request an assessment.</Link> · <Link href="/service-terms">Service terms</Link> · <Link href="/privacy">Privacy</Link></footer></>}

