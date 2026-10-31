import type {ResidentialOrderLine} from '../residential/residential-integration';
// The shared ledger records immutable prices; each service supplies its own
// calculator and date rules rather than pretending storefronts are homes.
export type BookingSnapshot={
 kind?:'residential'|'storefront';version:string;currency:string;selection:{billingMode?:string};plan:string;
 billing:{mode:string;visitsIncluded:number;extraDiscountPercent:number;regularExteriorCents:number;maintenanceSavingsCents:number;prepaySavingsCents:number;addonCents:number;annualTotalCents:number};
 initialLines:ResidentialOrderLine[];initialTotalCents:number;repeatLines:ResidentialOrderLine[];repeatTotalCents:number;
 visitOrders:{index:number;includedInInitialPayment?:boolean;lines:ResidentialOrderLine[];serviceNotes?:string[];totalCents:number}[];
 maintenance:{id:string;label:string;months:number;discountPercent:number;initialDiscountCents:number;maximumInitialDiscountReversalCents:number};
 upfrontDiscountPreview:boolean;termsDraft:boolean;paymentEnabled:boolean;
 recurring?:{monthlyCents:number;firstPeriodStart:string;firstPeriodEnd:string;autoRenewAuthorized:boolean;consentVersion:string;frequency:'monthly'|'twice'|'weekly';scopeNotes:string[];exteriorMonthlyCents:number;interiorMonthlyCents:number};
};
export function visitCovered(snapshot:BookingSnapshot,index:number){return snapshot.visitOrders[index]?.includedInInitialPayment??(index===0||(snapshot.selection.billingMode==='annual-prepay'&&index<snapshot.billing.visitsIncluded));}
