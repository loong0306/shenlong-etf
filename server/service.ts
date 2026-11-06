import {HOLDER_HISTORY_NOTE} from '../shared/disclosure.ts';
import {ETFS,INSTRUMENTS,findEtf} from '../shared/catalog.ts';
import {bollinger,rsi,closedBars} from '../shared/indicators.ts';
import type {Mode,Period,MarketData,ChartData,HolderData,Envelope} from '../shared/types.ts';
import {parseTencentQuotes,parseBars,parseMinute,parseHolders,number} from './parsers.ts';
export function validateRequest(symbol:string,period:string,mode:string='live'):void{
 if(!findEtf(symbol))throw new Error('不支持的ETF代码');
 if(!['minute','m5','day'].includes(period))throw new Error('不支持的时间周期');
 if(mode!=='live')throw new Error('无效数据模式');
}
export function createService(fetchText:(url:string,encoding?:string)=>Promise<string>){
 const cache=new Map<string,{until:number;value:unknown}>();const pending=new Map<string,Promise<any>>();
 async function cached<T>(key:string,ttl:number,fn:()=>Promise<T>):Promise<T>{
  const hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value as T;
  const running=pending.get(key);if(running)return running;
  const task=fn().then(value=>{cache.set(key,{value,until:Date.now()+ttl});return value;}).finally(()=>pending.delete(key));
  pending.set(key,task);return task;
 }
 function meta(mode:Mode,source:string,sourceUrl:string):Envelope{return {mode,source,sourceUrl,fetchedAt:new Date().toISOString(),warnings:[]};}
 return {
  async market(mode:Mode='live'):Promise<MarketData>{
   if(mode!=='live')throw new Error('无效数据模式');
   return cached('market:'+mode,800,async()=>{
    const sourceUrl='https://qt.gtimg.cn/q='+INSTRUMENTS.map(e=>e.symbol).join(',');
    const quotes=parseTencentQuotes(await fetchText(sourceUrl,'gb18030'));
    if(!quotes.length)throw new Error('公开数据源暂未返回有效行情，请稍后重试');
    const result={...meta(mode,'腾讯财经 · 公开行情',sourceUrl),quotes};
    if(quotes.length<INSTRUMENTS.length)result.warnings.push(`仅获取到${quotes.length}/${INSTRUMENTS.length}个标的行情，缺失标的不参与统计`);
    return result;
   });
  },
  async chart(symbol:string,period:Period,mode:Mode='live'):Promise<ChartData>{
   validateRequest(symbol,period,mode);
   return cached(`chart:${mode}:${symbol}:${period}`,45000,async()=>{
    const sourceUrl=period==='minute'?`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${symbol}`:period==='m5'?`https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${symbol},m5,,180`:`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,120,qfq`;
    const data=JSON.parse(await fetchText(sourceUrl));
    const bars=period==='minute'?parseMinute(data,symbol):parseBars(data,symbol,period);
    if(!bars.length)throw new Error('暂无可用图表数据');
    const completed=closedBars(bars,period);const prices=completed.map(b=>b.close);
    return {...meta(mode,'腾讯财经 · 公开K线',sourceUrl),symbol,period,bars,rsi:rsi(prices),bands:bollinger(prices),indicatorTime:completed.at(-1)?.time??null};
   });
  },
  async holders(symbol:string,mode:Mode='live'):Promise<HolderData>{
   validateRequest(symbol,'day',mode);
   return cached(`holders:${mode}:${symbol}`,21600000,async()=>{
    const code=findEtf(symbol)!.code,sourceUrl=`https://stock.finance.sina.com.cn/fundInfo/view/FundInfo_JJCYR.php?symbol=${code}`;
    const info=meta(mode,'新浪财经 · 十大持有人（转载披露）',sourceUrl);
    const data=parseHolders(await fetchText(sourceUrl,'gb18030'));
    if(data.previousReportDate){
     try {
      const url=`https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/CaihuiFundInfoService.getFundHolder?symbol=${code}&date=${data.previousReportDate}`;
      const previous=JSON.parse(await fetchText(url));const rows=previous?.result?.data;
      if(Array.isArray(rows)&&rows.length){for(const holder of data.holders){const old=rows.find((r:any)=>r.cyrmc===holder.name);const shares=number(old?.cyfe);if(shares!==null)holder.delta=holder.shares-shares;}}
      else info.warnings.push('上期持有人数据不可用，份额变化暂不计算');
     }catch {info.warnings.push('上期持有人数据不可用，份额变化暂不计算');}
    }
    info.warnings.push(HOLDER_HISTORY_NOTE,'转载数据请以基金管理人正式报告核验；历史份额变化不等于期间买卖成交量');
    return {...info,symbol,...data};
   });
  }
 };
}
