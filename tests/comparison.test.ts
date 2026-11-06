import {test} from 'node:test';import assert from 'node:assert/strict';
import {activeNetBuy,buildComparisonBaseline,sameTimeRatio} from '../shared/comparison.ts';
test('active net buy is signed direction estimate, not missing values coerced to zero',()=>{assert.equal(activeNetBuy(60,40,1000),200);assert.equal(activeNetBuy(20,80,1000),-600);assert.equal(activeNetBuy(0,0,100),null);assert.equal(activeNetBuy(null,10,100),null);});
const day=(date:string,amount:number)=>Array.from({length:48},(_,i)=>{const m=i<24?575+i*5:785+(i-24)*5;return {day:`${date} ${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00`,amount:String(amount)};});
test('baseline excludes snapshot day and incomplete days and sums actual yuan without estimating prices',()=>{
 const b=buildComparisonBaseline([...day('2026-11-02',10),...day('2026-11-03',20),...day('2026-11-04',999),{day:'2026-11-01 15:00:00',amount:'1000'}],'2026-11-04');
 assert.equal(b.sampleCount,2);assert.equal(b.dailyMean,720);assert.equal(b.history.length,2);assert.equal(b.progress[23],0.5);
 assert.equal(sameTimeRatio(360,'2026-11-04T11:30:00+08:00',b),1);assert.equal(sameTimeRatio(720,'2026-11-04T15:00:00+08:00',b),1);
 assert.equal(sameTimeRatio(100,'2026-11-04T09:30:00+08:00',b),null);
});
test('missing amount and duplicate timestamps cannot create a complete trading day',()=>{
 const rows=day('2026-11-03',10);rows[3].amount='--';const b=buildComparisonBaseline([...rows,...Array(48).fill({day:'2026-11-02 15:00:00',amount:'100'})],'2026-11-04');assert.equal(b.sampleCount,0);assert.equal(b.dailyMean,null);
});
test('midday break is flat and afternoon interpolation starts at 13:00',()=>{
 const b=buildComparisonBaseline(day('2026-11-03',10),'2026-11-04');
 for(const time of ['12:00:00','13:00:00'])assert.equal(sameTimeRatio(240,`2026-11-04T${time}+08:00`,b),1);
 assert.ok(Math.abs(sameTimeRatio(245,'2026-11-04T13:02:30+08:00',b)!-1)<1e-10);
});
test('comparison service requests a verified supported history length',async()=>{
 const {createComparisonService}=await import('../server/comparison.ts');
 const get=createComparisonService(async url=>{assert.equal(new URL(url).searchParams.get('datalen'),'1600');return JSON.stringify(day('2026-11-03',10));});
 const result=await get('sh510300','2026-11-04') as {sampleCount:number};assert.equal(result.sampleCount,1);
});
