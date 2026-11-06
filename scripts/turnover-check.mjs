import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.APP_URL??'http://127.0.0.1:5173';
const d=await(await fetch(base+'/api/turnover/sh510300')).json();
assert.equal(d.symbol,'sh510300');assert.ok(d.sampleCount>0);
console.log('API',JSON.stringify({days:d.days.map(x=>x.date),sampleCount:d.sampleCount,last:d.days[0].points.at(-1)}));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('.turnover-chart canvas').waitFor();
 await page.locator('.turnover-panel').screenshot({path:'artifacts/turnover-chart.png'});
 const option=d.days.filter(x=>x.date<d.today)[1]?.date;
 if(option){await page.locator('.turnover-actions .ant-select').click();await page.locator('.ant-select-item-option-content').filter({hasText:option}).click();}
 const response=page.waitForResponse(r=>r.url().includes('/api/turnover/sz159915')&&r.status()===200);
 await page.getByRole('row',{name:'选择创业板ETF易方达'}).click();await response;
 await page.locator('.turnover-chart canvas').waitFor();
 assert.ok((await page.locator('.turnover-panel .panel-header').innerText()).includes('159915'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('.turnover-panel').screenshot({path:'artifacts/turnover-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS date selection, selected ETF linkage, real charts, mobile layout, no page errors');
}finally{await browser.close();}
