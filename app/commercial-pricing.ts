export const schedules = [
  {id:'monthly', label:'Monthly', visits:12, detail:'1 visit each month'},
  {id:'twice', label:'Twice monthly', visits:24, detail:'2 visits each month'},
  {id:'weekly', label:'Weekly', visits:52, detail:'52 visits per year'},
] as const;
export const storefrontPlans = [
  {name:'Starter', panels:'1–6 panels', description:'Very small storefront', prices:[39,80,175], photo:1},
  {name:'Small', panels:'7–12 panels', description:'Small shop or salon', prices:[49,120,260], photo:24},
  {name:'Medium', panels:'13–16 panels', description:'Medium storefront', prices:[59,160,345], photo:47},
  {name:'Large', panels:'17–20 panels', description:'Larger storefront', prices:[69,200,430], photo:72},
  {name:'XL', panels:'21–24 panels', description:'Wide storefront or multiple entrances', prices:[89,260,560], photo:98},
] as const;
export const interiorPanes = [
  {name:'Small', price:10, example:'Small square window', area:'Up to 6 sq ft', width:34, height:42},
  {name:'Medium', price:15, example:'Larger square window', area:'Over 6–12 sq ft', width:48, height:48},
  {name:'Regular', price:25, example:'Single glass door', area:'Over 12–21 sq ft', width:38, height:74},
  {name:'Large', price:35, example:'Large window', area:'Over 21–35 sq ft', width:64, height:65},
  {name:'Very large', price:50, example:'Extra large window', area:'Over 35–50 sq ft', width:82, height:72},
] as const;
export type InteriorCadence = 'once' | 'every';
export function calculateCommercialQuote(planIndex:number, scheduleIndex:number, quantities:number[], cadence:InteriorCadence, ladder:boolean) {
  if (!Number.isInteger(planIndex) || !storefrontPlans[planIndex] || !Number.isInteger(scheduleIndex) || !schedules[scheduleIndex]) throw new Error('Choose a valid plan and schedule.');
  if (quantities.length !== interiorPanes.length || quantities.some(q=>!Number.isInteger(q)||q<0||q>100)) throw new Error('Pane quantities must be whole numbers from 0 to 100.');
  if(cadence!=='once'&&cadence!=='every') throw new Error('Choose an interior schedule.');
  const exteriorMonthly = storefrontPlans[planIndex].prices[scheduleIndex];
  const count = quantities.reduce((sum,q)=>sum+q,0);
  const interiorPerVisit = quantities.reduce((sum,q,i)=>sum+q*interiorPanes[i].price,0);
  const ladderPerVisit = count>0 && ladder ? 20 : 0;
  const interiorTotalPerVisit = interiorPerVisit+ladderPerVisit;
  // Integer cents retain the fixed annual service count without fractional billing cents.
  const recurringInteriorCents = cadence==='every' ? Math.round(interiorTotalPerVisit*100*schedules[scheduleIndex].visits/12) : 0;
  return {exteriorMonthly, count, interiorPerVisit, ladderPerVisit, interiorTotalPerVisit,
    monthly:(exteriorMonthly*100+recurringInteriorCents)/100,
    recurringInterior:recurringInteriorCents/100,
    firstBill:(exteriorMonthly*100+recurringInteriorCents+(cadence==='once'?interiorTotalPerVisit*100:0))/100,
    oneTime:cadence==='once'?interiorTotalPerVisit:0,
    visits:schedules[scheduleIndex].visits};
}
