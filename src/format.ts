export function compact(value:number|null|undefined,digits=2){
 if(value===null||value===undefined||!Number.isFinite(value))return '—';
 const abs=Math.abs(value);if(abs>=1e8)return (value/1e8).toFixed(digits)+'亿';if(abs>=1e4)return (value/1e4).toFixed(digits)+'万';return value.toLocaleString('zh-CN',{maximumFractionDigits:digits});
}
export const price=(n:number|null|undefined)=>n==null?'—':n.toFixed(3);
export const pct=(n:number|null|undefined)=>n==null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;
export const tone=(n:number|null|undefined)=>n==null||n===0?'neutral':n>0?'up':'down';
export const clock=(value:string|undefined)=>value?new Date(value).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
export const dateTime=(value:string|undefined)=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
