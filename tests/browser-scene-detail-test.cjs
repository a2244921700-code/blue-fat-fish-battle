/* 场景细化验收：真实 WebGL、通行/碰撞/射线、地图重建与模型截图。
 * 先 node server.js；PLAYWRIGHT_MODULE 配置同 browser-art-test.cjs。
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'scene-detail-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
    await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');
    await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
    await page.click('#btn-start');await page.click('#btn-level-desert');
    await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.clearCovers();d.setState('paused');});
    await page.addStyleTag({content:'#fallback-hint,#notice-pop,#env-title {visibility:hidden!important;}'});
    const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await frame();
    const models=await page.evaluate(()=>{
      const d=FishGame.__debug,scene=d.getObstacles()[0].mesh.parent,root=scene.getObjectByName('沙海商旅哨站/精细模型');
      let invalid=0;root.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position;for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))invalid++;}});
      return {detail:root.userData.detailStats,stats:d.getSceneStats(),invalid,areas:root.children.filter(o=>o.isGroup).map(o=>o.name)};
    });
    assert.equal(models.invalid,0,'新增几何不得有 NaN/Infinity');assert(models.detail.parts>1000,'应实际构建丰富模型部件');
    assert(models.detail.triangles>50000,'必须包含立体细节');assert(models.stats.renderCalls<420,'固定出生视角控制 draw call 预算');
    const paths=[];
    for(const [name,x,z,yaw,axis,direction] of [
      ['南门',0,12,0,'z',-1],['北门',0,-12,Math.PI,'z',1],
      // 东西侧原地图在 x=±12 有廊墙，从廊墙内侧验证门洞本身。
      ['东门',11,0,Math.PI/2,'x',-1],['西门',-11,0,-Math.PI/2,'x',1],
      ['西市主路',-17,12,0,'z',-1],['东市主路',17,12,0,'z',-1]
    ]){
      const p=await page.evaluate(({x,z,yaw})=>{
        const d=FishGame.__debug,p=d.getPlayer();p.pos.set(x,0,z);p.yaw=yaw;p.pitch=0;p.velY=0;p.onGround=true;
        d.inertEnemies();d.setState('playing');d.pressKey('KeyW',true);for(let i=0;i<80;i++)d.update(1/60);d.releaseKeys();d.setState('paused');return {x:p.pos.x,z:p.pos.z};
      },{x,z,yaw});
      const progress=(p[axis]-(axis==='x'?x:z))*direction;assert(progress>5,name+'应能顺畅穿过');paths.push({name,progress});
    }
    const solids=[];
    for(const [name,x,z,near] of [['陶罐',8,15,12.1],['货车',24,25,21.0],['市集柜台',-20.6,10,7.65]]){
      const p=await page.evaluate(({x,z})=>{
        const d=FishGame.__debug,p=d.getPlayer();p.pos.set(x,0,z);p.yaw=0;p.pitch=0;p.velY=0;p.onGround=true;
        d.inertEnemies();d.setState('playing');d.pressKey('KeyW',true);for(let i=0;i<100;i++)d.update(1/60);d.releaseKeys();d.setState('paused');return p.pos.z;
      },{x,z});assert(p>=near,name+'必须阻挡玩家');assert(p<z-.1,name+'前方应有可走空间');solids.push({name,z:p});
    }
    const structure=await page.evaluate(()=>{
      const d=FishGame.__debug,scene=d.getObstacles()[0].mesh.parent;scene.updateMatrixWorld(true);
      const root=scene.getObjectByName('沙海商旅哨站/精细模型');
      const ray=new THREE.Raycaster(new THREE.Vector3(24,1.1,23),new THREE.Vector3(0,0,-1),0,10);
      const hit=ray.intersectObject(root,true)[0];
      const topSamples=[[.173,-45.613,5],[-6.173,8.587,3.4],[-10.721,8.701,3.4],[-43.813,-41.827,3.2],[43.813,-41.827,3.2],[-21.913,-4.173,3],[17.173,-11.137,3.8],[2.04,9.02,3.45,3.49],[-2.04,-9.02,3.45,3.49]].map(([x,z,height,fromY])=>{
        const hits=new THREE.Raycaster(new THREE.Vector3(x,fromY||20,z),new THREE.Vector3(0,-1,0)).intersectObject(scene,true).filter(h=>h.object.isMesh);
        const top=hits[0];return {height,actual:top.point.y,coincident:hits.filter(h=>Math.abs(h.point.y-top.point.y)<1e-4).length};
      });
      const spawn=[[0,40],[-38,-30],[38,-30],[0,-22],[30,30]].map(([x,z])=>({x,z,blocked:d.getObstacles().some(o=>o.detail&&o.min.y<2.5&&o.max.y>0&&x>o.min.x-1&&x<o.max.x+1&&z>o.min.z-1&&z<o.max.z+1)}));
      return {cartRayHit:hit?{name:hit.object.name,z:hit.point.z}:null,topSamples,spawn};
    });
    assert(structure.cartRayHit&&structure.cartRayHit.z>18,'货车实体可被射线击中');
    structure.topSamples.forEach(s=>{assert.equal(s.coincident,1,'全场景射线检查不得出现重复墙顶');assert(Math.abs(s.actual-s.height)<.0001,'原墙顶采样高度不变');});
    assert(structure.spawn.every(p=>!p.blocked),'新增实体不能侵占玩家/Boss 出生区域');
    const views=[
      ['01-gate',0,0,18,0,.045,0],['02-west-market',-17,0,14,0,.03,0],
      ['03-oasis',-21,0,31,1.10,.04,0],['04-cart',28,0,24,.58,-.05,0],
      ['05-overview',31,24,43,.60,-.50,0],['06-dusk',0,0,21,0,.05,1],['07-night',0,0,21,0,.05,4]
    ];
    const viewStats=[];
    for(const [name,x,y,z,yaw,pitch,theme] of views){
      await page.evaluate(({x,y,z,yaw,pitch,theme})=>{const d=FishGame.__debug,p=d.getPlayer();d.setEnvTheme(theme,false);p.pos.set(x,y,z);p.velY=0;p.yaw=yaw;p.pitch=pitch;d.setState('playing');d.update(.001);d.setState('paused');},{x,y,z,yaw,pitch,theme});
      await frame();await page.screenshot({path:path.join(OUT,name+'.png')});viewStats.push({name,...await page.evaluate(()=>FishGame.__debug.getSceneStats())});
    }
    const cycles=[];
    for(let i=0;i<4;i++){
      await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);d.enterGameWorld();d.enterFallback();d.clearCovers();d.setState('paused');});await frame();
      const detail=await page.evaluate(()=>FishGame.__debug.getObstacles()[0].mesh.parent.getObjectByName('沙海商旅哨站/精细模型').userData.detailStats);
      assert.deepEqual(detail,models.detail,'每次重建构件数量一致，不能累积副本');
      await page.evaluate(()=>FishGame.__debug.restart(true));await frame();cycles.push(await page.evaluate(()=>FishGame.__debug.getSceneStats()));
    }
    const warmed=cycles.slice(1);assert.equal(new Set(warmed.map(c=>c.geometries)).size,1,'卸载后几何资源稳定');assert.equal(new Set(warmed.map(c=>c.textures)).size,1,'卸载后纹理资源稳定');
    assert(cycles.every(c=>c.envObjects===0&&c.obstacles===0&&c.wallMeshes===0),'退出时世界、碰撞和遮挡引用清空');
    assert.deepEqual(errors,[]);
    const result={models,paths,solids,structure,viewStats,cycles,errors};fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));console.log('ALL SCENE DETAIL TESTS PASSED');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
