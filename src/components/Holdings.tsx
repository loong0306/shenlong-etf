import {Alert,Button,Empty,Select,Skeleton,Table,Tag,Tooltip} from 'antd';
import {BankOutlined,ExportOutlined,ReloadOutlined,SafetyCertificateOutlined} from '@ant-design/icons';
import {ShareTracker} from './ShareTracker.tsx';
import {DISCLOSURE_RULE_URL,HOLDER_HISTORY_NOTE} from '../../shared/disclosure.ts';
import {ETFS} from '../../shared/catalog.ts';
import type {HolderData,Mode,Holder} from '../../shared/types.ts';
import {useData} from '../useData.ts';
import {compact,tone,dateTime} from '../format.ts';
export function Holdings({symbol,onSelect,mode}:{symbol:string;onSelect:(symbol:string)=>void;mode:Mode}){
 const {data,error,loading,reload}=useData<HolderData>(`/api/holders/${symbol}?mode=${mode}`,0);
 const national=data?.holders.filter(h=>h.national)??[];
 const total=national.reduce((a,h)=>a+h.shares,0),ratio=national.reduce((a,h)=>a+h.ratio,0);
 const columns=[{title:'持有人',dataIndex:'name',key:'name',render:(v:string,h:Holder)=><div className="holder-name"><BankOutlined className={h.national?'blue':'muted'}/><span>{v}</span>{h.national&&<Tag color="blue" bordered={false}>观察机构</Tag>}</div>},
 {title:'持有份额',dataIndex:'shares',key:'shares',align:'right' as const,render:(n:number)=><span className="mono">{compact(n)}份</span>},
 {title:'占总份额',dataIndex:'ratio',key:'ratio',align:'right' as const,render:(n:number)=><span className="mono">{n.toFixed(2)}%</span>},
 {title:<Tooltip title={`与${data?.previousReportDate??'上一披露期'}比较；不等于交易买卖量，拆分等事件也可能影响份额。`}>较上期份额变化</Tooltip>,dataIndex:'delta',key:'delta',align:'right' as const,render:(n:number|null)=><span className={`mono ${tone(n)}`}>{n===null?'不可比':n===0?'未变化':`${n>0?'+':''}${compact(n)}份`}</span>}];
 return <div className="holdings-stack"><section className="panel"><div className="holdings-toolbar"><span>选择 ETF</span><Select aria-label="持仓ETF" value={symbol} onChange={onSelect} options={ETFS.map(e=>({value:e.symbol,label:`${e.code} · ${e.name}`}))} style={{width:310}}/><Tag bordered={false}>同一ETF · 两类数据</Tag></div></section><ShareTracker symbol={symbol}/><section className="panel holdings-panel">
 <div className="panel-header"><h3><SafetyCertificateOutlined/> 历史机构持仓 <span className="subtitle-inline">历史快照</span></h3><Button icon={<ReloadOutlined/>} onClick={reload} loading={loading}>重新读取</Button></div>
 <Alert className="historical-warning" type="info" showIcon message="历史披露，不是实时或T+1机构持仓" description={<span>{HOLDER_HISTORY_NOTE} <a href={DISCLOSURE_RULE_URL} target="_blank" rel="noreferrer">查看新准则第31条</a></span>}/>
 {error&&<Alert type="warning" showIcon message={error} style={{margin:20}} action={<Button size="small" onClick={reload}>重试</Button>}/>}
 {loading?<Skeleton active paragraph={{rows:5}} style={{padding:24}}/>:data?<>
 <div className="holding-summary"><div><span>报告期末观察机构份额</span><strong>{national.length?compact(total):'未列入'}<small>{national.length?'份':''}</small></strong></div><div><span>当期占基金总份额</span><strong>{national.length?ratio.toFixed(2)+'%':'—'}</strong></div><div><span>历史名单报告期</span><strong className="report-date">{data.reportDate}</strong><small>不可视为当前持仓</small></div></div>
 <Table<Holder> size="small" rowKey="name" columns={columns} dataSource={data.holders} pagination={false} scroll={{x:780}} locale={{emptyText:'前十名单中未发现已配置的观察机构；不代表没有持仓'}}/>
 <div className="source-foot"><span>来源：{data.source} · 抓取于 {dateTime(data.fetchedAt)}</span><a href={data.sourceUrl} target="_blank" rel="noreferrer">查看来源 <ExportOutlined/></a></div>
 <div className="holdings-notes"><Alert type="info" showIcon message="报告持仓 ≠ 实时持仓；份额变化 ≠ 买卖成交量" description="仅统计公开前十名单中的明确机构名称。未出现在前十不代表未持有。转载页面可能滞后，请用基金管理人的正式报告核验。"/>{data.warnings.filter(w=>w!==HOLDER_HISTORY_NOTE).map(w=><p className="small-note" key={w}>{w}</p>)}</div>
 </>:!error&&<Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>}
 </section></div>;
}
