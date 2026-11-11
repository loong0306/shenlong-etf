import type {Bar} from './types.ts';

// Normalize source offsets before matching the two Shanghai trading sessions.
export function shanghaiMinute(time:string):string {
 const timestamp=Date.parse(time);
 return Number.isFinite(timestamp)?new Date(timestamp+8*3600000).toISOString().slice(0,16).replace('T',' '):'';
}
export function minuteSession(bars:Bar[]):{date:string|null;times:string[];bars:(Bar|null)[]} {
 const times=Array.from({length:242},(_,i)=>{
  const minute=i<=120?570+i:780+i-121;
  return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
 });
 const dated=bars.map(bar=>({bar,time:shanghaiMinute(bar.time)})).filter(b=>b.time);
 const date=dated.map(b=>b.time.slice(0,10)).sort().at(-1)??null;
 const byMinute=new Map(dated.filter(b=>b.time.slice(0,10)===date).map(b=>[b.time.slice(-5),b.bar]));
 return {date,times,bars:times.map(time=>byMinute.get(time)??null)};
}
