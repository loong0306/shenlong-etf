import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectSignals} from '../shared/monitor.ts';
import {DEFAULT_RULES} from '../shared/indicators.ts';
import {quoteSamples} from './fixtures.ts';
import type {ChartData,MarketData} from '../shared/types.ts';
const now=Date.parse('2026-11-05T10:53:00+08:00');
const market:MarketData={mode:'live',source:'test',sourceUrl:'https://example.com',fetchedAt:new Date(now).toISOString(),warnings:[],quotes:quoteSamples().map(q=>({...q,time:'2026-11-05T10:52:30+08:00'}))};
const technical:ChartData={mode:'live',source:'test',sourceUrl:'https://example.com',fetchedAt:new Date(now).toISOString(),warnings:[],symbol:'sh510300',period:'m5',bars:[],rsi:20,bands:null,indicatorTime:'2026-11-05T10:50:00+08:00'};
test('switching demo to live with failing live requests cannot copy simulated signals into real history',()=>{
 assert.equal(collectSignals('live',market,{sh510300:{...technical,mode:'demo' as unknown as 'live'}},['sh510300'],DEFAULT_RULES,[],now).length,0);
 assert.equal(collectSignals('live',{...market,mode:'demo' as unknown as 'live'},{sh510300:technical},['sh510300'],DEFAULT_RULES,[],now).length,0);
});
test('a fresh real technical threshold produces a real alert; a stale bar does not',()=>{
 const valid=collectSignals('live',market,{sh510300:technical},['sh510300'],DEFAULT_RULES,[],now);
 assert.equal(valid.length,1);assert.equal(valid[0].mode,'live');
 assert.equal(collectSignals('live',market,{sh510300:{...technical,indicatorTime:'2026-11-05T10:40:00+08:00'}},['sh510300'],DEFAULT_RULES,[],now).length,0);
});
