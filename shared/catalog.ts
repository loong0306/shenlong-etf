import type { Instrument } from './types.ts';
export const ETFS: Instrument[] = [
 {symbol:'sh510300',code:'510300',name:'沪深300ETF华泰柏瑞',shortName:'沪深300ETF',category:'沪深300',manager:'华泰柏瑞',kind:'etf'},
 {symbol:'sh510310',code:'510310',name:'沪深300ETF易方达',shortName:'沪深300ETF',category:'沪深300',manager:'易方达',kind:'etf'},
 {symbol:'sh510330',code:'510330',name:'沪深300ETF华夏',shortName:'沪深300ETF',category:'沪深300',manager:'华夏',kind:'etf'},
 {symbol:'sz159919',code:'159919',name:'沪深300ETF嘉实',shortName:'沪深300ETF',category:'沪深300',manager:'嘉实',kind:'etf'},
 {symbol:'sz159915',code:'159915',name:'创业板ETF易方达',shortName:'创业板ETF',category:'创业板',manager:'易方达',kind:'etf'},
 {symbol:'sz159949',code:'159949',name:'创业板50ETF华安',shortName:'创业板50ETF',category:'创业板',manager:'华安',kind:'etf'},
 {symbol:'sh510050',code:'510050',name:'上证50ETF华夏',shortName:'上证50ETF',category:'上证50',manager:'华夏',kind:'etf'},
 {symbol:'sh510500',code:'510500',name:'中证500ETF南方',shortName:'中证500ETF',category:'中证500',manager:'南方',kind:'etf'},
];
export const INDICES: Instrument[] = [
 {symbol:'sh000001',code:'000001',name:'上证指数',shortName:'上证指数',category:'指数',manager:'',kind:'index'},
 {symbol:'sz399001',code:'399001',name:'深证成指',shortName:'深证成指',category:'指数',manager:'',kind:'index'},
 {symbol:'sz399006',code:'399006',name:'创业板指',shortName:'创业板指',category:'指数',manager:'',kind:'index'},
];
export const INSTRUMENTS = [...ETFS,...INDICES];
export const findEtf = (symbol:string) => ETFS.find(e=>e.symbol===symbol);
