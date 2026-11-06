import {useEffect,useMemo,useRef,useState} from 'react';
import {Alert,App as AntApp,Badge,Button,Checkbox,Divider,Empty,Input,InputNumber,Menu,Modal,Segmented,Select,Skeleton,Switch,Table,Tag,Tooltip} from 'antd';
import {AppstoreOutlined,ArrowDownOutlined,ArrowRightOutlined,ArrowUpOutlined,BankOutlined,BellOutlined,CheckCircleFilled,ClockCircleOutlined,CloudSyncOutlined,DatabaseOutlined,ExportOutlined,EyeOutlined,FundOutlined,InfoCircleOutlined,LineChartOutlined,MenuOutlined,PauseCircleOutlined,PlayCircleOutlined,PlusOutlined,QuestionCircleOutlined,RadarChartOutlined,ReloadOutlined,SearchOutlined,SettingOutlined,StarFilled,StarOutlined,SwapOutlined} from '@ant-design/icons';
import {ETFS,INDICES} from '../shared/catalog.ts';
import {DEFAULT_RULES,isFresh,shouldNotify} from '../shared/indicators.ts';
import {summarize} from '../shared/summary.ts';
import {collectSignals} from '../shared/monitor.ts';
import type {ChartData,MarketData,Mode,Period,Quote,Rules,Signal} from '../shared/types.ts';
import {normalizeFavorites,normalizeHistory,normalizeRules,normalizeRefreshSeconds,REFRESH_SECONDS,useStored} from './storage.ts';
import {useData,useTechnicals} from './useData.ts';
import {compact,price,pct,tone,clock,dateTime} from './format.ts';
import {TurnoverChart} from './components/TurnoverChart.tsx';
import {PriceChart} from './components/PriceChart.tsx';
import {FlowPanel} from './components/FlowPanel.tsx';
import {FundComparison} from './components/FundComparison.tsx';
import {Holdings} from './components/Holdings.tsx';
import {SignalRadar} from './components/SignalRadar.tsx';
import {AlertCenter} from './components/AlertCenter.tsx';

type View='comparison'|'overview'|'holdings'|'alerts'|'settings';
const titles:Record<View,string>={overview:'市场概览',comparison:'资金对比',holdings:'机构持仓',alerts:'预警中心',settings:'数据与设置'};
const descriptions:Record<View,string>={overview:'追踪宽基 ETF，观察市场资金的每一次脉动。',comparison:'统一口径比较8只宽基ETF的规模、成交活跃度与历史机构持有。',holdings:'区分清算后每日总份额与历史机构持有人披露。',alerts:'让异常走到眼前，让每一次提示都有据可查。',settings:'了解数据来源，按你的习惯配置监控。'};
function Logo(){return <div className="brand"><div className="brand-mark"><svg viewBox="0 0 28 28" fill="none"><path d="M6 21V11m5 10V6m6 15V14m5 7V9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg></div><div><b className="brand-name">神龙ETF</b></div></div>;}
function Metric({icon,label,value,unit,note,detail,color='blue'}:{icon:React.ReactNode;label:string;value:string;unit?:string;note:string;detail?:React.ReactNode;color?:string}){
 return <section className="metric panel"><div className="metric-heading"><span>{label}</span><i className={`metric-icon ${color}`}>{icon}</i></div><div className="metric-value"><strong>{value}</strong><span>{unit}</span>{detail}</div><div className="metric-note">{note}</div></section>;
}
export default function App(){
 const {message}=AntApp.useApp();
 const [view,setView]=useState<View>('overview'),[mobileMenu,setMobileMenu]=useState(false),[selected,setSelected]=useState('sh510300');
 const mode:Mode='live';
 const [paused,setPaused]=useState(false),[refreshVersion,setRefreshVersion]=useState(0),[now,setNow]=useState(Date.now());
 const [query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[listType,setListType]=useState('全部 ETF');
 const [period,setPeriod]=useState<Period>('minute'),[bands,setBands]=useState(true),[manageOpen,setManageOpen]=useState(false),[rulesOpen,setRulesOpen]=useState(false);
 const [favorites,setFavorites]=useStored('guanlan.favorites.v1',normalizeFavorites),[rules,setRules]=useStored('guanlan.rules.v1',normalizeRules),[alertStore,setAlertStore]=useStored('guanlan.alerts.v1',normalizeHistory);
 const [draftRules,setDraftRules]=useState<Rules>(rules);
 const [refreshSeconds,setRefreshSeconds]=useStored('shenlong.refresh-seconds.v1',normalizeRefreshSeconds);
 const market=useData<MarketData>(`/api/market?mode=${mode}`,refreshSeconds*1000,!paused);
 const chart=useData<ChartData>(`/api/chart/${selected}?period=${period}&mode=${mode}`,60000,!paused);
 const technicals=useTechnicals(mode,!paused,refreshVersion);
 const quotes=market.data?.mode===mode?market.data.quotes:[],etfQuotes=quotes.filter(q=>q.kind==='etf'),selectedQuote=etfQuotes.find(q=>q.symbol===selected);
 const history=alertStore[mode],unread=history.filter(s=>!s.read).length;
 const sessionFresh=etfQuotes.some(q=>isFresh(q.time,now));
 const selectedInfo=ETFS.find(e=>e.symbol===selected)!;
 const notified=useRef(new Set<string>()),observedSignals=useRef<Signal[]>([]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  if(paused||!rules.enabled)return;
  const additions=collectSignals(mode,market.data,technicals.data,favorites,rules,[...history,...observedSignals.current]);
  if(!additions.length)return;
  observedSignals.current=[...additions,...observedSignals.current].slice(0,400);
  setAlertStore(prev=>({...prev,[mode]:[...additions.filter(s=>shouldNotify(s,prev[mode])),...prev[mode]].slice(0,200)}));
  for(const signal of additions){
   const key=mode+signal.id;if(notified.current.has(key))continue;notified.current.add(key);
   if(rules.notifications&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
    const name=ETFS.find(e=>e.symbol===signal.symbol)?.name??signal.symbol;
    new Notification(`${name} · ${signal.kind==='oversold'?'超卖观察':'超买观察'}`,{body:`5分钟 RSI(14)：${signal.value.toFixed(1)}，指标时间 ${clock(signal.time)}`,tag:key});
   }
  }
 },[technicals.data,quotes,favorites,rules,mode,paused,history,setAlertStore]);
 const navigate=(next:View)=>{setView(next);setMobileMenu(false);window.scrollTo({top:0,behavior:'smooth'});};
 const selectEtf=(symbol:string)=>{setSelected(symbol);};
 const jumpToChart=(symbol:string)=>{setSelected(symbol);setPeriod('m5');navigate('overview');setTimeout(()=>document.getElementById('chart-section')?.scrollIntoView({behavior:'smooth',block:'center'}),100);};
 const refresh=()=>{market.reload();chart.reload();setRefreshVersion(v=>v+1);};
 const openRules=()=>{setDraftRules({...rules});setRulesOpen(true);};
 const toggleFavorite=(symbol:string)=>setFavorites(prev=>prev.includes(symbol)?prev.filter(s=>s!==symbol):[...prev,symbol]);
 const visible=useMemo(()=>etfQuotes.filter(q=>(category==='全部'||q.category===category)&&(listType!=='我的关注'||favorites.includes(q.symbol))&&(!query||`${q.name}${q.code}${q.manager}`.toLowerCase().includes(query.toLowerCase()))),[etfQuotes,category,listType,favorites,query]);
 const watched=etfQuotes.filter(q=>favorites.includes(q.symbol));
 const {amount:totalAmount,netVolume}=summarize(watched);
 const currentSignals=Object.values(technicals.data).filter(t=>favorites.includes(t.symbol)&&t.rsi!==null&&(t.rsi<rules.oversold||t.rsi>rules.overbought));
 const latest=etfQuotes.map(q=>q.time).sort().at(-1);
 const candidate=period==='m5'?(technicals.data[selected]??chart.data):chart.data;
 const chartData=candidate?.mode===mode&&candidate.symbol===selected&&candidate.period===period?candidate:null;
 const readAll=()=>setAlertStore(prev=>({...prev,[mode]:prev[mode].map(s=>({...s,read:true}))}));
 const clearAlerts=()=>setAlertStore(prev=>({...prev,[mode]:[]}));
 const saveRules=()=>{
  if(draftRules.oversold>=draftRules.overbought){void message.error('超卖阈值必须低于超买阈值');return;}
  setRules(normalizeRules(draftRules));setRulesOpen(false);void message.success('预警规则已保存');
 };
 const requestNotifications=async(checked:boolean)=>{
  if(!checked){setDraftRules(v=>({...v,notifications:false}));return;}
  if(typeof Notification==='undefined'){void message.warning('当前浏览器不支持系统通知');return;}
  const permission=await Notification.requestPermission();setDraftRules(v=>({...v,notifications:permission==='granted'}));
  if(permission!=='granted')void message.info('未获得通知权限，页面内提示仍然可用');
 };
 const navItems=[{key:'overview',icon:<AppstoreOutlined/>,label:'市场概览'},{key:'comparison',icon:<SwapOutlined/>,label:'资金对比'},{key:'holdings',icon:<BankOutlined/>,label:'机构持仓'},{key:'alerts',icon:<BellOutlined/>,label:<span className="nav-alert-label">预警中心{unread>0&&<i>{unread}</i>}</span>},{key:'settings',icon:<DatabaseOutlined/>,label:'数据与设置'}];
 return <div className="app-shell">
 {mobileMenu&&<div className="sidebar-scrim" onClick={()=>setMobileMenu(false)}/>}
 <aside className={`sidebar ${mobileMenu?'mobile-open':''}`}><Logo/><div className="nav-caption">市场观察</div><Menu mode="inline" selectedKeys={[view]} items={navItems} onClick={({key})=>navigate(key as View)}/></aside>
 <div className="main-shell"><header className="topbar"><div className="breadcrumb"><Button className="mobile-menu-toggle" type="text" icon={<MenuOutlined/>} aria-label="打开导航" onClick={()=>setMobileMenu(v=>!v)}/><span>工作台</span><i>/</i><b>{titles[view]}</b></div><div className="topbar-tools"><span className="header-date"><ClockCircleOutlined/> {new Date(now).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',weekday:'long'})}</span><Divider type="vertical"/><Tooltip title="预警中心"><Badge count={unread} size="small" offset={[-3,4]}><Button type="text" icon={<BellOutlined/>} aria-label="查看预警" onClick={()=>navigate('alerts')}/></Badge></Tooltip><div className="avatar">龙</div></div></header>
 <main className="main-content"><div className="page-heading"><div><div className="eyebrow">SHENLONG / MARKET INTELLIGENCE</div><h1>{titles[view]}</h1><p>{descriptions[view]}</p></div><div className="heading-actions"><Tag className="live-source-tag" color="blue" bordered={false}><CloudSyncOutlined/> 免费公开行情</Tag><Select aria-label="行情刷新间隔" className="refresh-interval-select" value={refreshSeconds} onChange={setRefreshSeconds} options={REFRESH_SECONDS.map(seconds=>({value:seconds,label:`${seconds}s 刷新`}))}/><Tooltip title={paused?'恢复自动刷新':'暂停自动刷新'}><Button aria-label={paused?'恢复自动刷新':'暂停自动刷新'} icon={paused?<PlayCircleOutlined/>:<PauseCircleOutlined/>} onClick={()=>setPaused(v=>!v)}/></Tooltip><Button icon={<ReloadOutlined spin={market.loading}/>} onClick={refresh}>刷新</Button></div></div>

 {market.error&&<Alert className="mode-banner" type="warning" showIcon message={market.error} description={market.data?'下方保留上次成功读取的数据，请留意数据时间。':undefined} action={<Button size="small" onClick={refresh}>重试</Button>}/>}
 {market.data?.warnings.map(w=><Alert className="mode-banner" key={w} type="warning" showIcon message={w}/>)}
 {view==='overview'&&<>
 <div className="index-strip panel">{INDICES.map(index=>{const quote=quotes.find(q=>q.symbol===index.symbol);return <div className="index-item" key={index.symbol}><div><span>{index.name}</span><small>{index.code}</small></div><strong className={tone(quote?.changePct)}>{quote?quote.price.toFixed(2):'—'}</strong><span className={`index-change ${tone(quote?.changePct)}`}>{quote&&quote.changePct!==0&&(quote.changePct>0?<ArrowUpOutlined/>:<ArrowDownOutlined/>)}{quote?pct(quote.changePct):'等待行情'}</span></div>;})}<div className="market-status"><span className={`pulse-dot ${sessionFresh?'':'gray'}`}/><div><b>{sessionFresh?'行情更新中':quotes.length?'最近交易行情':'连接行情源'}</b><span>{paused?'自动刷新已暂停':`每${refreshSeconds}秒更新 · ${clock(latest)}`}</span></div></div></div>
 <div className="metric-grid"><Metric icon={<FundOutlined/>} label="关注 ETF" value={String(favorites.length)} unit="只" note={`${watched.length}只已获取行情 · 覆盖${new Set(watched.map(q=>q.category)).size}类指数`} detail={<span className="metric-badge">自选监控</span>}/><Metric icon={<SwapOutlined/>} label="关注标的成交额" value={totalAmount!==null?compact(totalAmount).replace(/[亿万]$/,''):'—'} unit={totalAmount!==null?totalAmount>=1e8?'亿元':totalAmount>=1e4?'万元':'元':''} note="关注 ETF 当日累计 · 二级市场成交" color="violet"/><Metric icon={<LineChartOutlined/>} label="内外盘成交差" value={netVolume===null?'—':`${netVolume>0?'+':''}${compact(netVolume).replace(/[亿万]$/,'')}`} unit={netVolume===null?'':Math.abs(netVolume)>=1e8?'亿份':Math.abs(netVolume)>=1e4?'万份':'份'} note="外盘减内盘 · 不代表机构净买入" color="teal"/><Metric icon={<RadarChartOutlined/>} label="技术状态信号" value={String(currentSignals.length)} unit="只" note={`RSI(14) · 已收盘5分钟线${!sessionFresh?' · 历史状态':''}`} detail={<span className={`metric-badge ${currentSignals.length?'amber':''}`}>{currentSignals.length?'值得留意':'持续观察'}</span>} color="orange"/></div>
 <div className="context-note"><InfoCircleOutlined/><span><b>国家队观察</b> 历史披露用于机构身份参考，每日总份额与盘中成交用于观察基金动向。</span><button onClick={()=>navigate('settings')}>了解数据口径 <ArrowRightOutlined/></button></div>
 <div className="overview-grid"><section className="panel watch-panel"><div className="panel-header"><h3><FundOutlined/> ETF 监控列表 <span className="count-chip">{visible.length}</span></h3><Button size="small" icon={<PlusOutlined/>} onClick={()=>setManageOpen(true)}>管理关注</Button></div><div className="table-toolbar"><Segmented value={listType} onChange={setListType} options={['全部 ETF','我的关注']} size="small"/><div><Input aria-label="搜索ETF" prefix={<SearchOutlined/>} placeholder="搜索名称 / 代码" value={query} onChange={e=>setQuery(e.target.value)} allowClear className="etf-search"/><Select aria-label="按指数筛选" value={category} onChange={setCategory} options={['全部','沪深300','创业板','上证50','中证500'].map(v=>({value:v,label:v==='全部'?'全部指数':v}))}/></div></div>
 <Table<Quote> rowKey="symbol" size="small" loading={market.loading&&!market.data} dataSource={visible} pagination={false} scroll={{x:750}} rowClassName={q=>q.symbol===selected?'selected-row':''} onRow={q=>({onClick:()=>selectEtf(q.symbol),tabIndex:0,onKeyDown:e=>{if(e.key==='Enter')selectEtf(q.symbol);},'aria-label':`选择${q.name}`})} locale={{emptyText:query||category!=='全部'||listType==='我的关注'?'没有符合条件的ETF':'行情暂未就绪，请检查数据源状态'}} columns={[
 {title:'',key:'favorite',width:37,render:(_,q)=><Button type="text" size="small" className={`star-button ${favorites.includes(q.symbol)?'is-favorite':''}`} aria-label={`${favorites.includes(q.symbol)?'取消关注':'关注'}${q.name}`} icon={favorites.includes(q.symbol)?<StarFilled/>:<StarOutlined/>} onClick={e=>{e.stopPropagation();toggleFavorite(q.symbol);}}/>},
 {title:'ETF 名称 / 代码',dataIndex:'name',width:192,render:(_,q)=><div className="instrument-cell"><strong>{q.shortName}<span>{q.manager}</span></strong><small>{q.code} <i>{q.category}</i></small></div>},
 {title:'最新价',dataIndex:'price',align:'right',width:80,render:(v:number,q)=><b className={`mono ${tone(q.changePct)}`}>{price(v)}</b>},
 {title:'涨跌幅',dataIndex:'changePct',align:'right',width:96,sorter:(a,b)=>a.changePct-b.changePct,render:(v:number)=><span className={`change-pill ${tone(v)}`}>{pct(v)}</span>},
 {title:'成交额',dataIndex:'amount',align:'right',width:96,sorter:(a,b)=>(a.amount??0)-(b.amount??0),render:(v:number|null)=><span className="mono">{compact(v)}</span>},
 {title:'成交量（份）',dataIndex:'volume',align:'right',width:112,render:(v:number)=><span className="mono">{compact(v)}</span>},
 {title:<Tooltip title="Wilder RSI(14)，基于已收盘5分钟线；非交易时段显示最近技术状态。">RSI 状态</Tooltip>,key:'rsi',width:105,align:'right',render:(_,q)=>{const value=technicals.data[q.symbol]?.rsi;return value==null?<span className="muted">待计算</span>:<span className={`rsi-state ${value<rules.oversold?'oversold':value>rules.overbought?'overbought':''}`}><i/>{value.toFixed(1)} <small>{value<rules.oversold?'超卖':value>rules.overbought?'超买':'中性'}</small></span>;}}
 ]}/><div className="table-footer"><span><span className={`pulse-dot ${sessionFresh?'':'gray'}`}/> {`腾讯财经 · ${latest?dateTime(latest):'等待数据'}`}</span><span>点击行查看详情 <ArrowDownOutlined/></span></div></section>
 <SignalRadar technicals={technicals.data} quotes={quotes} rules={rules} history={history} onSettings={openRules} onSelect={jumpToChart} onAll={()=>navigate('alerts')} errors={technicals.errors}/></div>
 <div className="chart-grid" id="chart-section"><section className="panel chart-panel"><div className="panel-header"><h3><LineChartOutlined/> 行情详情</h3><Select aria-label="图表ETF" value={selected} onChange={selectEtf} options={ETFS.map(e=>({value:e.symbol,label:e.code+' '+e.name}))} className="chart-etf-select"/></div><div className="chart-price-row"><div><strong>{selectedInfo.shortName}</strong><Tag bordered={false}>{selectedInfo.manager} · {selectedInfo.code}</Tag></div><div className="chart-quote"><b className={`mono ${tone(selectedQuote?.changePct)}`}>{price(selectedQuote?.price)}</b><span className={tone(selectedQuote?.changePct)}>{pct(selectedQuote?.changePct)}</span></div></div>
 <div className="chart-controls"><Segmented size="small" value={period} onChange={v=>setPeriod(v as Period)} options={[{label:'分时',value:'minute'},{label:'5分钟',value:'m5'},{label:'日K',value:'day'}]}/><div className="chart-legend">{period==='minute'?<><span><i className="legend-dot price-dot"/>成交价</span><span><i className="legend-dot average-dot"/>成交均价</span></>:<Checkbox checked={bands} onChange={e=>setBands(e.target.checked)}>BOLL(20,2)</Checkbox>}</div></div>
 {chart.error&&<Alert type="warning" message={chart.error} banner/>}<PriceChart data={chartData} quote={selectedQuote} loading={chart.loading} bands={bands}/><div className="chart-metadata"><span>开 <b>{price(selectedQuote?.open)}</b></span><span>高 <b className="up">{price(selectedQuote?.high)}</b></span><span>低 <b className="down">{price(selectedQuote?.low)}</b></span><span>昨收 <b>{price(selectedQuote?.previousClose)}</b></span><span>换手 <b>{selectedQuote?.turnover?.toFixed(2)??'—'}%</b></span></div><div className="chart-bottom"><span>{period==='day'?'日K前复权 · 价格可能与未复权实时价存在差异':period==='m5'?'5分钟K线 · 可滚动缩放':'当日分时 · 成交量来自累计量差分'}</span><span>数据时间 {chartData?.bars.at(-1)?.time.replace('T',' ').slice(0,16)??'—'}</span></div></section><FlowPanel quote={selectedQuote}/></div>
 <TurnoverChart symbol={selected} paused={paused} version={refreshVersion} refreshSeconds={refreshSeconds}/>
 <Holdings symbol={selected} onSelect={selectEtf} mode={mode} compactView onExpand={()=>navigate('holdings')}/>
 </>}
 {view==='comparison'&&<FundComparison quotes={etfQuotes} favorites={favorites} version={refreshVersion} paused={paused} onSelect={jumpToChart}/>}
 {view==='holdings'&&<Holdings symbol={selected} onSelect={selectEtf} mode={mode}/>}
 {view==='alerts'&&<AlertCenter history={history} onRead={readAll} onClear={clearAlerts} onSettings={openRules} onSelect={jumpToChart}/>}
 {view==='settings'&&<div className="settings-grid"><section className="panel"><div className="panel-header"><h3><DatabaseOutlined/> 数据来源与口径</h3><Tag color="blue" bordered={false}>免费版</Tag></div><div className="settings-body"><div className="source-card"><div className="source-icon"><CloudSyncOutlined/></div><div><h4>公开行情与 K 线</h4><p>腾讯财经公开接口，展示最新价、成交量额、内外盘、五档委托、分时、5分钟和日线。每{refreshSeconds}秒拉取行情和累计成交额，K线和技术指标每60秒刷新。</p><a href="https://gu.qq.com/sh510300" target="_blank" rel="noreferrer">腾讯财经 <ExportOutlined/></a></div><Tag color={market.error?'default':'green'} bordered={false}>{market.error?'暂不可用':'已接入'}</Tag></div><Divider/><div className="source-card"><div className="source-icon purple"><BankOutlined/></div><div><h4>历史机构持仓披露</h4><p>新浪财经转载的历史 ETF 前十大持有人。2026年5月1日起的新准则不再将该名单列为强制披露项目。历史名单不代表当前持仓。</p><a href={`https://stock.finance.sina.com.cn/fundInfo/view/FundInfo_JJCYR.php?symbol=${selectedInfo.code}`} target="_blank" rel="noreferrer">查看当前 ETF 持有人来源 <ExportOutlined/></a></div><Tag bordered={false}>历史快照</Tag></div><Divider/><Alert type="info" showIcon message="这些指标分别说明什么" description={<div className="definitions"><p><b>成交额 / 成交量：</b>二级市场交易规模，每笔交易都有买方和卖方。</p><p><b>内外盘成交差：</b>外盘减内盘，是成交方向分类的参考，不等于申赎净流入。</p><p><b>日度总份额：</b>直接读取沪深交易所，清算后/T+1更新；日期以交易所记录为准，不等于国家队持仓变化。</p><p><b>国家队观察：</b>按明确机构名称识别公开持仓，公开盘口不含交易者实时身份。</p></div>}/></div></section><div><section className="panel"><div className="panel-header"><h3><SettingOutlined/> 监控偏好</h3></div><div className="settings-body"><div className="setting-row"><div><b>技术预警</b><p>仅监控「我的关注」中的ETF</p></div><Switch checked={rules.enabled} onChange={checked=>setRules({...rules,enabled:checked})}/></div><div className="setting-row"><div><b>RSI 阈值</b><p>超卖 &lt; {rules.oversold} · 超买 &gt; {rules.overbought}</p></div><Button size="small" onClick={openRules}>修改</Button></div><div className="setting-row"><div><b>关注列表</b><p>当前关注 {favorites.length} 只ETF</p></div><Button size="small" onClick={()=>setManageOpen(true)}>管理</Button></div><div className="setting-row"><div><b>自动刷新</b><p>行情{refreshSeconds}秒 · 分钟线60秒</p></div><Switch checked={!paused} onChange={v=>setPaused(!v)}/></div></div></section><section className="panel limits-panel"><div className="panel-header"><h3><InfoCircleOutlined/> 当前版本说明</h3></div><div className="settings-body"><p>公开数据可能延迟、限流或调整格式，页面展示数据时间，失败时保留明确提示。</p><p>RSI 使用 Wilder 平滑，布林带使用20周期与2倍总体标准差，仅对已收盘K线计算。</p><p>同一标的、同一信号10分钟内不重复提醒。同一根K线只记录一次。过期行情不触发实时提醒。</p><p>本版为本地看板，关闭页面后不会继续提醒。无交易下单功能。</p><Tag bordered={false}>本地存储自选与规则</Tag></div></section></div></div>}
 <footer className="page-footer"><span>神龙ETF <i>·</i> 观察市场，从数据出发</span><span>公开数据仅供研究参考 <i>·</i> 本地运行 <span className="footer-dot"/></span></footer>
 </main></div>
 <Modal title={<><StarOutlined/> 管理关注 ETF</>} open={manageOpen} onCancel={()=>setManageOpen(false)} footer={<><Button onClick={()=>setFavorites(ETFS.map(e=>e.symbol))}>关注全部</Button><Button type="primary" onClick={()=>setManageOpen(false)}>完成</Button></>} width={580}><p className="modal-description">关注的ETF会参与汇总统计和自动预警。第一版提供以下8只宽基ETF。</p><div className="watch-options">{ETFS.map(e=><label key={e.symbol}><Checkbox checked={favorites.includes(e.symbol)} onChange={()=>toggleFavorite(e.symbol)}/><div><strong>{e.name}</strong><span>{e.code} · {e.category}</span></div><Tag bordered={false}>{e.manager}</Tag></label>)}</div></Modal>
 <Modal title={<><RadarChartOutlined/> 预警规则</>} open={rulesOpen} onCancel={()=>setRulesOpen(false)} onOk={saveRules} okText="保存规则" cancelText="取消" width={480}><div className="rules-form"><div className="setting-row"><div><b>开启技术预警</b><p>监控我的关注 · 已收盘5分钟线</p></div><Switch checked={draftRules.enabled} onChange={enabled=>setDraftRules({...draftRules,enabled})}/></div><div className="threshold-fields"><label><span>超卖 RSI 低于</span><InputNumber aria-label="超卖阈值" min={1} max={98} value={draftRules.oversold} onChange={value=>{if(value!==null)setDraftRules({...draftRules,oversold:value});}}/></label><label><span>超买 RSI 高于</span><InputNumber aria-label="超买阈值" min={2} max={99} value={draftRules.overbought} onChange={value=>{if(value!==null)setDraftRules({...draftRules,overbought:value});}}/></label></div><div className="rsi-range"><span>0</span><div><i style={{left:`${draftRules.oversold}%`,right:`${100-draftRules.overbought}%`}}/></div><span>100</span></div><div className="setting-row"><div><b>浏览器系统通知</b><p>需要通知权限，且保持页面运行</p></div><Switch checked={draftRules.notifications} onChange={v=>void requestNotifications(v)}/></div><Alert type="info" showIcon message="技术指标提示，不是买卖指令" description="RSI(14) 采用 Wilder 平滑。同类信号冷却10分钟；数据过期或样本不足时不产生实时提醒。"/></div></Modal>
 </div>;
}
