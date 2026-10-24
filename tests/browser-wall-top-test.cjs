/* 墙顶重叠面回归。先 node server.js，再运行；Playwright 配置同其他 browser 测试。
 * FISH_WALL_BASELINE=1 仅采集修复前证据；正常模式会断言没有共面重复表面。
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=process.env.FISH_WALL_BASELINE==='1';
const OUT=path.join(__dirname,'wall-top-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});
    await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');
    await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
    await page.click('#btn-start');await page.click('#btn-level-desert');
    await page.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'));
    await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.clearCovers();d.setState('paused');});
    await page.addStyleTag({content:'#fallback-hint,#notice-pop {visibility:hidden!important;}'});
    const inspect=()=>page.evaluate(()=>{
      const d=FishGame.__debug,obstacles=d.getObstacles(),scene=obstacles[0].mesh.parent;
      const art=scene.getObjectByName('沙海哨站/环境细节');
      const meshes=obstacles.map(o=>o.mesh).concat([art]);scene.updateMatrixWorld(true);
      const samples=[['外墙',.173,-45.613,5],['中央直墙',-6.173,8.587,3.4],['中央转角',-10.721,8.701,3.4],['A区转角',-43.813,-41.827,3.2],['B区转角',43.813,-41.827,3.2],['西走廊',-21.913,-4.173,3],['东走廊屋顶',17.173,-11.137,3.8]];
      return samples.map(([name,x,z,height])=>{
        const ray=new THREE.Raycaster(new THREE.Vector3(x,12,z),new THREE.Vector3(0,-1,0));
        const hits=ray.intersectObjects(meshes,true),top=hits[0];
        // 同一面边缘可能命中两个三角形；只统计同高度的独立物体/实例。
        const topHits=hits.filter(h=>Math.abs(h.point.y-top.point.y)<1e-4);
        const surfaces=new Set(topHits.map(h=>h.object.uuid+':'+(h.instanceId??'-')));
        return {name,x,z,expectedHeight:height,top:top.point.y,surfaces:surfaces.size,triangles:topHits.length};
      });
    });
    const samples=await inspect();
    if(!baseline)for(const s of samples){assert.equal(s.surfaces,1,s.name+'不能存在重叠表面');assert.equal(s.triangles,1,s.name+'不能在同一网格内重复生成顶面');assert(Math.abs(s.top-s.expectedHeight)<1e-4,s.name+'落脚面高度不变');}
    const views=[['central',-8,3.4,8.5,-Math.PI/2,-.75],['corner',-10.5,3.4,7.4,.2,-.8],['boundary',1,5,-45.7,Math.PI/2,-.7],['roof',17,3.8,-11,.5,-.75]];
    const landings=[];
    for(const [name,x,y,z,yaw,pitch] of views){
      const landing=await page.evaluate(({x,y,z,yaw,pitch})=>{
        const d=FishGame.__debug,p=d.getPlayer();p.pos.set(x,y+.45,z);p.yaw=yaw;p.pitch=pitch;p.velY=0;p.onGround=false;
        d.setState('playing');d.inertEnemies();for(let i=0;i<45;i++)d.update(1/60);d.setState('paused');
        return {feet:p.pos.y,onGround:p.onGround};
      },{x,y,z,yaw,pitch});
      landings.push({name,expected:y,...landing});
      if(!baseline){assert(landing.onGround,name+'能够落地');assert(Math.abs(landing.feet-y)<1e-4,name+'碰撞高度不变');}
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.screenshot({path:path.join(OUT,(baseline?'before-':'after-')+name+'.png')});
    }
    let rebuilt=null;
    if(!baseline){
      await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);d.enterGameWorld();d.enterFallback();d.clearCovers();d.setState('paused');});
      rebuilt=await inspect();for(const s of rebuilt){assert.equal(s.surfaces,1,'重建后 '+s.name+'仍只有一个表面');assert.equal(s.triangles,1,'重建后 '+s.name+'仍只有一个顶面三角形');}
      assert.deepEqual(errors,[]);
    }
    const result={samples,landings,rebuilt,errors};
    fs.writeFileSync(path.join(OUT,baseline?'before.json':'report.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));console.log(baseline?'BASELINE CAPTURED':'ALL WALL TOP TESTS PASSED');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
