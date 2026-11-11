import {test} from 'node:test';
import assert from 'node:assert/strict';
import {minuteSession,shanghaiMinute} from '../shared/chartTimeline.ts';
import type {Bar} from '../shared/types.ts';
const bar=(time:string,close=4):Bar=>({time,open:close,close,high:close,low:close,volume:100,amount:400});

test('full minute axis ends at 15:00 with future and missing values left empty',()=>{
 const result=minuteSession([bar('2026-11-11T09:30:00+08:00'),bar('2026-11-11T10:00:00+08:00',4.1)]);
 assert.equal(result.times[0],'09:30');assert.equal(result.times.at(-1),'15:00');
 assert.equal(result.bars.length,242);assert.equal(result.bars[30]?.close,4.1);
 assert.equal(result.bars[1],null);assert.equal(result.bars.at(-1),null);
});
test('lunch is compressed while both session boundaries and final close are retained',()=>{
 const result=minuteSession(['11:30','12:00','13:00','15:00'].map(t=>bar(`2026-11-11T${t}:00+08:00`)));
 assert.equal(result.times[120],'11:30');assert.equal(result.times[121],'13:00');
 assert.ok(!result.times.includes('12:00'));assert.equal(result.bars.filter(Boolean).length,3);
 assert.equal(result.bars.at(-1)?.close,4);
});
test('UTC timestamps align to Shanghai trading minutes and previous days are excluded',()=>{
 const result=minuteSession([bar('2026-11-10T15:00:00+08:00'),bar('2026-11-11T01:30:00Z')]);
 assert.equal(shanghaiMinute('2026-11-11T01:30:00Z'),'2026-11-11 09:30');
 assert.equal(result.date,'2026-11-11');assert.ok(result.bars[0]);assert.equal(result.bars.at(-1),null);
});
test('empty input keeps a full axis without fabricating quotes',()=>{
 const result=minuteSession([]);assert.equal(result.date,null);assert.equal(result.bars.filter(Boolean).length,0);
 assert.equal(result.times.at(-1),'15:00');
});
