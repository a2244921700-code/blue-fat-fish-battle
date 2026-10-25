/* Real game input, action locks, momentum, cooking, pause, death and touch. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'grenade-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,value)=>{if(!value)console.error('Browser errors:',JSON.stringify(report.errors));assert(value,name);report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  await page.click('#btn-start');await page.click('#btn-pvp-mode');await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>{
   const d=FishGame.__debug;d.enterFallback();d.getPvpTactics().step=()=>{};d.setState('paused');
   window.step=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=.01)d.update(Math.min(.01,seconds-t));if(d.getState()==='playing')d.setState('paused');};
   step(4.7);
   window.prepare=()=>{d.clearProjectiles();d.releaseKeys();d.setNadeCount(5);d.setHp(100);d.resetHurt();const p=d.getPlayer();p.pos.set(0,0,64);p.velY=0;p.onGround=true;p.yaw=0;p.pitch=0;d.setState('playing');d.updatePlayer(1/60);d.setState('paused');};
  });
  const input=await page.evaluate(()=>{
   const d=FishGame.__debug;prepare();d.setState('playing');document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG'}));document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG',repeat:true}));
   const held={count:d.getNadeCount(),action:d.getGrenadeAction(),world:d.getGrenades().length};step(.65);const before=d.getAmmo().mag;d.setState('playing');d.shootOnce();d.reload();const switched=d.switchWeapon('knife'),knife=d.knifeAttack(true);d.setState('paused');
   return {held,mag:before,after:d.getAmmo().mag,switched,knife,reload:d.getAmmo().reloading,action:d.getGrenadeAction(),panel:!!document.getElementById('grenade-action'),gunY:d.getGun().group.position.y};
  });
  check('G 按下只取出一颗，系统自动重复按键不会连扔',input.held.count===4&&input.held.world===0&&input.held.action.phase==='cook');
  check('持雷时收枪举雷，引信继续走时且不显示倒计时浮窗',input.action.fuse<2.36&&input.action.fuse>2.34&&!input.panel&&input.gunY<-.8);
  check('持雷时不能射击、挥刀、切枪或换弹',input.mag===input.after&&!input.switched&&!input.knife&&!input.reload);
  await page.screenshot({path:path.join(OUT,'01-cooking.png')});
  const pause=await page.evaluate(()=>{const d=FishGame.__debug,before=d.getGrenadeAction();d.update(2);document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyG'}));const waiting=d.getGrenadeAction(),count=d.getGrenades().length;step(.01);return {before,waiting,count,gr:d.getGrenades().map(g=>({fuse:g.fuse,vel:g.vel})),action:d.getGrenadeAction()};});
  check('暂停冻结引信；暂停中松开 G，恢复后只投出一次',pause.before.fuse===pause.waiting.fuse&&pause.waiting.releasePending&&pause.count===0&&pause.gr.length===1&&pause.action.phase==='recover');
  const recovery=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');const mag=d.getAmmo().mag;d.shootOnce();const blocked=d.getAmmo().mag;step(.5);d.setState('playing');d.shootOnce();const after=d.getAmmo().mag;d.setState('paused');return {mag,blocked,after,action:d.getGrenadeAction()};});
  check('投掷收手动作结束前不能攻击，结束后恢复',recovery.mag===recovery.blocked&&recovery.after===recovery.mag-1&&!recovery.action);
  const velocities=await page.evaluate(()=>{
   const d=FishGame.__debug;
   function sample(move,jump,wall){prepare();const p=d.getPlayer();if(wall)p.pos.set(0,0,-74.9);if(move)d.pressKey(move,true);step(.3);d.setState('playing');if(jump){document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));d.updatePlayer(.02);}d.nadeThrow();const g=d.getGrenades()[0],result={v:g.vel.clone(),p:g.pos.clone(),motion:p.motion.clone(),vy:p.velY};d.releaseKeys();d.setState('paused');return result;}
   return {still:sample(),run:sample('KeyW'),back:sample('KeyS'),jump:sample('KeyW',true),wall:sample('KeyW',false,true)};
  });report.velocities=velocities;
  check('实际移动的前进、后退和跳跃速度带入投掷',velocities.run.v.z<velocities.still.v.z-5.9&&velocities.back.v.z>velocities.still.v.z+5.9&&velocities.jump.v.y>velocities.still.v.y+6);
  check('顶墙走路不虚增速度，贴墙出手不会穿墙生成',Math.abs(velocities.wall.motion.z)<.001&&Math.abs(velocities.wall.v.z-velocities.still.v.z)<.01&&velocities.wall.p.z>=-75.261);
  const bounce=await page.evaluate(()=>{const d=FishGame.__debug;prepare();d.setState('playing');d.nadeThrow();const g=d.getGrenades()[0];g.pos.set(0,.25,64);g.vel.set(3,-5,0);step(.12);return {exists:d.getGrenades().includes(g),fuse:g.fuse,bounces:g.bounces,y:g.pos.y,vy:g.vel.y};});
  check('落地后实际反弹，碰撞不会立即爆炸',bounce.exists&&bounce.bounces>0&&bounce.fuse>2.8&&bounce.y>.14);
  const air=await page.evaluate(()=>{const d=FishGame.__debug;prepare();const p=d.getPlayer();p.pitch=.6;d.setState('playing');d.updatePlayer(0);d.nadeBegin();step(2.1);d.setState('playing');d.nadeRelease();const g=d.getGrenades()[0],remaining=g.fuse;step(.85);const y=g.pos.y,before=d.getGrenades().length;step(.08);return {remaining,y,before,after:d.getGrenades().length};});report.airburst=air;
  check('预热 2.1 秒后投出，在空中按剩余 0.9 秒引爆',Math.abs(air.remaining-.9)<.001&&air.y>3&&air.before===1&&air.after===0);
  const hot=await page.evaluate(()=>{const d=FishGame.__debug;prepare();d.setState('playing');d.nadeBegin();step(3.05);return {hp:d.getPlayer().hp,action:d.getGrenadeAction(),count:d.getNadeCount(),world:d.getGrenades().length};});
  check('一直握住会在手中爆炸并自伤，不退还手雷',hot.hp<100&&hot.hp>0&&!hot.action&&hot.count===4&&hot.world===0);
  const death=await page.evaluate(()=>{const d=FishGame.__debug;prepare();d.setState('playing');d.nadeBegin();step(.6);d.setState('playing');d.pvpHurtPlayer();const g=d.getGrenades()[0],before={fuse:g&&g.fuse,action:d.getGrenadeAction(),respawn:d.getPvp().respawnT};step(.7);return {before,after:g&&g.fuse,action:d.getGrenadeAction(),world:d.getGrenades().length,hp:d.getPlayer().hp};});
  check('阵亡会掉落已拉环的手雷，剩余引信继续走时',death.before.fuse>2.39&&death.before.fuse<2.41&&!death.before.action&&death.after<1.71&&death.world===1&&death.hp===0);
  await page.evaluate(()=>step(4.2));
  // User regression: cook 0.2s, release, die during throw recovery, then respawn.
  const thrownDeath=await page.evaluate(()=>{
   const d=FishGame.__debug;prepare();d.setState('playing');document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG'}));step(.2);d.setState('playing');document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyG'}));
   const g=d.getGrenades()[0],thrown={fuse:g.fuse,phase:d.getGrenadeAction().phase};d.pvpHurtPlayer();
   const dead={hp:d.getPlayer().hp,action:d.getGrenadeAction(),sameProjectile:d.getGrenades().length===1&&d.getGrenades()[0]===g,view:!!d.getCamera().getObjectByName('手雷/第一人称')};
   step(4.1);d.setState('playing');const mag=d.getAmmo().mag;d.shootOnce();d.setState('paused');
   const respawned={hp:d.getPlayer().hp,action:d.getGrenadeAction(),world:d.getGrenades().length,view:!!d.getCamera().getObjectByName('手雷/第一人称'),panel:!!document.querySelector('#grenade-action,#grenade-fuse'),canShoot:d.getAmmo().mag===mag-1,nades:d.getNadeCount()};
   return {thrown,dead,respawned};
  });report.throwDeath=thrownDeath;
  check('预热 0.2 秒投出后立即阵亡，只保留原弹体并清空持雷动作',Math.abs(thrownDeath.thrown.fuse-2.8)<.001&&thrownDeath.thrown.phase==='recover'&&thrownDeath.dead.hp===0&&!thrownDeath.dead.action&&!thrownDeath.dead.view&&thrownDeath.dead.sameProjectile);
  check('复活后无残留浮窗、持雷模型或动作锁，原弹体已按时爆炸',thrownDeath.respawned.hp===100&&!thrownDeath.respawned.action&&!thrownDeath.respawned.view&&!thrownDeath.respawned.panel&&thrownDeath.respawned.world===0&&thrownDeath.respawned.canShoot&&thrownDeath.respawned.nades===1);
  await page.screenshot({path:path.join(OUT,'02-respawn.png')});
  const fresh=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG'}));const held=d.getGrenadeAction();document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyG'}));const grenades=d.getGrenades();d.setState('paused');return {held,count:d.getNadeCount(),world:grenades.length,fuse:grenades[0]&&grenades[0].fuse};});report.afterRespawn=fresh;
  check('复活后新手雷从完整 3 秒引信开始，不继承上次的 2.8 秒',fresh.held.phase==='cook'&&fresh.held.fuse===3&&fresh.count===0&&fresh.world===1&&fresh.fuse===3);
  const menu=await page.evaluate(()=>{const d=FishGame.__debug;prepare();d.setState('playing');d.nadeBegin();d.restart(true);return {a:d.getGrenadeAction(),world:d.getGrenades().length,panel:!!document.getElementById('grenade-action'),view:!!d.getCamera().getObjectByName('手雷/第一人称')};});
  check('退出回大厅清理持雷模型及所有投掷物，无倒计时浮窗',!menu.a&&menu.world===0&&!menu.panel&&!menu.view);
  // Touch button uses the same hold/release state machine.
  const touch=await browser.newPage({hasTouch:true,viewport:{width:1000,height:700}});touch.on('pageerror',e=>report.errors.push(e.message));await touch.goto('http://127.0.0.1:8123/');await touch.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  const mobile=await touch.evaluate(()=>{const d=FishGame.__debug;d.startPvp({teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};for(let i=0;i<50;i++)d.update(.1);d.setNadeCount(2);const b=document.getElementById('btn-tch-nade'),t=new Touch({identifier:17,target:b,clientX:900,clientY:560});b.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,changedTouches:[t],touches:[t],targetTouches:[t]}));d.update(.5);const cook=d.getGrenadeAction();b.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,changedTouches:[t],touches:[],targetTouches:[]}));const g=d.getGrenades()[0];d.setState('paused');return {cook,world:d.getGrenades().length,fuse:g&&g.fuse,count:d.getNadeCount()};});
  check('触屏按钮同样支持按住预热、松开投掷',mobile.cook&&mobile.cook.phase==='cook'&&mobile.world===1&&Math.abs(mobile.fuse-2.5)<.001&&mobile.count===1);
  check('整个手雷交互流程无脚本异常',report.errors.length===0);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('Browser grenade: '+report.checks.length+' checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
