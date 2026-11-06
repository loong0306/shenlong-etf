import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createComparisonService} from './comparison.ts';
import {createService,validateRequest} from './service.ts';
import {fetchText} from './providers.ts';
import {createTurnoverService} from './turnover.ts';
import {createShareService} from './shares.ts';
import {ETFS} from '../shared/catalog.ts';
import type {Mode,Period} from '../shared/types.ts';
export const app=express();const service=createService(fetchText);const shares=createShareService(fetchText);const turnover=createTurnoverService(fetchText);const comparison=createComparisonService(fetchText);
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next();});
app.get('/api/health',(_req,res)=>res.json({ok:true,app:'神龙ETF'}));
app.get('/api/catalog',(_req,res)=>res.json(ETFS));
app.get('/api/market',async(req,res)=>{
 const mode=req.query.mode??'live';if(mode!=='live'){res.status(400).json({error:'无效数据模式'});return;}
 try{res.json(await service.market(mode));}catch{res.status(502).json({error:'行情源暂时不可用，请稍后刷新或检查网络。'});}
});
app.get('/api/comparison/:symbol',async(req,res)=>{
 const symbol=String(req.params.symbol),date=String(req.query.date??'');
 try{validateRequest(symbol,'day');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))){res.status(400).json({error:'无效行情日期'});return;}}catch{res.status(400).json({error:'无效ETF'});return;}
 try{res.json(await comparison(symbol,date));}catch{res.status(502).json({error:'历史成交额基准暂不可用'});}
});
app.get('/api/turnover/:symbol',async(req,res)=>{
 const symbol=String(req.params.symbol);
 try{validateRequest(symbol,'minute',String(req.query.mode??'live'));}catch(e){res.status(400).json({error:(e as Error).message});return;}
 try{res.json(await turnover(symbol));}catch{res.status(502).json({error:'分钟累计成交额暂不可用，请稍后重试。'});}
});
app.get('/api/shares/:symbol',async(req,res)=>{
 const symbol=String(req.params.symbol);
 try{validateRequest(symbol,'day',String(req.query.mode??'live'));}catch(e){res.status(400).json({error:(e as Error).message});return;}
 try{res.json(await shares(symbol));}catch{res.status(502).json({error:'交易所日度份额暂不可用，请稍后重试。'});}
});
app.get(['/api/chart/:symbol','/api/holders/:symbol'],async(req,res)=>{
 const symbol=String(req.params.symbol),mode=String(req.query.mode??'live') as Mode,period=String(req.query.period??'m5') as Period;
 try{validateRequest(symbol,period,mode);}catch(e){res.status(400).json({error:(e as Error).message});return;}
 try{res.json(req.path.startsWith('/api/holders')?await service.holders(symbol,mode):await service.chart(symbol,period,mode));}
 catch{res.status(502).json({error:req.path.startsWith('/api/holders')?'持有人数据暂不可用，公开页面可能尚未更新或结构已变化。':'图表数据暂不可用，请稍后重试。'});}
});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.NODE_ENV==='production'){
 app.use(express.static(path.join(root,'dist')));
 app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/')){res.status(404).json({error:'API不存在'});return;}res.sendFile(path.join(root,'dist/index.html'));});
}
const port=Number(process.env.PORT??3001);
const bindHost=process.env.BIND_HOST??(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1');
const server=app.listen(port,bindHost,()=>console.log(`神龙ETF API: http://${bindHost}:${port}`));
function shutdown(){server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
