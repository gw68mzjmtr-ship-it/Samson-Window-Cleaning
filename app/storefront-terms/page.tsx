import Link from 'next/link';
import {storefrontTerms,storefrontConsentVersion} from '../storefront-terms';
import '../booking/walkthrough/walkthrough.css';
export const metadata={title:'Storefront subscription terms | Samson'};
export default function Page(){return <main className="bw" style={{maxWidth:900,margin:'auto',padding:24}}><Link href="/storefront-pricing">← Storefront subscriptions</Link><h1>Storefront subscription terms</h1><p>Version {storefrontConsentVersion}. Your exact first total, ongoing monthly amount and next billing date appear before you authorize payment.</p>{storefrontTerms.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}<p>Questions: <a href="mailto:zach@samsonwindowcleaning.com">zach@samsonwindowcleaning.com</a></p></main>}
