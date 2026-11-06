import type { Bar, Period, Rules, Signal } from './types.ts';
export const DEFAULT_RULES: Rules = {oversold:30,overbought:70,enabled:true,notifications:false};
export function rsi(prices:number[],period=14):number|null {
 if(prices.length<=period||prices.some(p=>!Number.isFinite(p))) return null;
 let gain=0,loss=0;
 for(let i=1;i<=period;i++){const d=prices[i]-prices[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
 gain/=period;loss/=period;
 for(let i=period+1;i<prices.length;i++){const d=prices[i]-prices[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period;}
 return gain===0&&loss===0?50:loss===0?100:100-100/(1+gain/loss);
}
export function bollinger(prices:number[],period=20):{middle:number;upper:number;lower:number}|null {
 if(prices.length<period) return null;
 const tail=prices.slice(-period);if(tail.some(p=>!Number.isFinite(p)))return null;
 const middle=tail.reduce((a,b)=>a+b,0)/period;
 const deviation=Math.sqrt(tail.reduce((a,b)=>a+(b-middle)**2,0)/period);
 return {middle,upper:middle+2*deviation,lower:middle-2*deviation};
}
export function closedBars(bars:Bar[],period:Period,now=Date.now()):Bar[] {
 return bars.filter(bar=>{
  const end=period==='day'?Date.parse(`${bar.time.slice(0,10)}T15:00:00+08:00`):Date.parse(bar.time);
  return Number.isFinite(end)&&end<now-2000;
 });
}
export function isFresh(time:string,now=Date.now()):boolean {
 const age=now-Date.parse(time);return Number.isFinite(age)&&age>=-10000&&age<=120000;
}
export function makeSignal(symbol:string,value:number|null,time:string,rules:Rules):Signal|null {
 if(!rules.enabled||value===null||!Number.isFinite(value))return null;
 const kind=value<rules.oversold?'oversold':value>rules.overbought?'overbought':null;
 return kind?{id:`${symbol}-${kind}-${time}`,symbol,kind,value,time,createdAt:Date.now(),read:false,mode:'live'}:null;
}
export function shouldNotify(signal:Signal,history:Signal[],now=Date.now()):boolean {
 return !history.some(s=>s.mode===signal.mode&&(s.id===signal.id||(s.symbol===signal.symbol&&s.kind===signal.kind&&now-s.createdAt<600000)));
}
export function bandSeries(bars:Bar[],period:Period,now=Date.now()):({middle:number;upper:number;lower:number}|null)[]{
 const completed=new Set(closedBars(bars,period,now).map(b=>b.time));
 const prices:number[]=[];
 return bars.map(bar=>{if(!completed.has(bar.time))return null;prices.push(bar.close);return bollinger(prices);});
}
