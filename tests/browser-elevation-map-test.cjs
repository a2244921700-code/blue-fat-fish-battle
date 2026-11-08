'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'elevation-map-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 function check(name,data){report.checks.push({name,data});assert(data.ok,name+' '+JSON.stringify(data));console.log('PASS | '+name);}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>{report.errors.push(e.message);console.error('PAGE',e.message);});
  await page.addInitScript(()=>{window.nativeRaf=requestAnimationFrame;window.requestAnimationFrame=f=>nativeRaf(t=>{if(!window.freezeMap)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{window.freezeMap=true;window.d=FishGame.__debug;d.enterFallback();d.setState('playing');window.step=t=>{d.setState('playing');for(let i=0;i<t/.025;i++)d.update(.025);d.setState('paused');};step(3.5);d.setState('paused');});
  check('实际入口载入分层地图与两阵营角色',await page.evaluate(()=>({ok:d.getMap().version===2&&d.getPvpTactics().nav.layered&&d.getEnemies().length===15,stats:d.getSceneStats(),nav:d.getPvpTactics().nav.stats})));
  check('区域与部署区标牌默认隐藏，随开发者模式即时开关',await page.evaluate(()=>{
   const signs=[];d.getCamera().parent.traverse(o=>{if(o.userData.debugMapSign)signs.push(o);});
   const hidden=signs.length===7&&signs.every(o=>!o.visible);d.enterDebug();const shown=signs.every(o=>o.visible);d.exitDebug();
   return {ok:hidden&&shown&&signs.every(o=>!o.visible),count:signs.length,hidden,shown};
  }));
  check('玩家连续走上 CT 至 A 坡道，不需要按跳跃',await page.evaluate(()=>{
   const p=d.getPlayer();d.releaseKeys();p.pos.set(35,0,-69);p.yaw=Math.PI;p.velY=0;p.onGround=true;d.setCrouch(0);d.pressKey('KeyW',true);d.setState('playing');let maxStep=0,old=p.pos.y;
   for(let i=0;i<260;i++){d.updatePlayer(1/60);maxStep=Math.max(maxStep,Math.abs(p.pos.y-old));old=p.pos.y;}d.releaseKeys();d.setState('paused');return {ok:p.pos.y>=5.39&&maxStep<=.261,position:p.pos.toArray(),maxStep};
  }));
  check('高台掉枪落在真实台面，拾取后保留弹匣与备弹',await page.evaluate(()=>{
   const t=d.getPvpTactics(),run=t.step;t.step=()=>{};const p=d.getPlayer();p.pos.set(46,5.4,-41);p.velY=0;p.onGround=true;p.yaw=0;p.pitch=0;d.setState('playing');d.updatePlayer(0);d.syncCharacters(.1);d.setAmmo(9,17);const dropped=d.dropWeapon();step(6);
   const r=d.getDroppedWeapons()[0];if(!r){t.step=run;return {ok:false,reason:'no gun'};}const box=new THREE.Box3().setFromObject(r.object),center=box.getCenter(new THREE.Vector3()),settled=r.settled,ground=box.min.y;
   p.pos.set(center.x,5.4,center.z+1.3);d.setState('playing');d.updatePlayer(0);const delta=center.clone().sub(d.getCamera().position);p.yaw=Math.atan2(-delta.x,-delta.z);p.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));d.updatePlayer(0);const picked=d.pickupWeapon();step(.8);const ammo={...d.getAmmo()};t.step=run;
   return {ok:!!dropped&&settled&&ground>=5.36&&ground<5.55&&picked&&ammo.mag===9&&ammo.reserve===17,settled,ground,picked,mag:ammo.mag,reserve:ammo.reserve};
  }));
  check('高台阵亡的布娃娃停在台面，未跌穿到零高度',await page.evaluate(()=>{
   const t=d.getPvpTactics(),run=t.step;t.step=()=>{};const e=d.getEnemies().find(e=>e.team==='red');e.mesh.position.set(46,5.4+e.baseY,-41);e.protection=0;d.syncCharacters(.1);d.setState('playing');d.pvpDamageBot(d.getEnemies().indexOf(e),999);step(2.7);const ys=e.ragdoll.bodies.map(b=>b.position.y);t.step=run;return {ok:Math.min(...ys)>5.32&&Math.max(...ys)<6.6,min:Math.min(...ys),max:Math.max(...ys)};
  }));
  check('B 下洞顶头不横移、不穿进上层',await page.evaluate(()=>{
   const p=d.getPlayer();p.pos.set(-25,0,5);p.velY=9.2;p.onGround=false;let top=0,shift=0;d.setState('playing');for(let i=0;i<100;i++){let before=p.pos.clone();d.updatePlayer(1/60);top=Math.max(top,p.pos.y+1.86);shift=Math.max(shift,Math.hypot(p.pos.x-before.x,p.pos.z-before.z));}d.setState('paused');return {ok:top<=3.651&&shift<.001&&p.pos.y===0,top,shift,position:p.pos.toArray()};
  }));
  check('玩家可经过小道桥下，头部与桥面分离',await page.evaluate(()=>{
   const p=d.getPlayer();p.pos.set(21,0,-20);p.yaw=Math.PI;p.velY=0;p.onGround=true;d.pressKey('KeyW',true);d.setState('playing');let max=0;for(let i=0;i<90;i++){d.updatePlayer(1/60);max=Math.max(max,p.pos.y);}d.releaseKeys();d.setState('paused');return {ok:max===0&&p.pos.z>-13,position:p.pos.toArray(),max};
  }));
  // Sustained real match, with rendering frozen but all game systems updating.
  report.battle=await page.evaluate(()=>{
   d.startPvp({team:'blue',teamSize:16});d.enterFallback();d.setState('playing');const seen=new Set(),heights=new Set();let invalid=0,maxY=0,maxDrops=0;
   for(let frame=0;frame<2700;frame++){
    const p=d.getPlayer();p.hp=10000;d.update(1/30);
    if(frame%15===0)for(const e of d.getEnemies())if(e.alive){const y=e.mesh.position.y-e.baseY;seen.add(e.brain.state);if(e.brain.motion.onGround)heights.add(Math.round(y*10)/10);maxY=Math.max(maxY,y);if(!Number.isFinite(y)||y<-.01||Math.abs(e.mesh.position.x)>75.1||Math.abs(e.mesh.position.z)>75.1)invalid++;}
    maxDrops=Math.max(maxDrops,d.getDroppedWeapons().length);
   }
   d.setState('paused');return {states:[...seen],heights:[...heights].sort((a,b)=>a-b),invalid,maxY,maxDrops,pvp:{kills:d.getPvp().myKills,round:d.getPvp().roundNum},ai:d.getPvpTactics().stats,nav:d.getPvpTactics().nav.stats};
  });
  check('32 人实战上下高地且没有无效坐标或越界',{ok:report.battle.invalid===0&&report.battle.heights.some(y=>y>=5.3)&&report.battle.heights.some(y=>y>=3.1&&y<3.4),...report.battle});
  check('新地形上发生实际交战、掉枪、投雷',{ok:report.battle.ai.shots>20&&report.battle.maxDrops>0&&report.battle.ai.grenades>0,shots:report.battle.ai.shots,drops:report.battle.maxDrops,grenades:report.battle.ai.grenades});
  // Render-only RAF: screenshot captures a live backbuffer without moving actors.
  await page.evaluate(()=>{
   d.getGun().group.visible=false;d.getCharacters().view.root.visible=false;d.getEnemies().forEach(e=>{e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});d.clearProjectiles();d.getDroppedWeapons().forEach(r=>r.object.visible=false);
   // Architecture captures exclude transient helmets/corpses frozen mid-fall.
   d.getEquipment().loose.forEach(r=>r.object.visible=false);d.getRagdolls().records.forEach(r=>r.rig.root.visible=false);
   document.querySelectorAll('body>*:not(#game-canvas)').forEach(e=>e.style.visibility='hidden');window.renderMap=true;function draw(){if(window.renderMap){d.renderFrame();nativeRaf(draw);}}draw();
  });
  for(const [name,pos,target] of [
   ['01-a-long',[60,3.5,21],[59,6,-32]],['02-a-high',[46,7.1,-38],[19,3,-6]],['03-mid-structure-fixed',[-6,4.9,25],[-6,2,-16]],
   ['04-upper-tunnel',[-54,4.9,22],[-54,4.7,-25]],['05-lower-tunnel',[-19,1.7,5],[-39,2.4,5]],['06-b-court',[-52,4.5,-29],[-51,5,-46]],
   ['07-bridge-under',[20,1.7,-22],[20,2,-12]],['08-pit',[71,1.7,33],[60,4,23]],
   ['10-lower-entrance',[-10,1.7,8],[-19,2.1,5]],['11-short-foundation',[0,3,12],[7,2.1,2]],['09-overview',[113,132,135],[-3,0,-4]]
  ]){
   await page.evaluate(({pos,target,name})=>{const c=d.getCamera();c.position.set(...pos);c.lookAt(...target);if(name==='09-overview'){c.parent.fog.near=500;c.parent.fog.far=900;c.far=600;c.updateProjectionMatrix();}},{pos,target,name});await page.waitForTimeout(120);await page.screenshot({path:path.join(OUT,name+'.webp')});
  }
  report.visual=await page.evaluate(()=>d.getSceneStats());
  check('建筑细节保持合批，俯瞰绘制提交受控',{ok:report.visual.modelParts>18000&&report.visual.renderCalls<900,stats:report.visual});
  await page.evaluate(()=>{window.renderMap=false;d.restart(true);d.enterGameWorld();d.clearCovers();d.setState('paused');});
  report.endless=await page.evaluate(()=>({stats:d.getSceneStats(),solids:d.getObstacles().map(o=>[o.min.x,o.min.y,o.min.z,o.max.x,o.max.y,o.max.z])}));
  check('无尽模式仍使用原地图和原范围',{ok:report.endless.stats.worldMode==='endless'&&report.endless.stats.arena===45&&report.endless.stats.modelParts===null});
  const baseline=await browser.newPage();await baseline.route('**/js/game.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('D:/CodexWork/蓝色肥鱼开发备份/2026-11-01-立体沙漠地图/js/game.js','utf8')}));
  await baseline.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await baseline.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());await baseline.evaluate(()=>FishCharacters.load(null,['deepseek']));
  const old=await baseline.evaluate(()=>{const d=FishGame.__debug;d.enterGameWorld();d.clearCovers();d.setState('paused');return d.getObstacles().map(o=>[o.min.x,o.min.y,o.min.z,o.max.x,o.max.y,o.max.z]);});
  check('无尽固定碰撞体与本轮备份逐项相同',{ok:JSON.stringify(old)===JSON.stringify(report.endless.solids),before:old.length,after:report.endless.solids.length});
  check('场景与实战没有浏览器脚本异常',{ok:report.errors.length===0,errors:report.errors});
 }finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
