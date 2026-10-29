import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {checkLocalRequest,secretDir,trialInvoiceApi} from '../../../zoho-trial/server';
import {residentialOrderSnapshot} from '../../../residential/residential-integration';
export const runtime='nodejs';
export async function GET(req:Request){
 try{await checkLocalRequest(req)}catch{return Response.json({error:'Local preview only'},{status:403})}
 try{
 const invoice=(await trialInvoiceApi('invoices/1611011000000097028','GET')).invoice;
 if(invoice.customer_id!=='1611011000000105015'||invoice.invoice_number!=='INV-000003')throw Error('Wrong invoice');
 return Response.json({invoiceNumber:invoice.invoice_number,status:invoice.status,totalCents:Math.round(Number(invoice.total)*100),balanceCents:Math.round(Number(invoice.balance)*100)},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Live invoice payment status could not be verified.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
export async function POST(req:Request){
 try{await checkLocalRequest(req,true)}catch{return Response.json({error:'Local preview only'},{status:403})}
 try{
 const input=await req.json();
 if(input.confirm!=='FICTIONAL_DRAFT_ONLY')throw Error('Confirm the fictional test.');
 const snapshot=residentialOrderSnapshot(input.selection,true);
 const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0,24);
 const folder=path.join(secretDir,'invoice-tests'),file=path.join(folder,digest+'.json');
 await mkdir(folder,{recursive:true});
 try{const prior=JSON.parse(await readFile(file,'utf8'));return Response.json(prior.result||{error:'A matching test is already pending or needs review. No duplicate was created.'},{headers:{'Cache-Control':'no-store'}})}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
 const contact=(await trialInvoiceApi('contacts/1611011000000105015','GET')).contact;
 if(contact?.contact_name!=='SAMSON TEST Website Booking'||contact?.email!=='samson-website-trial@example.invalid')throw Error('Fictional contact not verified.');
 // Exclusive durable claim before mutation. Ambiguous timeouts require review, never an automatic retry.
 await writeFile(file,JSON.stringify({state:'pending',createdAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
 const created=await trialInvoiceApi('invoices','POST',{
 customer_id:contact.contact_id,reference_number:'SAMSON-CALC-'+digest,
 line_items:snapshot.initialLines.map(line=>({name:'SAMSON TEST — '+line.label,description:'Fictional calculator transfer only. No service, reservation or charge.',quantity:line.quantity,rate:line.unitPriceCents/100})),
 notes:'SAMSON TEST ONLY. Unsent draft; no payment or appointment authorized. Maintenance terms remain draft. '+(snapshot.selection.billingMode==='annual-prepay'?'All listed first-year visits are included in this draft total. Do not invoice these visits again. The next anniversary is excluded. ':'Only initial visit is invoiced. Planned future visits, billed separately: ')+snapshot.visitOrders.slice(1).map(visit=>'Repeat '+visit.index+' month '+visit.index*snapshot.maintenance.months+': '+visit.lines.map(line=>line.label+' x'+line.quantity).join('; ')+' — USD '+(visit.totalCents/100).toFixed(2)).join('\n')
 });
 const invoice=created.invoice;
 const verified=(await trialInvoiceApi('invoices/'+invoice.invoice_id,'GET')).invoice;
 const linesMatch=verified.line_items?.length===snapshot.initialLines.length&&snapshot.initialLines.every((line,index)=>{
 const actual=verified.line_items[index];return actual.name==='SAMSON TEST — '+line.label&&Number(actual.quantity)===line.quantity&&Math.round(Number(actual.rate)*100)===line.unitPriceCents&&Math.round(Number(actual.item_total)*100)===line.amountCents;
 });
 if(!linesMatch||verified.status!=='draft'||Math.round(Number(verified.total)*100)!==snapshot.initialTotalCents||verified.customer_id!==contact.contact_id)throw Error('Invoice requires review.');
 const result={invoiceId:verified.invoice_id,invoiceNumber:verified.invoice_number,totalCents:snapshot.initialTotalCents,status:verified.status,notice:'Unsent fictional draft. No dates reserved, payment taken, email sent or recurring charges enabled.'};
 await writeFile(file,JSON.stringify({state:'verified',result}),{mode:0o600});
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The draft result could not be confirmed. Review existing test records before retrying. No card was charged.'},{status:400,headers:{'Cache-Control':'no-store'}})}
}

