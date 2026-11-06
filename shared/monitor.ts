import type {ChartData,MarketData,Mode,Rules,Signal} from './types.ts';
import {isFresh,makeSignal,shouldNotify} from './indicators.ts';
export function collectSignals(mode:Mode,market:MarketData|null,technicals:Record<string,ChartData>,favorites:string[],rules:Rules,history:Signal[],now=Date.now()):Signal[]{
 if(!rules.enabled||!market||market.mode!==mode)return [];
 const result:Signal[]=[];
 for(const symbol of favorites){
  const technical=technicals[symbol],quote=market.quotes.find(q=>q.symbol===symbol);
  if(!technical?.indicatorTime||technical.mode!==mode||technical.period!=='m5')continue;
  const barAge=now-Date.parse(technical.indicatorTime);
  if(mode==='live'&&(!quote||!isFresh(quote.time,now)||!Number.isFinite(barAge)||barAge<0||barAge>420000))continue;
  const signal=makeSignal(symbol,technical.rsi,technical.indicatorTime,rules);
  if(!signal)continue;signal.mode=mode;signal.createdAt=now;
  if(shouldNotify(signal,history,now))result.push(signal);
 }
 return result;
}
