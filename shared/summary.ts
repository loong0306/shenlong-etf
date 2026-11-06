import type {Quote} from './types.ts';
export function summarize(quotes:Quote[]):{amount:number|null;netVolume:number|null}{
 return {
  amount:quotes.length&&quotes.every(q=>q.amount!==null)?quotes.reduce((a,q)=>a+q.amount!,0):null,
  netVolume:quotes.length&&quotes.every(q=>q.buyVolume!==null&&q.sellVolume!==null)?quotes.reduce((a,q)=>a+q.buyVolume!-q.sellVolume!,0):null
 };
}
