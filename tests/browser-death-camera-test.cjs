'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'death-camera-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,value)=>{assert(value,name);report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))report.errors.push(m.text());});
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeDeathCamera)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.selectOption('#lobby-deploy-team','red');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{
   window.freezeDeathCamera=true;const d=FishGame.__debug;d.enterFallback();d.getPvpTactics().step=()=>{};
   window.stepDeath=(s)=>{d.setState('playing');for(let t=0;t<s-1e-8;t+=.01)d.update(Math.min(.01,s-t));d.setState('paused');};
   window.mouseDeath=(type,button=0,x=600,y=300)=>document.getElementById('game-canvas').dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,button,clientX:x,clientY:y}));
   window.dieAt=(x=0,z=66)=>{d.setState('playing');let p=d.getPlayer();p.pos.set(x,0,z);p.yaw=0;p.pitch=.1;p.velY=0;p.onGround=true;d.updatePlayer(0);d.syncCharacters(.1);d.pvpHurtPlayer(999);};
   stepDeath(4);d.setState('playing');let p=d.getPlayer();p.pos.set(0,0,66);p.yaw=.2;p.pitch=.1;d.updatePlayer(0);d.syncCharacters(.1);
   mouseDeath('mousedown');window.deathStart={pos:d.getCamera().position.clone(),q:d.getCamera().quaternion.clone()};d.pvpHurtPlayer(999);
  });
  const initial=await page.evaluate(()=>{let d=FishGame.__debug;return {view:d.getDeathView(),posShift:d.getCamera().position.distanceTo(deathStart.pos),rotationShift:d.getCamera().quaternion.angleTo(deathStart.q),rag:!!d.getRagdolls().local};});report.initial=initial;
  check('阵亡保留瞬间相机位置与朝向，默认自己的布娃娃而非队友',initial.rag&&initial.view.mode==='orbit'&&initial.view.targetId===null&&initial.posShift<1e-6&&initial.rotationShift<1e-6);
  const held=await page.evaluate(()=>{mouseDeath('mousedown');let before=FishGame.__debug.getDeathView();mouseDeath('mouseup');let after=FishGame.__debug.getDeathView();return {before,after};});
  check('致死前按住的开火不触发观战，松开也不会自动切换',held.before.needsRelease&&held.before.mode==='orbit'&&!held.after.needsRelease&&held.after.mode==='orbit');
  const orbit=await page.evaluate(()=>{stepDeath(.7);const d=FishGame.__debug,v=d.getDeathView(),body=d.getRagdolls().local.bodies[0].position;d.renderFrame();return {distance:d.getCamera().position.distanceTo(v.center),centerGap:Math.hypot(v.center.x-body.x,v.center.y-body.y-.12,v.center.z-body.z),view:v};});report.orbit=orbit;
  check('平滑拉远后以移动中的布娃娃为中心，开放处半径 3.2 米',Math.abs(orbit.distance-3.2)<.01&&orbit.centerGap<.22);
  await page.addStyleTag({content:'#dialog-box,#notice-pop{visibility:hidden!important}'});await page.screenshot({path:path.join(OUT,'01-own-corpse.png')});
  const turn=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');let start=d.getCamera().position.clone(),p=d.getPlayer().pos.clone(),yaw=d.getPlayer().yaw,old=d.getDeathView().yaw;mouseDeath('mousemove',0,500,300);mouseDeath('mousemove',0,720,360);let v=d.getDeathView();d.setState('paused');return {turned:v.yaw!==old,moved:d.getCamera().position.distanceTo(start),radius:d.getCamera().position.distanceTo(v.center),playerStill:p.equals(d.getPlayer().pos)&&yaw===d.getPlayer().yaw};});
  check('鼠标只环绕尸体，不移动玩家或改变存活时瞄准角',turn.turned&&turn.moved>.5&&Math.abs(turn.radius-3.2)<.01&&turn.playerStill);
  const paused=await page.evaluate(()=>{let d=FishGame.__debug,p=d.getCamera().position.clone(),v=d.getDeathView();d.update(1);mouseDeath('mousemove',0,900,500);return {same:p.equals(d.getCamera().position),age:d.getDeathView().age===v.age,yaw:d.getDeathView().yaw===v.yaw};});
  check('暂停冻结死亡镜头和鼠标环绕',paused.same&&paused.age&&paused.yaw);
  const spectate=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');let mag=d.getAmmo().mag;mouseDeath('mousedown');mouseDeath('mouseup');let v=d.getDeathView();window.watched=d.getEnemies().find(e=>e.pvpId===v.targetId);window.watchedDraws=0;window.watchedVisibleDraws=0;watched.character.meshes.forEach(m=>m.onBeforeRender=(r,s,c,g,material)=>{watchedDraws++;if(material.colorWrite||material.depthWrite)watchedVisibleDraws++;});d.renderFrame();const hidden=watchedVisibleDraws===0,shadowOnly=watchedDraws>0;d.renderFrame(d.getCamera().clone());const observerDraws=watchedVisibleDraws;d.setState('paused');return {view:v,team:watched.team,alive:watched.alive,hidden,shadowOnly,observerDraws,restored:watched.mesh.visible&&watched.character.meshes.every(m=>m.material.name!=='Anime/BodyShadowOnly'),magSame:d.getAmmo().mag===mag,label:document.getElementById('death-view-label').textContent};});report.spectate=spectate;
  check('明确左键点击后才观战存活红队队友，点击不消耗子弹',spectate.view.mode==='spectate'&&spectate.team==='red'&&spectate.alive&&spectate.magSame&&spectate.label.includes('观战'));
  check('队友第一人称保留投影但不显示身体，其他镜头恢复完整材质',spectate.hidden&&spectate.shadowOnly&&spectate.observerDraws>0&&spectate.restored);
  await page.screenshot({path:path.join(OUT,'02-teammate-view.png')});
  const cycle=await page.evaluate(()=>{let d=FishGame.__debug,old=d.getDeathView().targetId;d.setState('playing');mouseDeath('mousedown');mouseDeath('mouseup');let next=d.getDeathView().targetId;window.watched=d.getEnemies().find(e=>e.pvpId===next);d.setState('paused');return old!==next;});
  check('再次左键可以切到下一位存活队友',cycle);
  const lost=await page.evaluate(()=>{let d=FishGame.__debug;d.setState('playing');d.pvpDamageBot(d.getEnemies().indexOf(watched),999);let pos=d.getCamera().position.clone();stepDeath(.15);return {view:d.getDeathView(),still:d.getCamera().position.distanceTo(pos)<.00001};});
  check('被观战队友死亡时不擅自切到另一人，等待下一次点击',lost.view.mode==='waiting'&&lost.still);
  const own=await page.evaluate(()=>{let d=FishGame.__debug;d.setState('playing');mouseDeath('mousedown',2);d.setState('paused');return d.getDeathView();});
  check('右键立即回到自己的布娃娃环绕视角',own.mode==='orbit'&&own.targetId===null);
  await page.evaluate(()=>stepDeath(3.3));
  const respawn=await page.evaluate(()=>{let d=FishGame.__debug;d.renderFrame();return {hp:d.getPlayer().hp,view:d.getDeathView(),corpse:!!d.getRagdolls().local,hidden:document.getElementById('pvp-death-view').classList.contains('hidden'),camera:d.getCamera().position.distanceTo(d.getPlayer().pos)};});
  check('4 秒复活清理镜头/尸体/提示并恢复自己的第一人称',respawn.hp===100&&respawn.view===null&&!respawn.corpse&&respawn.hidden&&respawn.camera>1.4&&respawn.camera<1.9);
  const collision=await page.evaluate(()=>{
   let d=FishGame.__debug;const crate=d.getMap().crates.find(c=>c.min.y===0&&c.z>40);dieAt(crate.min.x-1,crate.z);stepDeath(.8);d.setState('playing');mouseDeath('mousemove',0,500,300);
   // Sweep the boom through every heading beside an actual low crate.
   let minimum=Infinity,inside=0;
   for(let i=0;i<90;i++){mouseDeath('mousemove',0,500+(i+1)*36,300);let v=d.getDeathView(),p=d.getCamera().position;minimum=Math.min(minimum,p.distanceTo(v.center));if(p.y<.1||d.getObstacles().some(o=>p.x>o.min.x&&p.x<o.max.x&&p.y>o.min.y&&p.y<o.max.y&&p.z>o.min.z&&p.z<o.max.z))inside++;}
   d.renderFrame();d.setState('paused');return {minimum,inside};
  });report.collision=collision;
  check('尸体旁有箱体时环绕镜头缩短半径，不能穿墙或穿地',collision.minimum<2&&collision.inside===0);
  await page.screenshot({path:path.join(OUT,'03-collision-boom.png')});
  const nobody=await page.evaluate(()=>{let d=FishGame.__debug;d.getEnemies().filter(e=>e.team==='red').forEach(e=>{e.alive=false;e.mesh.visible=false;e.respawnTimer=999;});d.setState('playing');mouseDeath('mousedown');mouseDeath('mouseup');d.update(.01);d.setState('paused');return {view:d.getDeathView(),hint:document.getElementById('death-view-hint').textContent};});
  check('没有存活队友时保持自身镜头，不观战敌方',nobody.view.mode==='orbit'&&nobody.view.targetId===null&&nobody.hint.includes('暂无存活队友'));
  const cleanup=await page.evaluate(()=>{let d=FishGame.__debug;d.restart(true);return {view:d.getDeathView(),hidden:document.getElementById('pvp-death-view').classList.contains('hidden')};});
  check('阵亡时退出也清空观战目标和提示',cleanup.view===null&&cleanup.hidden);

  // Historical touch coverage is opt-in; desktop-only delivery is the default.
  if(process.env.FISH_TEST_TOUCH==='1'){
  // Real touch events: a swipe rotates; explicit buttons are still clickable.
  await page.close();const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});mobile.on('pageerror',e=>report.errors.push(e.message));
  await mobile.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeDeathCamera)f(t);});});
  await mobile.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await mobile.click('#btn-start');await mobile.selectOption('#lobby-deploy-team','red');await mobile.click('#btn-pvp-mode');
  await mobile.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await mobile.evaluate(()=>{window.freezeDeathCamera=true;const d=FishGame.__debug;d.enterFallback();d.getPvpTactics().step=()=>{};d.setState('playing');for(let i=0;i<41;i++)d.update(.1);d.pvpHurtPlayer(999);for(let i=0;i<6;i++)d.update(.1);});
  const swipe=await mobile.evaluate(()=>{let d=FishGame.__debug,canvas=document.getElementById('game-canvas'),before=d.getDeathView().yaw;function touch(type,x){let t=new Touch({identifier:91,target:canvas,clientX:x,clientY:300});canvas.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,changedTouches:[t],touches:type==='touchend'?[]:[t],targetTouches:type==='touchend'?[]:[t]}));}touch('touchstart',250);touch('touchmove',320);touch('touchend',320);return d.getDeathView().yaw!==before;});
  check('触屏滑动能够环绕自己的尸体',swipe);
  report.touch=await mobile.evaluate(()=>{const b=document.getElementById('btn-spectate-next'),r=b.getBoundingClientRect();return {lock:document.pointerLockElement&&document.pointerLockElement.id,coarse:matchMedia('(pointer:coarse)').matches,events:getComputedStyle(b).pointerEvents,point:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).id};});console.log('Touch input: '+JSON.stringify(report.touch));
  await mobile.locator('#btn-spectate-next').tap();check('触屏观战按钮有效，触摸拦截不会吞掉点击',await mobile.evaluate(()=>FishGame.__debug.getDeathView().mode==='spectate'));
  await mobile.locator('#btn-spectate-self').tap();check('触屏返回自身按钮有效',await mobile.evaluate(()=>FishGame.__debug.getDeathView().mode==='orbit'));
  await mobile.locator('#btn-spectate-pause').tap();check('阵亡触屏界面保留可用的暂停入口',await mobile.evaluate(()=>FishGame.__debug.getState()==='paused'));
  await mobile.locator('#btn-resume').tap();
  await mobile.addStyleTag({content:'#dialog-box,#notice-pop{visibility:hidden!important}'});await mobile.evaluate(()=>{FishGame.__debug.renderFrame();FishGame.__debug.setState('paused');});await mobile.screenshot({path:path.join(OUT,'04-touch-death-view.png')});
  }
  check('死亡镜头流程没有脚本或着色器错误',report.errors.length===0);
  console.log(report.checks.length+' death-camera browser checks passed');
 }finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
