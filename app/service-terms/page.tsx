import {notFound} from 'next/navigation';
import {approvedResidentialTerms,residentialTerms,residentialTermsVersion} from '../checkout/service-terms';
export const dynamic='force-dynamic';
export const metadata={title:'Residential service terms | Samson',robots:{index:false,follow:false}};
export default function Page(){
 const approved=approvedResidentialTerms();
 if(!approved&&process.env.SAMSON_LIVE_CHECKOUT_MODE!=='owner-test')notFound();
 return <main style={{maxWidth:900,margin:'auto',padding:'48px 24px',lineHeight:1.7}}><h1>Residential service terms</h1>{!approved&&<p role="note"><strong>Owner review draft. Customer acceptance is disabled until this exact version is approved.</strong></p>}<p>Samson Professional Window Cleaning · Version {residentialTermsVersion}</p>{residentialTerms.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}</main>;
}
