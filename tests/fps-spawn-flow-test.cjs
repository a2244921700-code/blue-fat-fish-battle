'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Tactics}=require('../js/fps-ai.js'),Layout=require('../js/fps-layout.js'),Physics=require('../js/player-physics.js'),Collision=require('../js/actor-collision.js');
const map=Layout.create(),out=path.join(__dirname,'spawn-flow-results');fs.mkdirSync(out,{recursive:true});
const report={checks:[]},opts={obstacles:map.solids,limit:75,surfaces:map.surfaces,jumpAnchors:map.jumpAnchors,routes:map.routes,weapons:{rifle:{magSize:30,reloadTime:2},pistol:{magSize:12,reloadTime:1}},random:()=>.5};
function simulation(team,count,blocker){
 const t=new Tactics(opts),flip=team==='red'?1:-1,columns=[0,-1,1,-2,2,-3,3,-4,4],bots=[];
 for(let i=0;i<count;i++){const a={id:team+'-'+i,team,alive:true,hp:100,baseY:1.4,position:{x:columns[i%9]*2.7,y:1.4,z:(69-Math.floor(i/9)*2.1)*flip},eyeY:1.7,aimY:.9,lowY:.35};t.reset(a,i);bots.push(a);}
 const actors=bots.slice();if(blocker)actors.push({id:'player',team,alive:true,hp:100,position:{...blocker},eyeY:1.7,aimY:.9,lowY:.35});
 const exited=new Map();let elapsed=0,maxStep=0;
 function tick(dt){
  const previous=actors.map(a=>t.feet(a));t.step(actors,dt);
  const bodies=actors.map((a,i)=>({owner:a,pos:t.feet(a),previous:previous[i],radius:.46,height:1.9}));
  Collision.solve(bodies,{move:(a,x,z)=>{const y=a.pos.y;Physics.step({pos:a.pos,velY:0,onGround:false},x,z,0,{obstacles:map.solids,radius:.46,height:1.9,gravity:0,limit:75});a.pos.y=y;}});
  bodies.forEach((a,i)=>{const b=a.owner;b.position.x=a.pos.x;b.position.y=a.pos.y+(b.brain?b.brain.baseY:0);b.position.z=a.pos.z;
   if(b.brain&&a.blocked){b.brain.repath=Math.min(b.brain.repath,.15);b.brain.stuck+=dt;}
   maxStep=Math.max(maxStep,Math.hypot(a.pos.x-previous[i].x,a.pos.z-previous[i].z));
   if(b.brain&&Math.abs(b.position.z)<58&&!exited.has(b.id))exited.set(b.id,elapsed);
  });elapsed+=dt;
 }
 function run(seconds,fps){for(let frame=0;frame<seconds*fps&&exited.size<bots.length;frame++)tick(1/fps);return {exited:exited.size,lastExit:Math.max(0,...exited.values()),maxStep,waiting:bots.filter(b=>!exited.has(b.id)).map(b=>({id:b.id,x:b.position.x,z:b.position.z,step:b.brain.routeStep,path:b.brain.path[0]}))};}
 return {t,bots,actors,run,tick};
}
function check(name,fn){const data=fn();report.checks.push({name,data});console.log('PASS | '+name);}
try{
 for(const team of ['red','blue'])for(const fps of [30,60,144])check(team+' 16 人保留实体碰撞，全部离开出生区（'+fps+' FPS）',()=>{const s=simulation(team,16),r=s.run(22,fps);assert.equal(r.exited,16,JSON.stringify(r));assert(r.maxStep<.5);return r;});
 for(const team of ['red','blue'])check(team+' 共用路点有站立玩家时，人机仍能通行',()=>{const r=simulation(team,16,{x:0,y:0,z:team==='red'?62:-65}).run(30,60);assert.equal(r.exited,16,JSON.stringify(r));assert(r.maxStep<.5);return r;});
 check('楼层不同或墙体隔开，不能用宽松到达半径跨过目标',()=>{const s=simulation('blue',1),a=s.bots[0];a.position={x:20,y:1.4,z:-14};assert.equal(s.t.move(a,{x:20,y:3.2,z:-14},3.35,0,[a],true,1.2),false);assert.equal(a.brain.routeStep,0);
  const t=new Tactics({limit:20,obstacles:[{min:{x:-.02,y:0,z:-30},max:{x:.02,y:4,z:30}}],weapons:opts.weapons}),b={...a,position:{x:-.49,y:1.4,z:0}};t.reset(b,0);assert.equal(t.move(b,{x:.49,y:0,z:0},3.35,0,[b],true,1.2),false);return {feet:s.t.feet(a),wallUnreachable:true};});
}finally{fs.writeFileSync(path.join(out,'logic-report.json'),JSON.stringify(report,null,2));}
