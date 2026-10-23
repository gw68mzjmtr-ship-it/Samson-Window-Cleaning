'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Menu, X, Play, Gem, ShieldCheck, CalendarDays, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const tiers=[{name:'Essential',range:'Up to 25 windows',price:149},{name:'Standard',range:'26–40 windows',price:249},{name:'Premium',range:'41–60 windows',price:349},{name:'Executive',range:'61–80 windows',price:449},{name:'Elite',range:'81–100 windows',price:549}];
const plans=[{name:'One-Time',freq:'Single visit',discount:'Standard price'},{name:'Silver',freq:'Every 6 months',discount:'10% off'},{name:'Gold',freq:'Quarterly',discount:'15% off'},{name:'Platinum',freq:'Every 2 months',discount:'15% off'},{name:'Black',freq:'Monthly',discount:'20% off'}];
const services=[{name:'Residential Homes',img:'/Residential%20Homes.png',desc:'Custom homes, luxury properties, and estate maintenance.'},{name:'Storefronts',img:'/Storefront%20for%20exterior%20window%20cleanng%20section.png',desc:'Retail, restaurants, and small businesses.'},{name:'HOAs & Townhomes',img:'/HOAs%20and%20TownHomes.png',desc:'Keep your community looking its best with scheduled cleanings.'},{name:'Commercial Properties',img:'/Commercial%20Properties.png',desc:'Office buildings, medical, schools, and more.'}];
const videos: {name:string;img:string;youtubeId?:string}[]=[{name:'CARMEL COUNTRY CLUB',img:'/1021%20(2)-Cover.jpg',youtubeId:'g4onoyqjLv4'},{name:'$14 MILLION MANSION',img:'/Mansion%20POV%20Slattery-Cover.jpg',youtubeId:'W3kXIDsKGtc'},{name:'COMMERCIAL STOREFRONT',img:'/Commercial%20Store%20Front-Cover.jpg',youtubeId:'avdkKhzj1qs'},{name:'$4.7 MILLION HOME — INTERIOR DETAIL',img:'/4.7%20Million%20Dollar%20Home%20Cover.jpg',youtubeId:'9yBsoffK3Nw'},{name:'$4.5 MILLION HOME',img:'/%244.5%20Million%20Home-Cover.jpg',youtubeId:'MAMio9fC26c'},{name:'$3.4 MILLION HOME',img:'/%243.4%20Million%20Home-Cover.jpg',youtubeId:'ugxOxgmcm3g'},{name:'$2.8 MILLION HOME',img:'/%242.8%20Million%20Home-Cover.jpg',youtubeId:'ZJkllNbgvAc'},{name:'$2.5 MILLION HOME',img:'/%242.5%20Million%20Dollar%20Home-Cover.jpg',youtubeId:'bQy_nXQYnSo'},{name:'$1.7 MILLION HOME',img:'/%241.7%20Million%20Home-Cover.jpg',youtubeId:'k2gaQRM7In4'},{name:'$1.5 MILLION HOME',img:'/%241.5%20Million%20Dollar%20Home-Cover.jpg',youtubeId:'yaf29e2TusM'},{name:'$1.3 MILLION HOME',img:'/%241.3%20Million%20Home-Cover.jpg',youtubeId:'YzOJTUiOkQ4'},{name:'$1 MILLION HOME',img:'/%241%20Million%20Home-Cover.jpg',youtubeId:'QWvdpQKI2dk'}];
const googleReviewsUrl='https://maps.google.com/maps?cid=1169625489972585955';
const customerReviews=[
  {
    "name": "Don Stamas",
    "text": "…The communication was on point from scheduling to reminders to invoicing. Since our initial experience, we have continued to hire them for our office as well as our home and referred them to friends.…"
  },
  {
    "name": "Philip Stokes",
    "text": "I recently hired Samson to clean the windows at both my home and office, and I couldn’t be more impressed.…"
  },
  {
    "name": "Kamaro Man",
    "text": "Great group to use for window cleaning. They cleaned my storefront on a local business in Charlotte NC and i would recommend them to everyone."
  },
  {
    "name": "Mindy Sypher",
    "text": "…He was at my clients home for about 5 hours and got every window inside and outside.…"
  },
  {
    "name": "Heather King",
    "text": "Great company, from start to finish. Very responsive, shows up when they say they will, stick to the estimate and do an excellent job. My windows have never looked better. Couldn’t recommend them any more highly."
  },
  {
    "name": "Grace Jackson",
    "text": "I highly recommend Zach. He is professional, punctual and is meticulous with his work. I schedule with him every year and am always impressed when he is finished."
  },
  {
    "name": "Patrick Wilson",
    "text": "…We are on his regular schedule, coming twice/yr and he even gives a discount for that!…"
  },
  {
    "name": "Eli Walker",
    "text": "…Zach was incredibly prompt, arriving exactly when he said he would, and he carried himself with the utmost professionalism throughout the entire job. The windows looked flawless when he was done, crystal clear and streak-free.…"
  },
  {
    "name": "Sonia Cleven",
    "text": "I cannot recommend Samson Window Cleaning enough. Zach and his team are thorough, clean, neat, polite and professional!"
  },
  {
    "name": "Scott Lowe (Scott and Lee Ann)",
    "text": "Couldn’t ask for a more professional group of guys. Zach and crew did an amazing job on our windows and exterior trim. Very punctual and communication was off the charts."
  },
  {
    "name": "Sandy Andrews",
    "text": "…They are thorough, use clean tools, and leave the windows sparkling clean.…"
  },
  {
    "name": "Marc Rinaldi",
    "text": "Very professional highly satisfied with the service provided. Samson was easy to work with and conducted his business efficiently and effectively. Will definitely be a repeat customer."
  }
];
const email=process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'zach@samsonwindowcleaning.com';
const contact=(subject='Window cleaning service')=>{window.location.href='mailto:'+email+'?subject='+encodeURIComponent('Samson — '+subject)+'&body='+encodeURIComponent('Hello Samson,\n\nI would like to request service.\nProperty address:\nWindow count:\nService frequency:\nPhone:\n')};
export default function Home(){const [open,setOpen]=useState(false);const [activeVideo,setActiveVideo]=useState<string|null>(null);
const videoRailRef=useRef<HTMLDivElement>(null);
const reviewRailRef=useRef<HTMLDivElement>(null);
const [reviewScroll,setReviewScroll]=useState({left:false,right:true});
const syncReviewScroll=()=>{
  const rail=reviewRailRef.current;
  if(!rail)return;
  setReviewScroll({left:rail.scrollLeft>3,right:rail.scrollLeft+rail.clientWidth<rail.scrollWidth-3});
};
useEffect(()=>{
  syncReviewScroll();
  window.addEventListener('resize',syncReviewScroll);
  return()=>window.removeEventListener('resize',syncReviewScroll);
},[]);
const scrollReviews=(direction:-1|1)=>{
  const rail=reviewRailRef.current;
  if(!rail)return;
  const card=rail.querySelector<HTMLElement>('.mockReviewCard');
  const gap=Number.parseFloat(window.getComputedStyle(rail).columnGap)||14;
  const distance=(card?.offsetWidth ?? rail.clientWidth*.8)+gap;
  rail.scrollBy({left:direction*distance,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
};

const [videoScroll,setVideoScroll]=useState({left:false,right:true});
const syncVideoScroll=()=>{
  const rail=videoRailRef.current;
  if(!rail)return;
  setVideoScroll({left:rail.scrollLeft>3,right:rail.scrollLeft+rail.clientWidth<rail.scrollWidth-3});
};
useEffect(()=>{
  syncVideoScroll();
  window.addEventListener('resize',syncVideoScroll);
  return()=>window.removeEventListener('resize',syncVideoScroll);
},[]);
const scrollVideos=(direction:-1|1)=>{
  const rail=videoRailRef.current;
  if(!rail)return;
  const card=rail.querySelector<HTMLElement>('.mockVideoCard');
  const distance=(card?.offsetWidth ?? rail.clientWidth*.8)+18;
  rail.scrollBy({left:direction*distance,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
};
useEffect(()=>{if(!activeVideo)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const onEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setActiveVideo(null)};window.addEventListener('keydown',onEscape);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onEscape)}},[activeVideo]);return <>
<header className="mockHeader"><a className="mockLogo" href="#home"><img src="/Samson%20Professional%20Window%20Cleaning%20Logo.png" alt="Samson Professional Window Cleaning"/><span className="mockLogoSlogan">“Where Strength Meets Shine”</span></a><nav className={open?'mockNav open':'mockNav'}><a className="active" href="#home" onClick={()=>setOpen(false)}>Home</a><a href="#services" onClick={()=>setOpen(false)}>Services</a><a href="#pricing" onClick={()=>setOpen(false)}>Pricing</a><a href="#commercial" onClick={()=>setOpen(false)}>Commercial</a><a href="#work" onClick={()=>setOpen(false)}>Our Work</a><a href="#about" onClick={()=>setOpen(false)}>About</a></nav><a href="#contact" className="mockRedBtn mockHeaderCta">Book Service <ArrowRight size={18}/></a><button aria-label="Toggle menu" className="mockMenu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>
<main id="home">
<section className="mockHero mockHeroArtwork">
  <img className="mockHeroArtworkImage" src="/Hero%20Commercial.png" alt="Samson Professional Window Cleaning. Residential and commercial exterior window cleaning. Clean Windows. Higher Standards." fetchPriority="high"/>
  <div className="mockHeroArtworkHotspots" aria-label="Homepage quick links">
    <a className="mockHeroArtworkBook" href="#contact" aria-label="Book Samson window cleaning service"><span className="mockHeroVisuallyHidden">Book Service</span></a>
    <a className="mockHeroArtworkWork" href="#work" aria-label="View Samson project videos"><span className="mockHeroVisuallyHidden">View Our Work</span></a>
  </div>
  <div className="mockHeroPic" aria-hidden="true"/>
  <div className="mockHeroShade" aria-hidden="true"/>
  <div className="mockHeroContent">
    <p className="mockEyebrow white">Residential &amp; Commercial Window Cleaning</p>
    <h1>Clean Windows<br/><em>Higher Standards</em></h1>
    <p>Professional exterior window cleaning for residential homes, storefronts, HOAs, townhomes, and commercial properties throughout the Concord and Lake Norman area.</p>
    <div className="mockButtons">
      <a href="#contact" className="mockRedBtn">Book Service <ArrowRight size={19}/></a>
      <a href="#work" className="mockOutlineBtn">View Our Work <Play size={17} fill="currentColor"/></a>
    </div>
    <div className="mockTrust">
      <span><ShieldCheck/>15 Years<br/>In Business</span>
      <span><Gem/>Residential &amp;<br/>Commercial</span>
      <span><Star/>4.9-Star<br/>Google Rating</span>
    </div>
  </div>
</section>
<section id="services" className="mockServices"><div className="mockHeading"><div><p className="mockEyebrow">Our Services</p><h2>Exterior Window Cleaning</h2></div><p>Streak-free results using professional water-fed pole systems.<br/>Fast, safe, and effective for residential and commercial properties.</p></div><div className="mockServiceGrid">{services.map(s=><article key={s.name}><img src={s.img} alt={s.name}/><h3>{s.name}</h3><p>{s.desc}</p></article>)}</div></section>
<section className="mockPricingWrap" id="pricing"><div className="mockPricing"><p className="mockEyebrow">Simple Pricing</p><h2>Exterior Window Cleaning</h2><p className="mockLead">Transparent pricing. No surprises. Built for repeat service.</p><div className="mockTiers">{tiers.map(t=><article key={t.name}><h3>{t.name}</h3><div><strong>${t.price}</strong><p>{t.range}</p><small>Exterior glass cleaning<br/>Streak-free results<br/>Interior priced separately</small><button onClick={()=>contact(t.name+' exterior cleaning')}>Book Now</button></div></article>)}</div><p className="mockFine">Pricing based on exact exterior window count. Second-story ladder setup $75; third-story $100 when required. Applicable taxes quoted before service.</p></div><aside className="mockPlans" id="plans"><p className="mockEyebrow">Stay on Schedule</p><h3>Maintenance Plans</h3><p>Keep your property looking its best year-round with scheduled service.</p><div>{plans.map((p,i)=><section key={p.name}><span className="mockPlanSymbol">{i===0?'✦':'✧'}</span><strong>{p.name}</strong><span>{p.freq}</span><b>{p.discount}</b></section>)}</div><a href="#contact" className="mockRedBtn">View Plans <ArrowRight size={17}/></a><small>Gold, Platinum and Black include unlimited rain touch-ups and priority scheduling. Cancel anytime.</small></aside></section>
<section className="mockInterior"><div className="mockInteriorPic"/><div><p className="mockEyebrow">Premium Add-On</p><h2>Interior Window Cleaning</h2><p>Interior glass available at a premium rate.<br/>Perfect for homes, offices, and storefronts.</p></div><button className="mockOutlineBtn" onClick={()=>contact('Interior window cleaning add-on')}>Add Interior to Your Service</button></section>
<section id="commercial" className="mockCommercial"><div className="mockCommercialIntro"><p className="mockEyebrow">Commercial Focus</p><h2>Built for<br/>Business</h2><p>Fast, reliable exterior window cleaning for storefronts, property managers, HOAs, and commercial accounts.</p><a href="#contact" className="mockRedBtn">Commercial Services <ArrowRight size={17}/></a></div><div className="mockCommercialPic"/><div className="mockBenefits">{['Recurring service schedules','Competitive commercial pricing','Minimal disruption to your business','Professional and insured','Lake Norman / Concord area'].map(s=><p key={s}><Check size={17}/>{s}</p>)}</div></section>
<section className="mockWork" id="work">
  <div><p className="mockEyebrow">Our Work</p><h2>Real Results</h2></div>
  <div className="mockVideoCarousel">
    <div className="mockVideoToolbar">
      <span>Scroll to see more projects</span>
      <div className="mockVideoArrows">
        <button type="button" aria-label="Scroll projects left" aria-controls="samson-video-strip" onClick={()=>scrollVideos(-1)} disabled={!videoScroll.left}><ChevronLeft size={19}/></button>
        <button type="button" aria-label="Scroll projects right" aria-controls="samson-video-strip" onClick={()=>scrollVideos(1)} disabled={!videoScroll.right}><ChevronRight size={19}/></button>
      </div>
    </div>
    <div id="samson-video-strip" className="mockVideoGrid" ref={videoRailRef} role="region" aria-label="Window cleaning project videos" tabIndex={0} onScroll={syncVideoScroll}>
      {videos.map(v=>v.youtubeId?<button type="button" className="mockVideoCard" key={v.name} onClick={()=>setActiveVideo(v.youtubeId ?? null)} aria-label={'Play '+v.name+' video'}><div className="mockVideo"><img src={v.img} alt={v.name}/><span><Play size={17} fill="white"/></span></div><strong>{v.name}</strong></button>:<a key={v.name} href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer" aria-label={'View Samson videos: '+v.name}><div className="mockVideo"><img src={v.img} alt={v.name}/><span><Play size={17} fill="white"/></span></div><strong>{v.name}</strong></a>)}
    </div>
  </div>
</section>
{activeVideo&&<div className="mockVideoOverlay" role="presentation" onClick={()=>setActiveVideo(null)}><div className="mockVideoDialog" role="dialog" aria-modal="true" aria-label="Samson window cleaning video" onClick={event=>event.stopPropagation()}><div className="mockVideoDialogTop"><strong>{videos.find(v=>v.youtubeId===activeVideo)?.name ?? 'SAMSON REAL RESULTS'}</strong><button type="button" className="mockVideoClose" onClick={()=>setActiveVideo(null)} aria-label="Close video"><X size={24}/></button></div><div className="mockVideoFrame"><iframe title={(videos.find(v=>v.youtubeId===activeVideo)?.name ?? 'Real Results')+' | Samson Professional Window Cleaning'} src={'https://www.youtube-nocookie.com/embed/'+activeVideo+'?autoplay=1&rel=0'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><a href={'https://www.youtube.com/watch?v='+activeVideo} target="_blank" rel="noopener noreferrer" className="mockVideoYouTubeLink">Watch on YouTube if playback is unavailable</a></div></div>}
<section className="mockReviews" id="reviews" aria-labelledby="samson-reviews-title">
  <div className="mockReviewsHeading">
    <div>
      <p className="mockEyebrow">Google Reviews</p>
      <h2 id="samson-reviews-title">Trusted by Our Customers</h2>
      <p>Real feedback from homeowners and businesses we've served.</p>
    </div>
    <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="mockGoogleRating" aria-label="Read all Samson Google reviews, rated 4.9 out of 5">
      <strong>4.9 <span>/ 5</span></strong>
      <span className="mockGoogleRatingStars" aria-hidden="true">{Array.from({length:5},(_,i)=><Star key={i} size={14} fill="currentColor"/>)}</span>
      <small>178 Google reviews <ArrowRight size={13}/></small>
    </a>
  </div>
  <div className="mockVideoToolbar mockReviewsToolbar">
    <span>Scroll to read more customer reviews</span>
    <div className="mockVideoArrows">
      <button type="button" aria-label="Scroll reviews left" aria-controls="samson-review-strip" onClick={()=>scrollReviews(-1)} disabled={!reviewScroll.left}><ChevronLeft size={19}/></button>
      <button type="button" aria-label="Scroll reviews right" aria-controls="samson-review-strip" onClick={()=>scrollReviews(1)} disabled={!reviewScroll.right}><ChevronRight size={19}/></button>
    </div>
  </div>
  <div id="samson-review-strip" className="mockReviewsGrid" role="region" aria-label="Google customer review carousel" tabIndex={0} ref={reviewRailRef} onScroll={syncReviewScroll}>
    {customerReviews.map(review=><article key={review.name} className="mockReviewCard">
      <div className="mockReviewStars" aria-label="5 out of 5 stars">{Array.from({length:5},(_,i)=><Star key={i} size={14} fill="currentColor"/>)}</div>
      <blockquote>“{review.text}”</blockquote>
      <p><strong>{review.name}</strong><span>Google review</span></p>
    </article>)}
  </div>
  <a className="mockReviewsReadAll" href={googleReviewsUrl} target="_blank" rel="noopener noreferrer">Read more customer reviews on Google <ArrowRight size={16}/></a>
</section>
<section className="mockAbout" id="about" aria-labelledby="samson-about-heading">
  <div className="mockAboutCopy">
    <p className="mockEyebrow">About Samson</p>
    <h2 id="samson-about-heading">THE SAMSON <span>STANDARD.</span></h2>
    <div className="mockAboutExperience" aria-label="15 years in business"><strong>15</strong><span>YEARS IN<br/>BUSINESS</span></div>
    <p className="mockAboutIntro">Built on experience. Driven by higher standards.</p>
    <p>For 15 years, Samson Professional Window Cleaning has built its reputation on dependable service, attention to detail, and professional results.</p>
    <p>From commercial storefronts and managed properties to exceptional residential homes, our focus is consistent exterior window cleaning, clear communication, and service you can count on. Scheduled maintenance keeps your property looking its best, with premium interior cleaning available as an add-on.</p>
    <div className="mockAboutPrinciples">
      <span><Check size={16}/> Consistent standards</span>
      <span><Check size={16}/> Dependable scheduling</span>
      <span><Check size={16}/> Long-term relationships</span>
    </div>
    <a className="mockRedBtn mockAboutCta" href="#contact">Work With Samson <ArrowRight size={17}/></a>
  </div>
  <div className="mockAboutMedia">
    <figure className="mockAboutCommercial">
      <img src="/Elijah%20AI%20redone.png" alt="Samson technician cleaning exterior commercial glass with a water-fed pole" loading="lazy"/>
      <figcaption>COMMERCIAL EXTERIOR WINDOW CLEANING</figcaption>
    </figure>
  </div>
</section>
<section className="mockClose" id="contact"><div><h2>Ready for Cleaner Windows?</h2><p>Professional. Reliable. High-End Results.</p></div><button className="mockRedBtn" onClick={()=>contact()}>Book Your Service <ArrowRight size={19}/></button></section>
</main><footer className="mockFooter"><div className="mockFooterBrand"><img src="/Samson%20Professional%20Window%20Cleaning%20Logo.png" alt="Samson Professional Window Cleaning"/><span>“Where Strength Meets Shine”</span></div><div><a href="https://www.instagram.com/samsoncleans/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.youtube.com/@samsoncleans" target="_blank" rel="noopener noreferrer">YouTube</a><a href={'mailto:'+email}>Contact</a></div></footer>
</>}
