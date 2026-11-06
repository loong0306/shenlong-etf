import {useEffect,useState} from 'react';
import {Button,Select,Table,Tag,Tooltip} from 'antd';
import {InfoCircleOutlined,SwapOutlined} from '@ant-design/icons';
import {ETFS} from '../../shared/catalog.ts';
import type {Quote,ShareData,HolderData} from '../../shared/types.ts';
import {activeNetBuy,sameTimeRatio,type ComparisonBaseline} from '../../shared/comparison.ts';
import {getJson} from '../useData.ts';
import {dateTime,tone,pct,price} from '../format.ts';
type Baseline=ComparisonBaseline&{snapshotDate:string};
type Extra={baseline?:Baseline;shares?:ShareData;holders?:HolderData;failed:string[]};
const yi=(n:number|null|undefined)=>n==null?'—':(n/1e8).toFixed(2);
function ColumnTitle({label,unit,hint}:{label:string;unit:string;hint?:string}){
 return <span className="comparison-column-title"><span>{label}{hint&&<Tooltip title={hint}><InfoCircleOutlined/></Tooltip>}</span><small>{unit}</small></span>;
}
export function FundComparison({quotes,favorites,version,paused,onSelect}:{quotes:Quote[];favorites:string[];version:number;paused:boolean;onSelect:(symbol:string)=>void}){
 const [extras,setExtras]=useState<Record<string,Extra>>({}),[search,setSearch]=useState(''),[scope,setScope]=useState('全部'),[sort,setSort]=useState('huijin');
 const dates=ETFS.map(e=>`${e.symbol}:${quotes.find(q=>q.symbol===e.symbol)?.time.slice(0,10)??''}`).join('|');
 useEffect(()=>{
  if(paused)return;
  const controller=new AbortController();let alive=true,timer:ReturnType<typeof setTimeout>;
  const run=async()=>{
   let failed=false;
   await Promise.all(ETFS.map(async etf=>{
    const date=quotes.find(q=>q.symbol===etf.symbol)?.time.slice(0,10);if(!date)return;
    const results=await Promise.allSettled([getJson<Baseline>(`/api/comparison/${etf.symbol}?date=${date}`,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])),getJson<ShareData>(`/api/shares/${etf.symbol}`,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])),getJson<HolderData>(`/api/holders/${etf.symbol}`,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]))]);
    if(!alive)return;const [b,s,h]=results;const missing=results.flatMap((r,i)=>r.status==='rejected'?[['成交基准','日度份额','历史持仓'][i]]:[]);if(missing.length)failed=true;
    setExtras(prev=>({...prev,[etf.symbol]:{baseline:b.status==='fulfilled'?b.value:undefined,shares:s.status==='fulfilled'?s.value:undefined,holders:h.status==='fulfilled'?h.value:undefined,failed:missing}}));
   }));
   if(alive)timer=setTimeout(()=>void run(),failed?30000:600000);
  };
  void run();return()=>{alive=false;controller.abort();clearTimeout(timer);};
 },[dates,version,paused]);
 const rows=ETFS.map(e=>{const q=quotes.find(q=>q.symbol===e.symbol),extra=extras[e.symbol];const base=extra?.baseline?.snapshotDate===q?.time.slice(0,10)?extra.baseline:undefined;
  const h=extra?.holders?.reportDate==='2025-12-31'?extra.holders:undefined;
  const names=['中央汇金投资有限责任公司','中央汇金资产管理有限责任公司'];const holders=h?.holders.filter(x=>names.includes(x.name))??[];
  const huijin=holders.length?holders.reduce((a,x)=>a+x.shares,0):null;
  const amount=q?.amount??null,shares=extra?.shares;return {...e,q,extra,base,amount,huijin,shares,scale:q?.totalShares!=null&&q.totalShares>0?q.price*q.totalShares:null,net:q?activeNetBuy(q.buyVolume,q.sellVolume,q.amount):null,ratio:q&&base?sameTimeRatio(amount,q.time,base):null};
 }).filter(r=>(scope==='全部'||scope==='我的关注'&&favorites.includes(r.symbol)||scope==='汇金历史可见'&&r.huijin!==null||r.category===scope)&&(!search||`${r.name}${r.code}${r.category}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>{
  const av=sort==='huijin'?a.huijin:sort==='amount'?a.amount:sort==='ratio'?a.ratio:sort==='net'?a.net:a.scale;
  const bv=sort==='huijin'?b.huijin:sort==='amount'?b.amount:sort==='ratio'?b.ratio:sort==='net'?b.net:b.scale;
  return (bv??-Infinity)-(av??-Infinity)||(b.scale??-Infinity)-(a.scale??-Infinity);
 });
 type Row=typeof rows[number];
 const latest=quotes.map(q=>q.time).sort().at(-1);
 const failures=Object.entries(extras).filter(([,v])=>v.failed.length).map(([s,v])=>`${ETFS.find(e=>e.symbol===s)?.code}：${v.failed.join('、')}暂不可用`).join('；');
 return <section className="panel comparison-panel">
 <div className="panel-header"><h3><SwapOutlined/> ETF 资金与成交对比 <span className="count-chip">{rows.length}</span></h3><span className="comparison-timestamp">{paused?'已暂停 · ':''}最新行情 {dateTime(latest)}</span></div>
 <div className="comparison-controls">
  <Select aria-label="资金对比排序" value={sort} onChange={setSort} style={{width:215}} options={[{value:'huijin',label:'汇金历史持有 → 规模优先'},{value:'scale',label:'规模优先'},{value:'amount',label:'成交额优先'},{value:'ratio',label:'同时点倍数优先'},{value:'net',label:'主动净买入估算优先'}]}/>
  <Select aria-label="资金对比范围" value={scope} onChange={setScope} style={{width:155}} options={['全部','我的关注','汇金历史可见','沪深300','创业板','上证50','中证500'].map(value=>({value,label:value}))}/>
  <Select aria-label="搜索资金对比ETF" placeholder="选择 ETF / 代码 / 指数" value={search||undefined} onChange={value=>setSearch(value??'')} allowClear showSearch optionFilterProp="label" className="comparison-search" popupMatchSelectWidth={320} options={ETFS.map(etf=>({value:etf.code,label:`${etf.code} ${etf.name} · ${etf.category}`}))} notFoundContent="没有匹配的 ETF"/>
  <span className="muted">点击ETF名称查看行情</span>
 </div>
 <Table<Row> size="small" rowKey="symbol" dataSource={rows} pagination={false} scroll={{x:1180}} columns={[
 {title:<ColumnTitle label="ETF" unit="名称 / 代码"/>,key:'etf',width:200,fixed:'left',render:(_,r)=><div className="comparison-etf"><Button type="link" onClick={()=>onSelect(r.symbol)}>{r.name}</Button><span>{r.code}{r.huijin!==null&&<Tag color="blue" bordered={false}>汇金历史可见</Tag>}</span></div>},
 {title:<ColumnTitle label="跟踪指数" unit="宽基分类"/>,dataIndex:'category',width:78,render:value=><span className="comparison-category">{value}</span>},
 {title:<ColumnTitle label="规模" unit="亿元" hint="腾讯行情现价×行情总份额，非净值口径资产规模；份额字段可能滞后，勿与交易所日度份额混用。"/>,width:84,align:'right',render:(_,r)=><span className="mono">{yi(r.scale)}</span>},
 {title:<ColumnTitle label="成交额" unit="亿元"/>,width:94,align:'right',render:(_,r)=><Tooltip title={`行情时间：${dateTime(r.q?.time)}`}><b className="mono">{yi(r.amount)}</b></Tooltip>},
 {title:<ColumnTitle label="同时点倍数" unit="相对历史同期" hint="当前成交额 ÷（历史日均成交额 × 同时刻历史平均已完成比例）。以完整5分钟成交额汇总日基准，时点间线性插值。"/>,width:145,align:'right',render:(_,r)=><Tooltip title={r.base?`实际${r.base.sampleCount}个完整样本：${r.base.dates.at(-1)} 至 ${r.base.dates[0]}；可能不连续。`:'历史基准待加载或不可用'}><div className="comparison-number"><b className={`comparison-ratio ${r.ratio!==null&&r.ratio>1?'is-active':''}`}>{r.ratio===null?'—':r.ratio.toFixed(2)+'×'}</b><small>日均 {r.amount!==null&&r.base?.dailyMean?(r.amount/r.base.dailyMean).toFixed(2)+'×':'—'} · {r.base?.sampleCount??0}/20日</small></div></Tooltip>},
 {title:<ColumnTitle label="主动净买入" unit="亿元 · 估算" hint="估算=(外盘−内盘)/(外盘+内盘)×成交额。非资金净流入、非申赎、不能识别机构身份。"/>,width:113,align:'right',render:(_,r)=><b className={`mono ${tone(r.net)}`}>{r.net!=null&&r.net>0?'+':''}{yi(r.net)}</b>},
 {title:<ColumnTitle label="涨跌幅" unit="%"/>,width:89,align:'right',render:(_,r)=><b className={`mono ${tone(r.q?.changePct)}`}>{pct(r.q?.changePct)}</b>},
 {title:<ColumnTitle label="份额" unit="亿份" hint="沪深交易所日度清算后总份额，按实际统计日期展示；并非腾讯盘中份额变化，更非汇金买卖。"/>,width:150,align:'right',render:(_,r)=><Tooltip title={r.shares?.points[0]?`交易所统计日：${r.shares.points[0].date}${r.shares.change!=null?`；较 ${r.shares.points[1]?.date} 变化 ${r.shares.change>0?'+':''}${yi(r.shares.change)} 亿份`:''}`:'日度份额待获取'}><div className="comparison-number"><b>{yi(r.shares?.points[0]?.shares)}</b><small>{r.shares?.points[0]?.date.slice(5)??'待获取'}{r.shares?.change!=null&&<> · <span className={tone(r.shares.change)}>{r.shares.change>0?'+':''}{yi(r.shares.change)}亿</span></>}</small></div></Tooltip>},
 {title:<ColumnTitle label="近30日成交" unit="含当前行情日"/>,width:125,align:'center',render:(_,r)=>{const bars=[...(r.base?.history??[]).slice(-29),...(r.amount!==null&&r.q?[{date:r.q.time.slice(0,10),amount:r.amount}]:[])];const max=Math.max(...bars.map(b=>b.amount),1);return r.base?.history.length&&bars.length?<svg width="100" height="38" role="img" aria-label={`${r.name}最近${bars.length}个可用日成交额`} viewBox="0 0 130 38">{bars.map((b,i)=><rect key={b.date} x={i*130/bars.length} y={35-b.amount/max*31} width={Math.max(1,130/bars.length-1)} height={Math.max(1,b.amount/max*31)} fill={i===bars.length-1&&b.date===r.q?.time.slice(0,10)?'#e86569':'#cfd7e3'}><title>{b.date}：{yi(b.amount)}亿元</title></rect>)}</svg>:<span className="muted">待获取</span>;}},
 {title:<ColumnTitle label="最新价" unit="元"/>,key:'price',className:'comparison-latest-price',width:92,align:'right',render:(_,r)=><b className={`mono ${tone(r.q?.changePct)}`}>{price(r.q?.price)}</b>},
 ]}/>
 <div className="comparison-footer"><span>共 {rows.length} 只 ETF · 点击名称查看行情</span><span>主动净买入为估算 · 汇金标记为历史披露</span></div>
 {failures&&<div className="comparison-source-status" role="status">{failures}</div>}
 <details className="comparison-notes"><summary><InfoCircleOutlined/> 数据口径与说明</summary><div><p>规模为行情现价×行情份额；日度份额使用交易所统计日数据。主动净买入只是成交方向估算，不是净流入或国家队交易确认。</p><p>同时点倍数按各ETF自身最近最多20个可用完整交易日计算，排除行情日；历史日总额由真实5分钟成交额汇总，平均日内完成比例作线性插值。样本不足会显示实际数量；不同于参考站的日均金额估算法。</p><p>近30日图最多含29个完整历史日与当前行情日；柱形悬浮可查日期和金额。汇金标记来自2025年报历史名单，不能作为当前持仓。</p></div></details>
 </section>;
}
