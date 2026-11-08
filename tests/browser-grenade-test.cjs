'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=path.join(__dirname,'grenade-results');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 function check(name,r){report.checks.push({name,...r});assert(r.ok,name+' '+JSON.stringify(r));console.log('PASS | '+name);}
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeGrenade)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.click('#btn-start');await page.evaluate(()=>FishCharacters.load());
  await page.evaluate(()=>{
   window.freezeGrenade=true;window.d=FishGame.__debug;d.startPvp({teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};
   window.step=seconds=>{d.setState('playing');for(let t=0;t<seconds-1e-8;t+=.01)d.update(Math.min(.01,seconds-t));d.setState('paused');};step(4.8);
   window.prepare=()=>{d.clearProjectiles();d.releaseKeys();step(.5);d.setNadeCount(5);d.setHp(100);d.resetHurt();const p=d.getPlayer();p.pos.set(0,0,64);p.velY=0;p.onGround=true;p.yaw=0;p.pitch=0;d.setState('playing');d.switchWeapon('grenade');step(.8);d.setState('playing');d.updatePlayer(0);d.syncCharacters(0);};
   window.down=()=>document.getElementById('game-canvas').dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));window.up=()=>document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
  });
  check('4 持雷不扣数量、不点燃；按住左键才消耗一颗并启动 3 秒引信',await page.evaluate(()=>{prepare();const idle=d.getGrenadeAction(),count=d.getNadeCount();down();const first=d.getGrenadeAction();down();step(.2);return {ok:!idle&&count===5&&first.fuse===3&&d.getNadeCount()===4&&Math.abs(d.getGrenadeAction().fuse-2.8)<.001&&!document.getElementById('grenade-action')};}));
  check('持雷期间禁止切枪、换弹与近战',await page.evaluate(()=>{d.setState('playing');const switched=d.switchWeapon('rifle'),knife=d.knifeAttack(true);d.reload();return {ok:!switched&&!knife&&!d.getAmmo().reloading};}));
  await page.screenshot({path:path.join(OUT,'01-cooking.png')});
  check('暂停冻结引信；暂停中松键，在恢复第一步仅投出一颗',await page.evaluate(()=>{d.setState('paused');const before=d.getGrenadeAction().fuse;d.update(2);up();const wait=d.getGrenadeAction();step(.01);const g=d.getGrenades()[0];return {ok:before===wait.fuse&&wait.releasePending&&d.getGrenades().length===1&&Math.abs(g.fuse-before)<.001,wait,fuse:g?.fuse};}));
  check('收招结束前禁止再次投雷，结束后可再次操作',await page.evaluate(()=>{d.setState('playing');const blocked=d.nadeBegin();step(.71);d.setState('playing');const ready=d.nadeBegin();d.clearProjectiles();return {ok:!blocked&&ready};}));
  check('移动、跳跃动量在松键瞬间参与抛射',await page.evaluate(()=>{
   function sample(move,jump,wall){prepare();const p=d.getPlayer();if(wall)p.pos.set(0,0,-74.9);if(move)d.pressKey(move,true);step(.3);d.setState('playing');down();if(jump){document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));d.updatePlayer(.01);}up();const g=d.getGrenades()[0],result={v:g.vel.clone(),p:g.pos.clone(),motion:p.motion.clone()};d.releaseKeys();return result;}
   const still=sample(),run=sample('KeyW'),back=sample('KeyS'),jump=sample('KeyW',true),wall=sample('KeyW',false,true);return {ok:run.v.z<still.v.z-5.9&&back.v.z>still.v.z+5.9&&jump.v.y>still.v.y+6&&Math.abs(wall.motion.z)<.001&&Math.abs(wall.v.z-still.v.z)<.01&&wall.p.z>=-75.261,still,run,back,jump,wall};
  }));
  check('碰地反弹而非触地引爆',await page.evaluate(()=>{prepare();down();up();const g=d.getGrenades()[0];g.pos.set(0,.25,64);g.vel.set(3,-5,0);step(.12);return {ok:d.getGrenades().includes(g)&&g.bounces>0&&g.fuse>2.8&&g.pos.y>.14};}));
  check('手中预热 2.1 秒后立刻投出，按剩余引信完成空爆',await page.evaluate(()=>{prepare();d.getPlayer().pitch=.6;d.updatePlayer(0);down();step(2.1);d.setState('playing');up();const g=d.getGrenades()[0],remaining=g.fuse;step(.86);const y=g.pos.y,before=d.getGrenades().length;step(.08);return {ok:Math.abs(remaining-.9)<.001&&y>3&&before===1&&d.getGrenades().length===0,remaining,y};}));
  check('一直握住 3 秒会手中爆炸、自伤且不返还手雷',await page.evaluate(()=>{prepare();down();step(3.1);return {ok:d.getPlayer().hp<100&&d.getPlayer().hp>0&&!d.getGrenadeAction()&&d.getNadeCount()===4&&!d.getGrenades().length,hp:d.getPlayer().hp};}));
  check('死亡掉落已拉环手雷，保留剩余引信',await page.evaluate(()=>{prepare();down();step(.6);d.setState('playing');d.pvpHurtPlayer();const g=d.getGrenades()[0],remaining=g.fuse;step(.7);return {ok:Math.abs(remaining-2.4)<.001&&!d.getGrenadeAction()&&g.fuse<1.71&&d.getPlayer().hp===0,remaining};}));
  await page.evaluate(()=>step(4.2));
  check('预热 0.2 秒出手后立即死亡，不重复生成手雷',await page.evaluate(()=>{prepare();down();step(.2);d.setState('playing');up();const g=d.getGrenades()[0],fuse=g.fuse;d.pvpHurtPlayer();return {ok:Math.abs(fuse-2.8)<.001&&d.getGrenades().length===1&&d.getGrenades()[0]===g&&!d.getGrenadeAction()&&d.getPlayer().hp===0,fuse};}));
  check('复活后清空旧动作，新雷有完整 3 秒引信',await page.evaluate(()=>{step(4.1);const clean=d.getPlayer().hp===100&&!d.getGrenadeAction()&&!d.getGrenades().length;d.setState('playing');d.switchWeapon('grenade');step(.8);d.setState('playing');down();const fuse=d.getGrenadeAction().fuse;up();return {ok:clean&&fuse===3&&d.getGrenades().length===1&&d.getGrenades()[0].fuse===3};}));
  check('最后一颗收招完自动返回上次枪械，举枪完成前不能射击',await page.evaluate(()=>{step(.72);const weapon=d.getWeapon(),sw=d.getWeaponSwitch(),mag=d.getAmmo().mag;d.setState('playing');d.shootOnce();const blocked=d.getAmmo().mag===mag;step(.4);d.setState('playing');d.shootOnce();return {ok:weapon==='rifle'&&!!sw&&blocked&&d.getAmmo().mag===mag-1,weapon};}));
  await page.screenshot({path:path.join(OUT,'02-respawn.png')});
  check('退出回大厅清理动作与弹体',await page.evaluate(()=>{prepare();down();d.restart(true);return {ok:!d.getGrenadeAction()&&!d.getGrenades().length};}));
  const touch=await browser.newPage({hasTouch:true,viewport:{width:1000,height:700}});touch.on('pageerror',e=>report.errors.push(e.message));await touch.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.stopTouch)f(t);});});await touch.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await touch.click('#btn-start');await touch.evaluate(()=>FishCharacters.load());
  check('触屏先点 4 选雷，再按开火键预热、松开立即投出',await touch.evaluate(()=>{window.stopTouch=true;const d=FishGame.__debug;d.startPvp({teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};for(let i=0;i<50;i++)d.update(.1);d.setNadeCount(2);function event(id,type){const b=document.getElementById(id),t=new Touch({identifier:17,target:b,clientX:900,clientY:560});b.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,changedTouches:[t],touches:type==='touchstart'?[t]:[],targetTouches:type==='touchstart'?[t]:[]}));}event('btn-tch-nade','touchstart');event('btn-tch-nade','touchend');for(let i=0;i<8;i++)d.update(.1);const idle=!d.getGrenadeAction();event('btn-tch-fire','touchstart');d.update(.1);event('btn-tch-fire','touchend');const g=d.getGrenades()[0];d.setState('paused');return {ok:idle&&d.getNadeCount()===1&&d.getGrenades().length===1&&Math.abs(g.fuse-2.9)<.001};}));
  check('所有交互无脚本异常',{ok:report.errors.length===0,errors:report.errors});
  console.log(report.checks.length+' grenade checks passed');
 }finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
