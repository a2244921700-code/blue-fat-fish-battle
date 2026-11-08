/* Real desktop Edge: fixed western style, saved atmosphere and legacy migration. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'western-default-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[],shaderErrors:[]};
 const check=(name,pass)=>{assert(pass,name);report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))report.shaderErrors.push(m.text());});
  await page.addInitScript(()=>{
   window.nativeRaf=requestAnimationFrame;window.requestAnimationFrame=f=>nativeRaf(t=>{if(!window.freezeStyles)f(t);});
   if(!sessionStorage.fishStylesSeeded){localStorage.setItem('bff_save_v1',JSON.stringify({v:4,bestScore:4321,settings:{bgm:.35,shadow:true,renderStyle:'anime',volumetricFog:false}}));sessionStorage.fishStylesSeeded='yes';}
  });
  await page.goto('http://127.0.0.1:8123/');
  const migration=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('bff_save_v1')),prefs:FishGame.__debug.getVisualPreferences()}));report.migration=migration;
  check('旧二次元存档迁移为美式卡通，保留音量、最高记录和关闭雾效',migration.save.bestScore===4321&&migration.save.settings.bgm===.35&&migration.save.settings.renderStyle==='western'&&migration.prefs.style==='western'&&!migration.prefs.volumetricFog);
  await page.click('#btn-settings-menu');
  check('主菜单没有画风切换，体积雾入口仍限定在大厅',await page.locator('input[name="render-style"]').count()===0&&await page.locator('#set-volume-fog').isDisabled());await page.click('#btn-settings-close');
  await page.click('#btn-start');await page.click('#btn-lobby-settings');
  check('大厅显示美式卡通当前画面，只有 FPS 体积雾可调整',await page.locator('.style-current').innerText().then(s=>s.includes('美式卡通')&&!s.includes('二次元'))&&await page.locator('#set-volume-fog').isEnabled());
  await page.check('#set-volume-fog');await page.uncheck('#set-volume-fog');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bff_save_v1')).settings);
  check('选择自动保存，原有设置没有被覆盖',saved.renderStyle==='western'&&saved.volumetricFog===false&&saved.bgm===.35);
  await page.reload();await page.click('#btn-start');await page.click('#btn-lobby-settings');
  check('刷新后保持固定美式卡通和关闭雾效',await page.evaluate(()=>FishRenderStyle.getPreset()==='western')&&!await page.locator('#set-volume-fog').isChecked());
  await page.check('#set-volume-fog');await page.click('#btn-settings-close');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{
   window.freezeStyles=true;window.d=FishGame.__debug;d.enterFallback();d.setState('paused');window.world=d.getCamera().parent;
   world.onBeforeRender=renderer=>{window.renderer=renderer;window.worldDraws=(window.worldDraws||0)+1;};
   d.getPvpTactics().step=()=>{};
   window.actors=[d.getEnemies().find(e=>e.team==='blue'),d.getEnemies().find(e=>e.team==='red')];
   d.getEnemies().forEach(e=>{e.alive=actors.includes(e);e.mesh.visible=e.alive;if(e.groundShadow)e.groundShadow.visible=e.alive;});
   actors.forEach((e,i)=>{d.equipHelmet(e,null);e.mesh.position.set(i?1.4:-1.4,e.baseY,5);e.charLastPos.copy(e.mesh.position);e.brain.yaw=0;e.brain.aim={x:0,y:1.5,z:11};e.brain.reload=0;e.character.cancelAttack();if(e.teamTag)e.teamTag.visible=false;});
   d.setState('playing');d.syncCharacters(.1);d.setState('paused');d.getCharacters().view.root.visible=false;d.getGun().group.visible=false;d.getCamera().position.set(0,2.3,11.5);d.getCamera().lookAt(0,1.3,1);
   window.pixels=()=>{d.renderFrame();const gl=renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
   window.diff=(a,b)=>{let changed=0,total=0;for(let i=0;i<a.length;i+=4){let delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(delta>12)changed++;total+=delta;}return {changed,mean:total/(a.length/4*3)};};d.renderFrame();
  });
  await page.addStyleTag({content:'#hud,#pvp-score,#pvp-status,#tip-bar,#fallback-hint,#notice-pop,#crosshair,#weapon-slots,#weapon-hud,#killfeed,#achievement-pop,#dialog-overlay{visibility:hidden!important}'});
  async function capture(file){await page.evaluate(()=>{window.renderStyles=true;function loop(){if(renderStyles){d.renderFrame();nativeRaf(loop);}}loop();});await page.waitForTimeout(160);await page.screenshot({path:file,quality:85});await page.evaluate(()=>{window.renderStyles=false;});await page.waitForTimeout(40);}
  // The gameplay RAF is deliberately frozen for deterministic pixel captures;
  // use timer polling while the browser delivers its asynchronous resize event.
  async function resizePlayfield(width,height){await page.setViewportSize({width,height});await page.waitForFunction(([w,h])=>renderer.domElement.width===w&&renderer.domElement.height===h,[width,height],{polling:50,timeout:10000});}
  report.initial=await page.evaluate(()=>{worldDraws=0;d.renderFrame();return {draws:worldDraws,style:d.getRenderStyle()};});
  check('保存的美式卡通进入实战，复用场景深度和阳光阴影进行 16 步体积积分',report.initial.style.materials.preset==='western'&&report.initial.style.pipeline.passes===4&&report.initial.style.pipeline.fog.shadowed&&report.initial.style.pipeline.fog.steps===16&&report.initial.draws===1);
  check('雾效采用半分辨率缓冲，不额外绘制世界场景',report.initial.style.pipeline.fog.width===720&&report.initial.style.pipeline.fog.height===450&&report.initial.style.pipeline.targets===3);
  report.styles=await page.evaluate(()=>{const caps=actors.map(e=>e.character.capsules.map(c=>[...c.a,...c.b]));let rejected=false;try{d.setRenderStyle('anime');}catch(e){rejected=/Unknown render style/.test(e.message);}return {rejected,preset:FishRenderStyle.getPreset(),fx:FishRenderStyle.fxUniforms.western.value,stable:JSON.stringify(caps)===JSON.stringify(actors.map(e=>e.character.capsules.map(c=>[...c.a,...c.b])))};});
  check('正式运行库已停用二次元预设，人物、特效和碰撞保持美式卡通状态',report.styles.rejected&&report.styles.preset==='western'&&report.styles.fx===1&&report.styles.stable);
  await capture(path.join(OUT,'01-western-default.webp'));
  await page.evaluate(()=>{actors.forEach(e=>{e.mesh.visible=false;if(e.groundShadow)e.groundShadow.visible=false;});d.getCamera().position.set(-6,4.9,25);d.getCamera().lookAt(-6,2,-16);});
  report.fog=await page.evaluate(()=>{const density=FishVolumeFog.parameters.density;FishVolumeFog.parameters.density=0;const clear=pixels();FishVolumeFog.parameters.density=density;const fog=pixels();return diff(clear,fog);});
  check('体积雾实际改变远处场景像素，形成空气透视',report.fog.changed>20000&&report.fog.mean>.3);
  await capture(path.join(OUT,'03-fog-mid.webp'));
  await page.evaluate(()=>{window.oldDensity=FishVolumeFog.parameters.density;FishVolumeFog.parameters.density=0;});await capture(path.join(OUT,'04-clear-mid.webp'));await page.evaluate(()=>{FishVolumeFog.parameters.density=oldDensity;});
  report.scatteringShadows=await page.evaluate(()=>{const shadowed=pixels();FishVolumeFog.parameters.shadowStrength=0;const unshadowed=pixels();FishVolumeFog.parameters.shadowStrength=1;return diff(shadowed,unshadowed);});
  check('仅改变雾内阳光遮挡时画面产生差异，体积光读取真实阴影',report.scatteringShadows.changed>1000);
  await page.evaluate(()=>{d.getCamera().position.set(60,3.5,21);d.getCamera().lookAt(59,6,-32);});await capture(path.join(OUT,'07-fog-a-long.webp'));
  await page.evaluate(()=>{d.getCamera().position.set(-54,4.9,22);d.getCamera().lookAt(-54,4.7,-25);});await capture(path.join(OUT,'08-fog-tunnel.webp'));
  report.near=await page.evaluate(()=>{const cover=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0x557799}));cover.position.z=-.5;d.getCamera().add(cover);const fog=pixels(),density=FishVolumeFog.parameters.density;FishVolumeFog.parameters.density=0;const clear=pixels();FishVolumeFog.parameters.density=density;cover.removeFromParent();cover.geometry.dispose();cover.material.dispose();return diff(clear,fog);});
  check('近处深度截止，第一人称武器距离不会被远处雾染白',report.near.changed===0);
  await resizePlayfield(1080,720);
  const resized=await page.evaluate(()=>{d.renderFrame();return d.getRenderStyle().pipeline;});check('桌面窗口缩放同步主画面及半分辨率雾缓冲',resized.width===1080&&resized.fog.width===540&&resized.fog.height===360);await resizePlayfield(1440,900);
  await page.evaluate(()=>{d.setRenderStyle('western');d.setState('paused');document.getElementById('btn-settings-pause').click();});
  check('对局暂停设置没有画风切换，体积雾仍锁定',await page.locator('input[name="render-style"]').count()===0&&await page.locator('#set-volume-fog').isDisabled());
  const blocked=await page.evaluate(()=>{const f=document.getElementById('set-volume-fog');f.disabled=false;f.checked=false;f.dispatchEvent(new Event('change'));return {prefs:d.getVisualPreferences(),style:d.getRenderStyle().materials.preset,disabled:f.disabled,save:JSON.parse(localStorage.getItem('bff_save_v1')).settings};});
  check('即使强行派发控件事件，也不能在场景内修改或写入存档',blocked.disabled&&blocked.prefs.style==='western'&&blocked.prefs.volumetricFog&&blocked.style==='western'&&blocked.save.renderStyle==='western');
  await capture(path.join(OUT,'05-locked-settings.webp'));
  await page.evaluate(()=>{document.getElementById('btn-settings-close').click();d.restart(true);document.getElementById('btn-start').click();document.getElementById('btn-lobby-settings').click();});
  check('返回大厅后重新开放雾效设置，画风继续固定',await page.locator('#set-volume-fog').isEnabled()&&await page.locator('input[name="render-style"]').count()===0);
  await page.uncheck('#set-volume-fog');await page.click('#btn-settings-close');
  await page.evaluate(()=>{d.startPvp({teamSize:16});d.enterFallback();d.setState('paused');d.syncCharacters(.1);d.renderFrame();});
  report.off=await page.evaluate(()=>({style:d.getRenderStyle(),actors:d.getEnemies().length+1}));
  check('关闭雾效后不分配雾缓冲、不执行体积积分，32 人保持美式卡通',report.off.style.materials.preset==='western'&&report.off.actors===32&&!report.off.style.pipeline.fog.active&&report.off.style.pipeline.targets===2&&report.off.style.pipeline.passes===3);
  report.cycles=[];
  for(let i=0;i<3;i++)report.cycles.push(await page.evaluate(()=>{d.restart(true);const released=d.getRenderStyle().pipeline;document.getElementById('btn-start').click();document.getElementById('btn-lobby-settings').click();const fog=document.getElementById('set-volume-fog');fog.checked=true;fog.dispatchEvent(new Event('change'));document.getElementById('btn-settings-close').click();d.startPvp({teamSize:16});d.enterFallback();d.setState('paused');d.syncCharacters(.1);d.renderFrame();return {released,scene:d.getSceneStats(),pipeline:d.getRenderStyle().pipeline};}));
  check('反复进出保持美式卡通，离场释放所有画面缓冲，预热后资源数稳定',report.cycles.every(c=>c.released.targets===0&&c.pipeline.targets===3&&c.pipeline.style==='western')&&report.cycles[1].scene.textures===report.cycles[2].scene.textures&&report.cycles[1].scene.geometries===report.cycles[2].scene.geometries);
  const endless=await page.evaluate(()=>{d.restart(true);d.enterGameWorld();d.restart();d.enterFallback();d.setState('paused');d.renderFrame();return d.getRenderStyle();});
  check('无尽保留所选画风，但不加载 FPS 体积雾',endless.materials.preset==='western'&&!endless.pipeline.fog.active&&endless.pipeline.targets===2);
  await page.reload();await page.click('#btn-start');await page.click('#btn-lobby-settings');await page.waitForFunction(()=>[...document.querySelectorAll('.style-current img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:path.join(OUT,'06-lobby-settings.webp'),quality:85});
  const layout=await page.locator('.settings-panel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth};});
  check('大厅实机预览正常载入，桌面设置面板没有横向溢出',!layout.overflow&&layout.left>=0&&layout.right<=1440&&layout.top>=0&&layout.bottom<=900);
  await page.setViewportSize({width:1024,height:768});
  const narrow=await page.locator('.settings-panel').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,right:el.getBoundingClientRect().right}));
  check('1024 像素宽的桌面窗口仍可操作全部设置',!narrow.overflow&&narrow.right<=1024);
  const local=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:2});
  local.on('pageerror',e=>report.errors.push(e.message));local.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))report.shaderErrors.push(m.text());});
  await local.goto(require('node:url').pathToFileURL(path.join(__dirname,'../index.html')).href);await local.click('#btn-start');await local.click('#btn-pvp-mode');
  await local.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  const file=await local.evaluate(()=>{const d=FishGame.__debug;d.setState('paused');d.renderFrame();return d.getRenderStyle();});report.file=file;
  check('全新存档 file:// 与 DPR 2 默认启用美式卡通和体积雾',file.materials.preset==='western'&&file.pipeline.width===1920&&file.pipeline.fog.width===960&&file.pipeline.fog.height===640);
  await local.close();
  check('无脚本异常或 WebGL / GLSL 编译错误',report.errors.length===0&&report.shaderErrors.length===0);
  console.log('ALL RENDER OPTIONS TESTS PASSED');
 }finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
