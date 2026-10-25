'use strict';
const path=require('node:path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());await page.waitForTimeout(300);
 async function shot(name){await page.screenshot({path:path.join(__dirname,'lobby-results',name+'.png')});}
 await shot('01-menu');await page.click('#btn-start');await page.waitForTimeout(500);await shot('02-lobby');
 await page.click('#btn-inventory');await page.waitForTimeout(250);await shot('03-armory');
 await page.click('#btn-inv-back');await page.click('#btn-mode-pvp');await shot('04-roomlist');
 await page.click('#room-list .rl-join >> nth=1');await shot('05-room');await page.keyboard.press('Escape');
 await page.click('#btn-room-create');await shot('06-create');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.click('#btn-pvp-mode');await shot('07-quickplay');await page.keyboard.press('Escape');
 await page.click('#btn-mode-endless');await shot('08-map');await page.keyboard.press('Escape');
 for(const [width,height,label] of [[390,844,'mobile'],[844,390,'landscape'],[1366,768,'laptop']]){
  await page.setViewportSize({width,height});await shot('09-'+label+'-lobby');
  await page.click('#btn-inventory');await shot('10-'+label+'-armory');await page.keyboard.press('Escape');
 }
 console.log(JSON.stringify({errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
