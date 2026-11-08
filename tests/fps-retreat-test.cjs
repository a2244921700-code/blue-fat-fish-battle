'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Tactics}=require('../js/fps-ai.js');
const OUT=path.join(__dirname,'retreat-results');fs.mkdirSync(OUT,{recursive:true});
const report={checks:[]};
const weapons={rifle:{magSize:30,reloadTime:1.8,shootInterval:.1},pistol:{magSize:12,reloadTime:1.2,shootInterval:.2}};
const box=(x,z,w,d)=>({min:{x:x-w/2,y:0,z:z-d/2},max:{x:x+w/2,y:3,z:z+d/2}});
const actor=(id,team,x,z)=>({id,team,position:{x,y:1.4,z},baseY:1.4,eyeY:1.9,aimY:1.5,lowY:.7,hp:100,alive:true,sidearm:'pistol'});
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function fixture(obstacles=[box(0,-6,3,1.5)],extra={}){
 const a=actor('bot','blue',0,0),e=actor('enemy','red',0,12),shots=[];
 const t=new Tactics({obstacles,weapons,random:()=>.5,fire:(b,aim)=>{shots.push({time:t.clock,reload:b.brain.reload,position:{...b.position},aim:{...aim}});return true;},...extra});
 t.reset(a,0);a.brain.shotWait=0;return {t,a,e,shots};
}
function test(name,fn){const data=fn()||{};report.checks.push({name,ok:true,...data});console.log('PASS | '+name);}
try{
 for(const fps of [30,60,144])test(fps+' FPS：换弹后撤保持目视，完成换弹立即恢复射击',()=>{
  const {t,a,e,shots}=fixture(),dt=1/fps;a.brain.magazines.rifle=0;
  let maxAngle=0,reloadEnd=null,minZ=0,visibleFrames=0,frames=0;
  for(let i=0;i<fps*3&&!shots.length;i++){
   e.position.x=Math.sin(t.clock)*.7;
   const before=a.brain.reload;t.step([a,e],dt);frames++;
   if(a.brain.visibleId===e.id)visibleFrames++;
   maxAngle=Math.max(maxAngle,angle(a.brain.yaw,Math.atan2(e.position.x-a.position.x,e.position.z-a.position.z)));
   minZ=Math.min(minZ,a.position.z);if(before>0&&a.brain.reload===0)reloadEnd=t.clock;
   if(a.brain.reload>0)assert.equal(shots.length,0,'不能在换弹途中开火');
  }
  assert(minZ<-3);assert.equal(visibleFrames,frames);assert(maxAngle<.12);assert(reloadEnd!==null&&shots.length);
  assert(shots[0].time-reloadEnd<=dt+1e-6);
  return {maxFacingErrorDegrees:maxAngle*180/Math.PI,retreatedMetres:-minZ,firstShot:shots[0].time,reloadEnd};
 });
 test('低血量撤向真实掩体时，面向敌人并边退边射击',()=>{
  const {t,a,e,shots}=fixture();a.hp=20;let backShots=0,maxAngle=0;
  for(let i=0;i<75;i++){
   const z=a.position.z,n=shots.length;t.step([a,e],1/60);
   if(shots.length>n&&a.position.z<z-.001)backShots++;
   maxAngle=Math.max(maxAngle,angle(a.brain.yaw,Math.atan2(e.position.x-a.position.x,e.position.z-a.position.z)));
  }
  assert(a.brain.cover&&a.brain.state==='cover');assert(a.position.z<-3);assert(backShots>=3);assert(maxAngle<.12);
  return {backShots,position:a.position,cover:a.brain.cover};
 });
 test('近距离拉扯同时后退和侧移，继续正常短点射',()=>{
  const {t,a,e,shots}=fixture([]);e.position.z=5;let maxX=0;
  for(let i=0;i<90;i++){t.step([a,e],1/60);maxX=Math.max(maxX,Math.abs(a.position.x));assert(angle(a.brain.yaw,Math.atan2(e.position.x-a.position.x,e.position.z-a.position.z))<.12);}
  assert(a.position.z<-.4&&maxX>.1&&shots.length>=3);return {shots:shots.length,retreatedMetres:-a.position.z,maxSideMovement:maxX};
 });
 test('撤退途中枪线有队友时不开火，队友离开后恢复',()=>{
  const {t,a,e,shots}=fixture();a.hp=20;const friend=actor('friend','blue',0,6);
  for(let i=0;i<60;i++){friend.position.x=(a.position.x+e.position.x)/2;friend.position.z=(a.position.z+e.position.z)/2;t.step([a,e,friend],1/60);}
  assert.equal(shots.length,0);friend.alive=false;
  for(let i=0;i<18;i++)t.step([a,e,friend],1/60);assert(shots.length>0);
 });
 test('遮挡后停止射击；隐藏目标移动不会更新最后目击位置',()=>{
  const {t,a,e,shots}=fixture();a.hp=20;for(let i=0;i<40;i++)t.step([a,e],1/60);
  const memory={...a.brain.memory.position},n=shots.length;t.obstacles.push(box(0,5,30,1));e.position.x=4;
  for(let i=0;i<20;i++)t.step([a,e],1/60);
  assert.equal(shots.length,n);assert.equal(a.brain.visibleId,null);assert.deepEqual(a.brain.memory.position,memory);
 });
 test('已经失去敌人视野时，换弹转移仍能面向安全路线',()=>{
  const {t,a,e}=fixture();a.brain.magazines.rifle=0;t.step([a,e],1/60);
  const memory={...a.brain.memory.position};t.obstacles.push(box(0,5,30,1));e.position.x=4;
  for(let i=0;i<30;i++)t.step([a,e],1/60);
  assert(a.brain.reload>0);assert.equal(a.brain.visibleId,null);assert.deepEqual(a.brain.memory.position,memory);assert(angle(a.brain.yaw,0)>1.2);
 });
 test('刚发现的新敌人仍需反应时间，换弹结束不能跳过这段延迟',()=>{
  const {t,a,e,shots}=fixture([]);a.brain.magazines.rifle=0;a.brain.reload=.06;
  for(let i=0;i<12;i++)t.step([a,e],1/60);assert.equal(a.brain.reload,0);assert.equal(shots.length,0);
  for(let i=0;i<15;i++)t.step([a,e],1/60);assert(shots.length>0);assert(shots[0].time>=t.level.react);
 });
 test('受击侧跳保留目击朝向，空中不开火、不追踪隐藏敌人',()=>{
  const {t,a,e,shots}=fixture([],{random:()=>0});t.hit(a,e.position);t.step([a,e],1/60);
  assert(a.brain.jump&&a.brain.jump.reason==='evade');const look={...a.brain.jump.lookAt};e.position.x=20;e.position.z=-12;
  let frames=0,maxAngle=0;
  while(a.brain.jump&&frames++<120){t.step([a,e],1/60);maxAngle=Math.max(maxAngle,angle(a.brain.yaw,Math.atan2(look.x-a.position.x,look.z-a.position.z)));assert.equal(shots.length,0);if(a.brain.jump)assert.deepEqual(a.brain.jump.lookAt,look);}
  assert(!a.brain.jump&&frames>10);assert(maxAngle<.12);return {frames,maxFacingErrorDegrees:maxAngle*180/Math.PI};
 });
 test('普通越障跳跃仍朝向路径落点，到达水平位置后不突然转向零度',()=>{
  const {t,a}=fixture([]);a.brain.yaw=Math.PI/2;assert(t.beginJump(a,{x:2,y:0,z:0},'obstacle',[a]));
  for(let i=0;i<30;i++)t.step([a],1/60);assert(angle(a.brain.yaw,Math.PI/2)<.05);
 });
}finally{fs.writeFileSync(path.join(OUT,'logic-report.json'),JSON.stringify(report,null,2));}
console.log(report.checks.length+' retreat scenarios passed');
