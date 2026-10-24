/* 真实 Edge/WebGL 的模式入口、规则、复活、导航、武器与资源回收回归。
 * 先启动 server.js；PLAYWRIGHT_MODULE 可指定已有 Playwright 安装，不给游戏增加依赖。
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=process.env.FISH_TEST_OUTPUT||path.join(__dirname,'fps-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});let passed=0;
 const results={};function check(name,condition){assert(condition,name);console.log('PASS | '+name);passed++;}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
  await page.evaluate(()=>{window.loadStages=[];new MutationObserver(()=>loadStages.push(+document.getElementById('loading-track').getAttribute('aria-valuenow'))).observe(document.getElementById('loading-track'),{attributes:true,attributeFilter:['aria-valuenow']});});
  await page.click('#btn-start');await page.click('#btn-pvp-mode');await page.screenshot({path:path.join(OUT,'01-setup.png')});
  check('队伍档位提供 6 / 8 / 12 / 16 人',await page.locator('#pvp-bots .pc-name').allTextContents().then(a=>a.join(',')==='6 v 6,8 v 8,12 v 12,16 v 16'));
  await page.click('#btn-pvp-start');await page.screenshot({path:path.join(OUT,'02-loading.png')});
  await page.waitForFunction(()=>FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>{const d=FishGame.__debug;d.enterFallback();d.setState('paused');window.stepGame=seconds=>{d.setState('playing');for(let t=0;t<seconds-.0001;t+=.05)d.update(Math.min(.05,seconds-t));if(d.getState()==='playing')d.setState('paused');};window.aiStep=d.getPvpTactics().step;d.getPvpTactics().step=()=>{};});
  const initial=await page.evaluate(()=>({state:FishGame.__debug.getPvp(),snap:FishGame.__debug.pvpSnapshot(),loading:loadStages,stats:FishGame.__debug.getSceneStats()}));
  check('真实场景成功绘制，默认 8v8 / 每队 24 额度',initial.snap.teamSize===8&&initial.state.botTotal===15&&initial.snap.tickets.red===24&&initial.stats.triangles>100000);
  check('载入进度经过实际构建阶段并到达 100%', [4,28,46,62,76,84,92,100].every(n=>initial.loading.includes(n)));
  check('存活时不显示复活面板',!(await page.locator('#pvp-respawn').isVisible()));
  check('无重复 killfeed ID',await page.locator('#killfeed').count()===1);
  await page.addStyleTag({content:'#fallback-hint{visibility:hidden!important}'});
  await page.screenshot({path:path.join(OUT,'03-deployment.png')});
  const prep=await page.evaluate(()=>{const d=FishGame.__debug,b=d.getAmmo().mag;d.setState('playing');d.shootOnce();d.knifeAttack(false);d.nadeThrow();d.setState('paused');return {mag:d.getAmmo().mag,b,grenades:d.getGrenades().length};});
  check('部署期间禁用开火、刀击和手雷',prep.mag===prep.b&&prep.grenades===0);
  await page.evaluate(()=>stepGame(4.7));
  const death=await page.evaluate(()=>{const d=FishGame.__debug;d.pvpKillBot();return {pvp:d.getPvp(),snap:d.pvpSnapshot()};});
  check('击杀扣队伍额度，不因单次死亡立即换回合',death.snap.tickets.blue===23&&death.pvp.roundNum===1&&death.pvp.roundState==='live');
  check('AI 死亡进入 4 秒复活倒计时',death.snap.actors.filter(a=>!a.alive).length===1&&death.snap.actors.find(a=>!a.alive).respawn===4);
  const frozen=await page.evaluate(()=>{const d=FishGame.__debug,a=d.pvpSnapshot();d.update(3);return {a,b:d.pvpSnapshot()};});
  check('暂停冻结复活与回合时间',frozen.a.clock===frozen.b.clock&&frozen.a.roundTime===frozen.b.roundTime);
  await page.evaluate(()=>stepGame(3.8));check('4 秒未到不会提前复活',(await page.evaluate(()=>FishGame.__debug.pvpSnapshot().actors.filter(a=>!a.alive).length))===1);
  await page.evaluate(()=>stepGame(.25));const respawned=await page.evaluate(()=>FishGame.__debug.pvpSnapshot());
  check('AI 到时回己方北端部署区，仍保留死亡统计',respawned.actors.every(a=>a.alive)&&respawned.actors.find(a=>a.deaths===1).z<-35);
  const playerDeath=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.pvpHurtPlayer();const mag=d.getAmmo().mag,pos=d.getPlayer().pos.clone();d.shootOnce();d.nadeThrow();d.setState('paused');return {pvp:d.getPvp(),snap:d.pvpSnapshot(),mag,after:d.getAmmo().mag,pos,now:d.getPlayer().pos};});
  check('玩家死亡扣红队额度，队友仍继续战斗',playerDeath.snap.tickets.red===23&&playerDeath.snap.respawn===4&&playerDeath.pvp.roundState==='live');
  check('玩家死亡后不能射击',playerDeath.mag===playerDeath.after);
  check('复活面板显示倒计时',await page.locator('#pvp-respawn').isVisible());
  await page.screenshot({path:path.join(OUT,'04-respawn.png')});
  await page.evaluate(()=>stepGame(4.05));const live=await page.evaluate(()=>({p:FishGame.__debug.getPlayer(),s:FishGame.__debug.pvpSnapshot(),a:FishGame.__debug.getAmmo()}));
  check('玩家回南端复活，生命和主武器弹药补满',live.p.hp===100&&live.p.pos.z>35&&live.a.mag===30&&live.s.respawn===0);
  check('复活后面板关闭',!(await page.locator('#pvp-respawn').isVisible()));
  const shield=await page.evaluate(()=>{const d=FishGame.__debug;d.setState('playing');d.damagePlayer(36);const hp=d.getPlayer().hp;d.shootOnce();d.damagePlayer(20);d.damagePlayer(20);d.setState('paused');return {hp,after:d.getPlayer().hp};});
  check('出生保护生效，主动射击后解除；没有半秒免伤漏洞',shield.hp===100&&shield.after===60);
  const switchResult=await page.evaluate(()=>{const d=FishGame.__debug;d.switchWeapon('pistol');return {mag:d.getAmmo().mag,key:document.querySelector('#weapon-bar .active').dataset.wkey};});
  check('副武器弹药重置且键位高亮正确',switchResult.mag===12&&switchResult.key==='2');
  const over=await page.evaluate(()=>{const d=FishGame.__debug;d.pvpSetTickets(23,1);d.pvpKillBot();return {pvp:d.getPvp(),snap:d.pvpSnapshot()};});
  check('蓝队额度归零即结束回合，即使仍有存活队员',over.snap.tickets.blue===0&&over.pvp.myRounds===1&&over.pvp.roundState==='over'&&over.pvp.bots>0);
  const pauseRound=await page.evaluate(()=>{const d=FishGame.__debug;d.update(10);return d.getPvp();});
  check('暂停不会被旧 setTimeout 偷偷切回合',pauseRound.roundNum===1);
  await page.evaluate(()=>stepGame(3.1));const next=await page.evaluate(()=>({p:FishGame.__debug.getPvp(),s:FishGame.__debug.pvpSnapshot()}));
  check('下一回合双方额度恢复、累计战绩保留',next.p.roundNum===2&&next.s.tickets.red===24&&next.s.tickets.blue===24&&next.s.actors.some(a=>a.deaths>0));
  // 独立命中场景：近处友军、墙后敌人都不能被刀或爆炸伤害。
  const combat=await page.evaluate(()=>{const d=FishGame.__debug;stepGame(4.7);const p=d.getPlayer(),all=d.getEnemies().filter(e=>e.isBot),friend=all.find(e=>e.team==='red'),enemy=all.find(e=>e.team==='blue');
    p.pos.set(0,0,20);p.yaw=0;p.pitch=0;friend.mesh.position.set(0,1.4,19.2);enemy.mesh.position.set(0,1.4,28);friend.protection=enemy.protection=0;d.setState('playing');d.update(0);d.knifeAttack(true);
    const friendHP=friend.hp;d.setState('paused');return {friendHP};});
  check('刀击不会伤害己方队员',combat.friendHP===100);
  const walls=await page.evaluate(()=>{const d=FishGame.__debug,p=d.getPlayer(),all=d.getEnemies().filter(e=>e.isBot),friend=all.find(e=>e.team==='red'),blue=all.filter(e=>e.team==='blue'),hidden=blue[0],exposed=blue[1];
    all.forEach((e,i)=>{e.mesh.position.set(-40,1.4,-30+i*.1);e.protection=0;});friend.mesh.position.set(8,1.4,5);hidden.mesh.position.set(13,1.4,5);exposed.mesh.position.set(7,1.4,5);friend.hp=hidden.hp=exposed.hp=100;
    p.pos.set(9,0,5);p.yaw=-Math.PI/2;p.pitch=0;p.hp=100;d.setState('playing');d.update(.8);d.switchWeapon('rifle');d.shootOnce();const gunBlocked=hidden.hp===100;
    const t=d.getPvpTactics(),botBlocked=t.fire({source:friend,position:friend.mesh.position,eyeY:1.9},{x:13,y:1.5,z:5},{damage:36},0)===false;
    d.setNadeCount(1);d.nadeThrow();const gr=d.getGrenades()[0];gr.pos.set(9,.1,5);gr.vel.set(0,0,0);d.update(0);d.setState('paused');return {gunBlocked,botBlocked,friend:friend.hp,hidden:hidden.hp,exposed:exposed.hp};});
  check('玩家子弹与 AI 枪口都不能隔墙射击',walls.gunBlocked&&walls.botBlocked);
  check('手雷伤害遵守墙体遮挡及无友伤，能伤害暴露敌人',walls.friend===100&&walls.hidden===100&&walls.exposed<100);
  const redLoss=await page.evaluate(()=>{const d=FishGame.__debug;d.pvpSetTickets(1,20);d.setState('playing');d.pvpHurtPlayer();d.setState('paused');return {p:d.getPvp(),s:d.pvpSnapshot()};});
  check('红队最后额度耗尽同样立即判回合失败',redLoss.s.tickets.red===0&&redLoss.p.botRounds===1&&redLoss.p.roundState==='over');
  // 重新部署 16v16：每一个出生点可走、分隔在地图两端，无重叠。
  const large=await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({teamSize:16});d.enterFallback();d.setState('paused');const s=d.pvpSnapshot(),nav=d.getPvpTactics().nav,p=d.getPlayer();const pts=s.actors.map(a=>({x:a.x,z:a.z})).concat([{x:p.pos.x,z:p.pos.z}]);let min=Infinity;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)min=Math.min(min,Math.hypot(pts[i].x-pts[j].x,pts[i].z-pts[j].z));return {s,min,clear:pts.every(p=>nav.clear(p.x,p.z))};});
  check('16v16 有 31 个 AI 且全部在两端合法部署',large.s.actors.length===31&&large.s.actors.every(a=>a.team==='red'?a.z>35:a.z<-35)&&large.clear);
  check('32 人的出生位置互不重叠',large.min>=1.5);
  const run=await page.evaluate(()=>{const d=FishGame.__debug,t=d.getPvpTactics(),begin=performance.now();stepGame(60);return {ms:performance.now()-begin,ai:t.stats,nav:t.nav.stats,pvp:d.getPvp(),s:d.pvpSnapshot(),stats:d.getSceneStats()};});
  check('32 人自主对战实际移动、交火并产生伤亡',run.ai.shots>50&&run.s.actors.some(a=>a.deaths>0)&&run.s.actors.some(a=>Math.abs(a.z)<30));
  check('导航没有路线查找失败',run.nav.failed===0);results.largeBattle=run;
  // 让相机看到正在交火的角色和武器；不改变角色图像资源。
  await page.evaluate(()=>{const d=FishGame.__debug,p=d.getPlayer();p.pos.set(0,0,24);p.yaw=0;p.pitch=0;d.setState('playing');d.update(0);d.setState('paused');});
  await page.screenshot({path:path.join(OUT,'05-large-battle.png')});
  const aim=await page.evaluate(()=>{const d=FishGame.__debug,t=d.getPvpTactics(),step=t.step;const e=d.getEnemies().find(e=>e.isBot&&e.alive),target=new THREE.Vector3(e.mesh.position.x+4,2,e.mesh.position.z-8);t.step=()=>{};e.brain.aim=target.clone();e.brain.reload=0;d.setState('playing');d.update(0);d.setState('paused');t.step=step;const muzzle=e.gunMesh.muzzleTip,pos=muzzle.getWorldPosition(new THREE.Vector3()),forward=muzzle.getWorldDirection(new THREE.Vector3());return forward.dot(target.clone().sub(pos).normalize());});
  check('AI 武器模型枪口轴与实际瞄准方向一致',aim>.995);
  const models=await page.evaluate(()=>['rifle','pistol','fishpistol','knife'].map(kind=>{const model=FishPvpArt.weapon(kind);let ok=true;model.traverse(m=>{if(m.isMesh&&(!m.geometry.attributes.position||!m.geometry.attributes.normal||!m.geometry.attributes.uv))ok=false;});FishArt.disposeTree(model);return ok;}));
  check('AI 主副武器与弹尽后匕首模型都能正常创建',models.every(Boolean));
  // 计分板在大队伍下可滚动，不溢出屏幕。
  await page.keyboard.down('Tab');await page.evaluate(()=>{FishGame.__debug.setState('playing');document.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',bubbles:true}));FishGame.__debug.setState('paused');});await page.screenshot({path:path.join(OUT,'06-scoreboard.png')});await page.keyboard.up('Tab');
  const finish=await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};stepGame(5);d.pvpSetRound(3,0,4);d.pvpSetTickets(10,1);d.pvpKillBot();stepGame(3.1);return {state:d.getState(),p:d.getPvp(),title:document.querySelector('#gameover-overlay h1').textContent};});
  check('先赢四回合结束整场比赛并显示正确结算 '+JSON.stringify(finish),finish.state==='gameover'&&finish.p.over&&finish.p.myRounds===4&&finish.title.includes('胜利'));
  // 卸载/重建两次，确认模式的基地、标签与角色没有留在场景中。
  const cleanup=await page.evaluate(()=>{const d=FishGame.__debug;d.restart(true);return {scene:d.getSceneStats(),classes:document.body.className,p:d.getPvp()};});
  check('退出完整清理 FPS 对象与状态',cleanup.scene.trackedEnemies===0&&!cleanup.scene.envBuilt&&!cleanup.p.active&&!cleanup.classes.includes('pvp-mode'));
  await page.evaluate(()=>{loadStages=[];});await page.click('#btn-start');await page.click('#btn-level-desert');
  await page.waitForFunction(()=>FishGame.__debug.getSceneStats().envBuilt&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>{FishGame.__debug.enterFallback();FishGame.__debug.setState('paused');});const endless=await page.evaluate(()=>({stages:loadStages,mode:FishGame.__debug.getPvp().mode}));
  check('无尽模式也使用完整载入画面',endless.mode==='endless'&&endless.stages.includes(4)&&endless.stages.includes(100));
  await page.screenshot({path:path.join(OUT,'07-endless.png')});
  const cycles=[];for(let n=0;n<2;n++){await page.evaluate(()=>{const d=FishGame.__debug;d.startPvp({teamSize:16});d.enterFallback();d.setState('paused');});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));cycles.push(await page.evaluate(()=>{const d=FishGame.__debug,s=d.getSceneStats();d.restart(true);d.enterGameWorld();return s;}));}
  check('重复部署资源数量稳定',cycles[1].geometries<=cycles[0].geometries+2&&cycles[1].textures<=cycles[0].textures+2);results.cycles=cycles;
  check('没有脚本或 WebGL 着色器错误',errors.length===0);check('新增 JS/CSS/图像资源没有加载失败',!missing.some(u=>/fps|\.png|\.css|\.js/.test(u)));
  results.passed=passed;results.errors=errors;results.missing=missing;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(results,null,2));console.log('FPS browser: '+passed+' checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
