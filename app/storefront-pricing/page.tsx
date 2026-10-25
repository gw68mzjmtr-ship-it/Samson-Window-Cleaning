import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Storefront Window Cleaning Plans & Add-Ons | Samson',
  description: 'Storefront exterior window cleaning plans starting at $39/month on eligible routes, plus optional interior glass cleaning. Serving Concord and the Lake Norman area.',
};

const exteriorPlans = [
  { name: 'Starter', panels: '3–6 panels', monthly: 39, twiceMonthly: null, weekly: null, note: 'Monthly service only' },
  { name: 'Up to 12 panels', panels: 'Up to 12 panels', monthly: 59, twiceMonthly: 120, weekly: 260, note: null },
  { name: 'Up to 16 panels', panels: 'Up to 16 panels', monthly: 79, twiceMonthly: 160, weekly: 345, note: null },
  { name: 'Up to 20 panels', panels: 'Up to 20 panels', monthly: 99, twiceMonthly: 200, weekly: 430, note: null },
  { name: 'Up to 24 panels', panels: 'Up to 24 panels', monthly: 129, twiceMonthly: 260, weekly: 560, note: null },
];

const interiorAddOns = [
  { name: 'Small', example: 'Approx. 2 × 3 ft', price: 10 },
  { name: 'Medium', example: 'Approx. 3 × 4 ft', price: 15 },
  { name: 'Regular', example: 'Approx. 3 × 7 ft', price: 25 },
  { name: 'Large', example: 'Approx. 5 × 7 ft', price: 35 },
  { name: 'Very Large', example: 'Approx. 5 × 10 ft', price: 50 },
];

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'zach@samsonwindowcleaning.com';
const quoteEmail = 'mailto:' + email + '?subject=' + encodeURIComponent('Samson storefront cleaning estimate') +
  '&body=' + encodeURIComponent('Hello Samson,\n\nI would like a storefront cleaning quote.\nBusiness name:\nProperty address:\nApproximate exterior panel count:\nPreferred frequency (monthly, twice monthly, weekly):\nInterested in interior cleaning (yes/no):\nPhone:\n');

export default function StorefrontPricingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.logo} href="/" aria-label="Samson Professional Window Cleaning home">
          <img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" />
          <span>Where Strength Meets Shine</span>
        </a>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="/"><ArrowLeft size={16}/> Home</a>
          <a href="/#services">Services</a>
          <a href="/#commercial">Commercial</a>
        </nav>
        <a className={styles.headerCta} href={quoteEmail}>Request a Quote <ArrowRight size={17}/></a>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Samson · Commercial Maintenance</p>
            <h1>Clean storefront glass.<br/><em>On autopilot.</em></h1>
            <p className={styles.heroText}>Dependable exterior window cleaning plans built for local storefronts. Select your preferred frequency and add interior glass only when you need it.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryBtn} href="#exterior-plans">Explore Plans <ArrowRight size={18}/></a>
              <a className={styles.ghostBtn} href={quoteEmail}>Get a Custom Quote</a>
            </div>
            <div className={styles.heroHighlights}>
              <span><Clock3 size={16}/> Recurring visits</span>
              <span><ShieldCheck size={16}/> Professional service</span>
              <span><Sparkles size={16}/> Interior optional</span>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img src="/Storefront%20for%20exterior%20window%20cleanng%20section.png" alt="Glass storefront exterior" />
          </div>
        </section>

        <section id="exterior-plans" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / Exterior Subscriptions</p>
              <h2>Choose Your Storefront Plan</h2>
            </div>
            <p>Starting rates for standard ground-floor glass on eligible routes. All plans are exterior-only unless interior service is requested separately.</p>
          </div>
          <div className={styles.plans}>
            {exteriorPlans.map((plan, index) => (
              <article className={styles.plan} key={plan.name}>
                <div className={styles.planTop}>
                  <span className={styles.planIndex}>0{index + 1}</span>
                  <h3>{plan.name}</h3>
                  <p>{plan.panels}</p>
                </div>
                <div className={styles.planBody}>
                  <span className={styles.from}>From</span>
                  <div className={styles.bigPrice}><strong>{'<span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from {'</p>
                      <p><Check size={14}/> Weekly <strong>from {'</p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>{'<small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
}{plan.monthly}</strong><span>/mo</span></div>
                  <p className={styles.planDescription}>1 exterior cleaning / month</p>
                  {plan.note ? <p className={styles.planFreq}>{plan.note}</p> :
                    <div className={styles.planFrequency}>
                      <p><Check size={14}/> Twice monthly <strong>from ${plan.twiceMonthly}/mo</strong></p>
                      <p><Check size={14}/> Weekly <strong>from ${plan.weekly}/mo</strong></p>
                    </div>}
                  <a href={quoteEmail} className={styles.planLink}>Request this plan <ArrowRight size={16}/></a>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.fineprint}>Monthly plans represent 12 exterior visits/year; twice monthly, 24 visits/year; weekly, 52 visits/year. Starter pricing is available for eligible routes. Final pricing depends on access, glass size and condition. Quotes are before applicable taxes.</p>
        </section>

        <section className={styles.interiorSection} id="interior-add-ons">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / Optional Add-Ons</p>
              <h2>Interior Window Cleaning</h2>
            </div>
            <p>Add interior glass whenever it is needed. Pricing is per pane, per requested cleaning, and is not automatically included in subscriptions.</p>
          </div>
          <div className={styles.addOnGrid}>
            {interiorAddOns.map(item => (
              <article key={item.name} className={styles.addOn}>
                <span className={styles.paneIcon} aria-hidden="true"><span/></span>
                <h3>{item.name}</h3>
                <p>{item.example}</p>
                <div><span>From</span> <strong>${item.price}</strong><small>/pane</small></div>
              </article>
            ))}
          </div>
          <div className={styles.example}><Sparkles size={22}/><p><strong>Example:</strong> 2 small + 2 regular interior panes = <strong>$70 extra</strong> per requested visit.</p></div>
        </section>

        <section className={styles.details}>
          <div>
            <p className={styles.eyebrow}>What to Expect</p>
            <h2>Clear service.<br/>No surprises.</h2>
          </div>
          <div className={styles.detailsList}>
            <p><Check size={18}/> Standard ground-floor storefront glass on eligible routes</p>
            <p><Check size={18}/> Entry-door glass counts toward exterior panels</p>
            <p><Check size={18}/> Interior cleaning is optional and charged separately</p>
            <p><Check size={18}/> Dimensions are illustrative; interior tiers depend on glass area</p>
            <p><Check size={18}/> Initial deep cleaning and restoration quoted separately</p>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <p className={styles.eyebrow}>Keep Your Business Looking Its Best</p>
          <h2>Ready for a Cleaner Storefront?</h2>
          <p>Tell us about your property and your preferred cleaning schedule. We’ll confirm the right plan and provide a final quote.</p>
          <a className={styles.primaryBtn} href={quoteEmail}>Request Storefront Pricing <ArrowRight size={18}/></a>
          <a className={styles.backHome} href="/">Return to Samson home</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}><img src="/FINAL%20LOGO.png" alt="Samson Professional Window Cleaning" /><span>Where Strength Meets Shine</span></a>
        <div><a href="/">Home</a><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:' + email}>Contact</a></div>
      </footer>
    </div>
  );
}
