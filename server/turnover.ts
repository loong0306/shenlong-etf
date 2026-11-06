import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {findEtf} from '../shared/catalog.ts';
import type {TurnoverDay,TurnoverPoint,TurnoverData} from '../shared/types.ts';
export const SESSION_MINUTES=Array.from({length:331},(_,i)=>570+i).filter(m=>m<=690||m>=780).map(m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
const minutes=new Set(SESSION_MINUTES);
function validDay(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
function cleanDays(days:TurnoverDay[]):TurnoverDay[]{
 return days.filter(d=>validDay(d.date)&&Array.isArray(d.points)).map(d=>({date:d.date,points:d.points.filter(p=>minutes.has(p.time)&&typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0)})).filter(d=>d.points.length>0).sort((a,b)=>b.date.localeCompare(a.date));
}
export function parseTurnover(data:any,symbol:string):TurnoverDay[]{
 const rows=data?.data?.[symbol]?.data;if(!Array.isArray(rows))throw new Error('分钟累计成交额数据格式异常');
 return cleanDays(rows.flatMap((row:any)=>{
  if(!/^\d{8}$/.test(row.date)||!Array.isArray(row.data))return [];
  const date=`${row.date.slice(0,4)}-${row.date.slice(4,6)}-${row.date.slice(6,8)}`;let last=-1;
  const points:TurnoverPoint[]=[];
  for(const line of row.data){const f=String(line).trim().split(/\s+/),time=f[0].slice(0,2)+':'+f[0].slice(2);if(!minutes.has(time)||f[3]===undefined)continue;const amount=Number(f[3]);if(!Number.isFinite(amount)||amount<0||amount<last)continue;points.push({time,amount});last=amount;}
  return [{date,points}];
 }));
}
export function buildTurnover(days:TurnoverDay[],today:string):{days:TurnoverDay[];sampleCount:number;baselineDates:string[];average:TurnoverPoint[]}{
 const ordered=cleanDays(days).filter(d=>d.date<=today);
 const baseline=ordered.filter(d=>d.date<today&&d.points.some(p=>p.time==='15:00')).slice(0,20);
 const maps=baseline.map(d=>new Map(d.points.map(p=>[p.time,p.amount])));
 const average=SESSION_MINUTES.map(time=>{const values=maps.map(m=>m.get(time));return {time,amount:values.length&&values.every(v=>typeof v==='number')?(values as number[]).reduce((a,b)=>a+b,0)/values.length:null};});
 return {days:ordered,sampleCount:baseline.length,baselineDates:baseline.map(d=>d.date),average};
}
export function createTurnoverService(fetchText:(url:string)=>Promise<string>){
 const cache=new Map<string,{until:number;data:TurnoverData}>(),pending=new Map<string,Promise<TurnoverData>>();
 const directory=new URL('../data/turnover/',import.meta.url);
 async function load(symbol:string):Promise<TurnoverData>{
  const sourceUrl=`https://web.ifzq.gtimg.cn/appstock/app/day/query?code=${symbol}`;
  const incoming=parseTurnover(JSON.parse(await fetchText(sourceUrl)),symbol);if(!incoming.length)throw new Error('暂无分钟累计成交额');
  const file=new URL(symbol+'.json',directory);let archived:TurnoverDay[]=[];let stored='';
  try{stored=await readFile(file,'utf8');archived=cleanDays(JSON.parse(stored));}catch{/* Missing or corrupt cache is never treated as data. */}
  const byDate=new Map(archived.map(d=>[d.date,d]));
  for(const day of incoming){const points=new Map((byDate.get(day.date)?.points??[]).map(p=>[p.time,p]));for(const p of day.points)points.set(p.time,p);byDate.set(day.date,{date:day.date,points:[...points.values()].sort((a,b)=>a.time.localeCompare(b.time))});}
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const result=buildTurnover([...byDate.values()],today);result.days=result.days.slice(0,40);
  const warnings:string[]=[];
  if(result.sampleCount<20)warnings.push(`历史完整样本仅${result.sampleCount}日，均值按实际样本计算，尚不是20日均值；继续使用时会在本地积累。`);
  try{const text=JSON.stringify(result.days);if(text!==stored){await mkdir(directory,{recursive:true});await writeFile(new URL(symbol+'.tmp',directory),text);await rename(new URL(symbol+'.tmp',directory),file);}}catch{warnings.push('本地历史保存失败，当前数据仍可查看，但无法跨重启积累。');}
  return {mode:'live',source:'腾讯财经 · 分钟累计成交额',sourceUrl,fetchedAt:new Date().toISOString(),warnings,symbol,today,...result};
 }
 return async(symbol:string):Promise<TurnoverData>=>{
  if(!findEtf(symbol))throw new Error('不支持的ETF代码');const hit=cache.get(symbol);if(hit&&hit.until>Date.now())return hit.data;if(pending.has(symbol))return pending.get(symbol)!;
  const job=load(symbol).then(data=>{cache.set(symbol,{until:Date.now()+800,data});return data;}).finally(()=>pending.delete(symbol));pending.set(symbol,job);return job;
 };
}
