import type {residentialOrderSnapshot} from '../residential/residential-integration';
// Used only by the authenticated owner route. Never accept a browser-supplied price.
export function ownerVerificationSnapshot(snapshot:ReturnType<typeof residentialOrderSnapshot>){
 const line={key:'owner-verification',label:'Owner checkout verification — real $1 payment; no cleaning service',quantity:1,unitPriceCents:100,amountCents:100};
 return {...snapshot,initialLines:[line],initialTotalCents:100,repeatTotalCents:0,visitOrders:[{...snapshot.visitOrders[0],lines:[line],totalCents:100}]};
}
