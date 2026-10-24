/* 全屏 / 击杀徽章 / 切枪互锁。先启动 server.js；PLAYWRIGHT_MODULE 指向已有安装。 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'controls-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 const report={checks:[],errors:[],missing:[]};
 function check(name,ok,detail){assert(ok,name+(detail?' '+JSON.stringify(detail):''));report.checks.push(name);console.log('PASS | '+name);}
 async function openGame(page){
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  await page.click('#btn-start');await page.click('#btn-pvp-mode');await page.click('#btn-pvp-start');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
 }
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  // 只给此自动测试的独立上下文授予权限，不修改用户浏览器配置。
  const cdp=await page.context().newCDPSession(page),{targetInfo}=await cdp.send('Target.getTargetInfo');
  await cdp.send('Browser.grantPermissions',{origin:new URL(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/').origin,permissions:['keyboardLock','pointerLock'],browserContextId:targetInfo.browserContextId});
  await openGame(page);
  check('对战入口的真实点击自动进入网页全屏',await page.evaluate(()=>!!document.fullscreenElement));
  await page.waitForFunction(()=>FishGame.__debug.getImmersiveState().keyboard==='locked');
  check('Edge 允许权限后成功启用游戏键捕获',await page.evaluate(()=>FishGame.__debug.getImmersiveState().keyboard==='locked'));
  await page.evaluate(()=>{window.shortcutSentinel='same-game';});
  await page.keyboard.press('Control+KeyW');await page.keyboard.press('Control+KeyR');
  check('全屏键捕获期间 Ctrl+W、Ctrl+R 不打断页面',!page.isClosed()&&await page.evaluate(()=>window.shortcutSentinel==='same-game'));
  await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.setState('paused');d.getPvpTactics().step=()=>{};
   window.step=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=.01)d.update(Math.min(.01,seconds-t));if(d.getState()==='playing')d.setState('paused');};step(4.7);});
  const lower=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.setAmmo(19,77);d.reload();const reloading=d.getAmmo().reloading;
   const started=d.switchWeapon('pistol'),before=d.getWeapon();d.shootOnce();const knife=d.knifeAttack(true);d.nadeThrow();d.reload();
   const blocked={mag:d.getAmmo().mag,knife,grenades:d.getGrenades().length,reloading:d.getAmmo().reloading};d.update(.1);
   const repeated=d.switchWeapon('knife'),sw=d.getWeaponSwitch(),y=d.getGun().group.position.y;d.setState('paused');d.update(2);
   return {started,before,reloading,blocked,repeated,sw,y,after:d.getWeaponSwitch(),afterY:d.getGun().group.position.y};});
  check('切枪从旧模型开始，立即中断旧换弹',lower.started&&lower.before==='rifle'&&lower.reloading&&!lower.blocked.reloading);
  check('收枪期间射击、刀击、手雷及换弹全部被阻止',lower.blocked.mag===19&&!lower.blocked.knife&&lower.blocked.grenades===0);
  check('收枪有可见位移，连续切换不能跳过或重置计时',lower.y<-.3&&!lower.repeated&&lower.sw.to==='pistol'&&lower.sw.t===.1);
  check('暂停冻结切枪计时与模型位置',lower.sw.t===lower.after.t&&lower.y===lower.afterY);
  await page.screenshot({path:path.join(OUT,'01-holster.png')});
  const mid=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.update(.2);d.shootOnce();d.knifeAttack(false);d.nadeThrow();d.reload();d.setState('paused');
   return {w:d.getWeapon(),sw:d.getWeaponSwitch(),ammo:d.getAmmo(),knife:d.getGun().knifeAnim,grenades:d.getGrenades().length,y:d.getGun().group.position.y};});
  check('动作中段才换成新模型及其弹药',mid.w==='pistol'&&mid.sw.swapped&&mid.ammo.mag===12);
  check('模型已换但尚未举起时仍禁止所有攻击和换弹',!mid.knife&&mid.grenades===0&&!mid.ammo.reloading&&mid.y<-.5);
  await page.evaluate(()=>step(.15));await page.screenshot({path:path.join(OUT,'02-draw.png')});
  const ready=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.update(.12);d.shootOnce();d.setState('paused');return {sw:d.getWeaponSwitch(),mag:d.getAmmo().mag};});
  check('动作完成后恢复射击',!ready.sw&&ready.mag===11);
  const held=await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.switchWeapon('rifle');document.getElementById('game-canvas').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));
   d.update(.71);const before=d.getAmmo().mag;d.update(.02);document.dispatchEvent(new MouseEvent('mouseup',{button:0}));d.setState('paused');return {before,after:d.getAmmo().mag,reserve:d.getAmmo().reserve,sw:d.getWeaponSwitch()};});
  check('换回武器保留弹药，按住连射只在举枪完成后生效',held.before===19&&held.after===18&&held.reserve===77&&!held.sw);
  const blade=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.switchWeapon('knife');d.update(.3);const blocked=d.knifeAttack(true);d.update(.19);const ready=d.knifeAttack(true);d.setState('paused');return {blocked,ready,w:d.getWeapon()};});
  check('匕首切入同样需要完整动作，完成后可重击',!blade.blocked&&blade.ready&&blade.w==='knife');
  const shortcut=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');const k=new KeyboardEvent('keydown',{code:'KeyW',ctrlKey:true,bubbles:true,cancelable:true});document.dispatchEvent(k);const prevented=k.defaultPrevented;
   window.dispatchEvent(new Event('blur'));const paused=d.getState();const pos=d.getPlayer().pos.clone();d.enterFallback();d.update(.1);d.setState('paused');return {prevented,paused,moved:pos.distanceTo(d.getPlayer().pos)};});
  check('游戏收到 Ctrl+W 时阻止浏览器默认动作',shortcut.prevented);
  check('窗口失焦暂停并清空移动按键',shortcut.paused==='paused'&&shortcut.moved===0);
  await page.evaluate(async()=>{FishGame.__debug.setState('playing');await document.exitFullscreen();});
  await page.waitForFunction(()=>FishGame.__debug.getState()==='paused');
  check('退出真实网页全屏后自动暂停',await page.locator('#pause-overlay').isVisible());
  await page.click('#btn-resume');await page.waitForFunction(()=>!!document.fullscreenElement&&FishGame.__debug.getState()==='playing');
  check('继续游戏按钮重新进入全屏',await page.evaluate(()=>!!document.fullscreenElement));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>FishGame.__debug.getState()==='paused');
  check('Esc 仍可暂停，不被键盘捕获吞掉',await page.locator('#pause-overlay').isVisible());
  const late=await page.evaluate(()=>{const d=FishGame.__debug;const old=Object.getOwnPropertyDescriptor(document,'pointerLockElement');Object.defineProperty(document,'pointerLockElement',{configurable:true,value:document.getElementById('game-canvas')});
   d.notifyLockChange();if(old)Object.defineProperty(document,'pointerLockElement',old);else delete document.pointerLockElement;return d.getState();});
  check('迟到的指针锁定事件不会擅自恢复暂停对局',late==='paused');
  // 回到模拟控制；只禁用 AI 主动行动，实际死亡/额度/复活流程仍运行。
  await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.setState('paused');d.pvpKillBot();});
  const first=await page.evaluate(()=>({m:FishGame.__debug.getKillMedal(),rank:FishGame.__debug.comboGet().rank,state:FishGame.__debug.getState(),pvp:FishGame.__debug.getPvp(),classes:document.body.className,medal:document.getElementById('kill-medal').outerHTML}));
  await page.locator('#kill-medal.show svg').waitFor({state:'visible',timeout:2000});
  check('玩家首杀显示本地 SVG 击杀徽章',first.m.chain===1&&first.m.streak===1&&await page.locator('#kill-medal.show svg').isVisible(),first);
  check('FPS 徽章不会触发无尽模式增益',first.rank===-1);
  await page.waitForTimeout(360);await page.screenshot({path:path.join(OUT,'03-kill.png')});
  await page.evaluate(()=>{FishGame.__debug.pvpKillBot();FishGame.__debug.pvpKillBot();});
  check('同一帧的多个击杀累积并升级为三连杀',await page.evaluate(()=>FishGame.__debug.getKillMedal().chain===3&&document.getElementById('kill-medal-title').textContent==='三连杀'));
  await page.waitForTimeout(360);await page.screenshot({path:path.join(OUT,'04-multikill.png')});
  const frozen=await page.evaluate(()=>{const d=FishGame.__debug,a=d.getKillMedal();d.update(9);return {a,b:d.getKillMedal()};});
  check('暂停不消耗连杀窗口及徽章停留时间',frozen.a.window===frozen.b.window&&frozen.a.life===frozen.b.life);
  await page.evaluate(()=>step(2.5));check('徽章在战斗时间到期后淡出',!(await page.locator('#kill-medal.show').count()));
  await page.evaluate(()=>{step(2.6);FishGame.__debug.pvpKillBot();});
  const renewed=await page.evaluate(()=>FishGame.__debug.getKillMedal());
  check('超过 5 秒后重置快速连杀，保留生存击杀',renewed.chain===1&&renewed.streak===4);
  const died=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.switchWeapon('pistol');d.update(.1);d.pvpHurtPlayer();const switchDead=d.switchWeapon('knife');d.setState('paused');return {sw:d.getWeaponSwitch(),switchDead,m:d.getKillMedal(),hp:d.getPlayer().hp};});
  check('阵亡取消切枪并清空连杀，死亡期间禁止换装',!died.sw&&!died.switchDead&&died.m.streak===0&&died.hp===0);
  await page.evaluate(()=>step(4.1));
  check('复活恢复主武器，没有遗留动作锁',await page.evaluate(()=>FishGame.__debug.getWeapon()==='rifle'&&!FishGame.__debug.getWeaponSwitch()));
  await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.switchWeapon('pistol');d.pvpSetTickets(24,1);d.pvpKillBot();d.setState('paused');});
  check('最后一杀保留徽章，回合结束取消切枪',await page.evaluate(()=>FishGame.__debug.getPvp().roundState==='over'&&FishGame.__debug.getKillMedal().chain===1&&!FishGame.__debug.getWeaponSwitch()));
  await page.evaluate(()=>step(3.1));
  check('新回合清空生存连杀并恢复默认武器',await page.evaluate(()=>FishGame.__debug.getKillMedal().streak===0&&FishGame.__debug.getWeapon()==='rifle'));
  await page.evaluate(async()=>{FishGame.__debug.restart(true);if(document.fullscreenElement)await document.exitFullscreen();});
  await page.click('#btn-start');await page.click('#btn-level-desert');
  await page.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'));
  check('无尽模式入口同样自动全屏',await page.evaluate(()=>!!document.fullscreenElement));
  await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.clearCovers();d.startWave(1);d.inertEnemies();d.killNearest();d.setState('paused');});
  check('无尽模式也有击杀图标，原有评级继续工作',await page.evaluate(()=>FishGame.__debug.getKillMedal().chain===1&&FishGame.__debug.comboGet().rank>=0));
  await page.screenshot({path:path.join(OUT,'05-endless.png')});
  // 在独立浏览器页模拟全屏权限拒绝，确认窗口模式可继续玩、可重试。
  const denied=await browser.newPage({viewport:{width:1440,height:900}});
  await denied.addInitScript(()=>{window.fullscreenAttempts=0;Element.prototype.requestFullscreen=function(){fullscreenAttempts++;return Promise.reject(new DOMException('test: denied','NotAllowedError'));};});
  await openGame(denied);
  await denied.evaluate(()=>FishGame.__debug.enterFallback());
  check('全屏被拒绝时窗口模式照常载入',await denied.evaluate(()=>!document.fullscreenElement&&FishGame.__debug.getState()==='playing'));
  check('被拒绝后有可见的手动全屏入口',await denied.locator('#btn-fullscreen').isVisible());
  await denied.keyboard.press('KeyF');
  check('手动入口可以重新发起全屏请求',await denied.evaluate(()=>fullscreenAttempts===2));
  await denied.screenshot({path:path.join(OUT,'06-window-fallback.png')});
  // 真实全屏 + 可控的权限拒绝，验证键盘锁异常不会中止载入。
  const lifecycle=await browser.newPage({viewport:{width:1440,height:900}});
  await lifecycle.addInitScript(()=>{
   Object.defineProperty(navigator,'keyboard',{configurable:true,value:{lock(){return Promise.reject(new DOMException('test: keyboard denied','NotAllowedError'));},unlock(){}}});
   const enter=Element.prototype.requestFullscreen;
   Element.prototype.requestFullscreen=function(options){const result=enter.call(this,options);result.then(()=>{if(!window.exitedDuringLoad){window.exitedDuringLoad=true;setTimeout(()=>document.exitFullscreen().catch(()=>{}),60);}}).catch(()=>{});return result;};
  });
  await openGame(lifecycle);await lifecycle.waitForFunction(()=>FishGame.__debug.getState()==='paused');
  check('载入期间退出全屏，完成载入后保持暂停',await lifecycle.locator('#pause-overlay').isVisible());
  await lifecycle.click('#btn-resume');await lifecycle.waitForFunction(()=>FishGame.__debug.getState()==='playing'&&FishGame.__debug.getImmersiveState().keyboard==='denied');
  check('键盘捕获权限被拒绝后仍可全屏继续游戏',await lifecycle.evaluate(()=>!!document.fullscreenElement));
  await lifecycle.evaluate(async()=>{const d=FishGame.__debug;d.restart(true);if(document.fullscreenElement)await document.exitFullscreen();});
  const menuTab=await lifecycle.evaluate(()=>{const ev=new KeyboardEvent('keydown',{code:'Tab',bubbles:true,cancelable:true});document.dispatchEvent(ev);return ev.defaultPrevented;});
  check('返回菜单释放快捷键，不再拦截 Tab',!menuTab);
  check('没有未处理的脚本错误',report.errors.length===0,report.errors);
  check('新增资源均可加载',report.missing.length===0,report.missing);
  report.passed=report.checks.length;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('Controls browser: '+report.passed+' checks passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
