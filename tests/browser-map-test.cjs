/* Real WebGL: mode isolation, overhead collisions, direct deployment, map views.
 * Run server.js first. PLAYWRIGHT_MODULE may point at an existing installation.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'fps-map-results');fs.mkdirSync(OUT,{recursive:true});
const URL=process.env.FISH_TEST_URL||'http://127.0.0.1:8123/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 function check(name,value){assert(value,name);console.log('PASS | '+name);report.checks.push(name);}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(URL);await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  // Test warehouse persistence through the actual click path.
  await page.evaluate(()=>{localStorage.setItem('bff_loadout_v1',JSON.stringify({secondary:'fishpistol',skin:'melee'}));});await page.reload();
  await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  await page.click('#btn-start');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  const quick=await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.getPvpTactics().step=()=>{};d.setState('playing');for(let i=0;i<100;i++)d.update(.05);d.setState('paused');return {pvp:d.getPvp(),map:d.getSceneStats(),covers:d.getRandomCovers()};});
  check('一次点击直接开始 FPS，无准备页并继承仓库装备',!await page.locator('#pvp-overlay').count()&&quick.pvp.mySkin==='melee'&&quick.pvp.myWeapon==='fishpistol');
  check('FPS 专属地图加载，且没有无尽随机掩体',quick.map.worldMode==='pvp'&&quick.map.arena===76&&quick.covers.length===0);
  report.initial=quick;
  // Test actual game movement, including the crouch interpolation and camera.
  async function jumpAt(x,z,roof,moving){return page.evaluate(({x,z,roof,moving})=>{
    const d=FishGame.__debug,p=d.getPlayer();d.releaseKeys();d.setCrouch(0);p.pos.set(x,0,z);p.velY=9.2;p.onGround=false;p.hp=100;p.yaw=0;
    if(moving)d.pressKey('KeyW',true);d.setState('playing');let max=0,delta=0,maxHead=0;
    for(let i=0;i<100;i++){const before=p.pos.clone();d.updatePlayer(1/60);max=Math.max(max,p.pos.y);delta=Math.max(delta,Math.hypot(p.pos.x-before.x,p.pos.z-before.z));maxHead=Math.max(maxHead,d.getCamera().position.y);}
    d.releaseKeys();d.setState('paused');return {max,delta,maxHead,y:p.pos.y,x:p.pos.x,z:p.pos.z,ground:p.onGround,roof};
  },{x,z,roof,moving});}
  const jump=await jumpAt(50,30,3.4,false),move=await jumpAt(50,35,3.4,true);
  check('新地图通道顶棚挡住原地跳跃并原位落地',jump.max<=1.54001&&jump.x===50&&jump.z===30&&jump.ground&&jump.y===0);
  check('顶头时向前走每帧不超过正常速度，镜头不会穿顶',move.delta<=.10001&&move.maxHead<3.4&&move.ground);
  report.fpsCollision={jump,move};
  // A deliberately low ceiling verifies standing up in the shared game controller.
  const crouch=await page.evaluate(()=>{const d=FishGame.__debug,p=d.getPlayer(),obs=d.getObstacles(),ceiling={min:new THREE.Vector3(-2,1.35,63),max:new THREE.Vector3(2,1.6,66)};obs.push(ceiling);p.pos.set(0,0,64);p.velY=0;p.onGround=true;d.setCrouch(1);d.setState('playing');for(let i=0;i<80;i++)d.updatePlayer(1/60);const under=d.getCrouch().eye;obs.pop();for(let i=0;i<80;i++)d.updatePlayer(1/60);const outside=d.getCrouch().eye;d.setState('paused');return {under,outside};});
  check('松开蹲键不会穿进低顶棚，离开后恢复站姿',crouch.under+.16<=1.351&&crouch.outside===1.7);
  // Freeze actors to inspect architecture; the camera alone is moved for photos.
  await page.addStyleTag({content:'body>*:not(#game-canvas){visibility:hidden!important}#game-canvas{visibility:visible!important}'});
  for(const shot of [
    ['01-depot',[0,2.1,69],[0,3.6,48]],
    ['02-long-a',[-58,1.85,38],[-52,2,-14]],
    ['03-mid',[0,1.85,24],[0,2,-12]],
    ['04-tunnel-b',[50,1.85,37],[48,2,8]],
    ['05-court-b',[43,1.85,12],[54,2,-5]],
    ['06-overview',[112,128,138],[0,0,0]]
  ]){
    await page.evaluate(({pos,target})=>{const d=FishGame.__debug,c=d.getCamera();d.setState('paused');c.position.set(...pos);c.lookAt(...target);}, {pos:shot[1],target:shot[2]});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.screenshot({path:path.join(OUT,shot[0]+'.png')});
  }
  const unload=await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);return d.getSceneStats();});
  check('退出后新地图环境与碰撞体全部卸载',!unload.envBuilt&&unload.obstacles===0&&unload.wallMeshes===0);
  await page.evaluate(()=>{const d=FishGame.__debug;d.enterGameWorld();d.clearCovers();d.enterFallback();d.setState('paused');});
  const old=await page.evaluate(()=>({stats:FishGame.__debug.getSceneStats(),solids:FishGame.__debug.getObstacles().map(o=>[o.min.x,o.min.y,o.min.z,o.max.x,o.max.y,o.max.z])}));
  check('切回无尽恢复 90 米原场景',old.stats.worldMode==='endless'&&old.stats.arena===45);
  const oldJump=await jumpAt(17,-11,3.4,true);
  check('无尽原 B 洞顶棚也不再横向闪现',oldJump.delta<=.10001&&oldJump.max<=1.54001&&oldJump.ground);
  report.endlessCollision=oldJump;
  await page.close();
  // Compare against the backed-up original renderer in a fresh isolated browser
  // page. Fixed world colliders must be byte-for-byte equal after removing covers.
  const baseline=await browser.newPage();baseline.on('pageerror',e=>report.errors.push(e.message));
  await baseline.route('**/js/game.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../backups/codex-fps-map-2026-10-24/js/game.js'),'utf8')}));
  await baseline.goto(URL);await baseline.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  const before=await baseline.evaluate(()=>{const d=FishGame.__debug;d.enterGameWorld();d.clearCovers();d.setState('paused');return d.getObstacles().map(o=>[o.min.x,o.min.y,o.min.z,o.max.x,o.max.y,o.max.z]);});
  check('无尽固定碰撞布局与修改前逐项一致',JSON.stringify(before)===JSON.stringify(old.solids));
  report.oldWorld={beforeColliders:before.length,afterColliders:old.solids.length};
  check('地图、物理与菜单没有脚本异常',report.errors.length===0);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('Map browser: '+report.checks.length+' checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
