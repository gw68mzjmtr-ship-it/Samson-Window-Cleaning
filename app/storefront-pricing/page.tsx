import type {Metadata} from 'next';
import Link from 'next/link';
import {storefrontReady} from '../storefront-terms';
import CommercialPlans from '../CommercialPlans';
import '../pricing-overview.css';

export const metadata:Metadata={title:'Storefront Window Cleaning Subscriptions | Samson',description:'Build your Samson storefront cleaning subscription. Compare monthly, twice-monthly and weekly cleaning schedules with optional interior window cleaning.'};

export const dynamic='force-dynamic';
export default function StorefrontPricingPage(){
  return <><header className="cpPageHeader"><Link href="/" aria-label="Samson home"><img src="/samson-approved-logo.png" alt="Samson Professional Window Cleaning"/></Link><nav aria-label="Pricing page navigation"><Link href="/">Back to Home</Link><Link href="/commercial-assessment">Commercial / HOA Assessment</Link></nav></header><main><CommercialPlans checkoutMode={storefrontReady()}/><p style={{textAlign:"center",padding:"24px"}}><Link href={storefrontReady()?'#storefront-checkout':'/#contact'}>{storefrontReady()?'Choose dates and start your subscription →':'Ask about a storefront subscription →'}</Link></p></main><footer className="cpPageFooter">Larger commercial or HOA project? <Link href="/commercial-assessment">Request an assessment.</Link> For home cleaning, <Link href="/residential">explore residential subscriptions.</Link> · <Link href="/storefront-terms">Subscription terms</Link> · <Link href="/privacy">Privacy</Link></footer></>;
}

