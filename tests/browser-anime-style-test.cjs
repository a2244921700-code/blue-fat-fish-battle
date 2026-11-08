/* Desktop Edge / real WebGL: rendered pixels, self-shadow, FX and lifecycle. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'western-default-results','shared-rendering');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[],shaderErrors:[]};
 const check=(name,ok)=>{assert(ok,name);report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))report.shaderErrors.push(m.text());});
  await page.addInitScript(()=>{window.nativeRaf=requestAnimationFrame;window.requestAnimationFrame=f=>nativeRaf(t=>{if(!window.freezeArt)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{
   window.freezeArt=true;window.d=FishGame.__debug;d.enterFallback();d.setState('playing');d.getPvpTactics().step=()=>{};
   const p=d.getPlayer();p.pos.set(0,0,10);p.yaw=0;p.pitch=-.03;d.updatePlayer(0);
   window.world=d.getCamera().parent;
   world.onBeforeRender=renderer=>{window.renderer=renderer;window.worldDraws=(window.worldDraws||0)+1;};
   window.actors=[d.getEnemies().find(e=>e.team==='blue'),d.getEnemies().find(e=>e.team==='red')];
   d.getEnemies().forEach(e=>{e.alive=actors.includes(e);e.mesh.visible=e.alive;if(e.groundShadow)e.groundShadow.visible=e.alive;});
   actors.forEach((e,i)=>{d.equipHelmet(e,null);e.mesh.position.set(i?1.05:-1.05,e.baseY,6);e.charLastPos.copy(e.mesh.position);e.brain.yaw=0;e.brain.aim={x:0,y:1.5,z:10};e.brain.reload=0;e.character.cancelAttack();if(e.teamTag)e.teamTag.visible=false;});
   d.syncCharacters(.1);d.setState('paused');d.getCharacters().view.root.visible=false;d.getGun().group.visible=false;
   d.getCamera().position.set(0,1.45,9.8);d.getCamera().lookAt(0,1,6);
   window.pixels=()=>{d.renderFrame();const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,bytes=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
   window.compare=(a,b)=>{let changed=0,total=0;for(let i=0;i<a.length;i+=4){const diff=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(diff>12)changed++;total+=diff;}return {changed,mean:total/(a.length/4*3)};};
   d.renderFrame();
  });
  await page.addStyleTag({content:'#hud,#pvp-score,#pvp-status,#tip-bar,#fallback-hint,#notice-pop,#dialog-overlay,#crosshair,#weapon-slots,#weapon-hud,#killfeed,#achievement-pop{visibility:hidden!important}'});
  async function capture(name){await page.evaluate(()=>{window.renderArt=true;function tick(){if(renderArt){d.renderFrame();nativeRaf(tick);}}tick();});await page.waitForTimeout(140);await page.screenshot({path:path.join(OUT,name+'.webp')});await page.evaluate(()=>{window.renderArt=false;});await page.waitForTimeout(35);}
  report.style=await page.evaluate(()=>d.getRenderStyle());
  check('角色 / 场景 / 金属材质接入，HDR 描边、体积雾和 FXAA 生效',report.style.materials.roles.character===2&&report.style.materials.roles.world>10&&report.style.materials.roles.metal>0&&report.style.pipeline.passes===4&&report.style.pipeline.depth&&report.style.pipeline.hdr);
  const draws=await page.evaluate(()=>{worldDraws=0;d.renderFrame();return worldDraws;});
  check('描边与抗锯齿仅追加屏幕处理，世界场景每帧绘制一次',draws===1);
  report.outline=await page.evaluate(()=>{const withInk=pixels(),saved=FishRenderStyle.settings;FishRenderStyle.settings=()=>Object.assign(saved(),{outline:0});const withoutInk=pixels();FishRenderStyle.settings=saved;return compare(withInk,withoutInk);});
  check('真实像素对比确认轮廓线改变画面，而非仅设置开关',report.outline.changed>1000);
  report.coveredOutline=await page.evaluate(()=>{const cover=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({color:0x8899aa,transparent:true,opacity:1,depthWrite:false,depthTest:false}));cover.position.z=-1;cover.renderOrder=9999;d.getCamera().add(cover);const a=pixels(),saved=FishRenderStyle.settings;FishRenderStyle.settings=()=>Object.assign(saved(),{outline:0});const b=pixels();FishRenderStyle.settings=saved;cover.removeFromParent();cover.geometry.dispose();cover.material.dispose();return compare(a,b);});
  check('不写深度的特效完全盖住画面时，背后的建筑线条不穿透显示',report.coveredOutline.changed<30);
  report.selfShadow=await page.evaluate(()=>{
   const meshes=new Set();actors.forEach(e=>e.character.root.traverse(o=>{if(o.isMesh)meshes.add(o);}));
   const others=[];world.traverse(o=>{if(o.isMesh&&o.castShadow&&!meshes.has(o)){others.push(o);o.castShadow=false;}});
   const receiving=[...meshes].filter(o=>o.receiveShadow),a=pixels();receiving.forEach(o=>o.receiveShadow=false);const b=pixels();receiving.forEach(o=>o.receiveShadow=true);others.forEach(o=>o.castShadow=true);
   const light=world.children.find(o=>o.isDirectionalLight);
   return Object.assign(compare(a,b),{parts:receiving.length,bias:light.shadow.bias,enabled:renderer.shadowMap.enabled,autoUpdate:renderer.shadowMap.autoUpdate,light:light.position.toArray(),target:light.target.position.toArray(),actors:actors.map(e=>({position:e.mesh.position.toArray(),bounds:new THREE.Box3().setFromObject(e.character.root).getSize(new THREE.Vector3()).toArray(),meshes:e.character.meshes.map(m=>({name:m.name,visible:m.visible,cast:m.castShadow,receive:m.receiveShadow,material:m.material.type}))}))});
  });
  await capture('01-character-shadows');
  check('仅保留角色投影时，接收阴影仍改变角色像素：真实自投影有效',report.selfShadow.parts>5&&report.selfShadow.changed>300);
  report.preset=await page.evaluate(()=>{const before=actors.map(e=>e.character.capsules.map(c=>[...c.a,...c.b,c.radius])),styled=pixels();d.setRenderStyle('classic');const classic=pixels(),passes=d.getRenderStyle().pipeline.passes;d.setRenderStyle('western');return {difference:compare(styled,classic),passes,hitboxesStable:JSON.stringify(before)===JSON.stringify(actors.map(e=>e.character.capsules.map(c=>[...c.a,...c.b,c.radius])))};});
  check('原风格对照可切换，部位碰撞与世界位置不变',report.preset.passes===1&&report.preset.difference.changed>5000&&report.preset.hitboxesStable);
  report.ownerShadow=await page.evaluate(()=>{
   actors.forEach(e=>{e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});
   const p=d.getPlayer();p.pos.set(0,0,12);p.yaw=-.9;p.pitch=-.70;d.setState('playing');d.updatePlayer(0);d.syncCharacters(.08);d.setState('paused');
   const root=d.getCharacters().local.root,meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
   const originals=meshes.map(m=>m.material),callbacks=meshes.map(m=>m.onBeforeRender),flags=[];
   meshes.forEach(m=>{m.onBeforeRender=function(r,s,c,g,material){flags.push(!material.colorWrite&&!material.depthWrite);};});
   const a=pixels(),casters=meshes.filter(m=>m.castShadow);casters.forEach(m=>m.castShadow=false);const b=pixels();casters.forEach(m=>m.castShadow=true);
   const result=Object.assign(compare(a,b),{proxyDraws:flags.length,casters:casters.length,position:root.position.toArray(),camera:d.getCamera().position.toArray(),hiddenInBeauty:flags.length>0&&flags.every(Boolean),materialsRestored:meshes.every((m,i)=>m.material===originals[i])});
   meshes.forEach((m,i)=>m.onBeforeRender=callbacks[i]);d.getCharacters().view.root.visible=true;d.getGun().group.visible=true;return result;
  });
  await capture('06-first-person-body-shadow');
  check('第一人称隐藏身体颜色和深度，但完整人物确实向地面投影',report.ownerShadow.changed>300&&report.ownerShadow.hiddenInBeauty&&report.ownerShadow.materialsRestored);
  report.helmetShadow=await page.evaluate(()=>{const p=d.getPlayer();d.equipHelmet(p,FishEquipment.helmetId);d.syncCharacters(.03);const helmet=d.getCharacters().local.root.getObjectByName('equipment/iron-rice-bowl'),a=pixels();helmet.visible=false;const b=pixels();helmet.visible=true;const result=compare(a,b);d.equipHelmet(p,null);return result;});
  check('佩戴头盔后，第一人称地面投影也包含实际头盔轮廓',report.helmetShadow.changed>100);
  await page.evaluate(()=>{d.getCharacters().view.root.visible=false;d.getGun().group.visible=false;});
  await page.evaluate(()=>{actors.forEach(e=>{e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});d.getCamera().position.set(-3,4,17);d.getCamera().lookAt(0,1,-22);});
  await capture('02-fps-map');
  await page.setViewportSize({width:1080,height:720});
  const size=await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));d.renderFrame();return d.getRenderStyle().pipeline;});
  check('桌面窗口缩放同步颜色、深度和体积雾目标',size.width===1080&&size.height===720&&size.targets===3&&size.fog.width===540);
  await page.setViewportSize({width:1440,height:900});
  report.fx=await page.evaluate(()=>{d.getCamera().position.set(0,2.5,14);d.getCamera().lookAt(0,1,6);d.previewExplosion(0,1,6,3);d.setState('playing');d.update(.06);d.setState('paused');d.renderFrame();const shapes=[];world.traverse(o=>{if(o.visible&&o.material&&o.material.name==='Anime/CombatFX')shapes.push(o.material.uniforms.uShape.value);});return {shapes,pool:d.getCombatFxStats(),muzzle:d.getGun().flashMesh.material.name};});
  check('爆炸、烟团、速度线、枪焰使用卡通着色器',report.fx.shapes.includes(0)&&report.fx.shapes.includes(1)&&report.fx.shapes.includes(3)&&report.fx.muzzle==='Anime/CombatFX');
  await capture('03-grenade-burst');
  const pool=await page.evaluate(()=>{for(let i=0;i<30;i++)d.previewExplosion(0,1,6,3);d.renderFrame();return d.getCombatFxStats();});
  check('连续爆炸仍使用 112 个特效对象的有界池',pool.allocated<=112&&pool.active<=112);
  report.cycles=[];
  for(let n=0;n<3;n++){
   const cycle=await page.evaluate(()=>{d.restart(true);const released=d.getRenderStyle().pipeline;d.startPvp({teamSize:16});d.enterFallback();d.setState('paused');d.syncCharacters(.1);d.renderFrame();return {released,actors:d.getEnemies().length+1,scene:d.getSceneStats(),style:d.getRenderStyle()};});report.cycles.push(cycle);
  }
  check('32 人重复部署，后处理目标离场释放、再次进入正常分配',report.cycles.every(c=>!c.released.allocated&&c.released.targets===0&&c.actors===32&&c.style.pipeline.targets===3));
  check('预热后重复进场的 GPU 几何、纹理和材质数量稳定',report.cycles[1].scene.geometries===report.cycles[2].scene.geometries&&report.cycles[1].scene.textures===report.cycles[2].scene.textures&&report.cycles[1].style.materials.materials===report.cycles[2].style.materials.materials);
  await page.evaluate(()=>{
   d.restart(true);d.enterGameWorld();d.restart();d.enterFallback();d.clearCovers();d.getWave().state='test';d.getEnemies().forEach(e=>{e.alive=false;e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});d.getPlayer().pos.set(0,0,36);d.getPlayer().yaw=0;d.getPlayer().pitch=-.06;d.setState('playing');d.updatePlayer(0);d.setState('paused');d.getCharacters().view.root.visible=false;d.getGun().group.visible=false;
   world=d.getCamera().parent;window.step=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=.025)d.update(Math.min(.025,seconds-t));d.setState('paused');};
   d.setState('playing');const e=d.spawnEnemy('bomber',0,17);d.explodeBomber(e);step(4);d.getCamera().position.set(0,2.6,44);d.getCamera().lookAt(0,6,17);d.renderFrame();
  });
  check('无尽大蘑菇云继续保留独立合批与长时间演出',await page.evaluate(()=>d.getBomberFxStats().world.clouds===1&&d.getBomberFxStats().world.partsPerCloud>=70));
  await capture('04-anime-mushroom');
  report.themes=await page.evaluate(()=>{const exposure=[];for(let i=0;i<4;i++){d.setEnvTheme(i,false);d.renderFrame();exposure.push(renderer.toneMappingExposure);}d.setEnvTheme(0,false);return exposure;});
  check('昼夜和天气主题均可绘制，夜间曝光未被强制改成白天',new Set(report.themes).size>1);
  await page.evaluate(()=>{d.getPlayer().pos.set(0,0,24);d.getPlayer().pitch=-.1;d.updatePlayer(0);step(1);d.renderFrame();});
  const rad=await page.evaluate(()=>({screen:d.getBomberFxStats().screen,pipeline:d.getRenderStyle().pipeline}));report.radiation=rad;
  check('绿色辐射撕裂共用同一套后处理目标',rad.screen.remaining>0&&rad.screen.sharedPipeline&&rad.pipeline.targets===2);
  await capture('05-radiation');
  const local=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:2});
  local.on('pageerror',e=>report.errors.push(e.message));local.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))report.shaderErrors.push(m.text());});
  await local.goto(require('node:url').pathToFileURL(path.join(__dirname,'../index.html')).href);
  await local.click('#btn-start');await local.click('#btn-pvp-mode');
  await local.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  report.localFile=await local.evaluate(()=>{const d=FishGame.__debug;d.setState('paused');d.renderFrame();return {style:d.getRenderStyle(),view:d.getCharacters().view.meshes.map(m=>({name:m.name,visible:m.visible,castShadow:m.castShadow})),flash:d.getGun().flashMesh.material.name};});
  check('file:// 直接启动和桌面高分屏均能进入实际三渲二场景',report.localFile.style.pipeline.width===1920&&report.localFile.style.pipeline.height===1280&&report.localFile.style.pipeline.passes===4);
  check('第一人称仍只显示双臂，世界角色阴影不改写本地可见规则',report.localFile.view.every(m=>m.visible===(m.name==='Mesh_Arms')&&!m.castShadow)&&report.localFile.flash==='Anime/CombatFX');
  await local.close();
  check('无 JavaScript 异常及 WebGL / GLSL 编译错误',report.errors.length===0&&report.shaderErrors.length===0);
  fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));console.log('ALL ANIME STYLE TESTS PASSED');
 }finally{fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
