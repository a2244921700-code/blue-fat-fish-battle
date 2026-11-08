'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'retreat-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 function check(name,data){report.checks.push({name,...data});assert(data.ok,name+' '+JSON.stringify(data));console.log('PASS | '+name);}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))report.errors.push(m.text());});
  await page.addInitScript(()=>{window.nativeRaf=requestAnimationFrame;window.requestAnimationFrame=f=>nativeRaf(t=>{if(!window.freezeRetreat)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{
   window.freezeRetreat=true;window.d=FishGame.__debug;d.startPvp({team:'blue',teamSize:6});d.enterFallback();
   window.tactics=d.getPvpTactics();window.runAI=tactics.step.bind(tactics);tactics.step=()=>{};
   d.setState('playing');for(let i=0;i<100;i++)d.update(1/30);
   window.bot=d.getEnemies().find(e=>e.team==='blue');window.enemy=d.getEnemies().find(e=>e.team==='red');
   d.getEnemies().forEach(e=>{e.alive=e===bot||e===enemy;e.mesh.visible=e.alive;if(!e.alive)e.respawnTimer=9999;});
   d.getPlayer().pos.set(25,0,-69);d.getPlayer().yaw=0;d.getPlayer().pitch=0;d.updatePlayer(0);
   tactics.danger=tactics.loot=tactics.grenade=null;tactics.random=()=>.5;
   window.shots=[];const fire=tactics.fire;
   tactics.fire=(a,aim,w,error)=>{const result=fire(a,aim,w,0);if(result!==false)shots.push({time:tactics.clock,reload:a.brain.reload,hp:enemy.hp});return result;};
   tactics.step=(actors,dt)=>runAI(actors.filter(a=>a.id===bot.pvpId||a.id===enemy.pvpId).map(a=>a.id===enemy.pvpId?Object.assign({},a,{brain:null}):a),dt);
   window.setupRetreat=(kind,team='blue')=>{
    if(bot.team!==team){const old=bot;bot=enemy;enemy=old;}
    shots.length=0;tactics.contacts={red:{},blue:{}};tactics.noises=[];
    for(const [e,z] of [[bot,-62],[enemy,-50]]){
     e.mesh.position.set(8,e.baseY,z);e.charLastPos.copy(e.mesh.position);e.charSpeed=e.charDX=e.charDZ=0;e.hp=e===enemy?10000:20;e.maxHp=e.hp;e.protection=0;e.grenadeAction=null;e.character.reset();
     const a={id:e.pvpId,team:e.team,position:e.mesh.position,baseY:e.baseY,eyeY:e.baseY+.5,aimY:e.baseY,lowY:.7,sidearm:e.pvpSidearm};
     e.brain=tactics.reset(a,e.pvpSlot);e.brain.yaw=e===bot?0:Math.PI;e.brain.shotWait=0;e.brain.scan=0;
    }
    bot.brain.cover={x:kind==='side'?14:8,y:0,z:kind==='side'?-62:-71};bot.brain.coverTimer=100;
    if(kind==='reload'){bot.brain.magazines.rifle=0;bot.brain.reload=1.2;}
    d.setState('playing');d.syncCharacters(.01);d.setState('paused');
   };
   window.runRetreat=(seconds,fps)=>{
    d.setState('playing');const frames=[];
    for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=1/fps){
     d.update(1/fps);const dx=enemy.mesh.position.x-bot.mesh.position.x,dz=enemy.mesh.position.z-bot.mesh.position.z;
     const err=Math.abs(Math.atan2(Math.sin(bot.mesh.rotation.y-Math.atan2(dx,dz)),Math.cos(bot.mesh.rotation.y-Math.atan2(dx,dz))));
     const from=bot.character.weapon.muzzleTip.getWorldPosition(new THREE.Vector3()),want=new THREE.Vector3(enemy.mesh.position.x,bot.brain.aim.y,enemy.mesh.position.z).sub(from).normalize();
     const forward=FishCombat.muzzleDirection(bot.character.weapon.muzzleTip,new THREE.Vector3());
     frames.push({t:tactics.clock,clip:bot.character.clip,reload:bot.brain.reload,shots:shots.length,visible:bot.brain.visibleId,err,muzzleDot:forward.dot(want),x:bot.mesh.position.x,z:bot.mesh.position.z});
    }
    d.setState('paused');return frames;
   };
  });
  for(const fps of [30,60,144])check(fps+' FPS 实机：倒退动作、朝向和真实命中一致',await page.evaluate(fps=>{
   setupRetreat('combat');const frames=runRetreat(1.2,fps),back=frames.filter(f=>f.clip==='RifleWalkBack');
   return {ok:back.length===frames.length&&frames.every(f=>f.err<.12&&f.muzzleDot>.99)&&bot.mesh.position.z<-65&&shots.length>=3&&enemy.hp<10000,clips:[...new Set(frames.map(f=>f.clip))],shots:shots.length,damage:10000-enemy.hp,maxAngle:Math.max(...frames.map(f=>f.err)),minMuzzleDot:Math.min(...frames.map(f=>f.muzzleDot)),z:bot.mesh.position.z};
  },fps));
  check('红方deepseek娘同样使用倒退动作并保持射击',await page.evaluate(()=>{setupRetreat('combat','red');const frames=runRetreat(1,60);return {ok:bot.character.characterId==='deepseek'&&frames.every(f=>f.clip==='RifleWalkBack'&&f.err<.12)&&shots.length>1&&enemy.hp<10000,character:bot.character.characterId,shots:shots.length,damage:10000-enemy.hp};}));
  check('实机换弹下半身倒退，上半身换弹；结束后无额外转身或锁定等待',await page.evaluate(()=>{
   setupRetreat('reload');const frames=runRetreat(1.5,60),reloading=frames.filter(f=>f.reload>0),ready=frames.find(f=>f.reload===0);
   const bad=reloading.filter(f=>f.shots!==0||f.clip!=='RifleWalkBackLowerOnly'||f.err>=.12||f.visible!==enemy.pvpId);
   return {ok:reloading.length>50&&!bad.length&&shots.length>0&&shots[0].time-ready.t<.02,clips:[...new Set(frames.map(f=>f.clip))],reloadFrames:reloading.length,delay:shots.length?shots[0].time-ready.t:null,shots:shots.length,bad:bad.slice(0,3)};
  }));
  check('实机侧移撤向掩体时播放侧移动作，枪口持续指向敌人',await page.evaluate(()=>{
   setupRetreat('side');const frames=runRetreat(1,60);return {ok:frames.every(f=>f.clip==='RifleStrafeLeft'&&f.err<.12&&f.muzzleDot>.99)&&bot.mesh.position.x>11&&shots.length>1,clips:[...new Set(frames.map(f=>f.clip))],x:bot.mesh.position.x,shots:shots.length};
  }));
  check('两套角色的步枪、手枪、蹲姿与双向侧移动作按相对方向选择',await page.evaluate(()=>{
   const rows=[];for(const character of ['deepseek','claude_fake'])for(const weapon of ['rifle','pistol']){
    const r=FishCharacters.create({character,weapon}),prefix=weapon==='rifle'?'Rifle':'Pistol';
    for(const fps of [30,60,144])for(const [f,s,suffix] of [[-1,0,'WalkBack'],[0,1,'StrafeLeft'],[0,-1,'StrafeRight']]){
     r.reset();r.update(1/fps,{weapon,speed:.32,forward:f*.32/fps,side:s*.32/fps});rows.push({clip:r.clip,expected:prefix+suffix});
    }
    r.reset();for(let i=0;i<60;i++)r.update(1/60,{weapon,speed:.32,forward:-.32/60,crouch:true});rows.push({clip:r.clip,expected:prefix+'CrouchWalkBack'});r.dispose();
   }
   return {ok:rows.every(r=>r.clip===r.expected),combinations:rows.length};
  }));
  check('手雷上下身分层也支持后退；空中继续使用跳跃动作',await page.evaluate(()=>{
   const r=FishCharacters.create({weapon:'grenade'});r.update(1/60,{weapon:'grenade',speed:2,forward:-2/60,grenadeTime:.2});
   const back=r.mixer._actions.some(a=>a.isRunning()&&a.getClip().name==='UnarmedWalkBackLowerOnly');
   r.update(1/60,{weapon:'grenade',speed:2,forward:-2/60,grenadeTime:.3,grounded:false});
   const airborne=r.mixer._actions.some(a=>a.isRunning()&&a.getClip().name==='UnarmedJumpLoopLowerOnly');r.dispose();
   const gun=FishCharacters.create({weapon:'rifle'});for(let i=0;i<40;i++)gun.update(1/60,{weapon:'rifle',speed:3,forward:-3/60,grounded:false});const clip=gun.clip;gun.dispose();
   return {ok:back&&airborne&&clip==='RifleJumpLoop',back,airborne,clip};
  }));
  await page.evaluate(()=>{
   setupRetreat('combat','blue');runRetreat(.8,60);d.getCharacters().view.root.visible=false;
   d.getCamera().position.set(12,2,-58);d.getCamera().lookAt(bot.mesh.position.x,1.1,bot.mesh.position.z);
   function render(){d.renderFrame();nativeRaf(render);}render();
  });
  await page.addStyleTag({content:'#tip-bar,#fallback-hint,#notice-pop,#dialog-overlay,#crosshair,#hud,#pvp-score,#pvp-status{visibility:hidden!important}'});
  await page.waitForTimeout(80);await page.screenshot({path:path.join(OUT,'combat-retreat.webp')});
  check('桌面 Edge / WebGL 无脚本和着色器异常',{ok:report.errors.length===0,errors:report.errors});
 }finally{fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
