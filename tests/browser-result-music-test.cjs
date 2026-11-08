'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.FISH_TEST_OUTPUT||path.join(__dirname,'result-music-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[],missing:[]};
 function check(name,ok,detail){assert(ok,name+' '+JSON.stringify(detail||''));report.checks.push({name,detail});console.log('PASS | '+name);}
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),requests=[];
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
  await page.addInitScript(()=>{
   const raf=requestAnimationFrame;requestAnimationFrame=f=>raf(t=>{if(!window.freezeMusicTest)f(t);});
   const NativeAudio=Audio;window.testAudio=[];window.Audio=function(...args){const el=new NativeAudio(...args);testAudio.push(el);const play=el.play;el.play=function(){if(window.blockVictory&&this.src.includes('/music/pvp-victory-'))return Promise.reject(new DOMException('Test autoplay rejection','NotAllowedError'));return play.call(this);};return el;};Audio.prototype=NativeAudio.prototype;
  });
  await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame);
  await page.click('#btn-start');
  check('菜单与大厅不提前请求两首胜利音乐',!requests.some(u=>u.includes('/music/pvp-victory-')));
  await page.evaluate(()=>FishCharacters.load());
  await page.evaluate(()=>{
   window.freezeMusicTest=true;window.d=FishGame.__debug;
   window.watchVictory=()=>{const el=testAudio.find(a=>a.src.includes('/music/pvp-victory-'));el.naturalLoops=0;let previous=el.currentTime;const record=()=>{if(previous>el.duration*.5&&el.currentTime<el.duration*.25)el.naturalLoops++;previous=el.currentTime;};el.addEventListener('timeupdate',record);el.stopWatching=()=>el.removeEventListener('timeupdate',record);return el;};
   window.stepMusic=t=>{for(let elapsed=0;elapsed<t-1e-6;elapsed+=.05)d.update(Math.min(.05,t-elapsed));};
   window.startMusicMatch=team=>{d.startPvp({team,teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};stepMusic(3.1);};
   window.exhaustMusicRound=win=>{const team=d.getPvp().myTeam,loser=win?(team==='red'?'blue':'red'):team;d.pvpSetTickets(loser==='red'?1:18,loser==='blue'?1:18);if(win)d.pvpKillBot();else d.pvpHurtPlayer();stepMusic(3.2);};
   window.finishMusicMatch=win=>{d.pvpSetRound(win?3:0,win?0:3,4);exhaustMusicRound(win);};
  });
  await page.evaluate(()=>{startMusicMatch('red');exhaustMusicRound(true);});
  check('单个回合获胜不会提前播放整场胜利曲',await page.evaluate(()=>!d.getPvp().over&&d.getPvp().roundNum===2&&d.getBgmInfo().result.selected===null)&&!requests.some(u=>u.includes('/music/pvp-victory-')));
  for(const team of ['red','blue']){
   await page.evaluate(team=>{startMusicMatch(team);finishMusicMatch(true);},team);
   await page.waitForFunction(()=>{const m=d.getBgmInfo().result;return m.ready&&!m.paused&&m.time>m.start+.1;},null,{polling:50,timeout:20000});
   const win=await page.evaluate(()=>({state:d.getState(),pvp:d.getPvp(),music:d.getBgmInfo(),title:document.getElementById('gameover-title').textContent,playing:testAudio.filter(a=>!a.paused&&/assets\/(?:music\/|(?:bgm|boss|gameover|menu|progress)\.mp3)/.test(a.src)).map(a=>a.getAttribute('src'))}));
   check(team+'方胜利视角只播放己方指定音乐',win.state==='gameover'&&win.pvp.resultWin===true&&win.music.result.selected==='victory-'+team&&win.music.result.src==='assets/music/pvp-victory-'+team+'.mp3'&&win.music.overPaused&&win.playing.length===1&&win.title==='歼灭战胜利！',win);
   check(team+'方真实音频解码并从文件开头播放',win.music.result.duration>(team==='red'?26:134)&&win.music.result.time>=0&&win.music.result.time<5&&win.music.result.start===0,win.music.result);
   await page.locator('#set-bgm').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}));});
   check(team+'方胜利曲遵循主背景音乐音量设置',Math.abs((await page.evaluate(()=>d.getBgmInfo().result.volume))-.11)<1e-6);
   await page.locator('#set-bgm').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
   // Speed up real playback rather than seeking: also works on servers without Range support.
   await page.evaluate(()=>{watchVictory().playbackRate=16;});
   await page.waitForFunction(()=>testAudio.some(a=>a.naturalLoops>0&&!a.paused),null,{polling:50,timeout:20000});
   check(team+'方实际播完后从头循环',await page.evaluate(()=>d.getBgmInfo().result.loop));
   await page.evaluate(()=>{const el=testAudio.find(a=>a.src.includes('/music/pvp-victory-'));el.playbackRate=1;el.stopWatching();});
   await page.evaluate(()=>{d.setState('settings');d.update(0);});
   check('离开'+team+'方结算进入设置时停止胜利曲',await page.evaluate(()=>d.getBgmInfo().result.paused&&d.getBgmInfo().overPaused));
   await page.evaluate(()=>{d.setState('gameover');d.update(0);});
   await page.waitForFunction(()=>!d.getBgmInfo().result.paused,null,{polling:50});
   check('返回'+team+'方结算仍播放胜利曲而非战败曲',await page.evaluate(()=>d.getBgmInfo().result.selected==='victory-'+d.getPvp().myTeam&&d.getBgmInfo().overPaused));
   await page.evaluate(team=>{startMusicMatch(team);finishMusicMatch(false);},team);
   await page.waitForFunction(()=>!d.getBgmInfo().overPaused,null,{polling:50,timeout:15000});
   check(team+'方失败视角不会播放对手胜利曲',await page.evaluate(()=>d.getPvp().resultWin===false&&d.getBgmInfo().result.selected==='defeat'&&d.getBgmInfo().result.paused&&document.getElementById('gameover-title').textContent==='歼灭战失败'));
  }
  await page.evaluate(()=>{blockVictory=true;startMusicMatch('blue');finishMusicMatch(true);});
  await page.waitForFunction(()=>d.getBgmInfo().result.ready,null,{polling:50});
  check('胜利曲自动播放被拒绝时不回退到战败曲',await page.evaluate(()=>d.getBgmInfo().result.paused&&d.getBgmInfo().overPaused));
  await page.evaluate(()=>{blockVictory=false;});await page.mouse.click(15,15);
  await page.waitForFunction(()=>!d.getBgmInfo().result.paused,null,{polling:50});
  check('真实点击正确重试蓝方胜利曲',await page.evaluate(()=>d.getBgmInfo().result.selected==='victory-blue'&&d.getBgmInfo().overPaused));
  await page.evaluate(()=>d.restart(true));
  check('返回菜单立即停止并清除上一场结算音乐状态',await page.evaluate(()=>d.getBgmInfo().result.paused&&d.getBgmInfo().overPaused&&d.getBgmInfo().result.win===null&&d.getBgmInfo().result.time===0));
  await page.mouse.click(15,15);
  check('离开结算后的点击不会重新启动旧胜利曲',await page.evaluate(()=>d.getBgmInfo().result.paused));
  await page.evaluate(()=>{d.enterGameWorld();d.enterFallback();d.killAllEnemies();d.getWave().state='test';d.setHp(1);d.damagePlayer(999);d.update(0);});
  await page.waitForFunction(()=>!d.getBgmInfo().overPaused,null,{polling:50});
  check('无尽失败继续使用原失败曲，不受上场蓝方胜利影响',await page.evaluate(()=>d.getState()==='gameover'&&d.getBgmInfo().result.selected==='defeat'&&d.getBgmInfo().result.paused));
  check('结算流程无脚本错误或缺失资源',!report.errors.length&&!report.missing.length,{errors:report.errors,missing:report.missing});
  console.log(report.checks.length+' result music checks passed.');
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
