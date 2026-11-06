import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTurnover,buildTurnover} from '../server/turnover.ts';
test('cumulative amount is already yuan; exclude lunch and after hours without summing it again',()=>{
 const x=parseTurnover({data:{sh510300:{data:[{date:'20261105',data:['0930 4 100 40000','0931 4 200 80000','1200 4 200 80000','1530 4 300 120000']} ]}}},'sh510300');
 assert.deepEqual(x,[{date:'2026-11-05',points:[{time:'09:30',amount:40000},{time:'09:31',amount:80000}]}]);
});
test('missing or decreasing cumulative amounts are not fabricated',()=>{
 const x=parseTurnover({data:{sh510300:{data:[{date:'20261105',data:['0930 4 100','0931 4 200 80000','0932 4 100 40000']} ]}}},'sh510300');
 assert.deepEqual(x[0].points,[{time:'09:31',amount:80000}]);
});
test('baseline excludes today and incomplete history; missing minutes are not zero-filled',()=>{
 const x=buildTurnover([{date:'2026-11-05',points:[{time:'09:30',amount:999}]},{date:'2026-11-04',points:[{time:'09:30',amount:100},{time:'15:00',amount:300}]},{date:'2026-11-03',points:[{time:'09:30',amount:200},{time:'09:31',amount:250},{time:'15:00',amount:500}]},{date:'2026-11-02',points:[{time:'09:30',amount:99999}]}],'2026-11-05');
 assert.equal(x.sampleCount,2);assert.equal(x.average.find(p=>p.time==='09:30')?.amount,150);assert.equal(x.average.find(p=>p.time==='09:31')?.amount,null);assert.equal(x.average.find(p=>p.time==='15:00')?.amount,400);
});
test('twenty day mean uses exactly twenty completed sessions and retains unavailable as null',()=>{
 const days=Array.from({length:22},(_,i)=>({date:new Date(Date.UTC(2026,9,31-i)).toISOString().slice(0,10),points:[{time:'09:30',amount:i+1},{time:'15:00',amount:(i+1)*100}]}));
 const d=buildTurnover(days,'2026-11-05');assert.equal(d.sampleCount,20);assert.equal(d.average[0].amount,10.5);
});
test('baseline exposes exact sample dates so gaps cannot masquerade as consecutive trading sessions',()=>{
 const d=buildTurnover([{date:'2026-10-30',points:[{time:'15:00',amount:100}]},{date:'2026-10-20',points:[{time:'15:00',amount:200}]}],'2026-11-05');
 assert.deepEqual(d.baselineDates,['2026-10-30','2026-10-20']);
});
