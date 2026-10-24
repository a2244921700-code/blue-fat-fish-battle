/* 真实 WebGL 回归 + 美术截图。先 node server.js，再运行本脚本。
 * 开发测试需要 Playwright（游戏本身仍零依赖）。可用 PLAYWRIGHT_MODULE 指向已有模块。
 * Windows 默认使用已安装的 Edge；其他系统使用 Playwright Chromium。
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const OUT = process.env.FISH_TEST_OUTPUT || path.join(ROOT, 'tests', 'art-results');
fs.mkdirSync(OUT, { recursive: true });

(async function () {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], shaderErrors = [], failedRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error' && /THREE|WebGL|shader/i.test(msg.text())) shaderErrors.push(msg.text()); });
    page.on('requestfailed', req => { if (!req.url().endsWith('.mp3')) failedRequests.push(req.url()); });
    await page.goto(process.env.FISH_TEST_URL || 'http://127.0.0.1:8123/');
    await page.waitForFunction(() => window.FishGame && FishGame.__debug.isFishReady());
    await page.click('#btn-start');
    await page.click('#btn-level-desert');
    await page.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'));
    await page.evaluate(() => {
      const d = FishGame.__debug;
      d.enterFallback(); d.clearCovers(); d.setState('paused');
    });
    // 一帧后检查 Three.js 真正完成的渲染，而非仅检查对象是否创建。
    async function rendered() { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); }
    await rendered();
    const initial = await page.evaluate(() => FishGame.__debug.getSceneStats());
    assert(initial.renderCalls > 0 && initial.triangles > 0, '必须真实绘制场景');
    // 截图只收起临时操作提示，保持真实游戏 HUD 和实际模型。
    await page.addStyleTag({content:'#fallback-hint, #notice-pop { visibility: hidden !important; }'});
    await page.screenshot({ path: path.join(OUT, '01-courtyard.png') });

    const shot=await page.evaluate(()=>{
      const d=FishGame.__debug;d.setState('playing');
      const target=d.spawnEnemy('normal',0,36);target.waitTimer=999;target.waypoint.copy(target.mesh.position);
      d.update(0);target.mesh.updateMatrixWorld(true);d.shootOnce();
      return {dead:!target.alive,mag:d.getAmmo().mag,score:d.getScore()};
    });
    assert(shot.dead && shot.mag===6 && shot.score===10,'真实射线必须命中浅弧敌人并消耗弹药');
    await page.evaluate(()=>{const d=FishGame.__debug;d.restart();d.clearCovers();});

    // 在真实浏览器里验证开始、移动、切换武器与暂停换弹。
    await page.evaluate(() => { const d=FishGame.__debug; d.setState('playing'); d.pressKey('KeyW',true); });
    await page.waitForTimeout(250);
    const moved = await page.evaluate(() => { const d=FishGame.__debug; d.releaseKeys(); return d.getPlayer().pos.z; });
    assert(moved < 40, 'W 键必须移动玩家');
    await page.keyboard.press('Digit2');
    await page.waitForFunction(()=>!FishGame.__debug.getWeaponSwitch());
    assert.equal(await page.evaluate(() => FishGame.__debug.getWeapon()), 'rifle');
    await page.keyboard.press('Digit3');
    await page.waitForFunction(()=>!FishGame.__debug.getWeaponSwitch());
    assert.equal(await page.evaluate(() => FishGame.__debug.getWeapon()), 'knife');
    await page.keyboard.press('Digit1');
    await page.waitForFunction(()=>!FishGame.__debug.getWeaponSwitch());
    const reload = await page.evaluate(() => {
      const d=FishGame.__debug; d.setAmmo(1,42); d.reload(); d.setState('paused');
      const before=d.getAmmo().reloadTimer; d.update(.5); return [before,d.getAmmo().reloadTimer,d.getAmmo().mag];
    });
    assert.equal(reload[0], reload[1], '暂停时不能继续换弹'); assert.equal(reload[2], 1);

    // 开阔区的原画角色近景，沿用真实 spawnEnemy 与战斗模型。
    await page.evaluate(() => {
      const d=FishGame.__debug; const p=d.getPlayer();
      p.pos.set(0,0,29);p.yaw=0;p.pitch=-.025;d.setState('playing');d.update(.001);d.setState('paused');
      ['normal','shield','healer'].forEach((kind,i)=>d.spawnEnemy(kind,(i-1)*3,22));
      d.update(.016);
    });
    await rendered();
    const fishInfo=await page.evaluate(()=>{
      const e=FishGame.__debug.getEnemies()[0];const p=e.mesh.geometry.attributes.position;
      return {depth:Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i))),shadow:!!e.groundShadow,depthMaterial:!!e.mesh.customDepthMaterial};
    });
    assert(fishInfo.depth > 0 && fishInfo.shadow && fishInfo.depthMaterial, '浅弧模型、接地阴影、透明轮廓投影必须就绪');
    await page.screenshot({ path: path.join(OUT, '02-enemies.png') });
    const themes=[];
    for(let i=0;i<5;i++) {
      await page.evaluate(i=>FishGame.__debug.setEnvTheme(i,false),i); await rendered();
      themes.push(await page.evaluate(()=>({theme:FishGame.__debug.getEnvTheme(),rule:FishGame.__debug.getEnvRule()})));
      if(i===1||i===4)await page.screenshot({path:path.join(OUT,i===1?'03-dusk.png':'04-night.png')});
    }
    assert.equal(themes[2].theme.name,'沙尘暴');assert(themes[4].rule.includes('30%'));

    await page.evaluate(()=>{
      const d=FishGame.__debug;d.setEnvTheme(0,false);
      const p=d.getPlayer();p.pos.set(-19,0,37);p.yaw=Math.PI/4;p.pitch=-.1;
      d.setState('playing');d.update(.001);d.setState('paused');
    });
    await rendered();await page.screenshot({path:path.join(OUT,'05-oasis.png')});

    // 每轮先实际渲染所有资源，然后回主菜单卸载，再进入相同场景。
    const cycles=[];
    for(let i=0;i<4;i++) {
      await page.evaluate(()=>{
        const d=FishGame.__debug;d.restart(true);d.enterGameWorld();d.enterFallback();d.clearCovers();d.setState('paused');
        d.startWave(1);d.update(.016);
      });
      await rendered();
      await page.evaluate(()=>{
        const d=FishGame.__debug;d.getEnemies().forEach(e=>{e.alive=false;e.dyingT=0;});d.startWave(2);
      });
      await rendered();
      const count=await page.evaluate(()=>FishGame.__debug.getSceneStats());
      assert.equal(count.trackedEnemies,6,'旧波次死亡敌人必须被回收');
      await page.evaluate(()=>FishGame.__debug.restart(true));
      // 菜单不绘制世界，显式确认场景引用已清空。
      const menu=await page.evaluate(()=>FishGame.__debug.getSceneStats());
      assert.equal(menu.envObjects,0);assert.equal(menu.envBuilt,false);assert.equal(menu.enemies,0);
      cycles.push(menu);
    }
    // Shader / PMREM 缓存首次暖机后可保留，不能逐轮增长。
    const stable=cycles.slice(1);
    assert(Math.max(...stable.map(x=>x.geometries))-Math.min(...stable.map(x=>x.geometries))<=2,'退出后的几何资源不应逐轮增长');
    assert(Math.max(...stable.map(x=>x.textures))-Math.min(...stable.map(x=>x.textures))<=1,'退出后的贴图资源不应逐轮增长');

    // file:// 是本项目的正式启动方式，也必须测试。
    const offline=await browser.newPage({viewport:{width:1280,height:720}});
    offline.on('pageerror',e=>errors.push('offline: '+e.message));
    await offline.goto(pathToFileURL(path.join(ROOT,'index.html')).href);
    await offline.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
    await offline.click('#btn-start');await offline.click('#btn-level-desert');
    await offline.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'));
    await offline.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.setState('paused');});
    await offline.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert((await offline.evaluate(()=>FishGame.__debug.getSceneStats())).triangles>0,'file:// 必须可运行');
    assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);assert.deepEqual(failedRequests,[]);
    const result={initial,shot,fishInfo,themes,cycles,errors,shaderErrors,offline:'passed'};
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));console.log('ALL BROWSER ART TESTS PASSED');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
