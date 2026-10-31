export function publicSiteReady(){return process.env.SAMSON_LIVE_CHECKOUT_MODE==='public'&&process.env.SAMSON_PUBLIC_CHECKOUT_READY==='1'}
export function publicSiteHost(host:string|null){
 if(!publicSiteReady())return false;
 try{const origin=new URL(process.env.SAMSON_CHECKOUT_ORIGIN||'');return origin.protocol==='https:'&&origin.pathname==='/'&&!origin.username&&!origin.password&&!origin.search&&!origin.hash&&host===origin.host}catch{return false}
}
export function publicSiteRoute(path:string){
 if(['/','/residential','/booking','/checkout','/service-terms','/privacy','/storefront-pricing','/commercial-assessment','/samson-logo.png','/storefront-terms','/storefront/manage'].includes(path))return true;
 if(/^\/api\/checkout\/(?:availability|orders|payment|storefront-orders|subscription)$/.test(path))return true;
 return !path.startsWith('/api/')&&!path.startsWith('/zoho-trial')&&!path.startsWith('/checkout/')&&/\.(?:png|jpe?g|webp|svg|ico|woff2?|css|mp4)$/i.test(path);
}
