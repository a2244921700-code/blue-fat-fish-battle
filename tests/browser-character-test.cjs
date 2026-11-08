/* Real Edge/WebGL: source GLB, independent rigs, per-part damage and animated contact. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=process.env.FISH_TEST_OUTPUT||path.join(__dirname,'character-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[],shaderErrors:[]};
function check(name,value){assert(value,name);report.checks.push(name);console.log('PASS | '+name);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))report.shaderErrors.push(m.text());});
 await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeCharacterTest)cb(t);});});
 await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame);
 await page.click('#btn-start');await page.click('#btn-mode-endless');await page.click('#btn-map-desert');await page.waitForFunction(()=>document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
 await page.evaluate(()=>{
  window.freezeCharacterTest=true;const d=FishGame.__debug;d.enterFallback();d.setState('paused');
  window.stepCharacters=(seconds,dt=.01)=>{d.setState('playing');for(let t=0;t<seconds-1e-7&&d.getState()==='playing';t+=dt)d.update(Math.min(dt,seconds-t));if(d.getState()==='playing')d.setState('paused');};
  window.clearCharacters=()=>{d.killAllEnemies();d.clearCovers();d.clearProjectiles();d.removeBoss();d.clearRadiation();d.getWave().state='test';d.releaseKeys();d.setHp(100);d.setArmor(0);d.resetHurt();d.setDifficulty('normal');d.setEnvTheme(0,false);let p=d.getPlayer();p.pos.set(0,0,34);p.yaw=p.pitch=p.velY=0;p.onGround=true;d.updatePlayer(0);};
  window.stationary=(kind,x,z)=>{let e=d.spawnEnemy(kind,x,z);e.hp=100;e.ranged=false;e.state='patrol';e.waitTimer=e.seeCheckTimer=99999;e.waypoint.copy(e.mesh.position);e.character.equip(kind==='healer'||kind==='bomber'?'unarmed':'sword');return e;};
  clearCharacters();
 });
 const source=await page.evaluate(()=>FishCharacters.stats());report.asset=source;
 check('v005 实际载入 91 动作 / 46 骨骼 / 9978 三角面',source.loaded&&source.animations===91&&source.bones===46&&source.triangles===9978);
 const forms=await page.evaluate(()=>{let d=FishGame.__debug;window.lineup=['normal','shield','bomber','healer','splitter'].map((k,i)=>stationary(k,(i-2)*2.3,28));d.setState('playing');d.syncCharacters(.3);d.setState('paused');return lineup.map(e=>({kind:e.kind,isGroup:e.mesh.isGroup,skins:e.character.meshes.length,caps:e.character.capsules.length,hasPicture:!!e.mesh.material}));});report.forms=forms;
 check('无尽五种普通敌人使用蒙皮模型并移除旧立绘',forms.every(e=>e.isGroup&&e.skins===3&&e.caps===16&&!e.hasPicture));
 const independent=await page.evaluate(()=>{let a=lineup[0].character,b=lineup[1].character;let before=b.bones.Hand_R.quaternion.toArray();a.startAttack(true);a.update(.5,{weapon:'sword'});return {sameBone:a.bones.Head===b.bones.Head,unchanged:before.every((v,i)=>v===b.bones.Hand_R.quaternion.toArray()[i]),sameGeometry:a.meshes[0].geometry===b.meshes[0].geometry};});
 check('角色骨骼相互独立，几何和贴图共享',!independent.sameBone&&independent.unchanged&&independent.sameGeometry);
 const mounted=await page.evaluate(()=>{let r=FishCharacters.create({weapon:'sword'});r.update(.3,{weapon:'sword'});let wrist=r.weapon.worldToLocal(r.bones.Hand_L.getWorldPosition(new THREE.Vector3()));let longsword=r.readBlade().length;r.equip('knife');r.update(.3,{weapon:'knife'});let dagger=r.readBlade().length;r.equip('rifle');r.update(.3,{weapon:'rifle'});let forward=FishCombat.muzzleDirection(r.weapon.muzzleTip,new THREE.Vector3());r.dispose();return {wrist:wrist.toArray(),longsword,dagger,forward:forward.toArray()};});report.mounts=mounted;
 check('枪口朝前，双手长剑握点与导出骨骼对齐',mounted.forward[2]>.98&&Math.abs(mounted.wrist[2]+.037)<.001&&Math.abs(mounted.wrist[1])<.001);
 check('刀刃碰撞长度取自实际模型：匕首 0.49m / 长剑 1.04m',Math.abs(mounted.dagger-.49)<.0001&&Math.abs(mounted.longsword-1.04)<.0001);
 const moving=await page.evaluate(()=>{let r=FishCharacters.create({weapon:'rifle'});r.update(.3,{weapon:'rifle'});let h=r.capsules[0].a.clone();r.update(.7,{weapon:'rifle',crouch:true});r.update(.2,{weapon:'rifle',crouch:true});let down=r.capsules[0].a.y-h.y;r.root.position.set(3,2,5);r.update(.1,{weapon:'rifle',grounded:false,crouch:false});let raised=r.capsules[0].a.y;let clip=r.clip;r.dispose();return {down,raised,clip};});report.moving=moving;
 check('胶囊随蹲下、跳跃及根节点移动',moving.down<-.12&&moving.raised>2.8&&/Jump/.test(moving.clip));
 await page.evaluate(()=>{lineup.forEach(e=>e.character.cancelAttack());const d=FishGame.__debug;d.getCamera().position.set(0,1.5,34);d.getCamera().lookAt(0,1.05,28);d.getCharacters().view.root.visible=false;d.renderFrame();});
 await page.addStyleTag({content:'#fallback-hint,#notice-pop,#dialog-overlay{visibility:hidden!important}'});await page.screenshot({path:path.join(OUT,'01-endless-lineup.png')});
 const boss=await page.evaluate(()=>{const d=FishGame.__debug;d.spawnBossNow(0);return {image:!!d.getBoss().mesh.material.map,rig:!!d.getBoss().character};});
 check('无尽 Boss 仍保留图片形象',boss.image&&!boss.rig);
 // Real fired rounds, not just isolated multiplier arithmetic.
 const bullets=await page.evaluate(()=>{
  const d=FishGame.__debug;clearCharacters();window.target=stationary('healer',0,29);d.getCharacters().view.root.visible=true;d.setState('playing');d.syncCharacters(.3);d.setState('paused');
  let results=[];for(const part of ['head','chest','abdomen','thigh']){
   stepCharacters(.4);target.hp=100;target.healTimer=99999;let c=target.character.capsules.find(c=>c.part===part),center=c.a.clone().lerp(c.b,.5);
   let p=d.getPlayer();d.getCamera().position.set(center.x,center.y,34);d.getCamera().lookAt(center);d.setState('playing');d.setAmmo(7,42);let h=d.characterRay(target,d.getCamera().position,d.getCamera().getWorldDirection(new THREE.Vector3()),10);d.shootOnce();d.setState('paused');results.push({requested:part,hit:h&&h.part,damage:100-target.hp,record:d.getCharacters().lastHit});
  }return results;
 });report.bullets=bullets;console.log('BULLETS '+JSON.stringify(bullets));
 check('实弹头部伤害 1.75 倍',Math.abs(bullets[0].damage-1.75)<.03&&bullets[0].record.part==='head');
 check('实弹胸部与腹部伤害均为 1.0 倍',Math.abs(bullets[1].damage-1)<.03&&Math.abs(bullets[2].damage-1)<.03);
 check('实弹腿部使用较低部位倍率',bullets[3].damage>0&&bullets[3].damage<1);
 // Aimed empty space between the legs must not hit an old bounding sphere.
 const gap=await page.evaluate(()=>{const d=FishGame.__debug;target.character.reset();let a=target.character.capsules.find(c=>c.part==='shin'),b=target.character.capsules.filter(c=>c.part==='shin')[1],p=a.a.clone().lerp(a.b,.5).lerp(b.a.clone().lerp(b.b,.5),.5);return !d.characterRay(target,new THREE.Vector3(p.x,p.y,34),new THREE.Vector3(0,0,-1),10);});
 check('双腿间隙穿过，不再命中整张立绘大球',gap);
 // Stabilize the knife pose first, then use the ordinary input and update path.
 await page.evaluate(()=>{clearCharacters();const d=FishGame.__debug;d.setState('playing');d.switchWeapon('knife');stepCharacters(.8);window.target=stationary('healer',.10,33.15);target.healTimer=99999;stepCharacters(.3);});
 const melee=await page.evaluate(()=>{const d=FishGame.__debug;target.hp=100;d.setState('playing');let started=d.knifeAttack(false);stepCharacters(.15);let windup=target.hp;stepCharacters(.25);let hit=target.hp,record=d.getCharacters().lastHit;stepCharacters(.35);return {started,windup,hit,after:target.hp,record,active:!!d.getCharacters().view.attack};});report.melee=melee;console.log('MELEE '+JSON.stringify(melee));
 check('轻击蓄力阶段不扣血，动作窗口中接触才命中',melee.started&&melee.windup===100&&melee.hit<100);
 check('一次挥刀只伤害同一角色一次，收招后结束',melee.after===melee.hit&&!melee.active);
 check('近战伤害由刀刃米长 × 部位倍率计算',Math.abs((100-melee.hit)-.49*4.1*melee.record.multiplier)<.002);
 const far=await page.evaluate(()=>{target.mesh.position.z=31.5;target.waypoint.copy(target.mesh.position);target.hp=100;let d=FishGame.__debug;d.setState('playing');d.knifeAttack(false);stepCharacters(.7);return target.hp;});
 check('旧 2.6 米范围内但刀刃够不到的目标不扣血',far===100);
 const heavy=await page.evaluate(()=>{target.mesh.position.set(.1,1.4,33.15);target.waypoint.copy(target.mesh.position);target.hp=100;let d=FishGame.__debug;d.setState('playing');d.knifeAttack(true);stepCharacters(.65);let pre=target.hp;stepCharacters(.55);let hit=target.hp,record=d.getCharacters().lastHit;stepCharacters(.3);return {pre,hit,record,active:!!d.getCharacters().view.attack};});report.heavy=heavy;
 check('重击使用 1.4 秒动作与独立后段命中窗口',heavy.pre===100&&heavy.hit<100&&!heavy.active);
 const pause=await page.evaluate(()=>{let d=FishGame.__debug;d.setState('playing');d.knifeAttack(false);stepCharacters(.1);let a=d.getCharacters().view.attack.time;d.update(.8);let b=d.getCharacters().view.attack.time;d.setState('playing');d.switchWeapon('rifle');stepCharacters(.9);return {a,b,cancelled:!d.getCharacters().view.attack};});
 check('暂停冻结近战；切武器取消剩余攻击',pause.a===pause.b&&pause.cancelled);
 const blocked=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.switchWeapon('knife');stepCharacters(.8);target.hp=100;target.mesh.position.set(.1,1.4,33.15);target.waypoint.copy(target.mesh.position);let box={min:new THREE.Vector3(-1,0,33.4),max:new THREE.Vector3(1,3,33.55)};d.getObstacles().push(box);d.setState('playing');d.knifeAttack(false);stepCharacters(.7);d.getObstacles().splice(d.getObstacles().indexOf(box),1);return target.hp;});
 check('隔墙挥刀不伤害另一侧角色',blocked===100);
 const lowFps=await page.evaluate(()=>{const d=FishGame.__debug;target.hp=100;d.setState('playing');d.knifeAttack(false);stepCharacters(.7,.1);return {hp:target.hp,record:d.getCharacters().lastHit};});report.lowFps=lowFps;
 check('低帧率跨过攻击窗口仍能扫掠命中一次',lowFps.hp<100&&lowFps.hp>94);
 // FPS all actors, team identity and normal respawn.
 await page.evaluate(()=>FishCharacters.load());await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({team:'red',teamSize:16});d.enterFallback();window.savedAi=d.getPvpTactics().step;d.getPvpTactics().step=()=>{};stepCharacters(4.7);});
 const pvp=await page.evaluate(()=>({stats:FishCharacters.stats(),bots:FishGame.__debug.getEnemies().map(e=>({team:e.team,rig:!!e.character,character:e.character.characterId,skin:e.character.meshes.length,caps:e.character.capsules.length,ring:!!e.teamRing,equipment:e.equipment.length})),mul:FishGame.__debug.pvpHitTest(10,true)}));report.pvp=pvp;
 check('16v16 全部 31 名 AI 和本地玩家使用当前阵营的实机模型',pvp.bots.length===31&&pvp.bots.every(e=>e.rig&&(e.team==='red'?['deepseek','claude_fake'].includes(e.character):e.character==='claude_true')&&e.skin===(e.character==='claude_fake'?4:3)&&e.caps===16)&&pvp.stats.instances===33);
 check('红蓝识别环和骨骼臂章保留，爆头统一 1.75',pvp.bots.every(e=>e.ring&&e.equipment===2)&&pvp.mul.damage===63);
 await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.syncCharacters(.2);d.setState('paused');d.renderFrame();});await page.screenshot({path:path.join(OUT,'05-fps-16v16.png')});
 const dead=await page.evaluate(()=>{let d=FishGame.__debug,bot=d.getEnemies().find(e=>e.team==='blue');bot.character.equip('knife');bot.brain.weapon='knife';bot.character.startAttack(true);let idx=d.getEnemies().indexOf(bot);d.setState('playing');d.pvpDamageBot(idx,9999);let stopped=!bot.character.attack;stepCharacters(4.1);return {stopped,alive:bot.alive,hp:bot.hp,attack:!!bot.character.attack,instances:FishCharacters.stats().instances};});
 check('AI 死亡清空攻击，复活重置骨骼且不增加实例',dead.stopped&&dead.alive&&dead.hp===100&&!dead.attack&&dead.instances===33);
 const localDeath=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.switchWeapon('knife');stepCharacters(.8);d.setState('playing');d.knifeAttack(true);stepCharacters(.1);d.setState('playing');d.pvpHurtPlayer(1000);let active=!!d.getCharacters().view.attack;stepCharacters(4.1);return {active,hp:d.getPlayer().hp,attack:!!d.getCharacters().view.attack};});
 check('玩家死亡与复活不遗留未完成刀击',!localDeath.active&&!localDeath.attack&&localDeath.hp===100);
 const aiDamage=await page.evaluate(()=>{
  const d=FishGame.__debug;stepCharacters(2);d.getEnemies().forEach(e=>{e.alive=false;e.respawnTimer=99999;e.mesh.visible=false;});
  const p=d.getPlayer();p.pos.set(0,0,64);p.yaw=0;p.pitch=0;window.shooter=d.getEnemies().find(e=>e.team==='blue');shooter.alive=true;shooter.mesh.visible=true;shooter.mesh.position.set(0,1.4,59);shooter.brain.yaw=0;shooter.brain.weapon='rifle';shooter.protection=0;
  d.setState('playing');d.update(.01);d.getCharacters().local.update(.3,{weapon:'unarmed'});d.setHp(100);
  const c=d.getCharacters().local.capsules[0],point=c.a.clone().lerp(c.b,.5),actor={source:shooter,position:shooter.mesh.position,eyeY:1.5,team:'blue',id:shooter.pvpId};
  let fired=d.botFire(actor,point,{damage:36},0),hp=p.hp,record=d.getCharacters().lastHit;d.setState('paused');return {fired,hp,record};
 });report.aiDamage=aiDamage;
 check('AI 射击玩家也走真实头部胶囊和 1.75 倍伤害',aiDamage.fired&&Math.abs(aiDamage.hp-37)<.01&&aiDamage.record.part==='head');
 const aiMelee=await page.evaluate(()=>{
  const d=FishGame.__debug,p=d.getPlayer();d.setHp(100);shooter.brain.weapon='knife';shooter.mesh.position.set(0,1.4,p.pos.z-.8);shooter.charLastPos.copy(shooter.mesh.position);shooter.character.equip('knife');d.setState('playing');d.syncCharacters(.2);
  let ok=d.botFire({source:shooter,position:shooter.mesh.position,eyeY:1.5,team:'blue',id:shooter.pvpId},p.pos.clone().add(new THREE.Vector3(0,1,0)),{melee:true},0);stepCharacters(.15);let windup=p.hp;stepCharacters(.6);return {ok,windup,hp:p.hp,record:d.getCharacters().lastHit};
 });report.aiMelee=aiMelee;
 check('AI 近战同样在动画接触时扣血，蓄力不能隔空伤人',aiMelee.ok&&aiMelee.windup===100&&aiMelee.hp<100);
 const cleanup=await page.evaluate(()=>{FishGame.__debug.restart(true);return FishCharacters.stats();});
 check('离开场景释放所有实例和骨骼，只保留共享资源缓存',cleanup.loaded&&cleanup.instances===0);
 check('浏览器无 JavaScript / WebGL 着色器错误',report.errors.length===0&&report.shaderErrors.length===0);
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(report.checks.length+' browser checks passed');
}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
