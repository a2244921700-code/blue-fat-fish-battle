/* 战斗表现真实 WebGL 回归。先 node server.js；Playwright 环境配置同 browser-art-test.cjs。 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=process.env.FISH_COMBAT_OUTPUT||path.join(__dirname,'combat-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],shaderErrors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))shaderErrors.push(m.text());});
    await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');
    await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
    await page.click('#btn-start');await page.click('#btn-level-desert');
    await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.clearCovers();d.setState('paused');});
    await page.addStyleTag({content:'#fallback-hint,#notice-pop {visibility:hidden!important;}'});
    async function render(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
    const aim=await page.evaluate(()=>{
      const d=FishGame.__debug,p=d.getPlayer(),cases=[];
      for(const variant of [0,3,4]){
        d.clearBossNow();d.spawnBossNow(variant);const b=d.getBoss();b.mesh.position.set(0,3,15);
        for(const pt of [[0,0,29,0],[12,4,21,1.3],[-14,0,9,-2.2],[1,7,16,Math.PI]]){
          p.pos.set(pt[0],pt[1],pt[2]);p.yaw=pt[3];d.updateBossWeaponAim();d.clearProjectiles();
          for(const off of (b.mode==='barrage'?[0,-d.CFG.bossBarrageSpread,d.CFG.bossBarrageSpread]:[0])){
            d.fireBossBall(off);const shot=d.getBossShots().at(-1),tip=b.weapon.muzzles?b.weapon.muzzles[shot.muzzleIndex]:b.weapon.muzzleTip;
            const from=tip.getWorldPosition(new THREE.Vector3()),forward=FishCombat.muzzleDirection(tip,new THREE.Vector3());
            const dir=shot.vel.clone().normalize();
            const target=new THREE.Vector3(p.pos.x,p.pos.y+d.CFG.eyeHeight,p.pos.z);
            const desired=target.sub(from).normalize();if(off)desired.applyAxisAngle(new THREE.Vector3(0,1,0),-off);
            cases.push({mode:b.mode,spawnError:from.distanceTo(shot.mesh.position),alignment:forward.dot(dir),targetAlignment:off?null:desired.dot(dir),speed:shot.vel.length()});
          }
        }
      }
      d.clearBossNow();d.clearProjectiles();return cases;
    });
    aim.forEach(c=>{assert(c.spawnError<1e-6,'弹丸必须来自物理炮口');assert(c.alignment>.99999,'炮管轴必须与出膛速度一致');if(c.targetAlignment!==null)assert(c.targetAlignment>.9999,'主炮必须朝玩家瞄准');assert(c.speed>0);});
    await page.evaluate(()=>{const d=FishGame.__debug;d.restart();d.clearCovers();d.getPlayer().pos.set(0,0,29);d.getPlayer().yaw=0;d.getPlayer().pitch=0;d.setState('playing');d.update(.001);d.setState('paused');});
    async function selectWeapon(key,id){
      await page.evaluate(()=>FishGame.__debug.setState('playing'));
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(()=>{const d=FishGame.__debug;d.setState('paused');return d.getWeapon();}),id,'截图前确认实际切换武器');
    }
    for(const [key,id,name] of [['Digit1','pistol','01-pistol'],['Digit2','rifle','02-rifle'],['Digit3','knife','03-knife']]){
      await selectWeapon(key,id);await render();await page.screenshot({path:path.join(OUT,name+'.png')});
    }
    await selectWeapon('Digit2','rifle');
    const fire=await page.evaluate(()=>{
      const d=FishGame.__debug;d.setState('playing');d.setAmmo(20,100);d.update(.3);d.shootOnce();d.setState('paused');
      const gun=d.getGun();return {flash:gun.flashMesh.visible,active:d.getCombatFxStats().active,mag:d.getAmmo().mag};
    });
    assert(fire.flash&&fire.active>0&&fire.mag===19,'枪焰、弹道与实际射击同时发生');
    await render();await page.screenshot({path:path.join(OUT,'04-rifle-fire.png')});
    const reload=await page.evaluate(()=>{
      const d=FishGame.__debug;d.setState('playing');d.update(.1);d.setAmmo(1,100);d.reload();d.update(.8);d.update(0);
      const g=d.getGun();const before=g.group.rotation.z;d.setState('paused');d.update(.8);
      return {tilt:before,frozen:g.group.rotation.z===before,magY:g.rifleGroup.magazine.position.y};
    });
    assert(reload.tilt<-.2&&reload.frozen&&reload.magY<-.1,'换弹模型姿势和弹匣移动，暂停冻结');
    await render();await page.screenshot({path:path.join(OUT,'05-reload.png')});
    await page.evaluate(()=>{const d=FishGame.__debug;d.setAmmo(7,42);d.setState('playing');d.update(0);d.setState('paused');});
    await selectWeapon('Digit1','pistol');
    for(let i=0;i<5;i++) {
      await page.evaluate(i=>{
        const d=FishGame.__debug;d.clearBossNow();d.clearProjectiles();d.spawnBossNow(i);
        d.getBoss().mesh.position.set(0,3,18);d.getBoss().fireTimer=99;
        const p=d.getPlayer();p.pos.set(2.5,0,29);p.yaw=.18;p.pitch=.03;
        d.setState('playing');d.update(.001);d.setState('paused');d.updateBossWeaponAim();
      },i);
      await render();await page.screenshot({path:path.join(OUT,'boss-'+i+'.png')});
    }
    await page.evaluate(()=>{
      const d=FishGame.__debug;d.clearBossNow();d.clearProjectiles();d.setState('playing');d.update(.2);d.setState('paused');
      d.previewExplosion(0,1,22,4);d.setState('playing');d.update(.14);d.setState('paused');
    });
    await render();await page.screenshot({path:path.join(OUT,'06-explosion.png')});
    const bounded=await page.evaluate(()=>{
      const d=FishGame.__debug;for(let i=0;i<120;i++)d.previewExplosion(i%5,1,22,4);
      const full=d.getCombatFxStats();d.restart(true);return {full,cleared:d.getCombatFxStats()};
    });
    assert(bounded.full.allocated<=bounded.full.capacity&&bounded.full.active<=bounded.full.capacity);
    assert.equal(bounded.cleared.active,0,'重开必须清空特效');
    // 所有 Boss、枪焰和烟团实际绘制之后，检查复用缓存不逐局增长。
    const cycles=[];
    for(let n=0;n<4;n++) {
      await page.evaluate(()=>{const d=FishGame.__debug;d.enterGameWorld();d.enterFallback();d.clearCovers();d.setState('paused');});
      for(let i=0;i<5;i++){
        await page.evaluate(i=>{const d=FishGame.__debug;d.clearBossNow();d.spawnBossNow(i);d.getBoss().mesh.position.set(0,3,29);d.updateBossWeaponAim();if(i===0||i===3||i===4)d.fireBossBall(0);},i);await render();
      }
      await page.evaluate(()=>{FishGame.__debug.previewExplosion(0,1,34,3);});await render();
      await page.evaluate(()=>FishGame.__debug.restart(true));await render();
      cycles.push(await page.evaluate(()=>({scene:FishGame.__debug.getSceneStats(),fx:FishGame.__debug.getCombatFxStats()})));
    }
    const warm=cycles[1];for(const c of cycles.slice(2)){assert.equal(c.scene.geometries,warm.scene.geometries);assert.equal(c.scene.textures,warm.scene.textures);assert.equal(c.fx.active,0);assert.equal(c.fx.allocated,warm.fx.allocated);}
    assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);
    const report={aimCases:aim.length,worstSpawnError:Math.max(...aim.map(c=>c.spawnError)),worstBarrelAlignment:Math.min(...aim.map(c=>c.alignment)),fire,reload,bounded,cycles,errors,shaderErrors};
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('ALL BROWSER COMBAT TESTS PASSED');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
