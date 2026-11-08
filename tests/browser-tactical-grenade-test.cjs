'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'factions-results');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,ok,detail)=>{assert(ok,name+' '+JSON.stringify(detail));report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
   const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeTactical)f(t);});window.explosionRadii=[];
   Object.defineProperty(window,'FishCombat',{configurable:true,set(api){Object.defineProperty(window,'FishCombat',{value:api,configurable:true,writable:true});const create=api.effects;api.effects=(...args)=>{const fx=create(...args),explode=fx.explosion;fx.explosion=(...values)=>{explosionRadii.push(values[1]);return explode(...values);};return fx;};}});
  });
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.evaluate(()=>FishCharacters.load());
  await page.evaluate(()=>{
   window.freezeTactical=true;window.d=FishGame.__debug;d.startPvp({team:'blue',teamSize:6});d.enterFallback();window.tactics=d.getPvpTactics();tactics.step=()=>{};
   window.stepT=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=.01)d.update(Math.min(.01,seconds-t));d.setState('paused');};stepT(4.8);
   window.lane=null;for(let x=-60;x<=60&&!lane;x+=4)for(let z=-60;z<34&&!lane;z+=4){
    if(!Array.from({length:25},(_,i)=>tactics.nav.clear(x,z+i)).every(Boolean))continue;
    let origin={x,y:1.5,z:z+.4},target={x,y:1.4,z:z+24};
    if(!tactics.occluded(origin,target)&&FishTacticalGrenades.plan(origin,target,d.getObstacles(),[],2.4666667,{x,z}))lane={x,z};
   }if(!lane)throw new Error('No open test lane');
   window.actor=e=>({id:e.pvpId,team:e.team,alive:e.alive,position:e.mesh.position,baseY:e.baseY,eyeY:e.mesh.position.y+.25,aimY:e.mesh.position.y-.3,lowY:e.mesh.position.y-1,hp:e.hp,brain:e.brain,source:e});
   window.thrower=d.getEnemies().find(e=>e.team==='red');window.target=d.getEnemies().find(e=>e.team==='blue');
   d.getEnemies().forEach(e=>{if(e!==thrower&&e!==target){e.alive=false;e.mesh.visible=false;e.respawnTimer=99999;}});
   thrower.mesh.position.set(lane.x,1.4,lane.z);target.mesh.position.set(lane.x,1.4,lane.z+24);thrower.brain.yaw=0;thrower.brain.jump=null;thrower.brain.reload=0;thrower.protection=target.protection=0;
   d.getPlayer().pos.set(0,0,-69);d.syncCharacters(.1);tactics.random=()=>.1;
   window.tryThrow=allies=>{thrower.grenadeCheckAt=0;return tactics.grenade(actor(thrower),actor(target),[actor(thrower),actor(target)].concat(allies||[]));};
  });
  const safety=await page.evaluate(()=>{
   const obstacle={min:{x:lane.x-3,y:0,z:lane.z+8},max:{x:lane.x+3,y:12,z:lane.z+9}};d.getObstacles().push(obstacle);const wall=tryThrow();d.getObstacles().pop();
   thrower.brain.yaw=Math.PI;const behind=tryThrow();thrower.brain.yaw=0;
   const friend={id:'ally',team:'red',alive:true,position:target.mesh.position};const allied=tryThrow([friend]);stepT(.2);const ok=tryThrow();return {wall,behind,allied,ok,ammo:thrower.grenadeCount};
  });report.safety=safety;
  check('AI 不向隔墙或背后的未见敌人投雷，也避开友军密集处',!safety.wall&&!safety.behind&&!safety.allied,safety);
  check('AI 对可见中距离敌人选择可到达的弹道，每次生命限一颗',safety.ok&&safety.ammo===0,safety);
  const action=await page.evaluate(()=>{const mag=thrower.brain.magazines.rifle,from=thrower.mesh.position.clone();tactics.step=FishTactics.Tactics.prototype.step;stepT(.6);tactics.step=()=>{};const held={clip:thrower.character.clip,count:d.getGrenades().length,move:from.distanceTo(thrower.mesh.position),mag:thrower.brain.magazines.rifle};stepT(.51);const g=d.getGrenades()[0];window.aiProjectile=g;return {held,mag,count:d.getGrenades().length,owner:g?.owner===thrower,team:g?.team,voices:d.getVoiceStats().played};});
  check('AI 挥臂投雷时暂停移动和射击，手雷随动作出手一次',action.held.clip==='GrenadeThrow'&&action.held.count===0&&action.held.move<.01&&action.held.mag===action.mag&&action.count===1&&action.owner&&action.team==='red',action);
  check('AI 实际出手触发一条投雷语音',action.voices===1,action);
  const landing=await page.evaluate(()=>{stepT(.8);const done=!thrower.grenadeAction&&thrower.character.weapon.visible;let clone={pos:aiProjectile.pos.clone(),vel:aiProjectile.vel.clone(),fuse:aiProjectile.fuse,age:0};FishGrenadePhysics.step(clone,clone.fuse,d.getObstacles());const miss=clone.pos.distanceTo(target.mesh.position);d.setState('playing');d.pvpDamageBot(d.getEnemies().indexOf(thrower),999);const once=d.getGrenades().length;stepT(2.6);return {done,miss,once,hp:target.hp};});report.landing=landing;
  check('AI 收招后恢复武器；死亡不重复生成已投出的手雷',landing.done&&landing.once===1,landing);
  check('AI 弹道按实际碰撞反弹，投雷者死后爆炸仍伤害敌人',landing.miss<5&&landing.hp<100,landing);
  const respawn=await page.evaluate(()=>{stepT(1.6);return {alive:thrower.alive,ammo:thrower.grenadeCount,action:!!thrower.grenadeAction};});
  check('AI 复活重置手雷库存和投掷动作',respawn.alive&&respawn.ammo===1&&!respawn.action,respawn);
  const radius=await page.evaluate(()=>{
   d.clearProjectiles();thrower.protection=target.protection=0;target.hp=100;target.mesh.position.set(lane.x,1.4,lane.z+6);thrower.mesh.position.set(lane.x,1.4,lane.z+8);
   function boom(){const mesh=FishCombat.grenade();mesh.position.set(lane.x,1.4,lane.z);d.setState('playing');d.explodeGrenade({mesh,owner:'player',team:'red'});d.setState('paused');}
   // The blast is an opposing red grenade. Blue target at 6 m is hurt; red stays immune to friendly fire.
   boom();const six=target.hp;target.hp=100;target.mesh.position.z=lane.z+8;boom();return {six,eight:target.hp,helmet:target.helmet?.charges,radius:FishGrenadePhysics.blastRadius,visual:explosionRadii.at(-1)};
  });report.radius=radius;
  check('FPS 爆炸半径由 5 米增至 7.5 米，6 米受伤、8 米不受伤',radius.radius===7.5&&radius.six<100&&radius.eight===100,radius);
  check('原 4 米爆炸特效按 50% 放大至 6 米，独立于 FPS 伤害半径',radius.visual===6,radius);
  for(const team of ['blue','red']){
   const jumping=await page.evaluate(team=>{
    d.startPvp({team,teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};stepT(4.8);let p=d.getPlayer();p.pos.set(lane.x,0,lane.z+5);p.yaw=Math.PI;p.onGround=true;p.velY=0;d.updatePlayer(0);d.pressKey('KeyW',true);stepT(.3);d.setState('playing');document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));stepT(.08);document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
    let clips=[];for(let i=0;i<80&&!p.onGround;i++){clips.push([d.getCharacters().local.clip,d.getCharacters().view.clip]);stepT(.01);}const landed=p.onGround;stepT(.7);let ground=[d.getCharacters().local.clip,d.getCharacters().view.clip];d.releaseKeys();return {clips,landed,ground,position:p.pos.toArray(),motion:p.motion.toArray(),phase:d.getPvp().roundState};
   },team);
   check(team+' 方空中移动的世界模型与第一人称双臂均不播放走跑动作',jumping.clips.length>10&&jumping.clips.every(pair=>pair.every(c=>/Jump/.test(c)&&!/Walk|Run|Strafe/.test(c))),jumping);
   check(team+' 方落地后恢复移动动作',jumping.landed&&jumping.ground.every(c=>/Run|Walk/.test(c)),jumping);
  }
  const endless=await page.evaluate(()=>{
   d.restart(true);d.enterGameWorld();d.killAllEnemies();d.getWave().state='test';d.setState('playing');d.getPlayer().pos.set(0,0,-34);
   const inside=d.spawnEnemy('normal',5.5,34),outside=d.spawnEnemy('normal',6.5,34);inside.hp=outside.hp=100;const mesh=FishCombat.grenade();mesh.position.set(0,1.4,34);d.explodeGrenade({mesh,owner:'player'});d.setState('paused');return {inside:inside.hp,outside:outside.hp,visual:explosionRadii.at(-1)};
  });
  check('无尽基础爆炸半径由 4 米增至 6 米，视觉同步放大',endless.inside<100&&endless.outside===100&&endless.visual===6,endless);
  check('战术投雷与空中动作没有脚本异常',report.errors.length===0,report.errors);
  console.log(report.checks.length+' tactical grenade checks passed.');
 }finally{fs.writeFileSync(path.join(OUT,'tactical-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
