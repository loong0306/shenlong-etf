import {INSTRUMENTS} from '../shared/catalog.ts';
import type {Quote,Bar,Period} from '../shared/types.ts';
// Controlled boundary samples for automated tests only; never imported by application code.
export function quoteSamples():Quote[]{return INSTRUMENTS.map((info,i)=>({...info,price:4+i/10,previousClose:4,change:i/10,changePct:i*2.5,open:4,high:5,low:3.9,volume:10000,amount:40000,buyVolume:6000,sellVolume:4000,turnover:1,totalShares:1000000,iopv:null,time:new Date().toISOString(),bids:[{price:4,volume:1000}],asks:[{price:4.001,volume:2000}]}));}
export function barSamples(period:Period):Bar[]{
 return Array.from({length:30},(_,i)=>({time:period==='day'?new Date(Date.now()-(31-i)*86400000).toISOString().slice(0,10):new Date(Date.now()-(31-i)*300000).toISOString(),open:4,close:4.001,high:4.01,low:3.99,volume:1000,amount:4000}));
}
