import {Button,Empty,Popconfirm,Segmented,Table,Tag} from 'antd';
import {BellOutlined,CheckOutlined,DeleteOutlined,SettingOutlined} from '@ant-design/icons';
import {useState} from 'react';
import type {Signal} from '../../shared/types.ts';
import {ETFS} from '../../shared/catalog.ts';
import {dateTime} from '../format.ts';
export function AlertCenter({history,onRead,onClear,onSettings,onSelect}:{history:Signal[];onRead:()=>void;onClear:()=>void;onSettings:()=>void;onSelect:(s:string)=>void}){
 const [filter,setFilter]=useState('全部');const rows=history.filter(s=>filter==='全部'||(filter==='未读'?!s.read:s.kind===(filter==='超卖'?'oversold':'overbought')));
 return <section className="panel"><div className="panel-header"><h3><BellOutlined/> 预警记录</h3><Button icon={<SettingOutlined/>} onClick={onSettings}>预警规则</Button></div><div className="alerts-toolbar"><Segmented value={filter} onChange={setFilter} options={['全部','未读','超买','超卖']}/><div><Button icon={<CheckOutlined/>} onClick={onRead} disabled={!history.some(s=>!s.read)}>全部已读</Button><Popconfirm title="清空当前模式的预警记录？" onConfirm={onClear} okText="清空" cancelText="取消"><Button type="text" danger icon={<DeleteOutlined/>} disabled={!history.length}>清空</Button></Popconfirm></div></div>
 <Table<Signal> rowKey="id" dataSource={rows} pagination={{pageSize:10,hideOnSinglePage:true}} scroll={{x:700}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚无预警记录；仅在页面运行且行情新鲜时产生提醒"/>}} columns={[
 {title:'状态',dataIndex:'read',render:(read:boolean)=><Tag bordered={false} color={read?'default':'blue'}>{read?'已读':'未读'}</Tag>},
 {title:'监控标的',dataIndex:'symbol',render:(s:string)=><Button type="link" onClick={()=>onSelect(s)}>{ETFS.find(e=>e.symbol===s)?.name??s}</Button>},
 {title:'信号',dataIndex:'kind',render:(kind:string)=><Tag bordered={false} color={kind==='oversold'?'cyan':'orange'}>{kind==='oversold'?'超卖观察':'超买观察'}</Tag>},
 {title:'RSI(14) · 5分钟',dataIndex:'value',render:(v:number)=><b className="mono">{v.toFixed(2)}</b>},
 {title:'指标时间',dataIndex:'time',render:(v:string)=>dateTime(v)},
 {title:'记录时间',dataIndex:'createdAt',render:(v:number)=>dateTime(new Date(v).toISOString())}
 ]}/><div className="source-foot">记录保存在当前浏览器，最多200条。页面关闭后不继续监控。</div></section>;
}
