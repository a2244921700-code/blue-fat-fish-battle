/* Codex · Physical AI jump planning/execution. Feet coordinates, metres and seconds.
 * Planning and playback use the same swept collision solver and fixed 120 Hz steps.
 */
(function(root){
'use strict';
var physics=root.FishPhysics;
if(typeof module!=='undefined'&&module.exports)physics=require('./player-physics.js');
var defaults={radius:.46,height:1.9,gravity:-21,jumpSpeed:9.2,speed:5.2,maxObstacle:1.65,limit:75};
function copy(p){return {x:p.x,y:p.y||0,z:p.z};}
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function settings(opts){return Object.assign({},defaults,opts);}
function localBoxes(from,to,obstacles,cfg){
 var pad=cfg.radius+.25,loX=Math.min(from.x,to.x)-pad,hiX=Math.max(from.x,to.x)+pad,loZ=Math.min(from.z,to.z)-pad,hiZ=Math.max(from.z,to.z)+pad;
 return obstacles.filter(function(o){return o.max.x>=loX&&o.min.x<=hiX&&o.max.z>=loZ&&o.min.z<=hiZ;});
}
function make(from,to,opts){return {pos:copy(from),velY:opts.jumpSpeed,onGround:false,target:copy(to),age:0,accumulator:0,apex:from.y||0,velocity:{x:0,y:opts.jumpSpeed,z:0},ceiling:false,done:false,failed:false};}
function advance(body,dt,obstacles,opts){
 body.accumulator+=Math.min(.1,Math.max(0,dt));
 while(body.accumulator>=1/120-1e-9&&!body.done&&!body.failed){
  var h=1/120,p=body.pos,old=copy(p),d=distance(p,body.target),step=Math.min(d,opts.speed*h);
  var dx=d>1e-6?(body.target.x-p.x)/d*step:0,dz=d>1e-6?(body.target.z-p.z)/d*step:0;
  var result=physics.step(body,dx,dz,h,{obstacles:obstacles,radius:opts.radius,height:opts.height,gravity:opts.gravity,limit:opts.limit});
  body.velocity={x:(p.x-old.x)/h,y:body.velY,z:(p.z-old.z)/h};body.apex=Math.max(body.apex,p.y);body.ceiling=body.ceiling||result.ceiling;
  body.age+=h;body.accumulator-=h;
  // A broad crate can be landed on, crossed, and stepped off without a second impulse.
  if(body.age>.15&&body.onGround&&distance(p,body.target)<.06&&Math.abs(p.y-body.target.y)<.04)body.done=true;
  if(body.age>2.6)body.failed=true;
 }
 return body;
}
function plan(from,to,obstacles,opts){
 var cfg=settings(opts);if(distance(from,to)>8||Math.abs(to.x)>cfg.limit||Math.abs(to.z)>cfg.limit)return null;
 if(physics.heightLimit(from,obstacles,cfg.radius,cfg.height+.08)<cfg.height+.08)return null;
 var boxes=localBoxes(from,to,obstacles,cfg),b=make(from,to,cfg);
 while(!b.done&&!b.failed)advance(b,1/30,boxes,cfg);
 if(!b.done||b.ceiling||b.apex<from.y+.25)return null;
 return {from:copy(from),to:copy(to),duration:b.age,apex:b.apex};
}
function start(from,to,opts){return make(from,to,settings(opts));}
root.FishBotMotion={defaults:defaults,settings:settings,plan:plan,start:start,advance:advance,localBoxes:localBoxes};
if(typeof module!=='undefined'&&module.exports)module.exports=root.FishBotMotion;
})(typeof window!=='undefined'?window:globalThis);
