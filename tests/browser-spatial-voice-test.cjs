'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),report={checks:[],errors:[]};
 const check=(name,ok,data)=>{assert(ok,name+' '+JSON.stringify(data));report.checks.push(name);console.log('PASS | '+name);};
 try{
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.freezeVoiceTest)f(t);});});
  await page.goto(process.env.FISH_TEST_URL||'file:///D:/DSH/Game/蓝色肥鱼大作战/index.html');await page.click('#btn-start');
  const pcm=await page.evaluate(async()=>{
   async function render(x,distance,blocked,local=false){
    const ctx=new OfflineAudioContext(2,96000,48000),forward={x:0,y:0,z:-1};
    const system=FishVoice.create({context:()=>ctx,volume:()=>1,paused:()=>false,active:()=>true,listener:()=>({position:{x:0,y:0,z:0},forward,up:{x:0,y:1,z:0}}),occluded:()=>blocked});
    const v=system.play('sfx_throw_voice_1.mp3',()=>({x,y:0,z:-distance}),.65,local);
    for(let n=0;n<100&&!v.buffer;n++)await new Promise(r=>setTimeout(r,10));if(!v.buffer)throw new Error('Voice decode failed');
    const before=system.stats(),audio=await ctx.startRendering(),rms=[];
    for(let ch=0;ch<2;ch++){const data=audio.getChannelData(ch);let sum=0;for(let i=4800;i<72000;i++)sum+=data[i]*data[i];rms.push(Math.sqrt(sum/67200));}
    return {rms,before};
   }
   return {left:await render(-4,3,false),right:await render(4,3,false),near:await render(0,4,false),far:await render(0,28,false),wall:await render(0,4,true),self:await render(0,.85,false,true)};
  });report.pcm=pcm;
  check('本地文件模式可解码原始语音并输出真实音频采样',pcm.near.rms.every(v=>v>.001),pcm.near);
  check('HRTF 左右方位确实改变双声道输出',pcm.left.rms[0]>pcm.left.rms[1]*1.1&&pcm.right.rms[1]>pcm.right.rms[0]*1.1,pcm);
  check('远处语音明显衰减，不再等响贴耳播放',pcm.far.rms[0]<pcm.near.rms[0]*.3,pcm);
  check('隔墙后的语音降低音量并滤去高频',pcm.wall.rms[0]<pcm.near.rms[0]*.45&&pcm.wall.before.voices[0].cutoff===1100,pcm.wall);
  check('自己的语音使用较低音量与轻微早期反射',pcm.self.rms[0]<pcm.near.rms[0]*.65,pcm.self);
  await page.evaluate(()=>FishCharacters.load());await page.evaluate(()=>{
   window.freezeVoiceTest=true;window.d=FishGame.__debug;d.startPvp({team:'blue',teamSize:6});d.enterFallback();d.getPvpTactics().step=()=>{};d.setState('playing');d.update(4.8);d.setState('playing');
   window.randomBefore=Math.random;window.speaker=d.getEnemies().find(e=>e.team==='red');const p=d.getPlayer().pos;speaker.mesh.position.set(p.x+3,1.4,p.z);d.syncCharacters(.01);d.playGrenadeVoice(speaker);
  });
  await page.waitForFunction(()=>FishGame.__debug.getVoiceStats().voices.some(v=>v.playing),null,{polling:30});
  const npc=await page.evaluate(()=>d.getVoiceStats().voices[0]);
  check('AI 语音使用实机头部坐标与距离',!npc.local&&npc.distance>2&&npc.distance<4&&!npc.blocked,npc);
  const occluded=await page.evaluate(async()=>{const p=d.getPlayer().pos;d.getObstacles().push({min:{x:p.x+1.2,y:0,z:p.z-2},max:{x:p.x+1.6,y:3,z:p.z+2}});await new Promise(r=>setTimeout(r,170));d.updateVoices();const v=d.getVoiceStats().voices[0];d.getObstacles().pop();return v;});
  check('实机地图碰撞体会压低并滤闷 AI 语音',occluded.blocked&&occluded.cutoff===1100&&occluded.level<npc.level*.5,occluded);
  const npcDeath=await page.evaluate(()=>{speaker.alive=false;d.updateVoices();return d.getVoiceStats().voices.length;});
  check('AI 死亡立即停止该角色正在播放的语音',npcDeath===0,npcDeath);
  await page.evaluate(()=>{Math.random=()=>0;d.playGrenadeVoice();Math.random=randomBefore;});
  await page.waitForFunction(()=>FishGame.__debug.getVoiceStats().voices.some(v=>v.playing),null,{polling:30});
  const first=await page.evaluate(()=>d.getVoiceStats());
  check('第一条投雷语音能够播放，声音在角色前下方',first.voices[0].file==='sfx_throw_voice_1.mp3'&&first.voices[0].local&&first.voices[0].distance>.8,first);
  const pause=await page.evaluate(()=>{d.setState('paused');d.updateVoices();return d.getVoiceStats();});
  check('暂停停止语音采样并保留播放进度',pause.paused&&!pause.voices[0].playing&&pause.voices[0].offset>=0,pause);
  const resume=await page.evaluate(()=>{d.setState('playing');d.updateVoices();return d.getVoiceStats();});
  check('继续游戏恢复同一条语音，不重复随机选择',!resume.paused&&resume.voices[0].playing&&resume.voices[0].id===first.voices[0].id,resume);
  await page.evaluate(()=>{Math.random=()=>.999;d.playGrenadeVoice();Math.random=randomBefore;});await page.waitForFunction(()=>FishGame.__debug.getVoiceStats().voices.some(v=>v.playing),null,{polling:30});
  const second=await page.evaluate(()=>d.getVoiceStats());
  check('第二条投雷语音随机分支可用，同一角色不会叠播',second.voices.length===1&&second.voices[0].file==='sfx_throw_voice_2.mp3',second);
  const death=await page.evaluate(()=>{d.pvpHurtPlayer();d.updateVoices();return d.getVoiceStats();});
  check('角色死亡立即结束自己的语音',death.voices.length===0,death);
  const leave=await page.evaluate(()=>{d.restart(true);return d.getVoiceStats();});
  check('返回菜单清空语音声源',leave.voices.length===0,leave);
  check('音频解码、空间节点与暂停恢复没有脚本异常',report.errors.length===0,report.errors);
  console.log(report.checks.length+' spatial voice checks passed.');
 }finally{fs.writeFileSync(path.join(__dirname,'factions-results','voice-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
