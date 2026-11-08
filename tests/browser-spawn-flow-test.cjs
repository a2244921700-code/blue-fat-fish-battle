'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'spawn-flow-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,data)=>{report.checks.push({name,...data});assert(data.ok,name+' '+JSON.stringify(data));console.log('PASS | '+name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.nativeRaf=requestAnimationFrame;window.requestAnimationFrame=f=>nativeRaf(t=>{if(!window.freezeSpawn)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.click('#btn-pvp-mode');
  await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.getPvp().active&&document.getElementById('loading-overlay').classList.contains('hidden'),null,{timeout:90000});
  await page.evaluate(()=>{
   window.freezeSpawn=true;window.d=FishGame.__debug;
   window.step=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=1/30)d.update(Math.min(1/30,seconds-t));d.setState('paused');};
   window.prepare=()=>{d.startPvp({team:'blue',teamSize:16});d.enterFallback();window.t=d.getPvpTactics();t.fire=()=>false;t.visible=()=>null;t.grenade=t.danger=t.loot=null;window.runAI=t.step;t.step=()=>{};step(3.1);};
   window.positions=()=>{const bots=d.getEnemies().filter(e=>e.alive).map(e=>({id:e.pvpId,team:e.team,x:e.mesh.position.x,y:e.mesh.position.y-e.baseY,z:e.mesh.position.z}));const p=d.getPlayer();if(p.hp>0)bots.push({id:'player',team:'blue',x:p.pos.x,y:p.pos.y,z:p.pos.z});let min=Infinity;for(let i=0;i<bots.length;i++)for(let j=i+1;j<bots.length;j++)if(Math.abs(bots[i].y-bots[j].y)<1.9)min=Math.min(min,Math.hypot(bots[i].x-bots[j].x,bots[i].z-bots[j].z));return {count:bots.length,min,allInBase:bots.every(b=>Math.abs(b.x)<=10.81&&b.y<.01&&Math.abs(b.z)>=64.79&&Math.abs(b.z)<=69.01),bots};};
   window.depart=seconds=>{const exited=new Set(),bots=d.getEnemies().filter(e=>e.isBot);let last=0;d.setState('playing');t.step=runAI;for(let i=0;i<seconds*30&&exited.size<bots.length;i++){d.update(1/30);for(const e of bots)if(Math.abs(e.mesh.position.z)<58&&!exited.has(e.pvpId)){exited.add(e.pvpId);last=i/30;}}d.setState('paused');t.step=()=>{};return {ok:exited.size===bots.length,count:exited.size,last,waiting:bots.filter(e=>!exited.has(e.pvpId)).map(e=>({id:e.pvpId,x:e.mesh.position.x,z:e.mesh.position.z,step:e.brain.routeStep}))};};
   prepare();
  });
  check('16v16 首次部署各占独立位置，没有重叠出生',await page.evaluate(()=>{const r=positions();return {ok:r.count===32&&r.min>=1.59&&r.allInBase,...r};}));
  check('真实游戏更新含角色碰撞，31 名 AI 全部离开出生区',await page.evaluate(()=>depart(25)));
  check('同时阵亡后仍遵守四秒复活等待',await page.evaluate(()=>{d.setState('playing');d.getEnemies().forEach((e,i)=>d.pvpDamageBot(i,999));d.pvpHurtPlayer(999);step(3.9);const alive=d.getEnemies().filter(e=>e.alive).length;return {ok:alive===0&&d.getPlayer().hp===0,alive,respawn:d.pvpSnapshot().respawn};}));
  check('32 人同时复活逐个避开占用，不挤进同一点',await page.evaluate(()=>{step(.2);const r=positions();return {ok:r.count===32&&r.min>=1.59&&r.allInBase,...r};}));
  check('同时复活后 AI 再次正常分路出发',await page.evaluate(()=>depart(25)));
  check('切换回合丢弃上一帧旧位置，不从战场扫回出生点',await page.evaluate(()=>{d.pvpSetTickets(1,48);d.setState('playing');const i=d.getEnemies().findIndex(e=>e.team==='red');d.pvpDamageBot(i,999);step(3.1);const r=positions();return {ok:d.getPvp().roundNum===2&&r.count===32&&r.min>=1.59&&r.allInBase,...r};}));
  await page.evaluate(()=>{
   prepare();window.target=d.getEnemies().find(e=>e.team==='blue');d.setState('playing');d.pvpDamageBot(d.getEnemies().indexOf(target),999);d.getPlayer().pos.set(0,0,50);
   const blockers=d.getEnemies().filter(e=>e!==target),cols=[0,-1,1,-2,2,-3,3,-4,4];window.blockers=blockers;
   blockers.forEach((e,i)=>{if(i<27){e.alive=true;e.mesh.position.set(cols[i%9]*2.7,e.baseY,-69+Math.floor(i/9)*2.1);}else {e.alive=false;e.mesh.visible=false;e.respawnTimer=9999;}});step(4.1);
  });
  check('己方全部点位被双方存活角色占用时延后复活',await page.evaluate(()=>({ok:!target.alive&&target.respawnTimer>0&&target.respawnTimer<=.25,alive:target.alive,retry:target.respawnTimer})));
  check('空出一个位置后立即恢复复活，并继续避开其他占用',await page.evaluate(()=>{blockers[0].mesh.position.set(24,blockers[0].baseY,-60);step(.3);const r=positions();return {ok:target.alive&&Math.abs(target.mesh.position.x)<.01&&Math.abs(target.mesh.position.z+69)<.01&&r.min>=1.59,position:target.mesh.position.toArray(),min:r.min};}));
  check('玩家等待全满出生区时，显示等待空位而非重复倒计时',await page.evaluate(()=>{d.setState('playing');d.pvpHurtPlayer(999);step(4.1);const text=document.getElementById('pvp-respawn').textContent;return {ok:d.getPlayer().hp===0&&text.includes('等待空位'),text,hp:d.getPlayer().hp,respawn:d.pvpSnapshot().respawn};}));
  check('点位腾空后玩家自动复活，等待提示消失',await page.evaluate(()=>{blockers[1].mesh.position.set(26,blockers[1].baseY,-60);step(.3);const r=positions();return {ok:d.getPlayer().hp>0&&document.getElementById('pvp-respawn').classList.contains('hidden')&&r.min>=1.59,min:r.min};}));
  // Player uses the same occupancy rule, including enemies in the deployment area.
  check('玩家复活同样跳过被占用的首选位置',await page.evaluate(()=>{prepare();const p=d.getPlayer(),old=p.pos.clone();d.setState('playing');d.pvpHurtPlayer(999);const e=d.getEnemies().find(e=>e.team==='red');e.mesh.position.set(old.x,e.baseY,old.z);step(4.1);const r=positions();return {ok:p.hp>0&&p.pos.distanceTo(old)>=1.59&&r.min>=1.59,position:p.pos.toArray(),min:r.min};}));
  await page.evaluate(()=>{prepare();t.step=runAI;step(20);d.setState('paused');d.getPlayer().pos.set(0,0,-72);d.getPlayer().yaw=Math.PI;d.getPlayer().pitch=0;d.updatePlayer(0);d.syncCharacters(0);window.renderSpawn=true;function render(){if(renderSpawn){d.renderFrame();nativeRaf(render);}}render();});
  await page.waitForTimeout(120);await page.screenshot({path:path.join(OUT,'spawn-cleared.webp')});
  check('出生与回合循环没有脚本异常',{ok:report.errors.length===0,errors:report.errors});
 }finally{fs.writeFileSync(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
