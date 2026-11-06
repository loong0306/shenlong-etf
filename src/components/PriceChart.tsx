import {useEffect,useRef} from 'react';
import * as echarts from 'echarts/core';
import {LineChart,BarChart,CandlestickChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,DataZoomComponent,MarkLineComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {Empty,Spin} from 'antd';
import type {ChartData,Quote} from '../../shared/types.ts';
import {bandSeries} from '../../shared/indicators.ts';
echarts.use([LineChart,BarChart,CandlestickChart,GridComponent,TooltipComponent,DataZoomComponent,MarkLineComponent,CanvasRenderer]);
export function PriceChart({data,quote,loading,bands}:{data:ChartData|null;quote?:Quote;loading:boolean;bands:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!ref.current||!data?.bars.length)return;
  const chart=echarts.init(ref.current,undefined,{renderer:'canvas'});
  const bars=data.bars,minute=data.period==='minute';
  const labels=bars.map(b=>data.period==='day'?b.time.slice(5,10):`${b.time.slice(5,10)} ${b.time.slice(11,16)}`);
  const bandValues=bandSeries(bars,data.period,Date.now());
  const line=(name:string,values:(number|null)[],color:string,dashed=false)=>({name,type:'line' as const,data:values,symbol:'none',lineStyle:{width:1.3,color,type:dashed?'dashed' as const:'solid' as const},itemStyle:{color},connectNulls:false});
  const series:any[]=[minute?{name:'成交价',type:'line',data:bars.map(b=>b.close),symbol:'none',lineStyle:{width:1.7,color:'#3478f6'},itemStyle:{color:'#3478f6'},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(52,120,246,0.13)'},{offset:1,color:'rgba(52,120,246,0)'}])},markLine:quote?{symbol:'none',silent:true,label:{show:false},lineStyle:{color:'#c8cdd6',type:'dashed'},data:[{yAxis:quote.previousClose}]}:undefined}:{name:'价格',type:'candlestick',data:bars.map(b=>[b.open,b.close,b.low,b.high]),itemStyle:{color:'#ed5b5b',color0:'#1aa784',borderColor:'#ed5b5b',borderColor0:'#1aa784'}},
  {name:'成交量（份）',type:'bar',xAxisIndex:1,yAxisIndex:1,data:bars.map(b=>({value:b.volume,itemStyle:{color:b.close>=b.open?'rgba(237,91,91,.55)':'rgba(26,167,132,.55)'}}))}];
  if(minute)series.push(line('成交均价',bars.map(b=>b.average??null),'#e5ad43'));
  else if(bands)series.push(line('BOLL 上轨',bandValues.map(b=>b?.upper??null),'#ad91de',true),line('BOLL 中轨',bandValues.map(b=>b?.middle??null),'#e5ad43'),line('BOLL 下轨',bandValues.map(b=>b?.lower??null),'#ad91de',true));
  chart.setOption({animation:false,textStyle:{fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',fontSize:11,color:'#8b94a6'},grid:[{left:64,right:25,top:24,height:'57%'},{left:64,right:25,top:'72%',height:'15%'}],tooltip:{trigger:'axis',axisPointer:{type:'cross'},backgroundColor:'rgba(255,255,255,.97)',borderColor:'#e9edf3',textStyle:{color:'#35425a',fontSize:12},confine:true},axisPointer:{link:[{xAxisIndex:'all'}]},xAxis:[{type:'category',data:labels,boundaryGap:!minute,axisLine:{lineStyle:{color:'#e8edf3'}},axisTick:{show:false},axisLabel:{show:false}},{type:'category',data:labels,boundaryGap:!minute,gridIndex:1,axisLine:{lineStyle:{color:'#e8edf3'}},axisTick:{show:false},axisLabel:{color:'#98a1af',formatter:(v:string)=>data.period==='day'?v:v.slice(-5),interval:'auto',hideOverlap:true}}],yAxis:[{scale:true,splitNumber:4,axisLabel:{formatter:(v:number)=>v.toFixed(3)},splitLine:{lineStyle:{color:'#f0f2f6',type:'dashed'}},axisLine:{show:false}},{scale:true,gridIndex:1,splitNumber:2,axisLabel:{formatter:(v:number)=>`${(v/10000).toFixed(0)}万`},splitLine:{show:false}}],dataZoom:minute?[]:[{type:'inside',xAxisIndex:[0,1],start:Math.max(0,100-80/bars.length*100),end:100}],series});
  const observer=new ResizeObserver(()=>chart.resize());observer.observe(ref.current);
  return()=>{observer.disconnect();chart.dispose();};
 },[data,quote?.previousClose,bands]);
 return <div className="chart-wrapper"><div className="price-chart" ref={ref} style={{display:data?'block':'none'}} role="img" aria-label={`${quote?.name??data?.symbol??''}价格及成交量图，${data?.bars.length??0}条数据`}/>{!data&&<div className="chart-placeholder">{loading?<Spin tip="正在读取公开行情…"><div style={{width:200,height:40}}/></Spin>:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时没有图表数据"/>}</div>}</div>;
}
