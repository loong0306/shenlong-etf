import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../shared/summary.ts';
import {quoteSamples} from './fixtures.ts';
test('missing amount does not present an incomplete aggregate as a valid total',()=>{
 const rows=quoteSamples().slice(0,2);rows[0].amount=null;
 assert.equal(summarize(rows).amount,null);
 assert.deepEqual(summarize([]),{amount:null,netVolume:null});
});
test('aggregate direction preserves sign and refuses missing sides',()=>{
 const row={...quoteSamples()[0],amount:4000,buyVolume:300,sellVolume:700};
 assert.deepEqual(summarize([row]),{amount:4000,netVolume:-400});
 assert.equal(summarize([{...row,buyVolume:null}]).netVolume,null);
});
