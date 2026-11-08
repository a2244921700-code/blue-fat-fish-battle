/* Preview the actual bouncing projectile, not an unobstructed straight line.
 * Targets are supplied by the vision system; this module never seeks enemies. */
(function(root){
'use strict';
var physics=typeof module==='object'&&module.exports?require('./grenade-physics.js'):root.FishGrenadePhysics;
function plan(origin,target,obstacles,allies,life,owner){
 var dx=target.x-origin.x,dz=target.z-origin.z,d=Math.hypot(dx,dz);if(d<11||d>29)return null;
 var best=null,bestScore=Infinity;
 [.12,.30,.48,.66,.84,1.02].forEach(function(pitch){
  var aim={x:dx/d*Math.cos(pitch),y:Math.sin(pitch),z:dz/d*Math.cos(pitch)},v=physics.launchVelocity(aim,{x:0,y:0,z:0});
  var g={pos:{x:origin.x,y:origin.y,z:origin.z},vel:{x:v.x,y:v.y,z:v.z},fuse:life,age:0,bounces:0};physics.step(g,life,obstacles);
  var miss=Math.hypot(g.pos.x-target.x,g.pos.z-target.z),self=owner||origin;
  if(miss>3.6||Math.hypot(g.pos.x-self.x,g.pos.z-self.z)<physics.blastRadius+1.5)return;
  if((allies||[]).some(function(a){return Math.hypot(a.x-g.pos.x,a.z-g.pos.z)<physics.blastRadius+2;}))return;
  var score=miss+g.bounces*.12;if(score<bestScore){bestScore=score;best={velocity:v,landing:g.pos,bounces:g.bounces,miss:miss};}
 });return best;
}
// Grenade perception follows the same horizontal cone and vertical limits as
// character perception. Unseen projectiles never provide live coordinates.
function observe(actor,projectiles,tactics,previous,now){
 var memory=(previous||[]).filter(function(m){return m.expires>now;});
 var eye=tactics.actorEye(actor),yaw=actor.brain.yaw;
 projectiles.forEach(function(g){
  if(g.team===actor.team||g.fuse<=0)return;
  var dx=g.pos.x-eye.x,dz=g.pos.z-eye.z,d=Math.hypot(dx,dz);
  if(d>32||(d>.1&&(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d<Math.cos(55*Math.PI/180))||Math.abs(g.pos.y-eye.y)>Math.max(2,d)*1.1||tactics.occluded(eye,g.pos))return;
  var old=memory.find(function(m){return m.projectile===g;});
  // One prediction per projectile/scan, shared only after each observer sees it.
  if(!g.aiPrediction||now-g.aiPrediction.time>.12){
   var clone={pos:{x:g.pos.x,y:g.pos.y,z:g.pos.z},vel:{x:g.vel.x,y:g.vel.y,z:g.vel.z},fuse:g.fuse,age:0,bounces:0};
   physics.step(clone,g.fuse,tactics.obstacles);g.aiPrediction={time:now,point:clone.pos};
  }
  var item={projectile:g,point:Object.assign({},g.aiPrediction.point),expires:now+g.fuse,firstSeen:old?old.firstSeen:now};
  if(old)memory[memory.indexOf(old)]=item;else memory.push(item);
 });return memory;
}
function risk(point,memory,tactics){
 var value=0;memory.forEach(function(m){var d=Math.hypot(point.x-m.point.x,point.y-m.point.y,point.z-m.point.z);
  if(d<physics.blastRadius+1&&!tactics.occluded(m.point,point))value=Math.max(value,physics.blastRadius+1-d);
 });return value;
}
function escape(actor,memory,tactics,now){
 var p=actor.position,feet=p.y-(actor.baseY||1.4),here={x:p.x,y:feet+1,z:p.z},current=risk(here,memory,tactics);if(!current)return null;
 var soon=Math.min.apply(null,memory.map(function(m){return m.expires-now;})),reach=Math.max(2,Math.min(9,soon*tactics.level.speed*1.1));
 var candidates=[];
 for(var i=0;i<12;i++)for(var j=1;j<=2;j++){
  var angle=i*Math.PI/6,d=reach*j/2,q={x:p.x+Math.sin(angle)*d,y:feet,z:p.z+Math.cos(angle)*d};
  if(tactics.nav.heightAt){var y=tactics.nav.heightAt(q.x,q.z,feet);if(!Number.isFinite(y))continue;q.y=y;}
  if(!tactics.nav.clear(q.x,q.z,tactics.nav.layered?q.y:undefined))continue;
  var danger=risk({x:q.x,y:q.y+1,z:q.z},memory,tactics);if(danger>=current-.15)continue;
  candidates.push({point:q,danger:danger,score:danger*3+d*.15});
 }
 candidates.sort(function(a,b){return a.score-b.score;});
 for(var n=0;n<Math.min(6,candidates.length);n++){
  var q=candidates[n].point,route=tactics.nav.route({x:p.x,y:feet,z:p.z},q,false);if(!route.length)continue;
  var length=0,prev=here;route.forEach(function(a){length+=Math.hypot(a.x-prev.x,a.z-prev.z);prev=a;});
  if(length>reach*1.7+1)continue;return q;
 }return null;
}
var api={plan:plan,observe:observe,risk:risk,escape:escape};if(typeof module==='object'&&module.exports)module.exports=api;root.FishTacticalGrenades=api;
})(typeof window==='undefined'?globalThis:window);
