import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSseShares,parseSzseShares,createShareService} from '../server/shares.ts';
test('SSE settlement shares convert ten-thousand units once and keep the official date',()=>{
 assert.deepEqual(parseSseShares({result:[{SEC_CODE:'510300',STAT_DATE:'2026-11-04',TOT_VOL:'4636308.77'}]},'sh510300'),[{date:'2026-11-04',shares:46363087700}]);
 assert.deepEqual(parseSseShares({result:[{SEC_CODE:'510050',STAT_DATE:'2026-11-04',TOT_VOL:'1'}]},'sh510300'),[]);
});
test('SZSE historical scale uses dated records rather than listing page update date',()=>{
 const payload=[{metadata:{cols:{current_size:'基金规模<br>(万份)'}},data:[{fund_code:'159915',size_date:'2026-11-04',current_size:'4,490,945.49'},{fund_code:'159915',size_date:'2026-11-03',current_size:'4,294,145.49'}]}];
 assert.deepEqual(parseSzseShares(payload,'sz159915'),[{date:'2026-11-04',shares:44909454900},{date:'2026-11-03',shares:42941454900}]);
 assert.throws(()=>parseSzseShares([{metadata:{cols:{current_size:'规模（未知单位）'}},data:payload[0].data}],'sz159915'));
});
test('missing or malformed share values are not backfilled or treated as zero',()=>{
 assert.deepEqual(parseSseShares({result:[{SEC_CODE:'510300',STAT_DATE:'2026-11-04',TOT_VOL:'--'},{SEC_CODE:'510300',STAT_DATE:'bad',TOT_VOL:'100'}]},'sh510300'),[]);
 assert.throws(()=>parseSseShares({blocked:true},'sh510300'));
});
test('share service computes total ETF share change without implying institutional identity',async()=>{
 const getShares=createShareService(async()=>JSON.stringify([{metadata:{cols:{current_size:'基金规模<br>(万份)'}},data:[{fund_code:'159915',size_date:'2026-11-04',current_size:'4,490,945.49'},{fund_code:'159915',size_date:'2026-11-03',current_size:'4,294,145.49'}]}]));
 const d=await getShares('sz159915');assert.equal(d.change,1968000000);assert.equal(d.points[0].date,'2026-11-04');assert.ok(d.warnings.some(w=>w.includes('不代表国家队')));
 await assert.rejects(()=>getShares('bad'));
});
test('SZSE history request initializes the default date range required by its endpoint',async()=>{
 const getShares=createShareService(async url=>JSON.stringify([{metadata:{cols:{current_size:'规模(万份)'}},data:new URL(url).searchParams.get('loading')==='first'?[{fund_code:'159915',size_date:'2026-11-04',current_size:'100'}]:[]} ]));
 assert.equal((await getShares('sz159915')).points[0].shares,1000000);
});
