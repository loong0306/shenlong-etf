import {useEffect,useState,useCallback,useRef} from 'react';
import {ETFS} from '../shared/catalog.ts';
import type {ChartData,Mode} from '../shared/types.ts';
export async function getJson<T>(url:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{signal:signal??AbortSignal.timeout(15000)});
 const body=await response.json();if(!response.ok)throw new Error(body.error??'请求失败');return body as T;
}
export function useData<T>(url:string,interval:number,enabled=true){
 const [entry,setEntry]=useState<{url:string;data:T}|null>(null),[failure,setFailure]=useState<{url:string;error:string}|null>(null),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 const enabledRef=useRef(enabled),previousEnabled=useRef(enabled);enabledRef.current=enabled;
 const previousRequest=useRef<string|null>(null);
 const reload=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{if(enabled&&!previousEnabled.current)reload();previousEnabled.current=enabled;},[enabled,reload]);
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();setLoading(true);
  const run=async(initial=false)=>{
   if(!initial&&!enabledRef.current)return;
   try{const result=await getJson<T>(url,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]));if(alive){setEntry({url,data:result});setFailure(null);}}
   catch(e){if(alive&&!controller.signal.aborted)setFailure({url,error:e instanceof Error?e.message:'网络请求失败'});}
   finally{if(alive){setLoading(false);if(enabledRef.current&&interval>0)timer=setTimeout(()=>void run(),interval);}}
  };
  const key=url+':'+version,changed=previousRequest.current!==key;previousRequest.current=key;
  if(changed||enabledRef.current)void run(true);else setLoading(false);return ()=>{alive=false;controller.abort();clearTimeout(timer);};
 },[url,interval,version]);
 return {data:entry?.url===url?entry.data:null,error:failure?.url===url?failure.error:'',loading,reload};
}
export function useTechnicals(mode:Mode,enabled:boolean,version:number){
 const [entry,setEntry]=useState<{mode:Mode;data:Record<string,ChartData>;errors:string[]}|null>(null),[resume,setResume]=useState(0);
 const enabledRef=useRef(enabled),previousEnabled=useRef(enabled);enabledRef.current=enabled;
 useEffect(()=>{if(enabled&&!previousEnabled.current)setResume(v=>v+1);previousEnabled.current=enabled;},[enabled]);
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();
  const run=async(initial=false)=>{
   if(!initial&&!enabledRef.current)return;
   const results=await Promise.allSettled(ETFS.map(e=>getJson<ChartData>(`/api/chart/${e.symbol}?period=m5&mode=${mode}`,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]))));
   if(!alive)return;const data:Record<string,ChartData>={},errors:string[]=[];
   results.forEach((r,i)=>{if(r.status==='fulfilled')data[ETFS[i].symbol]=r.value;else errors.push(ETFS[i].code);});setEntry({mode,data,errors});if(enabledRef.current)timer=setTimeout(()=>void run(),60000);
  };
  void run(true);return()=>{alive=false;controller.abort();clearTimeout(timer);};
 },[mode,version,resume]);
 return {data:entry?.mode===mode?entry.data:{},errors:entry?.mode===mode?entry.errors:[]};
}
