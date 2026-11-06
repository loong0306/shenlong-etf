import {useEffect,useState} from 'react';
import type {Rules,Signal} from '../shared/types.ts';
import {DEFAULT_RULES} from '../shared/indicators.ts';
import {ETFS} from '../shared/catalog.ts';
export function normalizeRules(value:unknown):Rules{
 const v=value as Partial<Rules>|null;
 if(!v||typeof v.oversold!=='number'||typeof v.overbought!=='number'||!Number.isFinite(v.oversold)||!Number.isFinite(v.overbought)||v.oversold<1||v.overbought>99||v.oversold>=v.overbought)return {...DEFAULT_RULES};
 return {oversold:v.oversold,overbought:v.overbought,enabled:typeof v.enabled==='boolean'?v.enabled:true,notifications:v.notifications===true};
}
export function normalizeFavorites(value:unknown):string[]{
 return Array.isArray(value)?[...new Set(value.filter((s):s is string=>typeof s==='string'&&ETFS.some(e=>e.symbol===s)))]:ETFS.map(e=>e.symbol);
}
export function normalizeHistory(value:unknown):{live:Signal[]}{
 const v=value as Record<string,unknown>|null;
 const valid=(list:unknown,mode:'live'):Signal[]=>Array.isArray(list)?list.filter((s):s is Signal=>s&&typeof s.id==='string'&&ETFS.some(e=>e.symbol===s.symbol)&&['oversold','overbought'].includes(s.kind)&&s.mode===mode&&typeof s.value==='number'&&Number.isFinite(s.value)&&s.value>=0&&s.value<=100&&typeof s.createdAt==='number'&&Number.isFinite(s.createdAt)&&typeof s.time==='string'&&Number.isFinite(Date.parse(s.time))&&typeof s.read==='boolean').slice(0,200):[];
 return {live:valid(v?.live,'live')};
}
export function useStored<T>(key:string,normalize:(v:unknown)=>T):[T,(next:T|((prev:T)=>T))=>void]{
 const [value,setValue]=useState<T>(()=>{try{return normalize(JSON.parse(localStorage.getItem(key)??'null'));}catch{return normalize(null);}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private mode/quota: retain in-memory preferences. */}},[key,value]);
 return [value,setValue];
}

export const REFRESH_SECONDS=[1,3,5,10,15,30] as const;
export function normalizeRefreshSeconds(value:unknown):number{return typeof value==='number'&&REFRESH_SECONDS.some(n=>n===value)?value:10;}
