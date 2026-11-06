import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rsi, bollinger, closedBars, makeSignal, DEFAULT_RULES, isFresh, shouldNotify } from '../shared/indicators.ts';
import type { Bar } from '../shared/types.ts';

test('RSI requires fourteen differences, not fourteen samples', () => {
 assert.equal(rsi(Array(14).fill(4)), null);
 assert.equal(rsi(Array(15).fill(4)), 50);
});
test('RSI handles monotone price sequences without division by zero', () => {
 assert.equal(rsi(Array.from({length:15},(_,i)=>i+1)),100);
 assert.equal(rsi(Array.from({length:15},(_,i)=>20-i)),0);
});
test('Wilder RSI matches independently published worked example', () => {
 const values=[44.34,44.09,44.15,43.61,44.33,44.83,45.1,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46,46.03,46.41,46.22,45.64,46.21];
 assert.ok(Math.abs(rsi(values)!-62.8807)<0.001);
});
test('Bollinger uses population deviation and rejects insufficient samples', () => {
 assert.equal(bollinger([1,2,3]),null);
 assert.deepEqual(bollinger([1,2,3,4],4),{middle:2.5,upper:2.5+2*Math.sqrt(1.25),lower:2.5-2*Math.sqrt(1.25)});
});
test('closed bars excludes incomplete five minute candle and daily session', () => {
 const bars=[{time:'2026-11-05T10:50:00+08:00',close:4},{time:'2026-11-05T10:55:00+08:00',close:4.1}] as Bar[];
 assert.equal(closedBars(bars,'m5',Date.parse('2026-11-05T10:53:00+08:00')).length,1);
 assert.equal(closedBars([{time:'2026-11-05',close:4}] as Bar[],'day',Date.parse('2026-11-05T14:50:00+08:00')).length,0);
});
test('stale quotes cannot trigger alerts', () => {
 assert.equal(isFresh('2026-11-05T10:00:00+08:00',Date.parse('2026-11-05T10:10:00+08:00')),false);
 assert.equal(isFresh('2026-11-05T10:00:00+08:00',Date.parse('2026-11-05T10:00:30+08:00')),true);
 assert.equal(isFresh('2026-11-05T11:00:00+08:00',Date.parse('2026-11-05T10:00:00+08:00')),false);
});
test('signals distinguish technical threshold states and cooldown deduplicates', () => {
 const result=makeSignal('sh510300',20,'2026-11-05T10:00:00+08:00',DEFAULT_RULES);
 assert.equal(result?.kind,'oversold');
 assert.equal(makeSignal('sh510300',50,'2026-11-05T10:00:00+08:00',DEFAULT_RULES),null);
 assert.equal(shouldNotify(result!,[{...result!,createdAt:1000}],2000),false);
 assert.equal(shouldNotify({...result!,id:'next-bar'},[{...result!,createdAt:1000}],601001),true);
});

test('plotted Bollinger bands exclude the still forming candle', async()=>{
 const {bandSeries}=await import('../shared/indicators.ts');
 const bars=Array.from({length:21},(_,i)=>({time:`2026-11-05T${String(9+Math.floor((35+i*5)/60)).padStart(2,'0')}:${String((35+i*5)%60).padStart(2,'0')}:00+08:00`,open:4,close:i===20?100:4,high:100,low:4,volume:100,amount:400}));
 const series=bandSeries(bars,'m5',Date.parse('2026-11-05T11:13:00+08:00'));
 assert.equal(series[20],null);assert.equal(series[19]?.upper,4);
});
