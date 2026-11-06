import {Tooltip,Empty} from 'antd';
import {InfoCircleOutlined,SwapOutlined} from '@ant-design/icons';
import type {Quote} from '../../shared/types.ts';
import {compact,price,tone} from '../format.ts';
export function FlowPanel({quote}:{quote?:Quote}){
 if(!quote)return <section className="panel flow-panel"><div className="panel-header"><h3>盘中成交结构</h3></div><Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/></section>;
 const buy=quote.buyVolume,sell=quote.sellVolume,available=buy!==null&&sell!==null,total=(buy??0)+(sell??0),ratio=total?(buy??0)/total*100:50;
 const max=Math.max(...quote.asks.map(d=>d.volume),...quote.bids.map(d=>d.volume),1);
 return <section className="panel flow-panel"><div className="panel-header"><h3><SwapOutlined/> 盘中成交结构</h3><Tooltip title="内外盘是数据源对成交方向的分类，不代表全部买卖委托，也不能识别国家队。"><InfoCircleOutlined className="muted"/></Tooltip></div>
 <div className="flow-content"><div className="flow-title"><span>外盘 · 主动买入参考</span><span>内盘 · 主动卖出参考</span></div><div className="flow-values"><strong className="up">{compact(buy)}<small>份</small></strong><strong className="down">{compact(sell)}<small>份</small></strong></div><div className="flow-bar"><span style={{width:`${ratio}%`}}/><span style={{width:`${100-ratio}%`}}/></div><div className="flow-ratio"><span>{available?ratio.toFixed(1)+'%':'—'}</span><span>{available?(100-ratio).toFixed(1)+'%':'—'}</span></div>
 <div className="orderbook-title"><span>五档盘口</span><span>价格 / 委托份额</span></div>
 <div className="orderbook">{[...quote.asks].reverse().map((d,i)=><div className="book-row" key={'ask'+i}><i className="depth-bg ask" style={{width:`${d.volume/max*68}%`}}/><span className="muted">卖{quote.asks.length-i}</span><span className="down mono">{price(d.price)}</span><span className="mono">{compact(d.volume,1)}</span></div>)}<div className="book-spread"><span>最新价</span><b className={tone(quote.changePct)}>{price(quote.price)}</b><span className={tone(quote.changePct)}>{quote.changePct>0?'+':''}{quote.changePct.toFixed(2)}%</span></div>{quote.bids.map((d,i)=><div className="book-row" key={'bid'+i}><i className="depth-bg bid" style={{width:`${d.volume/max*68}%`}}/><span className="muted">买{i+1}</span><span className="up mono">{price(d.price)}</span><span className="mono">{compact(d.volume,1)}</span></div>)}</div>
 <p className="small-note">盘口为当前委托快照，非逐笔成交。</p></div></section>;
}
