'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.FISH_TEST_OUTPUT||path.join(__dirname,'head-shadow-results');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,ok,detail)=>{assert(ok,name+' '+JSON.stringify(detail));report.checks.push(name);console.log('PASS | '+name);};
 try{const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader/.test(m.text()))report.errors.push(m.text());});
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeShadowTest)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-pvp-mode');await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:120000});
  await page.evaluate(()=>{window.freezeShadowTest=true;window.d=FishGame.__debug;d.enterFallback();d.getPvpTactics().step=()=>{};d.setState('paused');});
  report.poses=await page.evaluate(()=>{
   const rows=[],angle=(a,b)=>a.clone().normalize().angleTo(b.clone().normalize()),bones=['Chest','Neck'];
   const delta=(a,b)=>b.clone().normalize().invert().multiply(a.clone().normalize());
   for(const character of ['deepseek','claude_fake','claude_true']){
    const row={character,frameRates:[],frozenTime:0,neutral:0,transitions:0,repeatAim:0,corpse:0,reset:0};
    for(const fps of [30,60,144])for(const pitch of [-.7,.65])for(const speed of [0,2.4]){
     const a=FishCharacters.create({character,weapon:'rifle'}),b=FishCharacters.create({character,weapon:'rifle'}),state={grounded:true,speed,forward:1};
     a.update(.3,Object.assign({},state,{pitch}));b.update(.3,state);const offsets=bones.map(n=>delta(a.bones[n].quaternion,b.bones[n].quaternion));let drift=0;
     for(let n=0;n<fps*3;n++){a.update(1/fps,Object.assign({},state,{pitch}));b.update(1/fps,state);bones.forEach((name,i)=>{drift=Math.max(drift,angle(delta(a.bones[name].quaternion,b.bones[name].quaternion),offsets[i]));});}
     row.frameRates.push({fps,pitch,speed,drift});a.dispose();b.dispose();
    }
    for(const weapon of ['unarmed','rifle','sniper','pistol','knife']){
     const a=FishCharacters.create({character,weapon}),b=FishCharacters.create({character,weapon});a.update(.5,{pitch:-.7});b.update(.5,{});
     const before=a.bones.Head.getWorldQuaternion(new THREE.Quaternion());for(let n=0;n<120;n++)a.update(0,{pitch:-.7});row.frozenTime=Math.max(row.frozenTime,angle(before,a.bones.Head.getWorldQuaternion(new THREE.Quaternion())));
     a.update(0,{pitch:0});b.update(0,{});row.neutral=Math.max(row.neutral,angle(a.bones.Head.getWorldQuaternion(new THREE.Quaternion()),b.bones.Head.getWorldQuaternion(new THREE.Quaternion())));
     a.dispose();b.dispose();
    }
    const a=FishCharacters.create({character,weapon:'rifle'}),b=FishCharacters.create({character,weapon:'rifle'});
    a.update(.5,{pitch:-.7});b.update(.5,{});
    for(const state of [{reload:true,reloadDuration:2.5},{weapon:'grenade',grenadeTime:.7,grenadeHeld:true},{weapon:'rifle',reload:true,reloadDuration:2.5}]){
     for(let n=0;n<24;n++){a.update(1/60,Object.assign({pitch:-.7},state));b.update(1/60,state);bones.forEach(name=>{row.transitions=Math.max(row.transitions,angle(a.bones[name].quaternion,b.bones[name].quaternion));});}
    }
    a.update(.4,{weapon:'knife',pitch:-.7});b.update(.4,{weapon:'knife'});a.startAttack(true);b.startAttack(true);
    for(let n=0;n<20;n++){a.update(1/60,{pitch:-.7});b.update(1/60,{});bones.forEach(name=>{row.transitions=Math.max(row.transitions,angle(a.bones[name].quaternion,b.bones[name].quaternion));});}
    a.reset();b.reset();a.equip('sniper');b.equip('sniper');a.update(.4,{});b.update(.4,{});
    const target={x:5,y:3,z:20};a.aimAt(target);const aimed=a.bones.Head.getWorldQuaternion(new THREE.Quaternion());for(let n=0;n<30;n++)a.aimAt(target);row.repeatAim=angle(aimed,a.bones.Head.getWorldQuaternion(new THREE.Quaternion()));
    a.update(0,{pitch:-.7});const pose=a.bones.Head.getWorldQuaternion(new THREE.Quaternion()),copy=FishCharacters.create({character,weapon:'sniper'});copy.copyPoseFrom(a);copy.freezePose();a.freezePose();a.update(1,{pitch:.7});copy.update(1,{pitch:.7});row.corpse=Math.max(angle(pose,a.bones.Head.getWorldQuaternion(new THREE.Quaternion())),angle(pose,copy.bones.Head.getWorldQuaternion(new THREE.Quaternion())));
    a.reset();b.reset();a.update(.4,{});b.update(.4,{});row.reset=angle(a.bones.Head.getWorldQuaternion(new THREE.Quaternion()),b.bones.Head.getWorldQuaternion(new THREE.Quaternion()));a.dispose();b.dispose();copy.dispose();rows.push(row);
   }return rows;
  });
  for(const r of report.poses){
   check(r.character+'：30/60/144 FPS 站立与走动、抬头与低头均不累积旋转',r.frameRates.every(s=>s.drift<.00001),r.frameRates);
   check(r.character+'：五类武器重复零时长更新头部不转动，回正无残留',r.frozenTime<.00001&&r.neutral<.00001,r);
   check(r.character+'：换弹、投雷、近战恢复动作原始姿势',r.transitions<.00001,r.transitions);
   check(r.character+'：反复AI瞄准无漂移，尸体保留最终姿势，重置恢复',r.repeatAim<.00001&&r.corpse<.00001&&r.reset<.00001,r);
  }
  report.render=await page.evaluate(()=>{
   d.startPvp({team:'red',teamSize:6,helmet:'iron-rice-bowl'});d.enterFallback();d.getPvpTactics().step=()=>{};d.getEnemies().forEach(e=>{e.alive=false;e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});
   const p=d.getPlayer();p.pos.set(0,0,12);p.yaw=-.9;p.pitch=-.7;p.motion.set(0,0,0);p.onGround=true;d.setState('playing');d.updatePlayer(0);d.syncCharacters(.3);d.setState('paused');d.getGun().group.visible=false;
   const scene=d.getCamera().parent;let renderer;scene.onBeforeRender=r=>{renderer=r;};d.renderFrame();
   const pixels=()=>{d.renderFrame();const gl=renderer.getContext(),bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
   const compare=(a,b)=>{let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)changed++;return changed;};
   const rig=d.getCharacters().local,head=rig.bones.Head.getWorldQuaternion(new THREE.Quaternion()),helmet=p.helmet.object,helmetQ=helmet.getWorldQuaternion(new THREE.Quaternion()),before=pixels();
   for(let n=0;n<60;n++){d.setState('playing');d.syncCharacters(0);d.setState('paused');}const after=pixels(),stable=compare(before,after);
   const casters=[];rig.root.traverse(m=>{if(m.isMesh&&m.castShadow){casters.push(m);m.castShadow=false;}});const noShadow=pixels();casters.forEach(m=>m.castShadow=true);
   const materials=rig.meshes.map(m=>m.material),flags=[];rig.meshes.forEach(m=>{m.onBeforeRender=(r,s,c,g,mat)=>flags.push(!mat.colorWrite&&!mat.depthWrite);});pixels();rig.meshes.forEach(m=>{m.onBeforeRender=()=>{};});
   const result={stablePixels:stable,shadowPixels:compare(after,noShadow),headDrift:head.angleTo(rig.bones.Head.getWorldQuaternion(new THREE.Quaternion())),helmetDrift:helmetQ.angleTo(helmet.getWorldQuaternion(new THREE.Quaternion())),hiddenBody:flags.length>0&&flags.every(Boolean),materialsRestored:rig.meshes.every((m,i)=>m.material===materials[i])};
   const atYaw=rig.bones.Head.getWorldQuaternion(new THREE.Quaternion());p.yaw+=.6;d.setState('playing');d.updatePlayer(0);d.syncCharacters(0);d.setState('paused');result.yawResponse=atYaw.angleTo(rig.bones.Head.getWorldQuaternion(new THREE.Quaternion()));p.yaw-=.6;d.setState('playing');d.updatePlayer(0);d.syncCharacters(0);d.setState('paused');result.yawReturn=atYaw.angleTo(rig.bones.Head.getWorldQuaternion(new THREE.Quaternion()));d.renderFrame();
   return result;
  });
  const r=report.render;check('实际第一人称重复同步后头部和头盔影子保持稳定',r.stablePixels<20&&r.headDrift<.0001&&r.helmetDrift<.0001,r);
  check('完整人物继续向地面投影，隐藏身体颜色/深度且绘制后恢复材质',r.shadowPixels>300&&r.hiddenBody&&r.materialsRestored,r);
  check('鼠标方向变化只带动同量世界转向，转回后无残留',Math.abs(r.yawResponse-.6)<.0001&&r.yawReturn<.0001,r);
  await page.screenshot({path:path.join(out,'first-person-shadow.webp'),type:'webp',quality:88});
  check('无脚本或着色器错误',report.errors.length===0,report.errors);
  console.log(report.checks.length+' head/shadow checks passed');
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
