'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),OUT=path.join(__dirname,'view-jump-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
const check=(name,value)=>{assert(value,name);report.checks.push(name);console.log('PASS | '+name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))report.errors.push(m.text());});
 await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeViewJump)f(t);});});
 await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-mode-endless');await page.click('#btn-map-desert');await page.waitForFunction(()=>document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
 await page.evaluate(()=>{
  window.freezeViewJump=true;const d=FishGame.__debug;d.enterFallback();d.killAllEnemies();d.clearCovers();d.removeBoss();d.getWave().state='test';d.setHp(100);d.getPlayer().pos.set(0,0,34);d.getPlayer().yaw=0;d.getPlayer().pitch=-1.15;d.setState('playing');d.updatePlayer(0);d.syncCharacters(.2);d.setState('paused');
  window.stepV=(seconds,dt=.01)=>{d.setState('playing');for(let t=0;t<seconds-1e-7;t+=dt)d.update(Math.min(dt,seconds-t));d.setState('paused');};
  window.observeDraws=()=>{let rigs=d.getCharacters();window.draws={world:[],arms:[]};rigs.local.meshes.forEach(m=>m.onBeforeRender=()=>draws.world.push(m.name));rigs.view.meshes.forEach(m=>m.onBeforeRender=()=>draws.arms.push(m.name));};
  observeDraws();d.renderFrame();
 });
 let own=await page.evaluate(()=>({draws,visible:FishGame.__debug.getCharacters().local.root.visible,complete:FishGame.__debug.getCharacters().local.meshes.every(m=>m.visible),weapon:FishGame.__debug.getCharacters().local.weapon.visible}));report.owner=own;
 check('无尽低头视角只绘制第一人称双臂，不绘制自己的世界身体',own.draws.world.length===0&&own.draws.arms.length>0&&own.draws.arms.every(n=>n==='Mesh_Arms'));
 check('完整身体和武器只在该相机绘制期间隐藏，绘制后立即恢复',own.visible&&own.complete&&own.weapon);
 await page.addStyleTag({content:'#fallback-hint,#notice-pop,#dialog-overlay{visibility:hidden!important}'});await page.screenshot({path:path.join(OUT,'01-first-person-down.png')});
 const hit=await page.evaluate(()=>{const d=FishGame.__debug,r=d.getCharacters().local;r.updateCapsules();const h=r.capsules[0],p=h.a.clone().lerp(h.b,.5),origin=p.clone().add(new THREE.Vector3(0,0,4));return d.playerRay(origin,new THREE.Vector3(0,0,-1),6);});
 check('本地相机隐藏身体后，头部胶囊仍可命中且为 1.75 倍',hit&&hit.part==='head'&&hit.multiplier===1.75);
 const observer=await page.evaluate(()=>{const d=FishGame.__debug;d.getPlayer().pitch=0;stepV(.2);draws.world=[];draws.arms=[];window.worldCamera=new THREE.PerspectiveCamera(60,1440/900,.1,300);worldCamera.position.set(0,1.5,30);worldCamera.lookAt(0,1,34);d.renderFrame(worldCamera);return {world:draws.world,arms:draws.arms};});report.observer=observer;
 check('独立旁观相机能绘制玩家完整头部、身体和双臂',new Set(observer.world).size===3&&observer.arms.length===0);
 await page.screenshot({path:path.join(OUT,'02-world-observer.png')});
 const knife=await page.evaluate(()=>{let d=FishGame.__debug;d.setState('playing');d.switchWeapon('knife');stepV(.6);d.getPlayer().pitch=-1.15;d.pressKey('KeyC',true);stepV(.4);observeDraws();d.renderFrame();d.releaseKeys();return {world:draws.world,arms:draws.arms};});
 check('切刀与蹲下后仍不显示自己的躯干和裙摆',knife.world.length===0&&knife.arms.length>0);
 await page.evaluate(()=>FishCharacters.load());await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({team:'red',teamSize:8});d.enterFallback();d.getPvpTactics().step=()=>{};stepV(4.7);d.getPlayer().pitch=-1.15;d.setState('playing');d.updatePlayer(0);d.setState('paused');observeDraws();d.renderFrame();});
 const pvpView=await page.evaluate(()=>({world:draws.world,arms:draws.arms,links:FishGame.__debug.getPvpTactics().nav.stats.jumpLinks}));report.pvp=pvpView;
 check('FPS 同样只显示自己的双臂，地图生成跳越连接',pvpView.world.length===0&&pvpView.arms.length>0&&pvpView.links>50);
 await page.screenshot({path:path.join(OUT,'04-fps-first-person-down.png')});
 const ready=await page.evaluate(()=>{
  const d=FishGame.__debug,t=d.getPvpTactics();window.jumper=d.getEnemies().find(e=>e.team==='blue');
  d.getEnemies().forEach(e=>{if(e!==jumper){e.alive=false;e.mesh.visible=false;e.respawnTimer=99999;}});d.getPlayer().pos.set(40,0,67);d.getPlayer().pitch=0;d.updatePlayer(0);
  jumper.mesh.position.set(-24,1.4,-48);jumper.protection=0;jumper.brain.path=[];jumper.brain.goal=null;jumper.brain.repath=0;jumper.brain.memory={position:{x:-18,y:1,z:-48},time:t.clock,kind:'visual'};jumper.brain.visibleId=null;jumper.brain.yaw=Math.PI/2;
  t.step=FishTactics.Tactics.prototype.step;d.setState('playing');d.syncCharacters(.1);d.setState('paused');window.headBefore=jumper.character.capsules[0].a.y;
  for(let i=0;i<150;i++){stepV(.01);if(jumper.brain.jump&&jumper.mesh.position.y>2.05)break;}
  return {y:jumper.mesh.position.y,clip:jumper.character.clip,head:jumper.character.capsules[0].a.y,headBefore,state:jumper.aiState,velocity:jumper.brain.motion.velY,stats:t.stats};
 });report.jump=ready;
 check('AI 在实际地图由行为树起跳，世界高度不再被动画更新重置',ready.y>2.05&&ready.state==='jump'&&ready.stats.obstacleJumps>0);
 check('起跳动作和受击胶囊随真实离地高度移动',/Jump/.test(ready.clip)&&ready.head>ready.headBefore+.5);
 check('空中不能绕过行为树直接开火',await page.evaluate(()=>FishGame.__debug.botFire({source:jumper},{x:0,y:1,z:0},{damage:36},0)===false));
 await page.evaluate(()=>{worldCamera.position.set(-27,3.5,-53);worldCamera.lookAt(jumper.mesh.position.x,1.9,-48);FishGame.__debug.renderFrame(worldCamera);});await page.screenshot({path:path.join(OUT,'03-ai-jump.png')});
 const pause=await page.evaluate(()=>{let d=FishGame.__debug,a=jumper.brain.jump.age,p=jumper.mesh.position.clone();d.update(1);return {age:jumper.brain.jump.age-a,dist:jumper.mesh.position.distanceTo(p)};});
 check('暂停冻结 AI 跳跃位置和物理计时',pause.age===0&&pause.dist===0);
 const killed=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');let vy=jumper.brain.motion.velY,beforeHead=jumper.character.bones.Head.getWorldPosition(new THREE.Vector3()).y;d.pvpDamageBot(d.getEnemies().indexOf(jumper),999);let r=jumper.ragdoll;d.setState('paused');return {alive:jumper.alive,rag:!!r,vy,beforeHead,jump:!!jumper.brain.jump,bodyVy:r.bodies[0].velocity.y,head:jumper.character.bones.Head.getWorldPosition(new THREE.Vector3()).y};});report.airDeath=killed;
 check('空中阵亡由布娃娃接管并保留跳跃速度',!killed.alive&&killed.rag&&!killed.jump&&killed.vy>1&&killed.bodyVy>1&&Math.abs(killed.head-killed.beforeHead)<.00001);
 await page.evaluate(()=>{FishGame.__debug.getPvpTactics().step=()=>{};stepV(4.1);});
 const respawn=await page.evaluate(()=>({alive:jumper.alive,jump:!!jumper.brain.jump,grounded:jumper.brain.motion.onGround,y:jumper.mesh.position.y,rag:!!jumper.ragdoll}));
 check('复活清除跳跃和尸体状态，回基地地面',respawn.alive&&!respawn.jump&&respawn.grounded&&Math.abs(respawn.y-1.4)<.001&&!respawn.rag);
 const post=await page.evaluate(()=>{let d=FishGame.__debug;d.setState('playing');d.pvpHurtPlayer(999);let body=d.getRagdolls().local,complete=body.rig.meshes.every(m=>m.visible);stepV(4.1);observeDraws();d.renderFrame();return {complete,world:draws.world,arms:draws.arms,corpses:!!d.getRagdolls().local};});
 check('自己的尸体仍为完整模型，复活后恢复仅双臂的第一人称',post.complete&&!post.corpses&&post.world.length===0&&post.arms.length>0);
 const roundEnd=await page.evaluate(()=>{
  const d=FishGame.__debug,t=d.getPvpTactics(),link=Object.values(t.nav.jumpLinks).flat().find(l=>l.from.x===-24&&l.from.z===-48);
  jumper.mesh.position.set(link.from.x,1.4,link.from.z);jumper.brain.jumpCooldown=0;d.setState('playing');d.syncCharacters(.1);
  const a={id:jumper.pvpId,team:jumper.team,alive:true,position:jumper.mesh.position,baseY:1.4,eyeY:1.7,aimY:1,lowY:.4,brain:jumper.brain,source:jumper};
  const started=t.beginJump(a,link.to,'obstacle',[a]);t.step=FishTactics.Tactics.prototype.step;stepV(.15);const airborne=jumper.mesh.position.y>1.5;t.step=()=>{};
  d.pvpSetTickets(1,20);d.setState('playing');d.pvpHurtPlayer(999);stepV(2.5);
  return {started,airborne,phase:d.getPvp().roundState,landed:!jumper.brain.jump&&jumper.brain.motion.onGround,y:jumper.mesh.position.y};
 });report.roundEnd=roundEnd;
 check('回合结算期间继续完成跳跃落地，不把角色悬在半空',roundEnd.started&&roundEnd.airborne&&roundEnd.phase==='over'&&roundEnd.landed&&Math.abs(roundEnd.y-1.4)<.001);
 await page.evaluate(()=>FishGame.__debug.restart(true));check('退出场景回收角色和物理实例',await page.evaluate(()=>FishCharacters.stats().instances===0&&FishGame.__debug.getRagdolls().stats===null));
 check('实际渲染与跳跃没有脚本或着色器错误',report.errors.length===0);
 console.log(report.checks.length+' view/jump browser checks passed');
}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
