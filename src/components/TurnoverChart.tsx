import {useEffect,useRef,useState} from 'react';
import * as echarts from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,DataZoomComponent,LegendComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {Alert,Select,Spin,Tag} from 'antd';
import {LineChartOutlined} from '@ant-design/icons';
import type {TurnoverData,TurnoverPoint} from '../../shared/types.ts';
import {ETFS} from '../../shared/catalog.ts';
import {useData} from '../useData.ts';
import {clock} from '../format.ts';
echarts.use([LineChart,GridComponent,TooltipComponent,DataZoomComponent,LegendComponent,CanvasRenderer]);
export function TurnoverChart({symbol,paused,version,refreshSeconds}:{symbol:string;paused:boolean;version:number;refreshSeconds:number}){
 const {data,error,loading}=useData<TurnoverData>(`/api/turnover/${symbol}?v=${version}`,refreshSeconds*1000,!paused);
 const [choice,setChoice]=useState<string|null>(null);const ref=useRef<HTMLDivElement>(null);
 const dates=data?.days.filter(d=>d.date<data.today).map(d=>d.date)??[];
 const comparison=choice&&dates.includes(choice)?choice:dates[0];
 const info=ETFS.find(e=>e.symbol===symbol)!;
 useEffect(()=>{
  if(!ref.current||!data)return;
  const chart=echarts.init(ref.current);
  const labels=data.average.map(p=>p.time);
  const values=(points:TurnoverPoint[])=>{const map=new Map(points.map(p=>[p.time,p.amount]));return labels.map(t=>{const v=map.get(t);return v==null?null:v/1e8;});};
  const today=data.days.find(d=>d.date===data.today),previous=data.days.find(d=>d.date===comparison);
  const line=(name:string,points:TurnoverPoint[],color:string,dashed=false)=>({name,type:'line' as const,data:values(points),symbol:'none',connectNulls:false,lineStyle:{color,width:dashed?1.6:2,type:dashed?'dashed' as const:'solid' as const},itemStyle:{color}});
  const series=[line(`今日（${data.today}）`,today?.points??[],'#ee4249'),...(previous?[line(previous.date,previous.points,'#ee9138')]:[]),line(data.sampleCount===20?'最近20个可用日均值':data.sampleCount?`近${data.sampleCount}日参考均值`:'历史均值（暂无样本）',data.average,'#5288ff',true)];
  chart.setOption({animation:false,textStyle:{fontFamily:'-apple-system,"PingFang SC",sans-serif',fontSize:11,color:'#8b97a9'},legend:{top:8,left:22,itemWidth:16,itemHeight:7,textStyle:{fontSize:11,color:'#718096'}},grid:{left:72,right:25,top:68,bottom:68},tooltip:{trigger:'axis',confine:true,valueFormatter:(v:unknown)=>v==null?'暂无数据':Number(v).toFixed(2)+' 亿元'},xAxis:{type:'category',data:labels,boundaryGap:false,axisLine:{lineStyle:{color:'#dce3ed'}},axisTick:{show:false},axisLabel:{hideOverlap:true,interval:19,color:'#8c97a8'}},yAxis:{type:'value',name:'累计成交额（亿元）',nameTextStyle:{fontSize:10,color:'#8b97a9',align:'left',padding:[0,0,0,-44]},min:0,axisLabel:{formatter:(v:number)=>v.toLocaleString('zh-CN',{maximumFractionDigits:2})},splitLine:{lineStyle:{color:'#e8edf5'}}},dataZoom:[{type:'inside',start:0,end:100},{type:'slider',height:20,bottom:13,start:0,end:100,borderColor:'#dfe6f0',fillerColor:'rgba(82,136,255,.12)',handleSize:'85%',showDetail:false}],series});
  const observer=new ResizeObserver(()=>chart.resize());observer.observe(ref.current);return()=>{observer.disconnect();chart.dispose();};
 },[data,comparison]);
 return <section className="panel turnover-panel"><div className="panel-header"><h3><LineChartOutlined/> 分钟累计成交额对比 <span className="subtitle-inline">{info.shortName} · {info.code}</span></h3><div className="turnover-actions"><Tag bordered={false}>单只 ETF</Tag><Select aria-label="累计成交额对比日期" value={comparison} placeholder="选择历史日期" options={dates.map(date=>({value:date,label:date}))} onChange={setChoice} disabled={!dates.length} style={{width:136}}/></div></div>
 {error&&<Alert type="warning" showIcon message={error} style={{margin:'12px 20px'}}/>}
 <div className="turnover-viewport"><div ref={ref} className="turnover-chart" role="img" aria-label={`${info.name}分钟累计成交额，今日、历史日期及同分钟均值对比`}/>{!data&&<div className="turnover-loading">{loading?<Spin/>:<span>暂无累计成交额数据</span>}</div>}</div>
 {data&&<><div className="turnover-note">{`采用今日之前最近 ${data.sampleCount}/20 个可用完整样本，缺失分钟不补零；样本日期可能不连续。`}{data.baselineDates?.length>0&&` 样本范围：${data.baselineDates.at(-1)} 至 ${data.baselineDates[0]}。`}{!data.days.some(d=>d.date===data.today)&&' 今日曲线暂不可用。'}</div><div className="source-foot"><span>{data.source} · 数据按元读取，图中换算为亿元 · {paused?'刷新已暂停':`每${refreshSeconds}秒刷新`}</span><span>最近数据 {data.days[0]?.date} {data.days[0]?.points.at(-1)?.time} · 读取 {clock(data.fetchedAt)}</span></div>{data.warnings.filter(w=>!w.startsWith('历史完整样本')).map(w=><Alert key={w} type="warning" message={w} style={{margin:16}}/>)}</>}
 </section>;
}
