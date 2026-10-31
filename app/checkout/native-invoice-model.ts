import type {Booking} from '../zoho-trial/booking-workflow';
import {visitCovered} from './order-snapshot';

export type NativeInvoicePreparation={scopeVersion?:'native-visits-v1';pending?:string;contactId?:string;workOrderId?:string;invoiceRecordId?:string;financeInvoiceId?:string;territoryId?:string;visitLines?:{index:number;id:string}[];ready?:boolean};
export const nativeSummary=(b:Booking)=>(b.paymentEnvironment==='sandbox'?'SAMSON TEST — native checkout — no cleaning ':'Website '+(b.snapshot.kind==='storefront'?'storefront subscription ':'cleaning '))+b.id;
export function nativeVisitLines(b:Booking){
 const rows=b.snapshot.visitOrders.filter(v=>visitCovered(b.snapshot,v.index)).map(v=>{
  const visit=b.visits[v.index];
  if(!visit||!Number.isSafeInteger(v.totalCents)||v.totalCents<=0||v.lines.reduce((n,l)=>n+l.amountCents,0)!==v.totalCents)throw Error('Invalid covered visit allocation');
  // Missing version identifies the earlier private proof records. Preserve
  // their accepted descriptions rather than repricing or rewriting them.
  const includeBusiness=!b.nativePreparation||b.nativePreparation.scopeVersion==='native-visits-v1';
  const description=[...(includeBusiness&&b.customer.businessName?['Business: '+b.customer.businessName]:[]),visit.date+' · '+(visit.period==='morning'?'8–11 a.m.':'1–4 p.m.')+' Eastern',...v.lines.map(l=>l.label+' × '+l.quantity+' @ $'+(l.unitPriceCents/100).toFixed(2)+' = $'+(l.amountCents/100).toFixed(2)),...(v.serviceNotes||[])].join('\n');
  if(description.length>2000)throw Error('Detailed visit scope needs owner review');
  return {index:v.index,amountCents:v.totalCents,description};
 });
 if(!rows.length||rows.length>5||rows.reduce((n,l)=>n+l.amountCents,0)!==b.snapshot.initialTotalCents)throw Error('Covered visits do not match the payable invoice');
 return rows;
}
export function invoiceLinesMatch(b:Booking,invoice:any){
 if(!b.nativePreparation?.ready)return invoice.line_items?.length===b.snapshot.initialLines.length&&b.snapshot.initialLines.every((line,i)=>Math.round(Number(invoice.line_items[i].rate)*100)===line.unitPriceCents&&Number(invoice.line_items[i].quantity)===line.quantity);
 const expected=nativeVisitLines(b);
 return invoice.line_items?.length===expected.length&&expected.every((line,i)=>Number(invoice.line_items[i].quantity)===1&&Math.round(Number(invoice.line_items[i].rate)*100)===line.amountCents&&invoice.line_items[i].description===line.description);
}
export function nativeLineContent(invoice:any){return JSON.stringify({customer:invoice.customer_id,number:invoice.invoice_number,currency:invoice.currency_code,total:invoice.total,balance:invoice.balance,status:invoice.status,lines:invoice.line_items?.map((l:any)=>({item:l.item_id,name:l.name,description:l.description,quantity:Number(l.quantity),rate:Number(l.rate),discount:l.discount,tax:l.tax_id,total:Number(l.item_total)}))});}
export function verifyNativeBinding(b:Booking,invoice:any,native:any,order:any){
 const p=b.nativePreparation;
 if(!p?.workOrderId||!p.invoiceRecordId||!p.financeInvoiceId||!p.contactId||invoice.invoice_id!==p.financeInvoiceId||native.id!==p.invoiceRecordId||native.ZBilling_InvoiceId!==invoice.invoice_id||native.Work_Order?.id!==p.workOrderId||order.id!==p.workOrderId||order.Summary!==nativeSummary(b)||order.Contact?.id!==p.contactId||invoice.currency_code!=='USD'||Math.round(Number(invoice.total)*100)!==b.snapshot.initialTotalCents||Math.round(Number(order.Grand_Total)*100)!==b.snapshot.initialTotalCents)throw Error('Native invoice and job identity mismatch');
 const expected=nativeVisitLines(b),actual=[...(order.Service_Line_Items||[])].sort((a:any,c:any)=>Number(a.Sequence)-Number(c.Sequence));
 if(actual.length!==expected.length||p.visitLines?.length!==expected.length||!expected.every((line,i)=>actual[i].id===p.visitLines![i].id&&p.visitLines![i].index===line.index&&Number(actual[i].Quantity)===1&&Math.round(Number(actual[i].List_Price)*100)===line.amountCents&&actual[i].Description===line.description&&actual[i].Invoice_Id===p.invoiceRecordId))throw Error('Native visit line binding mismatch');
 if(invoice.line_items?.length!==expected.length||!expected.every((line,i)=>Number(invoice.line_items[i].quantity)===1&&Math.round(Number(invoice.line_items[i].rate)*100)===line.amountCents&&invoice.line_items[i].description===line.description))throw Error('Native invoice scope mismatch');
}
