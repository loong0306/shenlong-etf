import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tradeObservations} from '../shared/tradeObservations.ts';
import {DEFAULT_RULES,rsi} from '../shared/indicators.ts';
import type {Bar} from '../shared/types.ts';
const prices=[...Array.from({length:18},(_,i)=>100-i),100,101,102];
const bars=(values=prices):Bar[]=>values.map((close,i)=>({time:new Date(Date.parse('2026-11-11T09:35:00+08:00')+i*300000).toISOString(),open:close,close,high:close+.1,low:close-.1,volume:100,amount:400}));
const now=Date.parse('2026-11-11T15:01:00+08:00');

test('entry confirms recovery from oversold on a rising closed candle, at its actual close',()=>{
 const result=tradeObservations(bars(),DEFAULT_RULES,now);
 assert.equal(result.length,1);assert.equal(result[0].kind,'entry');assert.equal(result[0].time,bars()[18].time);
 assert.equal(result[0].price,100);assert.equal(result[0].previousRsi,0);
 assert.ok(result[0].rsi>=30);assert.ok(result[0].reason.includes('30'));
 assert.equal(result[0].rsi,rsi(prices.slice(0,19)));
});
test('exit confirms cooling from overbought and continuous extreme states are not repeated',()=>{
 const result=tradeObservations(bars(prices.map(p=>200-p)),DEFAULT_RULES,now);
 assert.equal(result.length,1);assert.equal(result[0].kind,'exit');assert.ok(result[0].rsi<=70);
 assert.equal(tradeObservations(bars(prices.slice(0,18)),DEFAULT_RULES,now).length,0);
});
test('forming candles and the two-second close guard cannot create early points',()=>{
 const time=Date.parse(bars()[18].time);
 assert.equal(tradeObservations(bars(),DEFAULT_RULES,time+1000).length,0);
 assert.equal(tradeObservations(bars(),DEFAULT_RULES,time+3000).length,1);
});
test('cached forming snapshots never become confirmed just because the client clock advances',()=>{
 const snapshot=bars().slice(0,19),confirmedThrough=snapshot[17].time;
 assert.equal(tradeObservations(snapshot,DEFAULT_RULES,now,confirmedThrough).length,0);
 assert.equal(tradeObservations(snapshot,DEFAULT_RULES,now,null).length,0);
 assert.equal(tradeObservations(snapshot,DEFAULT_RULES,now,'invalid').length,0);
 assert.equal(tradeObservations(snapshot,DEFAULT_RULES,now,snapshot[18].time).length,1);
});
test('later candles never rewrite previously confirmed points (no future lookahead)',()=>{
 const full=tradeObservations(bars(),DEFAULT_RULES,now);
 for(let length=15;length<=prices.length;length++){
  const prefix=bars().slice(0,length);
  assert.deepEqual(tradeObservations(prefix,DEFAULT_RULES,now),full.filter(p=>Date.parse(p.time)<=Date.parse(prefix.at(-1)!.time)));
 }
});
test('thresholds follow configured rules, independently of notification preference',()=>{
 assert.equal(tradeObservations(bars(),{...DEFAULT_RULES,oversold:80,overbought:90},now).length,0);
 assert.equal(tradeObservations(bars(),{...DEFAULT_RULES,enabled:false},now).length,1);
 assert.equal(tradeObservations(bars().slice(0,14),DEFAULT_RULES,now).length,0);
 assert.equal(tradeObservations(bars(),{...DEFAULT_RULES,oversold:80,overbought:20},now).length,0);
});
