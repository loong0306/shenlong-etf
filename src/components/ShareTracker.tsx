import {Alert,Button,Skeleton,Table,Tag} from 'antd';
import {CloudSyncOutlined,ExportOutlined,ReloadOutlined} from '@ant-design/icons';
import type {ShareData,SharePoint} from '../../shared/types.ts';
import {useData} from '../useData.ts';
import {compact,tone,pct,dateTime} from '../format.ts';
export function ShareTracker({symbol,compactView=false}:{symbol:string;compactView?:boolean}){
 const {data,error,loading,reload}=useData<ShareData>(`/api/shares/${symbol}`,600000);
 return <section className="panel share-panel"><div className="panel-header"><h3><CloudSyncOutlined/> ETF 日度份额 <span className="subtitle-inline">清算后 / T+1</span></h3><Button size="small" type="text" aria-label="刷新ETF日度份额" icon={<ReloadOutlined/>} onClick={reload} loading={loading}/></div>
 {error&&<Alert type="warning" showIcon message={error} style={{margin:16}}/>}
 {!data&&loading?<Skeleton active paragraph={{rows:2}} style={{padding:20}}/>:data&&<>
 <div className="holding-summary share-summary"><div><span>ETF 总份额</span><strong>{compact(data.points[0].shares)}<small>份</small></strong></div><div><span>较上一统计日变化</span><strong className={tone(data.change)}>{data.change===null?'—':`${data.change>0?'+':''}${compact(data.change)}`}<small>{data.change===null?'':'份'}</small></strong><small>对比 {data.points[1]?.date??'不可用'} · {pct(data.changePct)}</small></div><div><span>最新统计日期</span><strong className="report-date">{data.points[0].date}</strong><small>交易所数据日期，非抓取时间</small></div></div>
 {!compactView&&<Table<SharePoint> rowKey="date" size="small" pagination={false} dataSource={data.points.slice(0,10)} columns={[{title:'统计日期',dataIndex:'date'},{title:'ETF总份额',dataIndex:'shares',align:'right',render:(value:number)=><span className="mono">{compact(value)}份</span>},{title:'较上一统计日变化',key:'change',align:'right',render:(_,row,index)=>{const previous=data.points[index+1];const diff=previous?row.shares-previous.shares:null;return <span className={`mono ${tone(diff)}`}>{diff===null?'—':`${diff>0?'+':''}${compact(diff)}份`}</span>;}}]}/>}
 <div className="share-disclaimer">总份额变化反映全体持有人的合计结果，不代表国家队买卖；申赎、拆分等均可能影响份额。</div>
 {data.warnings.filter(w=>!w.startsWith('ETF总份额变化不代表')).map(w=><Alert key={w} type="warning" showIcon message={w} style={{margin:'10px 20px 0'}}/>)}
 <div className="source-foot"><span>{data.source} · 读取于 {dateTime(data.fetchedAt)}</span><a href={data.sourceUrl} target="_blank" rel="noreferrer">交易所来源 <ExportOutlined/></a></div>
 </>}
 </section>;
}
