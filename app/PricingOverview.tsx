import Link from 'next/link';
import {ArrowRight, CalendarDays} from 'lucide-react';
import {storefrontPlans} from './commercial-pricing';
import './pricing-overview.css';

export default function PricingOverview() {
  return <section id="pricing" className="pricingOverview" aria-labelledby="pricing-overview-title">
    <div className="poHeading"><div><p className="poEyebrow">STOREFRONT MAINTENANCE</p><h2 id="pricing-overview-title">A clearer view.<br/><span>A predictable price.</span></h2></div><p>Exterior storefront plans from <strong>$39/month.</strong><br/>Choose your size, then build a schedule that works for your business.</p></div>
    <div className="poPlans">{storefrontPlans.map(plan=><div className="poPlan" key={plan.name}><h3>{plan.name}</h3><p>{plan.panels}</p><div><strong>${plan.prices[0]}</strong><span>/month</span></div></div>)}</div>
    <div className="poAction"><p><CalendarDays size={20}/><span>Starting monthly rates for one exterior visit each month.<br/>Twice-monthly and weekly schedules, plus optional interior cleaning, available.</span></p><Link href="/storefront-pricing">Build My Storefront Plan <ArrowRight size={18}/></Link></div>
    <p className="poFine">Before tax. Eligible service routes and standard ground-floor maintenance glass. Oversized glass, larger properties and specialty access require a custom quote. <Link href="/commercial-assessment">Larger commercial or HOA project? Request an assessment.</Link> <Link href="/#contact">For home cleaning, contact Samson.</Link></p>
  </section>;
}
