import type {Metadata} from 'next';
import Link from 'next/link';
import CommercialPlans from '../CommercialPlans';
import '../pricing-overview.css';

export const metadata:Metadata={title:'Storefront Pricing & Plan Builder | Samson',description:'Build your Samson storefront cleaning plan. Compare monthly, twice-monthly and weekly exterior plans with optional interior window cleaning.'};

export default function StorefrontPricingPage(){
  return <><header className="cpPageHeader"><Link href="/" aria-label="Samson home"><img src="/samson-approved-logo.png" alt="Samson Professional Window Cleaning"/></Link><nav aria-label="Pricing page navigation"><Link href="/">Back to Home</Link><Link href="/commercial-assessment">Commercial / HOA Assessment</Link></nav></header><main><CommercialPlans/><p style={{textAlign:"center",padding:"24px"}}><Link href="/booking">Booking &amp; recurring cleaning options →</Link></p></main><footer className="cpPageFooter">Larger commercial or HOA project? <Link href="/commercial-assessment">Request an assessment.</Link> For home cleaning, <Link href="/#contact">contact Samson.</Link></footer></>;
}

