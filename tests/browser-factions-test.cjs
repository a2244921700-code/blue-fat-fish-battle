'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.FISH_TEST_OUTPUT||path.join(__dirname,'factions-results');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
function check(name,ok,value){assert(ok,name+' '+JSON.stringify(value));report.checks.push(name);console.log('PASS | '+name);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGL/i.test(m.text()))report.errors.push(m.text());});
 await page.addInitScript(()=>{if(!localStorage.getItem('bff_loadout_v1'))localStorage.setItem('bff_loadout_v1',JSON.stringify({skin:'deepseek',skins:{red:'deepseek',blue:'claude_fake'},team:'blue',secondary:'fishpistol',helmet:'iron-rice-bowl'}));const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>raf(t=>{if(!window.freezeFactionTest)fn(t);});});
 await page.goto(process.env.FISH_TEST_URL||'file:///D:/DSH/Game/蓝色肥鱼大作战/index.html');await page.waitForFunction(()=>window.FishGame);
 const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('bff_loadout_v1')));
 check('旧存档自动保存新角色归属且保留出战队伍、副武器、头盔',migrated.skins.red==='deepseek'&&migrated.skins.blue==='claude_true'&&migrated.team==='blue'&&migrated.secondary==='fishpistol'&&migrated.helmet==='iron-rice-bowl'&&migrated.skin==='deepseek',migrated);
 await page.reload();await page.waitForFunction(()=>window.FishGame);
 check('刷新后迁移结果稳定，不再次交换角色',JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem('bff_loadout_v1'))))===JSON.stringify(migrated));
 await page.click('#btn-start');await page.click('#btn-inventory');await page.click('.inv-tab[data-tab="skin"]');
 check('三名实机角色可选、其余五名仍为预告',await page.locator('.inv-item:enabled').count()===3&&await page.locator('.inv-item:disabled').count()===5);
 check('红蓝双方分别默认装配正确角色',await page.locator('#inv-item-claude_true .ii-eq').textContent()==='蓝方已装配'&&await page.locator('#inv-item-deepseek .ii-eq').textContent()==='红方已装配');
 check('仓库红蓝四对四，伪Claude归红、真Claude归蓝',JSON.stringify(await page.locator('#inv-faction-red .ii-name').allTextContents())===JSON.stringify(['deepseek娘','伪·Claude娘','kimi娘','Qwen娘'])&&JSON.stringify(await page.locator('#inv-faction-blue .ii-name').allTextContents())===JSON.stringify(['真·Claude娘','Grok娘','GPT娘','Gemini娘']));
 check('装备总览与角色说明同步新阵营',await page.locator('#inv-loadout').textContent().then(s=>s.includes('红方deepseek娘蓝方真·Claude娘'))&&await page.locator('#inv-detail .id-description').textContent().then(s=>s.startsWith('红方角色')));
 await page.click('#inv-item-claude_fake');check('仓库可查看新角色详情',await page.locator('#inv-detail .id-name').textContent()==='伪·Claude娘');
 await page.screenshot({path:path.join(out,'warehouse.webp'),type:'webp',quality:80});
 await page.click('#btn-inv-back');await page.selectOption('#lobby-deploy-team','red');
 check('红方预览为deepseek且出战选择持久保存',await page.evaluate(()=>document.getElementById('lobby-hero-img').src.endsWith('/deepseek.png')&&JSON.parse(localStorage.getItem('bff_loadout_v1')).team==='red'));
 await page.selectOption('#lobby-deploy-team','blue');
 check('蓝方预览为真Claude且出战选择持久保存',await page.evaluate(()=>document.getElementById('lobby-hero-img').src.endsWith('/claude_true.png')&&JSON.parse(localStorage.getItem('bff_loadout_v1')).team==='blue'));
 await page.evaluate(()=>FishCharacters.load());
 await page.evaluate(()=>{window.freezeFactionTest=true;window.d=FishGame.__debug;window.stepFaction=(t)=>{d.setState('playing');for(let x=0;x<t-1e-7;x+=.01)d.update(Math.min(.01,t-x));d.setState('paused');};});
 for(const team of ['blue','red']){
  const deploy=await page.evaluate(team=>{d.startPvp({team,teamSize:6,helmet:'iron-rice-bowl'});d.enterFallback();d.getPvpTactics().step=()=>{};stepFaction(4);const c=d.getCharacters(),bots=d.getEnemies().filter(e=>e.isBot);return {skin:d.getPvp().mySkin,local:c.local.characterId,view:c.view.characterId,z:d.getPlayer().pos.z,bots:bots.map(e=>({team:e.team,skin:e.character.characterId})),helmet:d.getPlayer().helmet.object.parent.name,head:c.local.bones.Head.getWorldPosition(new THREE.Vector3()).toArray(),visible:c.view.meshes.filter(m=>m.visible).map(m=>m.name),balance:d.getEquipment().plan.counts,tag:bots.filter(e=>!!e.teamTag).every(e=>e.team===team)};},team);report[team]=deploy;
  const skin=team==='red'?'deepseek':'claude_true';check(team+' 方实机、第一人称和出生点正确',deploy.skin===skin&&deploy.local===skin&&deploy.view===skin&&(team==='red'?deploy.z>60:deploy.z<-60)&&deploy.visible.length===1&&deploy.visible[0]==='Mesh_Arms',deploy);
  check(team+' 方 AI 形象按阵营分开，人数和队友标识正确',deploy.bots.filter(b=>b.team===team).length===5&&deploy.bots.filter(b=>b.team!==team).length===6&&deploy.bots.every(b=>b.team==='red'?['deepseek','claude_fake'].includes(b.skin):b.skin==='claude_true')&&deploy.tag);
  check(team+' 方头盔正确挂接且双方随机配装仍平衡',deploy.helmet==='Head'&&Math.abs(deploy.balance.red-deploy.balance.blue)<=2);
  const throwState=await page.evaluate(()=>{d.setState('playing');d.switchWeapon('grenade');stepFaction(.8);d.setState('playing');d.nadeBegin();stepFaction(.7);const held=d.getGrenadeAction(),rig=d.getCharacters().local;const attached=rig.bones.Socket_Throwable.children.length;const before=d.getGrenades().length;d.setState('playing');d.nadeRelease();const pending=d.getGrenades().length;stepFaction(.02);const after=d.getGrenades().length,record=d.getGrenades()[0];const mag=d.getAmmo().mag;d.setState('playing');d.shootOnce();const locked=mag===d.getAmmo().mag;const clip=rig.clip;stepFaction(.72);return {held,attached,before,pending,after,fuse:record.fuse,clip,locked,done:!d.getGrenadeAction()};});
  check(team+' 方拔销后停在持雷姿势，出手前不生成弹体',throwState.held.phase==='cook'&&throwState.held.armed&&throwState.attached===1&&throwState.before===0&&throwState.pending===1,throwState);
  check(team+' 方松键立即出手一次、收招前禁止开火',throwState.after===1&&throwState.clip==='GrenadeThrow'&&throwState.locked&&throwState.done,throwState);
  const death=await page.evaluate(()=>{d.setState('playing');d.pvpHurtPlayer();const record=d.getRagdolls().local,view=d.getDeathView&&d.getDeathView();const before={skin:record.rig.characterId,charges:d.getPlayer().helmet.charges,loose:d.getEquipment().loose.length,tickets:d.pvpSnapshot().tickets};stepFaction(4.1);return {before,skin:d.getCharacters().local.characterId,z:d.getPlayer().pos.z,hp:d.getPlayer().hp,charges:d.getPlayer().helmet.charges};});
  check(team+' 方阵亡尸体与复活保持角色和头盔规则',death.before.skin===skin&&death.before.loose>=1&&death.before.tickets[team]===17&&death.skin===skin&&death.hp===100&&death.charges===3,death);
 }
 const fake=await page.evaluate(()=>{d.startPvp({team:'red',teamSize:6,skins:{red:'claude_fake',blue:'claude_true'},helmet:'iron-rice-bowl'});d.enterFallback();d.getPvpTactics().step=()=>{};stepFaction(4.7);d.setState('playing');const p=d.getPlayer();d.damagePlayer(80,{damageType:'bullet',hit:{part:'head'}});return {skin:d.getCharacters().local.characterId,hp:p.hp,charges:p.helmet.charges,bots:d.getEnemies().filter(e=>e.team==='red').every(e=>['deepseek','claude_fake'].includes(e.pvpSkin))};});
 check('红方可实装伪Claude且仍有三次爆头免疫',fake.skin==='claude_fake'&&fake.hp===100&&fake.charges===2&&fake.bots,fake);
 const reset=await page.evaluate(()=>{d.startPvp({team:'blue',teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};stepFaction(4);d.setState('playing');d.switchWeapon('grenade');stepFaction(.8);d.setState('playing');d.nadeThrow();stepFaction(.1);const g=d.getGrenades()[0];d.setState('playing');d.pvpHurtPlayer();const once=d.getGrenades().length===1&&d.getGrenades()[0]===g;stepFaction(4.1);return {once,action:d.getGrenadeAction(),projectiles:d.getGrenades().length,hp:d.getPlayer().hp};});
 check('出手后立即死亡不重复掉雷，复活无残留动作',reset.once&&!reset.action&&!reset.projectiles&&reset.hp===100,reset);
 const bomber=await page.evaluate(()=>{d.restart(true);d.enterGameWorld();d.killAllEnemies();d.getWave().state='test';d.setState('playing');const p=d.getPlayer();p.pos.set(0,0,34);p.yaw=p.pitch=0;p.motion.set(0,0,0);d.updatePlayer(0);window.bomber=d.spawnEnemy('bomber',0,29);bomber.hp=100;bomber.fuseTimer=9999;bomber.waitTimer=bomber.seeCheckTimer=9999;bomber.state='patrol';d.syncCharacters(.01);const hp=[];for(let i=0;i<4;i++){d.setState('playing');const c=bomber.character.capsules[0];d.getCamera().lookAt(c.a.clone().lerp(c.b,.8));d.shootOnce();hp.push({hp:bomber.hp,charges:bomber.helmet.charges,part:d.getCharacters().lastHit?.part});stepFaction(.32);bomber.mesh.position.set(0,bomber.baseY,29);d.syncCharacters(0);}d.setState('paused');return {hp,helmet:!!bomber.helmet.object,loose:d.getEquipment().loose.length};});report.bomber=bomber;
 check('无尽自爆怪实际子弹前三次爆头免疫，第四次正常受伤',bomber.hp.slice(0,3).every((v,i)=>v.hp===100&&v.charges===2-i&&v.part==='head')&&bomber.hp[3].hp<100&&!bomber.helmet&&bomber.loose>=1,bomber);
 check('离开对战后无尽玩家和普通怪仍使用deepseek',await page.evaluate(()=>d.getCharacters().local.characterId==='deepseek'&&d.getCharacters().view.characterId==='deepseek'&&window.bomber.character.characterId==='deepseek'));
 check('双阵营与投雷流程没有脚本/着色器异常',report.errors.length===0,report.errors);
 console.log(report.checks.length+' faction integration checks passed.');
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
