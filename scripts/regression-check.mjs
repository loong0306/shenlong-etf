import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {quoteSamples,barSamples} from '../tests/fixtures.ts';
const base=process.env.APP_URL??'http://127.0.0.1:5173';
const response=await fetch(base+'/api/market?mode=demo');assert.equal(response.status,400,'removed mode must not be accepted by the backend');
const market={mode:'live',source:'controlled API test sample',sourceUrl:'https://example.com',fetchedAt:new Date().toISOString(),warnings:[],quotes:quoteSamples()};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];let requests=0,offline=false;
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('guanlan.alerts.v1',JSON.stringify({live:[],demo:[{id:'old-fake',mode:'demo',symbol:'sh510300',kind:'oversold',value:20,time:new Date().toISOString(),createdAt:Date.now(),read:false}]})));
await page.route('**/api/**',async route=>{
 requests++;const url=new URL(route.request().url());
 if(offline){await route.fulfill({status:502,json:{error:'行情源不可用（受控测试）'}});return;}
 if(url.pathname==='/api/market'){await route.fulfill({json:market});return;}
 const symbol=url.pathname.split('/').at(-1);
 if(url.pathname.startsWith('/api/chart/')){const period=url.searchParams.get('period')??'m5';await route.fulfill({json:{...market,quotes:undefined,symbol,period,bars:barSamples(period),rsi:20,bands:null,indicatorTime:new Date(Date.now()-180000).toISOString()}});return;}
 if(url.pathname.startsWith('/api/holders/')){await route.fulfill({json:{...market,quotes:undefined,symbol,reportDate:'2025-12-31',previousReportDate:null,holders:[{name:'公开机构（受控测试）',shares:100,ratio:1,national:false,delta:null}]}});return;}
 if(url.pathname.startsWith('/api/turnover/')){await route.fulfill({json:{...market,quotes:undefined,symbol,today:'2026-11-05',days:[{date:'2026-11-05',points:[{time:'09:30',amount:40000}]}],sampleCount:0,baselineDates:[],average:[{time:'09:30',amount:null}]}});return;}
 if(url.pathname.startsWith('/api/shares/')){await route.fulfill({json:{...market,quotes:undefined,symbol,points:[{date:'2026-11-04',shares:1000},{date:'2026-11-03',shares:900}],change:100,changePct:100/9}});return;}
 await route.fulfill({json:[]});
});
await page.goto(base+'/?mode=demo',{waitUntil:'networkidle'});
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('guanlan.alerts.v1')??'{}').live?.length===8);
assert.equal(await page.getByText('演示模式',{exact:true}).count(),0);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guanlan.alerts.v1')).demo),undefined);
console.log('PASS removed UI/backend mode; legacy simulated records discarded');
const snapshot=await page.locator('.watch-panel').innerText();const beforePause=requests;
await page.getByRole('button',{name:'暂停自动刷新',exact:true}).click();await page.waitForTimeout(350);
assert.equal(requests,beforePause,'pause must not send new requests');assert.equal(await page.locator('.watch-panel').innerText(),snapshot);
console.log('PASS pause preserves snapshot without a new request');
await page.getByRole('button',{name:'恢复自动刷新',exact:true}).click();await page.waitForLoadState('networkidle');
await page.getByRole('menuitem').filter({hasText:'预警中心'}).click();await page.getByRole('button',{name:/清\s*空/}).click();await page.locator('.ant-popconfirm').getByRole('button',{name:/清\s*空/}).click();await page.waitForTimeout(350);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guanlan.alerts.v1')).live.length),0);
console.log('PASS cleared alert history stays clear');
offline=true;await page.locator('.heading-actions').getByRole('button').last().click();await page.waitForLoadState('networkidle');
await page.getByText('行情源不可用（受控测试）',{exact:true}).first().waitFor({timeout:10000});
assert.ok((await page.locator('body').innerText()).includes('行情源不可用'));assert.equal(await page.getByText('演示模式',{exact:true}).count(),0);
console.log('PASS API failure remains explicit without a simulated fallback');
assert.deepEqual(errors,[]);await browser.close();
