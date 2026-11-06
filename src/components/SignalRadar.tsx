import {Button,Empty,Tag,Tooltip} from 'antd';
import {RadarChartOutlined,SettingOutlined,ArrowDownOutlined,ArrowUpOutlined,CheckCircleOutlined} from '@ant-design/icons';
import type {ChartData,Quote,Rules,Signal} from '../../shared/types.ts';
import {ETFS} from '../../shared/catalog.ts';
import {clock} from '../format.ts';
export function SignalRadar({technicals,quotes,rules,history,onSettings,onSelect,onAll,errors}:{technicals:Record<string,ChartData>;quotes:Quote[];rules:Rules;history:Signal[];onSettings:()=>void;onSelect:(s:string)=>void;onAll:()=>void;errors:string[]}){
 const entries=ETFS.map(e=>({info:e,technical:technicals[e.symbol]})).filter(e=>e.technical?.rsi!=null).sort((a,b)=>Math.abs(b.technical.rsi!-50)-Math.abs(a.technical.rsi!-50));
 const signals=entries.filter(e=>e.technical.rsi!<rules.oversold||e.technical.rsi!>rules.overbought);
 return <section className="panel radar-panel"><div className="panel-header"><h3><RadarChartOutlined/> 信号雷达</h3><Tooltip title="设置预警规则"><Button type="text" size="small" aria-label="设置预警规则" icon={<SettingOutlined/>} onClick={onSettings}/></Tooltip></div>
 <div className="radar-status"><span className={`pulse-dot ${!rules.enabled?'gray':''}`}/><span>{rules.enabled?'技术指标监测中':'自动预警已关闭'}</span><Tag bordered={false}>5分钟周期</Tag></div>
 <div className="radar-content">{signals.length?signals.slice(0,3).map(({info,technical})=>{const oversold=technical.rsi!<rules.oversold;return <button className={`signal-card ${oversold?'cool':'warm'}`} key={info.symbol} onClick={()=>onSelect(info.symbol)}><div className="signal-card-top"><span>{oversold?<ArrowDownOutlined/>:<ArrowUpOutlined/>} {oversold?'超卖观察':'超买观察'}</span><time>{clock(technical.indicatorTime??undefined)}</time></div><strong>{info.shortName}<small>{info.code}</small></strong><p>RSI(14) <b>{technical.rsi!.toFixed(1)}</b><span>{oversold?`低于 ${rules.oversold}`:`高于 ${rules.overbought}`}</span></p><div className="signal-track"><i style={{left:`${technical.rsi}%`}}/></div></button>;}):<div className="radar-empty"><CheckCircleOutlined/><strong>{entries.length?'当前未发现超买超卖':'正在读取技术指标'}</strong><span>{entries.length?'价格处于设定的 RSI 区间内':'公开分钟线准备完成后开始计算'}</span></div>}
 <div className="scan-summary"><div><span>标的扫描</span><b>{entries.length}<small> / {ETFS.length}</small></b></div><div className="scan-dots">{ETFS.map(e=><Tooltip key={e.symbol} title={`${e.name}：${errors.includes(e.code)?'数据暂不可用':technicals[e.symbol]?'已获取分钟线':'等待数据'}`}><span className={technicals[e.symbol]?'ready':errors.includes(e.code)?'failed':''}/></Tooltip>)}</div><p>基于已收盘 K 线 · 技术状态不代表交易建议</p></div></div>
 <Button className="radar-footer" type="text" block onClick={onAll}>查看预警记录 <span>{history.length}</span> →</Button>
 </section>;
}
