export interface ComparisonBaseline {sampleCount:number;dates:string[];dailyMean:number|null;progress:number[];history:{date:string;amount:number}[];}
export const FIVE_MINUTES=Array.from({length:48},(_,i)=>i<24?575+i*5:785+(i-24)*5);
export function activeNetBuy(buy:number|null,sell:number|null,amount:number|null):number|null{
 return buy===null||sell===null||amount===null||![buy,sell,amount].every(Number.isFinite)||buy<0||sell<0||amount<0||buy+sell===0?null:(buy-sell)/(buy+sell)*amount;
}
export function buildComparisonBaseline(rows:unknown,snapshotDate:string):ComparisonBaseline{
 const groups=new Map<string,Map<number,number>>();
 if(Array.isArray(rows))for(const row of rows){
  if(typeof row?.day!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.day))continue;
  const date=row.day.slice(0,10),m=Number(row.day.slice(11,13))*60+Number(row.day.slice(14,16));
  if(date>=snapshotDate||!FIVE_MINUTES.includes(m))continue;
  const amount=row.amount==null||String(row.amount).trim()===''?NaN:Number(row.amount);
  if(!Number.isFinite(amount)||amount<0)continue;
  const group=groups.get(date)??new Map();group.set(m,amount);groups.set(date,group);
 }
 const complete=[...groups].filter(([,g])=>FIVE_MINUTES.every(m=>g.has(m))).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,g])=>({date,values:FIVE_MINUTES.map(m=>g.get(m)!)})).filter(d=>d.values.reduce((a,b)=>a+b,0)>0);
 const base=complete.slice(0,20),totals=base.map(d=>d.values.reduce((a,b)=>a+b,0));
 const curves=base.map((d,i)=>{let sum=0;return d.values.map(v=>(sum+=v)/totals[i]);});
 return {sampleCount:base.length,dates:base.map(d=>d.date),dailyMean:totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:null,progress:FIVE_MINUTES.map((_,i)=>curves.length?curves.reduce((a,c)=>a+c[i],0)/curves.length:0),history:complete.slice(0,30).reverse().map(d=>({date:d.date,amount:d.values.reduce((a,b)=>a+b,0)}))};
}
export function sameTimeRatio(amount:number|null,time:string,baseline:ComparisonBaseline):number|null{
 if(amount===null||!Number.isFinite(amount)||amount<0||!baseline.dailyMean||!baseline.sampleCount)return null;
 const date=new Date(time);if(!Number.isFinite(date.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date).split(':').map(Number);
 const minute=parts[0]*60+parts[1]+parts[2]/60;if(minute<=570)return null;
 let fraction=1;
 if(minute<900){const right=FIVE_MINUTES.findIndex(m=>m>=minute);const left=right-1;
  if(right===24&&minute<780)fraction=baseline.progress[23];
  else{const leftTime=left<0?570:right===24?780:FIVE_MINUTES[left];const leftValue=left<0?0:baseline.progress[left];fraction=leftValue+(baseline.progress[right]-leftValue)*(minute-leftTime)/(FIVE_MINUTES[right]-leftTime);}
 }
 return fraction>0?amount/(baseline.dailyMean*fraction):null;
}
