/* Real Edge/WebGL: bomber fuse, mushroom silhouette, true damage, slowing and cleanup. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'bomber-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[],shaderErrors:[]};
 function check(name,value){assert(value,name);report.checks.push(name);console.log('PASS | '+name);}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))report.shaderErrors.push(m.text());});
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeBomberTest)cb(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  await page.click('#btn-start');await page.click('#btn-mode-endless');await page.click('#btn-map-desert');await page.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>{
   window.freezeBomberTest=true;const d=FishGame.__debug;window.dispatchEvent(new Event('blur'));d.enterFallback();
   window.stepBomber=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8&&d.getState()==='playing';t+=.01)d.update(Math.min(.01,seconds-t));if(d.getState()==='playing')d.setState('paused');};
   window.prepareBomber=()=>{d.clearRadiation();d.clearProjectiles();d.clearCovers();d.releaseKeys();d.removeBoss();d.getWave().state='test';d.getEnemies().forEach(e=>{e.alive=false;e.respawnTimer=99999;e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});d.setHp(100);d.setArmor(0);d.setDifficulty('normal');d.setEnvTheme(0,false);d.setUpgradeLevel('speed',0);d.resetHurt();d.setParticles(true);const p=d.getPlayer();p.pos.set(0,0,36);p.velY=0;p.onGround=true;p.yaw=0;p.pitch=.24;d.setState('playing');d.updatePlayer(0);d.setState('paused');};
   window.boom=(x=0,z=17)=>{d.setState('playing');const e=d.spawnEnemy('bomber',x,z);d.explodeBomber(e);d.setState('paused');return e;};
   prepareBomber();
  });
  await page.addStyleTag({content:'#fallback-hint,#notice-pop,#bomber-warn,#achievement-pop{visibility:hidden!important}'});
  const natural=await page.evaluate(()=>{const d=FishGame.__debug,p=d.getPlayer();p.pos.set(0,0,18.6);const e=d.spawnEnemy('bomber',0,17);stepBomber(.02);const armed=e.fuseTimer; p.pos.set(0,0,36);stepBomber(3.05);return {armed,alive:e.alive,zones:d.getRadiation().zones.length};});
  check('真实自爆鱼点燃 3 秒引信后才产生污染区',natural.armed>2.9&&!natural.alive&&natural.zones===1);
  await page.evaluate(()=>{prepareBomber();boom();stepBomber(.55);FishGame.__debug.renderFrame();});await page.screenshot({path:path.join(OUT,'01-fireball.png')});
  await page.evaluate(()=>{stepBomber(3.95);FishGame.__debug.renderFrame();});await page.screenshot({path:path.join(OUT,'02-mushroom.png')});
  const formed=await page.evaluate(()=>FishGame.__debug.getBomberFxStats());report.formed=formed;
  check('蘑菇云独立合批，4.5 秒时仍完整存在',formed.world.clouds===1&&formed.world.partsPerCloud>=70&&formed.world.ages[0]>4.49);
  await page.evaluate(()=>{stepBomber(5);FishGame.__debug.renderFrame();});await page.screenshot({path:path.join(OUT,'03-dissipation.png')});
  check('9.5 秒时仍有消散烟云',await page.evaluate(()=>FishGame.__debug.getBomberFxStats().world.clouds===1));
  const expiry=await page.evaluate(()=>{stepBomber(3);const cloudGone=FishGame.__debug.getBomberFxStats(),field=FishGame.__debug.getRadiation();stepBomber(2.6);return {cloudGone,field,ended:FishGame.__debug.getRadiation(),fx:FishGame.__debug.getBomberFxStats()};});
  check('云在 12 秒消散，污染边界持续至 15 秒且随后清理',expiry.cloudGone.world.clouds===0&&expiry.cloudGone.world.fields===1&&expiry.field.zones.length===1&&expiry.ended.zones.length===0&&expiry.fx.world.fields===0);
  const truth=await page.evaluate(()=>{
   const d=FishGame.__debug;prepareBomber();boom();const p=d.getPlayer();p.pos.set(0,0,24);d.setDifficulty('hard');d.setEnvTheme(3,false);stepBomber(.9);d.setArmor(0);d.setState('playing');d.damagePlayer(1,{name:'测试',atk:'自爆'});d.setHp(100);d.setArmor(100);
   stepBomber(.1);const hp=d.getPlayer().hp,fx=d.getBomberFxStats();stepBomber(4);return {hp,after:d.getPlayer().hp,armor:d.getArmor(),fx};
  });report.trueDamage=truth;
  check('辐射绕过 100 层护甲、难度、天气及普通受击冷却，每秒固定 2 点',truth.hp===98&&truth.after===90&&truth.armor===100);
  const overlap=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();boom();boom(1,17);boom(-1,17);d.getPlayer().pos.set(0,0,24);stepBomber(3);return {hp:d.getPlayer().hp,zones:d.getRadiation().zones.length};});
  check('重叠三片污染区仍只每秒扣 2 点',overlap.hp===94&&overlap.zones===3);
  const movement=await page.evaluate(()=>{
   const d=FishGame.__debug;prepareBomber();
   function move(x,z){const p=d.getPlayer();p.pos.set(x,0,z);p.yaw=0;p.pitch=0;p.velY=0;p.onGround=true;d.pressKey('KeyW',true);d.setState('playing');d.updatePlayer(.1);const dist=z-p.pos.z;d.releaseKeys();d.setState('paused');return dist;}
   const normal=move(0,24);boom();const slowed=move(0,24),outside=move(0,28),hp=d.getPlayer().hp;stepBomber(1.2);return {normal,slowed,outside,hp,after:d.getPlayer().hp};
  });report.movement=movement;
  check('实际移动距离减半，走出 10 米后立即恢复且不再掉血',Math.abs(movement.slowed/movement.normal-.5)<1e-6&&Math.abs(movement.outside/movement.normal-1)<1e-6&&movement.hp===movement.after);
  const paused=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();boom();d.getPlayer().pos.set(0,0,24);stepBomber(.7);const before=d.getRadiation(),age=d.getBomberFxStats().world.ages[0];d.update(5);return {before,after:d.getRadiation(),age,afterAge:d.getBomberFxStats().world.ages[0],hp:d.getPlayer().hp};});
  check('暂停冻结辐射寿命、接触计时和蘑菇云演出',JSON.stringify(paused.before)===JSON.stringify(paused.after)&&paused.age===paused.afterAge&&paused.hp===100);
  const tearing=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();boom();d.getPlayer().pos.set(0,0,24);d.getPlayer().pitch=.03;stepBomber(1);d.renderFrame();return d.getBomberFxStats();});
  await page.screenshot({path:path.join(OUT,'04-radiation-tear.png')});report.tearing=tearing;
  check('受辐射伤害触发实际画面的撕裂后处理，按屏幕尺寸分配',tearing.screen.remaining>0&&tearing.screen.allocated&&tearing.screen.width===1440&&tearing.screen.height===900);
  await page.setViewportSize({width:1000,height:700});
  const resized=await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));FishGame.__debug.renderFrame();return FishGame.__debug.getBomberFxStats().screen;});
  check('视野撕裂缓冲随窗口尺寸调整 '+JSON.stringify(resized),resized.width===1000&&resized.height===700);
  await page.setViewportSize({width:1440,height:900});
  const left=await page.evaluate(()=>{const d=FishGame.__debug;d.getPlayer().pos.set(0,0,36);const hp=d.getPlayer().hp;stepBomber(.5);d.renderFrame();return {hp,after:d.getPlayer().hp,screen:d.getBomberFxStats().screen};});
  check('离开后停止伤害，短促撕裂消退后恢复直接渲染',left.hp===left.after&&left.screen.remaining===0);
  const low=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();d.setParticles(false);boom();d.getPlayer().pos.set(0,0,24);stepBomber(1);d.renderFrame();return {hp:d.getPlayer().hp,fx:d.getBomberFxStats()};});
  check('关闭装饰粒子仍保留污染范围标记、真实伤害与受击撕裂',low.hp===98&&low.fx.world.clouds===0&&low.fx.world.fields===1&&low.fx.screen.remaining>0);
  const stress=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();for(let i=0;i<20;i++)boom();stepBomber(.1);const peak=d.getBomberFxStats(),zones=d.getRadiation().zones.length;stepBomber(15.1);return {peak,zones,end:d.getBomberFxStats()};});report.stress=stress;
  check('连续 20 次自爆云团不超过 6 组，所有污染区各自到期清理',stress.peak.world.allocated<=6&&stress.peak.world.clouds===6&&stress.zones===20&&stress.end.world.clouds===0&&stress.end.world.fields===0);
  const fatal=await page.evaluate(()=>{const d=FishGame.__debug;prepareBomber();boom();d.getPlayer().pos.set(0,0,24);d.setHp(2);stepBomber(1);return {hp:d.getPlayer().hp,state:d.getState(),zones:d.getRadiation().zones.length,fx:d.getBomberFxStats()};});
  check('辐射能致死并进入正常结算，死亡后清除减速区和画面撕裂',fatal.hp===0&&fatal.state==='gameover'&&fatal.zones===0&&fatal.fx.world.clouds===0&&fatal.fx.screen.remaining===0);
  const cycles=await page.evaluate(()=>{const d=FishGame.__debug,result=[];for(let i=0;i<3;i++){d.restart(true);d.enterGameWorld();d.enterFallback();prepareBomber();boom();d.getPlayer().pos.set(0,0,24);stepBomber(1);d.renderFrame();d.restart(true);d.renderFrame();const s=d.getSceneStats();result.push({geometries:s.geometries,textures:s.textures,fx:d.getBomberFxStats()});}return result;});report.resourceCycles=cycles;
  check('重复进入、引爆、受伤、退出三次，几何和纹理数量不累积',cycles[1].geometries===cycles[2].geometries&&cycles[1].textures===cycles[2].textures&&cycles.every(c=>!c.fx.world&&!c.fx.screen));
  const switched=await page.evaluate(()=>{const d=FishGame.__debug;d.enterGameWorld();d.enterFallback();prepareBomber();boom();d.startPvp({teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};stepBomber(4);const before=d.getPlayer().hp;const fake=d.spawnEnemy('bomber',d.getPlayer().pos.x,d.getPlayer().pos.z);d.setState('playing');d.explodeBomber(fake);d.setState('paused');return {before,after:d.getPlayer().hp,zones:d.getRadiation().zones.length,fx:d.getBomberFxStats(),mode:d.getSceneStats().worldMode};});
  check('切换 FPS 清理辐射及 GPU 缓冲，FPS 不触发自爆污染',switched.mode==='pvp'&&switched.zones===0&&switched.before===switched.after&&!switched.fx.world&&!switched.fx.screen);
  const cleanup=await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);return {zones:d.getRadiation().zones.length,fx:d.getBomberFxStats()};});
  check('返回大厅后无污染、云团或视野撕裂资源残留',cleanup.zones===0&&!cleanup.fx.world&&!cleanup.fx.screen);
  check('新特效与画面撕裂无脚本或着色器错误',report.errors.length===0&&report.shaderErrors.length===0);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('Browser bomber: '+report.checks.length+' checks passed');
 }catch(e){console.error(report.errors,report.shaderErrors);throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
