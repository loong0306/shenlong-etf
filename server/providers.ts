import {fetch,EnvHttpProxyAgent} from 'undici';
const dispatcher=new EnvHttpProxyAgent();
export async function fetchText(url:string,encoding='utf-8'):Promise<string>{
 const response=await fetch(url,{dispatcher,signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0','Referer':new URL(url).hostname==='query.sse.com.cn'?'https://www.sse.com.cn/':new URL(url).origin+'/','Accept':'application/json,text/html,*/*'}});
 if(!response.ok)throw new Error(`数据源响应异常（${response.status}）`);
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength>4_000_000)throw new Error('数据源响应过大');
 return new TextDecoder(encoding).decode(buffer);
}
