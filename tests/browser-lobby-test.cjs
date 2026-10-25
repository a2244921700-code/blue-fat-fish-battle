/* Real Edge regressions for the lobby, safe text, loadout, artwork and responsive UI.
 * Start server.js first. No packages are added to the game; use PLAYWRIGHT_MODULE if needed.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const URL=process.env.FISH_TEST_URL||'http://127.0.0.1:8123/',OUT=path.join(__dirname,'lobby-results');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 const report={checks:[],errors:[],missing:[],layouts:[]};
 function check(name,ok,detail){assert(ok,name+(detail?' '+JSON.stringify(detail):''));report.checks.push(name);console.log('PASS | '+name);}
 function track(page){page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});}
 async function load(page){await page.goto(URL);await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());}
 async function shot(page,name){await page.screenshot({path:path.join(OUT,name+'.png')});}
 async function layout(page,id,label){
  const result=await page.locator(id).evaluate(el=>{const r=el.getBoundingClientRect();return {width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth,children:Array.from(el.querySelectorAll('button,input,select,.lt-tab,.shell-main,.room-main')).filter(e=>e.getClientRects().length).filter(e=>{const b=e.getBoundingClientRect();return b.left<r.left-2||b.right>r.right+2;}).map(e=>e.id||e.className)};});
  report.layouts.push({label,...result});check(label+' 横向无溢出',result.scroll<=result.client+2&&result.children.length===0,result);
 }
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});track(page);
  // Controlled local save in this isolated browser context; no user save is touched.
  await page.addInitScript(()=>{
   if(!sessionStorage.getItem('lobby-test-seeded')){
    localStorage.setItem('bff_save_v1',JSON.stringify({v:4,bestScore:12345,bestTime:321,bestCombo:2,bestWave:6,bestStage:2}));
    localStorage.setItem('bff_loadout_v1',JSON.stringify({primary:'bogus',secondary:'<img>',melee:'bogus',skin:'bogus'}));
    sessionStorage.setItem('lobby-test-seeded','1');
   }
  });
  await load(page);
  check('主菜单使用本地宣传图',await page.locator('#menu-overlay').evaluate(el=>getComputedStyle(el).backgroundImage.includes('menu-sandwatch.webp')));
  await shot(page,'final-menu');await page.click('#btn-start');
  check('进入大厅不提前进入对局或全屏',await page.evaluate(()=>FishGame.__debug.getState()==='levelSelect'&&!document.fullscreenElement));
  check('大厅战绩读取真实存档',await page.locator('#side-best-score').textContent()==='12345'&&await page.locator('#side-best-time').textContent()==='5:21'&&await page.locator('#side-best-combo').textContent()!=='—');
  check('无效仓库数据回退到默认装备',await page.locator('#lobby-sidearm').textContent()==='手枪'&&await page.locator('#lobby-skin-name').textContent()==='常规鱼');
  await page.click('#level-overlay [data-open-help]');check('操作指南在原界面上打开',await page.locator('#controls-dialog').isVisible());
  await page.keyboard.press('Escape');check('Esc 只关闭指南，不退出大厅',!(await page.locator('#controls-dialog').isVisible())&&await page.locator('#level-overlay').isVisible());
  await page.click('#btn-lobby-settings');await page.keyboard.press('Escape');check('设置按 Esc 返回来源大厅',await page.locator('#level-overlay').isVisible());
  await page.click('#btn-lobby-ach');await page.keyboard.press('Escape');check('成就按 Esc 返回大厅',await page.locator('#level-overlay').isVisible());
  await page.click('#btn-inventory');
  check('仓库采用已修正扶盆手的插画',await page.locator('.armory-banner').evaluate(el=>getComputedStyle(el).backgroundImage.includes('armory-basin-v2.webp')));
  await page.click('#inv-item-knife');check('匕首详情正确显示近战类型',await page.locator('#inv-detail').textContent().then(t=>t.includes('近战武器')&&!t.includes('角色形象')));
  await page.click('#inv-item-fishpistol');await page.click('#btn-inv-equip');
  check('装备保存且状态立即更新',await page.evaluate(()=>JSON.parse(localStorage.getItem('bff_loadout_v1')).secondary==='fishpistol')&&await page.locator('#inv-item-fishpistol').getAttribute('aria-pressed')==='true');
  check('武器预览来自真实模型静态图',await page.locator('#inv-item-rifle img').evaluate(el=>el.complete&&el.naturalWidth===640&&el.src.includes('/weapons/rifle.png')));
  await page.click('.inv-tab[data-tab="skin"]');await page.click('#inv-item-melee');await page.click('#btn-inv-equip');await page.keyboard.press('Escape');
  check('大厅装备与形象跟随仓库选择',await page.locator('#lobby-sidearm').textContent()==='鱼人手枪'&&await page.locator('#lobby-skin-name').textContent()!=='常规鱼');
  await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  check('快速出战直接载入且继承仓库副武器与形象',await page.evaluate(()=>{const p=FishGame.__debug.getPvp();return p.myWeapon==='fishpistol'&&p.mySkin==='melee'&&!document.getElementById('pvp-overlay');}));
  await page.evaluate(async()=>{FishGame.__debug.restart(true);if(document.fullscreenElement)await document.exitFullscreen();});await page.click('#btn-start');
  await page.click('#btn-mode-pvp');
  check('房间列表明确本地连接，不伪造延迟',await page.locator('#room-list .c-ping').allTextContents().then(a=>a.length===4&&a.every(t=>t==='本地')));
  // Count render mutations after revisiting; repeated listener registration would cause multiple replacements.
  await page.keyboard.press('Escape');await page.click('#btn-mode-pvp');await page.keyboard.press('Escape');await page.click('#btn-mode-pvp');
  await page.evaluate(()=>{window.roomReplacements=0;window.roomObserver=new MutationObserver(records=>{roomReplacements+=records.filter(r=>r.removedNodes.length>0).length;});roomObserver.observe(document.getElementById('room-list'),{childList:true});});
  await page.click('.rf-chip[data-filter="mode"][data-value="bot"]');
  check('多次打开房间列表不会重复绑定筛选',await page.evaluate(()=>roomReplacements===1));await page.evaluate(()=>roomObserver.disconnect());
  check('模式筛选可用',await page.locator('#room-list .rl-row').count()===3);
  await page.fill('#room-search','不存在的房间');check('空结果提供清除筛选操作',await page.locator('#btn-room-clear').isVisible());
  await page.click('#btn-room-clear');check('清除筛选恢复房间并聚焦搜索',await page.locator('#room-list .rl-row').count()===4&&await page.inputValue('#room-search')==='');
  await page.click('#btn-room-create');check('创建房间默认本地 AI 且正确锁定补位',await page.inputValue('#cr-mode')==='bot'&&await page.locator('#cr-fillai').isDisabled());
  await page.fill('#cr-name','<b>Test</b>');await page.selectOption('#cr-teamsize','6');await page.selectOption('#cr-tickets','5');await page.locator('#cr-name').press('Enter');
  check('回车创建房间，名称保留为普通文本',await page.locator('#room-title').textContent()==='<b>Test</b>'&&await page.locator('#room-title b').count()===0);
  check('房间展示所选共享额度',await page.locator('#room-ticket-text').textContent().then(t=>t.includes('30')));
  const palette=await page.evaluate(()=>({r:getComputedStyle(document.querySelector('.room-team.red .rt-head')).color,b:getComputedStyle(document.querySelector('.room-team.blue .rt-head')).color}));
  check('红蓝队伍颜色对应正确',palette.r.includes('245, 176, 155')&&palette.b.includes('155, 203, 237'));
  await page.keyboard.press('Escape');await page.fill('#room-search','test');
  check('名称搜索忽略大小写，HTML 不被执行或解析',await page.locator('#room-list .rl-row').count()===1&&await page.locator('#room-list .c-name').textContent()==='<b>Test</b>'&&await page.locator('#room-list .c-name b').count()===0);
  await page.click('#room-list .rl-join');check('离开再进保留房间与房主身份',await page.locator('#room-sub').textContent().then(t=>t.includes('房主')));
  await page.click('#btn-room-start');await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>{FishGame.__debug.enterFallback();FishGame.__debug.setState('paused');});
  const match=await page.evaluate(()=>({s:FishGame.__debug.pvpSnapshot(),p:FishGame.__debug.getPvp(),names:FishGame.__debug.getEnemies().filter(e=>e.isBot).map(e=>e.pvpName)}));
  check('房间配置实际生效：6v6、每队 30 额度、11 个 AI',match.s.teamSize===6&&match.s.limit===30&&match.p.botTotal===11);
  check('预览编队名字传入实际比赛',match.names.includes('AI-1')&&match.names.includes('AI-12'));
  await page.evaluate(async()=>{FishGame.__debug.restart(true);if(document.fullscreenElement)await document.exitFullscreen();});await page.click('#btn-start');await page.click('#btn-mode-pvp');await page.click('#btn-room-create');
  await page.fill('#cr-name','演示房');await page.selectOption('#cr-mode','online');await page.uncheck('#cr-fillai');await page.click('#btn-cr-create');
  check('关闭 AI 的演示房间不会偷偷开满员 AI 对局',await page.locator('#btn-room-start').isDisabled()&&await page.locator('#room-note').textContent().then(t=>t.includes('仅可预览')));
  await page.click('#btn-room-simjoin');check('模拟队员标识明确，提示显示在菜单之上',await page.locator('#room-red-slots').textContent().then(t=>t.includes('模拟 · AI'))&&await page.locator('#notice-pop').evaluate(el=>Number(getComputedStyle(el).zIndex)>20));
  await page.keyboard.press('Escape');await page.click('#btn-room-create');await page.fill('#cr-name','演示接管');await page.selectOption('#cr-mode','online');await page.check('#cr-fillai');await page.selectOption('#cr-teamsize','6');await page.click('#btn-cr-create');await page.click('#btn-room-simjoin');
  check('演示房间说明 AI 接管',await page.locator('#btn-room-start').textContent()==='以 AI 接管出战');
  await page.click('#btn-room-start');await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});await page.evaluate(()=>{FishGame.__debug.enterFallback();FishGame.__debug.setState('paused');});
  check('模拟成员在对局里确实由命名 AI 接管',await page.evaluate(()=>FishGame.__debug.getEnemies().some(e=>e.pvpName==='海豹 · AI')));
  await page.evaluate(async()=>{FishGame.__debug.restart(true);if(document.fullscreenElement)await document.exitFullscreen();});
  // Exercise shuffle-bag and actual decode in isolation from game construction speed.
  const sequence=await page.evaluate(async()=>{const result=[];for(let i=0;i<10;i++){await FishUI.beginLoading(i%2?'pvp':'endless');result.push({id:FishUI.getArtState().id,ready:document.getElementById('loading-art').classList.contains('ready')});FishUI.endLoading();}return result;});
  check('载入图全部可解码且跨轮换不连续重复',sequence.every((a,i)=>a.ready&&(!i||a.id!==sequence[i-1].id))&&new Set(sequence.map(a=>a.id)).size===3,sequence);
  report.artSequence=sequence;
  await page.evaluate(async()=>{await FishUI.beginLoading('pvp');document.getElementById('loading-overlay').classList.remove('hidden');document.getElementById('loading-label').textContent='构建场景细节';document.getElementById('loading-fill').style.width='62%';document.getElementById('loading-percent').textContent='62%';document.getElementById('loading-track').setAttribute('aria-valuenow','62');});
  await shot(page,'final-loading');await page.evaluate(()=>{FishUI.endLoading();document.getElementById('loading-overlay').classList.add('hidden');FishUI.show('menu');});
  await page.reload();await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());await page.click('#btn-start');
  check('刷新后装备持久化',await page.locator('#lobby-sidearm').textContent()==='鱼人手枪');
  // Focus cycle keeps keyboard navigation within current screen.
  await page.locator('#btn-level-back').focus();await page.keyboard.press('Tab');check('Tab 不会进入遮挡的游戏 HUD',await page.evaluate(()=>document.getElementById('level-overlay').contains(document.activeElement)));
  for(const [width,height,label] of [[1440,900,'desktop'],[1366,768,'laptop'],[390,844,'phone'],[844,390,'landscape']]){
   await page.setViewportSize({width,height});await layout(page,'#level-overlay',label+' 大厅');
   if(label==='desktop')await shot(page,'final-lobby');if(label==='phone')await shot(page,'final-phone-lobby');
   await page.click('#btn-inventory');await layout(page,'#inventory-overlay',label+' 仓库');if(label==='desktop')await shot(page,'final-armory');if(label==='phone')await shot(page,'final-phone-armory');
   await page.keyboard.press('Escape');await page.click('#btn-mode-pvp');await layout(page,'#roomlist-overlay',label+' 房间列表');
   if(label==='desktop')await shot(page,'final-rooms');await page.click('#room-list .rl-join >> nth=0');await layout(page,'#room-overlay',label+' 部署');
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   await page.click('#btn-mode-endless');await layout(page,'#map-overlay',label+' 地图选择');await page.keyboard.press('Escape');
  }
  check('页面没有重复的元素 ID',await page.evaluate(()=>{const ids=Array.from(document.querySelectorAll('[id]')).map(el=>el.id);return ids.length===new Set(ids).size;}));
  // A separate page whose loading art fails still reaches a playable mode.
  const failed=await browser.newPage({viewport:{width:1280,height:720}});track(failed);
  await failed.route('**/assets/ui-art/loading-*.webp',route=>route.abort());
  await load(failed);await failed.click('#btn-start');await failed.click('#btn-mode-endless');await failed.click('#btn-map-desert');
  await failed.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  check('载入插画失败时仍能进入无尽模式',await failed.evaluate(()=>FishGame.__debug.getPvp().mode==='endless'&&!document.getElementById('loading-art').classList.contains('ready')));
  await failed.close();
  const local=await browser.newPage();track(local);await local.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));await local.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());await local.click('#btn-start');await local.click('#btn-inventory');
  check('直接 file:// 打开时仓库与本地图像也正常',await local.locator('#inv-item-rifle img').evaluate(el=>el.complete&&el.naturalWidth>0));await local.close();
  check('无脚本异常或新增资源 404',report.errors.length===0&&report.missing.length===0,report);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('Lobby browser: '+report.checks.length+' checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
