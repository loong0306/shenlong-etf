import {closedBars,rsi} from './indicators.ts';
import type {Bar,Rules} from './types.ts';

export interface TradeObservation {
 kind:'entry'|'exit';time:string;price:number;rsi:number;previousRsi:number;reason:string;
}
// Each point uses only its own closed prefix. No future pivot or extrema lookup.
// One position state at a time: after an entry only an exit can follow, and the other way round.
// The state starts unknown, so the first crossing inside the window is always kept.
// These are chart observations; the notification enabled flag does not hide history.
export function tradeObservations(bars:Bar[],rules:Rules,now=Date.now(),confirmedThrough?:string|null):TradeObservation[] {
 if(!Number.isFinite(rules.oversold)||!Number.isFinite(rules.overbought)||rules.oversold<1||rules.overbought>99||rules.oversold>=rules.overbought)return [];
 // A cached forming candle must never become confirmed by wall-clock passage.
 const cutoff=confirmedThrough===undefined?Infinity:Date.parse(confirmedThrough??'');
 if(Number.isNaN(cutoff))return [];
 const completed=closedBars(bars,'m5',now).filter(bar=>Date.parse(bar.time)<=cutoff);
 const prices:number[]=[],points:TradeObservation[]=[];
 let previousRsi:number|null=null,holding:boolean|null=null;
 for(const [index,bar] of completed.entries()){
  prices.push(bar.close);
  const value=rsi(prices),previous=completed[index-1];
  if(value!==null&&previousRsi!==null&&previous){
   const entry=previousRsi<rules.oversold&&value>=rules.oversold&&bar.close>previous.close;
   const exit=previousRsi>rules.overbought&&value<=rules.overbought&&bar.close<previous.close;
   if(entry&&holding!==true){points.push({kind:'entry',time:bar.time,price:bar.close,rsi:value,previousRsi,
    reason:`RSI从超卖区回升至${rules.oversold}及以上，收盘价高于上一根`});holding=true;}
   else if(exit&&holding!==false){points.push({kind:'exit',time:bar.time,price:bar.close,rsi:value,previousRsi,
    reason:`RSI从超买区回落至${rules.overbought}及以下，收盘价低于上一根`});holding=false;}
  }
  previousRsi=value;
 }
 return points;
}
