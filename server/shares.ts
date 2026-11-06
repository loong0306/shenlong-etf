import {findEtf} from '../shared/catalog.ts';
import type {SharePoint,ShareData} from '../shared/types.ts';
import {number} from './parsers.ts';
function validDate(value:unknown):value is string {
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
function normalize(points:SharePoint[]):SharePoint[]{return [...new Map(points.map(p=>[p.date,p])).values()].sort((a,b)=>b.date.localeCompare(a.date));}
export function parseSseShares(payload:any,symbol:string):SharePoint[]{
 if(!Array.isArray(payload?.result))throw new Error('上交所份额数据格式异常');
 return normalize(payload.result.flatMap((row:any)=>{
  const shares=number(row.TOT_VOL);
  return row.SEC_CODE===symbol.slice(2)&&validDate(row.STAT_DATE)&&shares!==null&&shares>=0?[{date:row.STAT_DATE,shares:Math.round(shares*10000)}]:[];
 }));
}
export function parseSzseShares(payload:any,symbol:string):SharePoint[]{
 const report=Array.isArray(payload)?payload.find((p:any)=>p.metadata?.cols?.current_size):null;
 if(!report||!String(report.metadata.cols.current_size).includes('万份')||!Array.isArray(report.data))throw new Error('深交所份额格式或单位无法确认');
 return normalize(report.data.flatMap((row:any)=>{
  const shares=number(row.current_size);
  return row.fund_code===symbol.slice(2)&&validDate(row.size_date)&&shares!==null&&shares>=0?[{date:row.size_date,shares:Math.round(shares*10000)}]:[];
 }));
}
export function createShareService(fetchText:(url:string,encoding?:string)=>Promise<string>):(symbol:string)=>Promise<ShareData>{
 const rawCache=new Map<string,{until:number;data:unknown}>(),pending=new Map<string,Promise<unknown>>();
 const cache=new Map<string,{until:number;data:ShareData}>();
 async function json(url:string):Promise<unknown>{
  const hit=rawCache.get(url);if(hit&&hit.until>Date.now())return hit.data;
  if(pending.has(url))return pending.get(url)!;
  const job=fetchText(url).then(text=>{const data=JSON.parse(text);rawCache.set(url,{data,until:Date.now()+600000});return data;}).finally(()=>pending.delete(url));pending.set(url,job);return job;
 }
 const sseUrl=(date='')=>'https://query.sse.com.cn/commonQuery.do?'+new URLSearchParams({isPagination:'true','pageHelp.pageSize':'1000','pageHelp.pageNo':'1',sqlId:'COMMON_SSE_ZQPZ_ETFZL_XXPL_ETFGM_SEARCH_L',STAT_DATE:date});
 return async(symbol:string)=>{
  if(!findEtf(symbol))throw new Error('不支持的ETF代码');
  const hit=cache.get(symbol);if(hit&&hit.until>Date.now())return hit.data;
  let points:SharePoint[]=[];const sh=symbol.startsWith('sh');
  const sourceUrl=sh?'https://www.sse.com.cn/market/funddata/volumn/etfvolumn/':`https://fund.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=fund_jjgm&TABKEY=tab1&loading=first&txtDm=${symbol.slice(2)}`;
  const warnings=['ETF总份额变化不代表国家队或任何特定机构的持仓变化，也不等于买卖成交量；拆分等事件同样可能影响份额。'];
  if(sh){
   points=parseSseShares(await json(sseUrl()),symbol);
   if(points.length){
    for(let offset=1;offset<=14;offset++){
     const date=new Date(Date.parse(points[0].date)-offset*86400000).toISOString().slice(0,10);
     try{const previous=parseSseShares(await json(sseUrl(date)),symbol).filter(p=>p.date<points[0].date);if(previous.length){points=normalize([...points,...previous]);break;}}
     catch{warnings.push('前期份额数据暂不可用');break;}
    }
   }
  }else points=parseSzseShares(await json(sourceUrl),symbol);
  if(!points.length)throw new Error('交易所暂未返回有效日度份额');
  const change=points.length>=2?points[0].shares-points[1].shares:null;
  if(change===null)warnings.push('缺少前一可比统计日，暂不计算份额变化');
  const data:ShareData={mode:'live',symbol,source:sh?'上海证券交易所 · 清算后ETF总份额':'深圳证券交易所 · ETF日度总份额',sourceUrl,fetchedAt:new Date().toISOString(),warnings,points,change,changePct:change!==null&&points[1].shares>0?change/points[1].shares*100:null};
  cache.set(symbol,{until:Date.now()+600000,data});return data;
 };
}
