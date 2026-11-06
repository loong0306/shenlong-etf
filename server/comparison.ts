import {findEtf} from '../shared/catalog.ts';
import {buildComparisonBaseline} from '../shared/comparison.ts';
export function createComparisonService(fetchText:(url:string)=>Promise<string>){
 const cache=new Map<string,{until:number;data:unknown}>(),pending=new Map<string,Promise<unknown>>();
 return async(symbol:string,date:string)=>{
  if(!findEtf(symbol)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw new Error('无效的ETF或行情日期');
  const key=symbol+date;const hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.data;if(pending.has(key))return pending.get(key)!;
  const sourceUrl=`https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${symbol}&scale=5&ma=no&datalen=1600`;
  const job=(async()=>{const rows=JSON.parse(await fetchText(sourceUrl));if(!Array.isArray(rows))throw new Error('历史成交额不可用');const baseline=buildComparisonBaseline(rows,date);if(!baseline.sampleCount)throw new Error('无完整历史成交额样本');const data={...baseline,symbol,snapshotDate:date,sourceUrl,fetchedAt:new Date().toISOString()};cache.set(key,{until:Date.now()+600000,data});return data;})().finally(()=>pending.delete(key));pending.set(key,job);return job;
 };
}
