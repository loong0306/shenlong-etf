import {load} from 'cheerio';
import {INSTRUMENTS} from '../shared/catalog.ts';
import type {Bar,Period,Quote,Holder} from '../shared/types.ts';
export function number(value:unknown):number|null {
 if(value===null||value===undefined||String(value).trim()===''||String(value)==='--')return null;
 const n=Number(String(value).replaceAll(',',''));return Number.isFinite(n)?n:null;
}
function timestamp(s:string):string {
 if(/^\d{8}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
 if(/^\d{14}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}+08:00`;
 if(/^\d{12}$/.test(s))return timestamp(s+'00');
 return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
export function parseTencentQuotes(raw:string):Quote[]{
 const quotes:Quote[]=[];
 for(const m of raw.matchAll(/v_((?:sh|sz)\d{6})="([^"]*)"/g)){
  const info=INSTRUMENTS.find(i=>i.symbol===m[1]);if(!info)continue;
  const f=m[2].split('~'),price=number(f[3]),previousClose=number(f[4]),volume=number(f[6]),time=timestamp(f[30]??'');
  if(price===null||price<=0||previousClose===null||previousClose<=0||volume===null||!time||!Number.isFinite(Date.parse(time)))continue;
  const lots=(i:number)=>{const n=number(f[i]);return n===null?null:n*100;};
  const depth=(start:number)=>Array.from({length:5},(_,i)=>({price:number(f[start+i*2]),volume:lots(start+i*2+1)})).filter((d):d is {price:number;volume:number}=>d.price!==null&&d.price>0&&d.volume!==null&&d.volume>=0);
  quotes.push({...info,price,previousClose,change:price-previousClose,changePct:(price/previousClose-1)*100,open:number(f[5])??price,high:number(f[33])??price,low:number(f[34])??price,volume:volume*100,amount:number(f[35]?.split('/')[2]),buyVolume:lots(7),sellVolume:lots(8),turnover:number(f[38]),totalShares:info.kind==='etf'?number(f[72]):null,iopv:null,time,bids:depth(9),asks:depth(19)});
 }
 return quotes;
}
export function parseBars(data:any,symbol:string,period:Period):Bar[]{
 const node=data?.data?.[symbol];const rows=period==='day'?(node?.qfqday??node?.day):node?.m5;
 if(!Array.isArray(rows))return [];
 return rows.flatMap((row:any)=>{
  if(!Array.isArray(row))return [];
  const time=timestamp(String(row[0])),values=row.slice(1,6).map(number);
  if(!time||values.length!==5||values.some((n:number|null)=>n===null)||values.slice(0,4).some((n:number|null)=>n!==null&&n<=0))return [];
  const [open,close,high,low,volume]=values as number[];
  return [{time,open,close,high,low,volume:volume*100,amount:null}];
 });
}
export function parseMinute(data:any,symbol:string):Bar[]{
 const node=data?.data?.[symbol]?.data;if(!node||!Array.isArray(node.data))return [];
 const date=timestamp(String(node.date)),bars:Bar[]=[];let lastVolume=0,lastAmount=0;
 if(!date)return [];
 for(const line of node.data){
  const [hhmm,p,v,a]=String(line).trim().split(/\s+/);const price=number(p),volume=number(v),amount=number(a);
  if(!/^\d{4}$/.test(hhmm)||price===null||price<=0||volume===null||volume<lastVolume)continue;
  const shares=volume*100;
  bars.push({time:`${date.slice(0,10)}T${hhmm.slice(0,2)}:${hhmm.slice(2)}:00+08:00`,open:bars.at(-1)?.close??price,close:price,high:price,low:price,volume:(volume-lastVolume)*100,amount:amount===null?null:Math.max(0,amount-lastAmount),average:amount!==null&&shares>0?amount/shares:null});
  lastVolume=volume;if(amount!==null)lastAmount=amount;
 }
 return bars;
}
const nationalNames=new Set(['中央汇金投资有限责任公司','中央汇金资产管理有限责任公司','中国证券金融股份有限公司','国新投资有限公司','中国国新控股有限责任公司','中国诚通控股集团有限公司','诚通金控投资有限公司']);
export function parseHolders(html:string):{reportDate:string;previousReportDate:string|null;holders:Holder[]}{
 const $=load(html),dates=$('#tc_slt option').map((_,el)=>$(el).attr('value')??'').get();
 const reportDate=dates[0];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(reportDate??'')||!$('#tb-title').text().includes('持有份额(份)'))throw new Error('持有人页面格式已变化或报告期缺失');
 const holders:Holder[]=[];
 $('tr.f005').each((_,row)=>{
  const cells=$(row).find('td').map((_,c)=>$(c).text().trim()).get();
  const shares=number(cells[2]),ratio=number(cells[3]);
  if(cells[1]&&shares!==null&&shares>=0&&ratio!==null&&ratio>=0&&ratio<=100)holders.push({name:cells[1],shares,ratio,national:nationalNames.has(cells[1]),delta:null});
 });
 if(!holders.length)throw new Error('数据源暂未提供十大持有人');
 return {reportDate,previousReportDate:dates[1]??null,holders};
}
