import {useEffect,useMemo,useRef,useState} from 'react';
import * as echarts from 'echarts/core';
import {LineChart,BarChart,CandlestickChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,DataZoomComponent,MarkLineComponent,MarkPointComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {Checkbox,Empty,Spin} from 'antd';
import type {ChartData,Quote,Rules} from '../../shared/types.ts';
import {bandSeries,isFresh} from '../../shared/indicators.ts';
import {minuteSession,shanghaiMinute} from '../../shared/chartTimeline.ts';
import {tradeObservations} from '../../shared/tradeObservations.ts';

echarts.use([LineChart,BarChart,CandlestickChart,GridComponent,TooltipComponent,DataZoomComponent,MarkLineComponent,MarkPointComponent,CanvasRenderer]);
export function PriceChart({data,technical,quote,loading,bands,rules,now}:{data:ChartData|null;technical?:ChartData;quote?:Quote;loading:boolean;bands:boolean;rules:Rules;now:number}){
 const ref=useRef<HTMLDivElement>(null);
 const [showPoints,setShowPoints]=useState(true);
 const validTechnical=technical?.symbol===data?.symbol&&technical?.period==='m5'?technical:undefined;
 const points=useMemo(()=>validTechnical?tradeObservations(validTechnical.bars,rules,Date.now(),validTechnical.indicatorTime):[],[validTechnical,rules.oversold,rules.overbought]);
 const session=useMemo(()=>minuteSession(data?.period==='minute'?data.bars:[]),[data]);
 const visiblePoints=useMemo(()=>{
  if(!data||data.period==='day')return [];
  const available=new Set((data.period==='minute'?session.bars.filter(b=>b!==null):data.bars).map(b=>shanghaiMinute(b.time)));
  return points.filter(p=>available.has(shanghaiMinute(p.time)));
 },[data,session,points]);
 const latest=visiblePoints.at(-1);
 const recent=latest&&quote&&isFresh(quote.time,now)&&now-Date.parse(latest.time)>=0&&now-Date.parse(latest.time)<=420000;
 useEffect(()=>{
  if(!ref.current||!data?.bars.length)return;
  const chart=echarts.init(ref.current,undefined,{renderer:'canvas'});
  const minute=data.period==='minute',bars=minute?session.bars:data.bars;
  const labels=minute?session.times:data.bars.map(b=>data.period==='day'?b.time.slice(0,10):shanghaiMinute(b.time));
  const bandValues=minute?[]:bandSeries(data.bars,data.period,Date.now());
  const line=(name:string,values:(number|null)[],color:string,dashed=false)=>({name,type:'line' as const,data:values,symbol:'none',lineStyle:{width:1.3,color,type:dashed?'dashed' as const:'solid' as const},itemStyle:{color},connectNulls:false});
  const priceSeries:any=minute?{name:'成交价',type:'line',data:bars.map(b=>b?.close??null),symbol:'none',connectNulls:false,lineStyle:{width:1.7,color:'#3478f6'},itemStyle:{color:'#3478f6'},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(52,120,246,0.13)'},{offset:1,color:'rgba(52,120,246,0)'}])},markLine:quote?{symbol:'none',silent:true,label:{show:false},lineStyle:{color:'#c8cdd6',type:'dashed'},data:[{yAxis:quote.previousClose}]}:undefined}:{name:'价格',type:'candlestick',data:data.bars.map(b=>[b.open,b.close,b.low,b.high]),itemStyle:{color:'#ed5b5b',color0:'#1aa784',borderColor:'#ed5b5b',borderColor0:'#1aa784'}};
  if(showPoints&&visiblePoints.length)priceSeries.markPoint={
   symbol:'triangle',symbolSize:14,
   data:visiblePoints.map(p=>({name:p.kind==='entry'?'开仓观察':'减仓观察',coord:[minute?shanghaiMinute(p.time).slice(-5):shanghaiMinute(p.time),p.price],value:p.price,symbolRotate:p.kind==='entry'?0:180,symbolOffset:p.kind==='entry'?[0,13]:[0,-13],itemStyle:{color:p.kind==='entry'?'#d94a52':'#138768',borderColor:'#fff',borderWidth:1},label:{show:true,formatter:p.kind==='entry'?'开':'减',position:p.kind==='entry'?'bottom':'top',color:p.kind==='entry'?'#b73c43':'#087354',fontSize:10},tooltip:{trigger:'item',formatter:()=>`<b>${p.kind==='entry'?'开仓观察':'减仓观察'}</b><br/>${shanghaiMinute(p.time)} · 5分钟已收盘<br/>收盘参考价 ${p.price.toFixed(3)}<br/>RSI ${p.previousRsi.toFixed(1)} → ${p.rsi.toFixed(1)}<br/>${p.reason}<br/>收盘后确认，实际成交价可能不同`}}))
  };
  const series:any[]=[priceSeries,{name:'成交量（份）',type:'bar',xAxisIndex:1,yAxisIndex:1,data:bars.map(b=>b?{value:b.volume,itemStyle:{color:b.close>=b.open?'rgba(237,91,91,.55)':'rgba(26,167,132,.55)'}}:null)}];
  if(minute)series.push(line('成交均价',bars.map(b=>b?.average??null),'#e5ad43'));
  else if(bands)series.push(line('BOLL 上轨',bandValues.map(b=>b?.upper??null),'#ad91de',true),line('BOLL 中轨',bandValues.map(b=>b?.middle??null),'#e5ad43'),line('BOLL 下轨',bandValues.map(b=>b?.lower??null),'#ad91de',true));
  chart.setOption({animation:false,textStyle:{fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',fontSize:11,color:'#8b94a6'},grid:[{left:64,right:32,top:32,height:'55%'},{left:64,right:32,top:'72%',height:'15%'}],tooltip:{trigger:'axis',axisPointer:{type:'cross'},backgroundColor:'rgba(255,255,255,.97)',borderColor:'#e9edf3',textStyle:{color:'#35425a',fontSize:12},confine:true},axisPointer:{link:[{xAxisIndex:'all'}]},xAxis:[{type:'category',data:labels,boundaryGap:!minute,axisLine:{lineStyle:{color:'#e8edf3'}},axisTick:{show:false},axisLabel:{show:false}},{type:'category',data:labels,boundaryGap:!minute,gridIndex:1,axisLine:{lineStyle:{color:'#e8edf3'}},axisTick:{show:false},axisLabel:{color:'#98a1af',formatter:(v:string,index:number)=>minute?(index===120?'11:30 / 13:00':v):data.period==='day'?v.slice(5):v.slice(-5),interval:minute?(index:number)=>[0,60,120,181,241].includes(index):'auto',showMinLabel:true,showMaxLabel:true,hideOverlap:true}}],yAxis:[{scale:true,splitNumber:4,axisLabel:{formatter:(v:number)=>v.toFixed(3)},splitLine:{lineStyle:{color:'#f0f2f6',type:'dashed'}},axisLine:{show:false}},{scale:true,gridIndex:1,splitNumber:2,axisLabel:{formatter:(v:number)=>`${(v/10000).toFixed(0)}万`},splitLine:{show:false}}],dataZoom:minute?[]:[{type:'inside',xAxisIndex:[0,1],start:Math.max(0,100-80/bars.length*100),end:100}],series});
  const observer=new ResizeObserver(()=>chart.resize());observer.observe(ref.current);
  return()=>{observer.disconnect();chart.dispose();};
 },[data,session,quote?.previousClose,bands,showPoints,visiblePoints]);
 const pointCount=showPoints?visiblePoints.length:0;
 const insufficient=validTechnical&&validTechnical.rsi===null;
 return <div className="chart-wrapper">
  <div className="trade-chart-toolbar"><Checkbox checked={showPoints} disabled={data?.period==='day'} onChange={e=>setShowPoints(e.target.checked)}>买卖观察点</Checkbox><span className="trade-chart-legend"><span className="entry-color">▲ 开仓观察</span><span className="exit-color">▼ 减仓观察</span><span>{data?.period==='day'?'5分钟信号仅在分时／5分钟图展示':`${pointCount} 个确认点`}</span></span></div>
  <div className="price-chart" ref={ref} style={{display:data?'block':'none'}} role="img" aria-label={`${quote?.name??data?.symbol??''}价格及成交量图，${data?.bars.length??0}条数据${data?.period==='minute'?'，完整交易时间09:30至15:00，午休压缩':''}，${pointCount}个买卖观察点`}/>
  {!data&&<div className="chart-placeholder">{loading?<Spin tip="正在读取公开行情…"><div style={{width:200,height:40}}/></Spin>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时没有图表数据"/>}</div>}
  {data&&data.period!=='day'&&<div className={`trade-observation ${showPoints&&latest?latest.kind:''}`} role="status">
   {showPoints&&latest?<><strong>{recent?'最新确认':'历史观察'} · {latest.kind==='entry'?'开仓观察':'减仓观察'}</strong><span>{shanghaiMinute(latest.time)} · 收盘参考价 <b>{latest.price.toFixed(3)}</b> · RSI {latest.previousRsi.toFixed(1)} → {latest.rsi.toFixed(1)}</span><span>{latest.reason}。{recent?'请结合日线趋势与仓位判断。':'此为历史触发点，不代表当前仍可操作。'}</span></>:<><strong>{!showPoints?'买卖观察点已隐藏':!validTechnical?'5分钟数据暂未就绪':insufficient?'5分钟样本不足':'暂无确认的买卖观察点'}</strong><span>RSI回升穿过{rules.oversold}且收盘上涨 → 开仓观察；回落穿过{rules.overbought}且收盘下跌 → 减仓观察。同一时间只跟踪一个仓位状态，开仓后须先出现减仓点。</span></>}
   <small>5分钟K线收盘后确认，点位为收盘参考价，实际成交价可能不同。规则未经收益回测，不代表价格预测。{data.period==='minute'?'分时横轴固定至15:00，未来和缺失行情留空。':''}</small>
  </div>}
 </div>;
}
