import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRules,normalizeFavorites,normalizeHistory} from '../src/storage.ts';
test('corrupt settings and inverted thresholds cannot enable misleading signals',()=>{
 assert.deepEqual(normalizeRules({oversold:80,overbought:20,enabled:true}),{oversold:30,overbought:70,enabled:true,notifications:false});
 assert.equal(normalizeRules({oversold:25,overbought:75,enabled:false,notifications:false}).oversold,25);
});
test('watch list filters unknown symbols without restoring intentionally empty list',()=>{
 assert.deepEqual(normalizeFavorites(['sh510300','bogus','sh510300']),['sh510300']);
 assert.deepEqual(normalizeFavorites([]),[]);
});
test('legacy storage keeps only real records and discards simulated records',()=>{
 const real={id:'real',symbol:'sh510300',kind:'oversold',value:20,time:'2026-11-05T10:00:00+08:00',createdAt:1000,read:false,mode:'live'};
 assert.deepEqual(normalizeHistory({live:[real],demo:[{...real,id:'fake',mode:'demo'}]}),{live:[real]});
 assert.deepEqual(normalizeHistory({live:[{...real,mode:'demo'}]}),{live:[]});
});
test('refresh preference accepts supported seconds and falls back for invalid stored values',async()=>{
 const {normalizeRefreshSeconds}=await import('../src/storage.ts');
 for(const seconds of [1,3,5,10,15,30])assert.equal(normalizeRefreshSeconds(seconds),seconds);
 for(const invalid of [null,0,2,-1,NaN,'1',60000])assert.equal(normalizeRefreshSeconds(invalid),10);
});
