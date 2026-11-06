import {test} from 'node:test';
import assert from 'node:assert/strict';
import { parseTencentQuotes, parseBars, parseMinute, parseHolders } from '../server/parsers.ts';
function quoteFixture(){
 const f=Array(90).fill('');
 Object.assign(f,{1:'沪深300ETF华泰柏瑞',2:'510300',3:'4.192',4:'4.175',5:'4.149',6:'8933215',7:'4557407',8:'4370324',9:'4.191',10:'4333',19:'4.192',20:'11825',30:'20261105105405',31:'0.017',32:'0.41',33:'4.216',34:'4.145',35:'4.192/8933215/3740695271',38:'1.93',72:'46363087700'});
 return `v_sh510300="${f.join('~')}";`;
}
test('Tencent ETF volume/depth lots normalize to shares; precise amount comes from trade field',()=>{
 const q=parseTencentQuotes(quoteFixture())[0];
 assert.equal(q.volume,893321500);assert.equal(q.buyVolume,455740700);assert.equal(q.sellVolume,437032400);
 assert.equal(q.amount,3740695271);assert.equal(q.bids[0].volume,433300);assert.equal(q.price,4.192);
 assert.equal(q.time,'2026-11-05T10:54:05+08:00');
});
test('partial response and absent fields do not fabricate zero activity',()=>{
 assert.deepEqual(parseTencentQuotes('v_pv_none_match="1";'),[]);
 const q=parseTencentQuotes(quoteFixture().replace('~4557407~','~~'))[0];
 assert.equal(q.buyVolume,null);
 assert.deepEqual(parseTencentQuotes('v_sh510300="1~bad~510300~NaN";'),[]);
});
test('minute cumulative amounts and lots are differenced once',()=>{
 const bars=parseMinute({data:{sh510300:{data:{date:'20261105',data:['0930 4.0 100 40000','0931 4.1 150 60500']}}}},'sh510300');
 assert.equal(bars[1].volume,5000);assert.equal(bars[1].amount,20500);assert.equal(bars[1].average,60500/15000);
 assert.equal(bars[1].time,'2026-11-05T09:31:00+08:00');
});
test('K-line decoding preserves endpoint high/low order and rejects invalid rows',()=>{
 const data={data:{sh510300:{m5:[['202611051050','4.1','4.2','4.3','4','100'],['bad','x']]}}};
 const bars=parseBars(data,'sh510300','m5');assert.equal(bars.length,1);assert.equal(bars[0].high,4.3);assert.equal(bars[0].low,4);assert.equal(bars[0].volume,10000);assert.equal(bars[0].amount,null);
});
test('holder data uses its own report period, identifies named institutions and preserves shares',()=>{
 const html='<select id="tc_slt"><option value="2025-12-31">2025-12-31</option><option value="2025-06-30">2025-06-30</option></select><table><tr id="tb-title"><td>序号</td><td>持有人名称</td><td>持有份额(份)</td><td>占总份额比(%)</td></tr><tr class="f005"><td>1</td><td>中央汇金投资有限责任公司</td><td>35,654,600,000</td><td>40.14</td></tr><tr class="f005"><td>2</td><td>香港中央结算有限公司</td><td>100</td><td>0.1</td></tr></table>';
 const h=parseHolders(html);assert.equal(h.reportDate,'2025-12-31');assert.equal(h.holders[0].shares,35654600000);assert.equal(h.holders[0].national,true);assert.equal(h.holders[1].national,false);assert.equal(h.holders[0].delta,null);
 assert.throws(()=>parseHolders('<html>blocked</html>'));
});
