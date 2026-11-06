import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createService,validateRequest} from '../server/service.ts';
test('request validates allowlisted ETF, period and explicit mode',()=>{
 assert.throws(()=>validateRequest('../../etc/passwd','m5','live'));
 assert.throws(()=>validateRequest('sh510300','week','live'));
 assert.throws(()=>validateRequest('sh510300','m5','fake'));
 assert.throws(()=>validateRequest('sh510300','minute','demo'));
 assert.doesNotThrow(()=>validateRequest('sh510300','minute','live'));
});
test('live failure is explicit, never an automatic demo fallback',async()=>{
 const service=createService(async()=>{throw new Error('offline');});
 await assert.rejects(()=>service.market('live'),/offline/);
 await assert.rejects(()=>service.market(),/offline/);
});
test('live response does not label partial symbol coverage complete',async()=>{
 const service=createService(async()=> 'v_pv_none_match="1";');
 await assert.rejects(()=>service.market('live'),/有效行情/);
});
