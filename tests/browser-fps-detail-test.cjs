'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'fps-detail-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 function check(name,ok){assert(ok,name);report.checks.push(name);console.log('PASS | '+name);}
 const shots=[['01-mid',[0,1.85,24],[0,2,-12]],['02-join',[-17.5,1.9,63],[-13.5,3.5,56]],['03-door',[7,1.9,10],[0,2.8,0]],['04-market',[43,1.85,12],[54,2,-5]],['05-approach',[-58,1.85,49],[-51,3,32]],['06-passage',[50,1.85,37],[48,2,8]]];
 try{
  for(const version of ['before','after']){
   const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(version+': '+e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))report.errors.push(m.text());});
   if(version==='before')for(const file of ['game.js','fps-map.js'])await page.route('**/js/'+file,route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../backups/codex-fps-detail-grenades-2026-10-25/js/'+file),'utf8')}));
   await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
   await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({teamSize:8});d.enterFallback();d.getPvpTactics().step=()=>{};for(let i=0;i<48;i++)d.update(.1);d.setState('paused');d.getGun().group.scale.setScalar(.00001);d.getEnemies().forEach(e=>e.mesh.visible=false);document.querySelectorAll('body *:not(#game-canvas)').forEach(el=>el.style.setProperty('visibility','hidden','important'));});
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));FishGame.__debug.setState('paused');});
   for(const [name,pos,target] of shots){
    await page.evaluate(({pos,target})=>{const d=FishGame.__debug,c=d.getCamera();d.setState('paused');c.position.set(...pos);c.lookAt(...target);},{pos,target});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const actual=await page.evaluate(()=>FishGame.__debug.getCamera().position.toArray());assert.deepEqual(actual,pos,'Screenshot camera moved: '+name);
    await page.screenshot({path:path.join(OUT,version+'-'+name+'.png')});
   }
   report[version]=await page.evaluate(()=>{
    const d=FishGame.__debug,scene=d.getCamera().parent,sun=scene.children.find(o=>o.isDirectionalLight),hemi=scene.children.find(o=>o.isHemisphereLight);return {stats:d.getSceneStats(),lighting:{shadow: sun.shadow.mapSize.toArray(),left:sun.shadow.camera.left,right:sun.shadow.camera.right,sun:sun.color.getHexString(),hemi:hemi.color.getHexString()},map:d.getMap().gates};
   });
   if(version==='after'){
    check('新场景保留 FPS 大地图范围并增加近景结构',report.after.stats.arena===76&&report.after.stats.modelParts>report.before.stats.modelParts*2);
    check('新门按铰链打开，两侧叶片不与墙面平行',report.after.map.length===2&&report.after.map.every(l=>Math.abs(l.angle)>Math.PI/3));
    check('阴影纹理与正交范围适配大地图',report.after.lighting.shadow[0]===4096&&report.after.lighting.left===-112&&report.after.lighting.right===112);
    check('模型合批保持可控绘制提交',report.after.stats.renderCalls<850);
    const memory=[];for(let rebuild=0;rebuild<3;rebuild++){
     await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);d.startPvp({teamSize:8});d.enterFallback();d.setState('paused');});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));memory.push(await page.evaluate(()=>FishGame.__debug.getSceneStats()));
    }
    report.rebuilds=memory;check('连续重建三次不累积几何体、纹理或碰撞体',memory.every(s=>s.geometries===memory[0].geometries&&s.textures===memory[0].textures&&s.obstacles===memory[0].obstacles));
   }
   await page.close();
  }
  check('修改前后场景预览没有脚本或着色器错误',!report.errors.length);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('FPS detail browser: '+report.checks.length+' checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
