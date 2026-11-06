export type Mode = 'live';
export type Period = 'minute' | 'm5' | 'day';
export interface Instrument { symbol: string; code: string; name: string; shortName: string; category: string; manager: string; kind: 'etf' | 'index'; }
export interface Depth { price: number; volume: number; }
export interface Quote extends Instrument { price: number; previousClose: number; change: number; changePct: number; open: number; high: number; low: number; volume: number; amount: number | null; buyVolume: number | null; sellVolume: number | null; turnover: number | null; totalShares: number | null; iopv: number | null; time: string; bids: Depth[]; asks: Depth[]; }
export interface Bar { time: string; open: number; close: number; high: number; low: number; volume: number; amount: number | null; average?: number | null; }
export interface Envelope { mode: Mode; source: string; sourceUrl: string; fetchedAt: string; warnings: string[]; }
export interface MarketData extends Envelope { quotes: Quote[]; }
export interface ChartData extends Envelope { symbol: string; period: Period; bars: Bar[]; rsi: number | null; bands: {middle:number;upper:number;lower:number}|null; indicatorTime: string | null; }
export interface Holder { name: string; shares: number; ratio: number; national: boolean; delta: number | null; }
export interface HolderData extends Envelope { symbol: string; reportDate: string; previousReportDate: string | null; holders: Holder[]; }
export interface Rules { oversold: number; overbought: number; enabled: boolean; notifications: boolean; }
export interface Signal { id: string; symbol: string; kind: 'oversold' | 'overbought'; value: number; time: string; createdAt: number; read: boolean; mode: Mode; }
export interface SharePoint {date:string;shares:number;}
export interface ShareData extends Envelope {symbol:string;points:SharePoint[];change:number|null;changePct:number|null;}
export interface TurnoverPoint {time:string;amount:number|null;}
export interface TurnoverDay {date:string;points:TurnoverPoint[];}
export interface TurnoverData extends Envelope {symbol:string;today:string;days:TurnoverDay[];sampleCount:number;baselineDates:string[];average:TurnoverPoint[];}
