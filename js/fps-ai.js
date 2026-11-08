/* Codex · FPS 感知、导航与优先级行为树。无 DOM，可独立回归测试。
 * 交战朝向独立于移动方向；只根据目击快照、有限时间的队伍情报与枪声决策。
 */
(function(root){
'use strict';
var TAU=Math.PI*2;
var Motion=root.FishBotMotion;
var Equipment=root.FishEquipment;
var SniperCycle=root.FishSniperCycle;
var HeightNav=root.FishHeightNavigation,Physics=root.FishPhysics;
if(typeof module!=='undefined'&&module.exports){Motion=require('./fps-locomotion.js');HeightNav=require('./fps-height-nav.js');Physics=require('./player-physics.js');Equipment=require('./equipment.js');SniperCycle=require('./sniper-cycle.js');}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function copy(p){return {x:p.x,y:p.y||0,z:p.z};}
function angle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function turn(bot,p,dt){var dx=p.x-bot.position.x,dz=p.z-bot.position.z;if(dx*dx+dz*dz<1e-8)return;var desired=Math.atan2(dx,dz);bot.brain.yaw+=Math.max(-dt*3.8,Math.min(dt*3.8,angle(desired-bot.brain.yaw)));}
function segmentBox(a,b,o,pad){
  var lo=0,hi=1,axes=['x','y','z'];pad=pad||0;
  for(var i=0;i<3;i++){
    var k=axes[i],d=b[k]-a[k],mn=o.min[k]-(k==='y'?0:pad),mx=o.max[k]+(k==='y'?0:pad);
    if(Math.abs(d)<1e-9){if(a[k]<mn||a[k]>mx)return false;continue;}
    var p=(mn-a[k])/d,q=(mx-a[k])/d;if(p>q){var t=p;p=q;q=t;}lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return false;
  }return hi>.002&&lo<.998;
}
// 地面导航忽略门楼/屋顶等高处障碍；视线检测仍保留其真实高度范围。
function Navigation(obstacles,limit,cell,radius,jumpOptions){
  this.obstacles=obstacles;this.limit=limit||44;this.cell=cell||1;this.radius=radius||.46;
  this.n=Math.floor(this.limit*2/this.cell)+1;this.blocked=new Uint8Array(this.n*this.n);
  this.ground=obstacles.filter(function(o){return o.max.y>.12&&o.min.y<2.15;});
  // Static spatial buckets avoid scanning every building for every A* edge.
  this.bucketSize=8;this.buckets=Object.create(null);
  var self=this;
  this.ground.forEach(function(o){
    for(var bz=Math.floor((o.min.z-self.radius)/8);bz<=Math.floor((o.max.z+self.radius)/8);bz++)
      for(var bx=Math.floor((o.min.x-self.radius)/8);bx<=Math.floor((o.max.x+self.radius)/8);bx++)
        (self.buckets[bx+','+bz]||(self.buckets[bx+','+bz]=[])).push(o);
  });
  this.costs=new Float32Array(this.n*this.n);this.parents=new Int32Array(this.n*this.n);this.closed=new Uint8Array(this.n*this.n);
  this.stats={requests:0,failed:0,expanded:0,jumpLinks:0};this.jumpLinks=Object.create(null);this.parentJumps=new Array(this.n*this.n);
  for(var z=0;z<this.n;z++)for(var x=0;x<this.n;x++){var p=this.point(z*this.n+x);this.blocked[z*this.n+x]=this.clear(p.x,p.z)?0:1;}
  if(jumpOptions)this.buildJumpLinks(jumpOptions);
}
Navigation.prototype.clear=function(x,z){
  if(Math.abs(x)>this.limit||Math.abs(z)>this.limit)return false;
  var local=this.buckets[Math.floor(x/8)+','+Math.floor(z/8)]||[];
  for(var i=0;i<local.length;i++){var o=local[i],r=this.radius;if(x>o.min.x-r&&x<o.max.x+r&&z>o.min.z-r&&z<o.max.z+r)return false;}return true;
};
Navigation.prototype.point=function(i){return {x:(i%this.n)*this.cell-this.limit,y:0,z:Math.floor(i/this.n)*this.cell-this.limit};};
Navigation.prototype.index=function(p){var x=Math.round((p.x+this.limit)/this.cell),z=Math.round((p.z+this.limit)/this.cell);return x<0||z<0||x>=this.n||z>=this.n?-1:z*this.n+x;};
Navigation.prototype.nearest=function(p){
  var i=this.index(p);if(i>=0&&!this.blocked[i])return i;
  var best=-1,bd=Infinity,cx=Math.round((p.x+this.limit)/this.cell),cz=Math.round((p.z+this.limit)/this.cell);
  for(var dz=-6;dz<=6;dz++)for(var dx=-6;dx<=6;dx++){
    var x=cx+dx,z=cz+dz;if(x<0||z<0||x>=this.n||z>=this.n)continue;var j=z*this.n+x;if(this.blocked[j])continue;
    var d=dist(p,this.point(j));if(d<bd){bd=d;best=j;}
  }return best;
};
Navigation.prototype.line=function(a,b){
  var steps=Math.ceil(dist(a,b)/.24);
  for(var i=0;i<=steps;i++){var t=steps?i/steps:0;if(!this.clear(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;
};
Navigation.prototype.buildJumpLinks=function(options){
  var self=this,motion=Motion||root.FishBotMotion,cfg=motion.settings(options),pairs=new Set();
  // Ground A* remains intact. Explicit links cross low cover using a validated
  // jump, possible contact with its top, and a physical step down on the far side.
  this.ground.forEach(function(o){
    if(o.min.y>.05||o.max.y<.25||o.max.y>cfg.maxObstacle)return;
    ['x','z'].forEach(function(axis){
      var cross=axis==='x'?'z':'x',width=o.max[axis]-o.min[axis],span=o.max[cross]-o.min[cross];
      if(width>4.5||span<.7)return;
      var center=(o.min[cross]+o.max[cross])/2,offset=Math.max(0,span/2-.8),lanes=offset>.5?[center,center-offset,center+offset]:[center];
      lanes.forEach(function(lane){
        var a={x:0,y:0,z:0},b={x:0,y:0,z:0};a[axis]=o.min[axis]-self.radius-.7;b[axis]=o.max[axis]+self.radius+.7;a[cross]=b[cross]=lane;
        var ia=self.nearest(a),ib=self.nearest(b);if(ia<0||ib<0||ia===ib)return;
        a=self.point(ia);b=self.point(ib);if(a[axis]>=o.min[axis]-self.radius||b[axis]<=o.max[axis]+self.radius)return;
        [[ia,ib,a,b],[ib,ia,b,a]].forEach(function(edge){
          var key=edge[0]+':'+edge[1];if(pairs.has(key))return;pairs.add(key);
          var plan=motion.plan(edge[2],edge[3],self.obstacles,cfg);if(!plan)return;
          plan.index=edge[1];plan.cost=dist(plan.from,plan.to)+.65;
          (self.jumpLinks[edge[0]]||(self.jumpLinks[edge[0]]=[])).push(plan);self.stats.jumpLinks++;
        });
      });
    });
  });
};
function Heap(){this.items=[];}
Heap.prototype.push=function(node){var a=this.items;a.push(node);var i=a.length-1;while(i>0){var p=(i-1)>>1;if(a[p].f<=node.f)break;a[i]=a[p];i=p;}a[i]=node;};
Heap.prototype.pop=function(){var a=this.items,first=a[0],last=a.pop();if(a.length){var i=0;while(i*2+1<a.length){var j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first;};
Navigation.prototype.route=function(from,to,allowJumps){
  this.stats.requests++;
  if(this.clear(to.x,to.z)&&this.line(from,to))return [copy(to)];
  var start=this.nearest(from),end=this.nearest(to),n=this.n;
  if(start<0||end<0){this.stats.failed++;return [];}
  var size=n*n,g=this.costs,parent=this.parents,parentJump=this.parentJumps,closed=this.closed,open=new Heap();g.fill(Infinity);parent.fill(-1);parentJump.fill(null);closed.fill(0);g[start]=0;
  var self=this;function h(i){return dist(self.point(i),self.point(end));}open.push({i:start,f:h(start)});var found=false,expanded=0;
  while(open.items.length&&expanded<size){
    var cur=open.pop().i;if(closed[cur])continue;if(cur===end){found=true;break;}closed[cur]=1;expanded++;
    var cx=cur%n,cz=Math.floor(cur/n);
    for(var dz=-1;dz<=1;dz++)for(var dx=-1;dx<=1;dx++){
      if(!dx&&!dz)continue;var x=cx+dx,z=cz+dz;if(x<0||z<0||x>=n||z>=n)continue;var next=z*n+x;
      if(this.blocked[next]||closed[next])continue;
      if(dx&&dz&&(this.blocked[cz*n+x]||this.blocked[z*n+cx]))continue;
      // 网格可走不等于连线可走：薄墙/斜角必须再做连续碰撞检查。
      if(!this.line(this.point(cur),this.point(next)))continue;
      var ng=g[cur]+(dx&&dz?1.414214:1)*this.cell;if(ng>=g[next])continue;
      g[next]=ng;parent[next]=cur;parentJump[next]=null;open.push({i:next,f:ng+h(next)});
    }
    var jumps=allowJumps===false?[]:(this.jumpLinks[cur]||[]);
    for(var ji=0;ji<jumps.length;ji++){var link=jumps[ji],dest=link.index,jg=g[cur]+link.cost;if(closed[dest]||jg>=g[dest])continue;g[dest]=jg;parent[dest]=cur;parentJump[dest]=link;open.push({i:dest,f:jg+h(dest)});}
  }
  this.stats.expanded=Math.max(this.stats.expanded,expanded);
  if(!found){this.stats.failed++;return [];}
  var path=[],at=end;while(at!==start&&at>=0){var point=this.point(at);if(parentJump[at])point.jump=parentJump[at];path.push(point);at=parent[at];}path.reverse();
  var smooth=[],anchor=copy(from),cursor=0;
  while(cursor<path.length){
    if(path[cursor].jump){var jump=path[cursor].jump;if(dist(anchor,jump.from)>.01)smooth.push(copy(jump.from));smooth.push(path[cursor]);anchor=path[cursor++];continue;}
    var far=cursor;while(far+1<path.length&&!path[far+1].jump&&this.line(anchor,path[far+1]))far++;smooth.push(path[far]);anchor=path[far];cursor=far+1;
  }
  if(this.clear(to.x,to.z)&&this.line(anchor,to))smooth.push(copy(to));return smooth;
};
var LEVELS={easy:{react:.55,error:.055,speed:2.9},normal:{react:.34,error:.033,speed:3.35},hard:{react:.24,error:.022,speed:3.7}};
var ROUTES=[[[0,24],[0,13],[0,3],[0,-13],[0,-26]], [[-28,24],[-28,10],[-28,-10],[-25,-25],[0,-30]], [[28,24],[28,10],[28,-10],[25,-25],[0,-30]]];
function Tactics(opts){
  this.routes=opts.routes||ROUTES;
  this.motion=Motion||root.FishBotMotion;this.motionOptions=this.motion.settings(Object.assign({limit:opts.limit||44},opts.motion));
  this.nav=opts.surfaces?new (HeightNav||root.FishHeightNavigation)(opts.obstacles,opts.limit||44,opts.cell||1,.46,this.motionOptions,opts.surfaces,opts.jumpAnchors):new Navigation(opts.obstacles,opts.limit||44,opts.cell||1,.46,this.motionOptions);this.obstacles=opts.obstacles;this.weapons=Object.assign({knife:{melee:true,range:.9,shootInterval:.6}},opts.weapons);
  this.level=LEVELS[opts.difficulty]||LEVELS.normal;this.random=opts.random||Math.random;this.clock=0;this.noises=[];this.contacts={red:{},blue:{}};
  this.stats={shots:0,blockedShots:0,replans:0,hearings:0,jumps:0,landings:0,obstacleJumps:0,evadeJumps:0,rejectedJumps:0,grenades:0,pickups:0,sniperShots:0,reconUses:0,reconScans:0,sniperRepositions:0};this.fire=opts.fire||function(){return true;};this.grenade=opts.grenade||null;this.loot=opts.loot||null;this.danger=opts.danger||null;
}
Tactics.prototype.actorEye=function(a){return {x:a.position.x,y:a.eyeY,z:a.position.z};};
Tactics.prototype.feet=function(a){return {x:a.position.x,y:a.position.y-(a.brain?a.brain.baseY:(a.baseY||0)),z:a.position.z};};
Tactics.prototype.floorGoal=function(p,preferred){var q=copy(p);if(this.nav.layered){var y=this.nav.heightAt(q.x,q.z,preferred===undefined?q.y:preferred);if(y!==undefined)q.y=y;}return q;};
Tactics.prototype.walk=function(bot,dx,dz,dt){
  var b=bot.brain,p=this.feet(bot),before=copy(p),body={pos:p,velY:b.motion.velY||0,onGround:b.motion.onGround};
  var boxes=this.nav.local(p.x,p.z);
  if(Math.floor(p.x/8)!==Math.floor((p.x+dx)/8)||Math.floor(p.z/8)!==Math.floor((p.z+dz)/8))boxes=Array.from(new Set(boxes.concat(this.nav.local(p.x+dx,p.z),this.nav.local(p.x,p.z+dz),this.nav.local(p.x+dx,p.z+dz))));
  (Physics||root.FishPhysics).step(body,dx,dz,dt,{obstacles:boxes,radius:this.nav.radius,height:this.motionOptions.height,gravity:this.motionOptions.gravity,limit:this.nav.limit,stepHeight:.26});
  bot.position.x=p.x;bot.position.z=p.z;bot.position.y=p.y+b.baseY;var dy=p.y-before.y;bot.eyeY+=dy;bot.aimY+=dy;bot.lowY+=dy;
  var elapsed=dt||this.frameDt||1/60;b.motion.onGround=body.onGround;b.motion.velY=body.velY;b.motion.velocity={x:(p.x-before.x)/elapsed,y:body.velY,z:(p.z-before.z)/elapsed};
};
Tactics.prototype.occluded=function(a,b){for(var i=0;i<this.obstacles.length;i++)if(segmentBox(a,b,this.obstacles[i]))return true;return false;};
Tactics.prototype.visible=function(observer,target,ignoreCone){
  if(!target||!target.alive||target.team===observer.team)return null;
  var sniper=observer.brain&&this.weapons[observer.brain.weapon]&&this.weapons[observer.brain.weapon].sniper,scoped=sniper&&observer.brain.scoped;
  var dx=target.position.x-observer.position.x,dz=target.position.z-observer.position.z,d=Math.hypot(dx,dz);if(d>(scoped?90:sniper?72:48))return null;
  var yaw=observer.brain?observer.brain.yaw:observer.yaw;
  if(!ignoreCone&&d>.05&&(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d<Math.cos((scoped?12:55)*Math.PI/180))return null;
  var eye=this.actorEye(observer),ys=[target.aimY,target.eyeY,target.lowY];
  for(var i=0;i<ys.length;i++){
    var point={x:target.position.x,y:ys[i],z:target.position.z};
    if(Math.abs(point.y-eye.y)>Math.max(2,d)*1.1)continue;
    if(!this.occluded(eye,point))return point;
  }return null;
};
Tactics.prototype.reset=function(actor,slot){
  var primary=actor.primary||'rifle',rifle=this.weapons[primary],side=this.weapons[actor.sidearm]||this.weapons.pistol;
  var recon=actor.recon||(actor.recon={readyAt:0});recon.activeUntil=0;recon.contacts=[];recon.nextScan=0;
  actor.brain={yaw:actor.team==='red'?Math.PI:0,state:'advance',slot:slot,routeStep:0,routeDirection:1,scan:slot*.017,
    targetId:null,visibleId:null,memory:null,react:0,burst:0,shotWait:.4+this.random()*.4,reload:0,weapon:primary,
    magazines:{rifle:rifle.magSize,sidearm:side.magSize},reserves:{rifle:rifle.magSize*(rifle.reserveMagMul||3),sidearm:side.magSize*4},
    path:[],goal:null,repath:0,stuck:0,lastPos:copy(actor.position),cover:null,coverTimer:0,strafe:slot%2?1:-1,strafeTimer:0,
    aim:{x:actor.position.x,y:actor.eyeY,z:actor.position.z+(actor.team==='red'?-8:8)},heardAt:-Infinity,searchScan:0,shots:0,
    baseY:actor.baseY===undefined?1.4:actor.baseY,motion:{onGround:true,velY:0,velocity:{x:0,y:0,z:0}},jump:null,jumpCooldown:0,jumpRecovery:0,jumpWait:0,avoidJumpsUntil:0,lastHit:-Infinity,lastEvade:-Infinity,
    recon:recon,scoped:false,scopeTime:0,aimStable:0,switchWait:0,nearThreatUntil:0,spawnPosition:copy(actor.position),spawnTime:this.clock,probeAt:this.clock+8+slot*.7,sniperPost:null,postUntil:0,postThink:0,lastSniperShot:-Infinity,cycleGoal:null,previousSniperPosition:copy(actor.position)};return actor.brain;
};
Tactics.prototype.noise=function(team,pos,radius){this.noises.push({team:team,position:copy(pos),radius:radius||26,time:this.clock});if(this.noises.length>48)this.noises.shift();};
Tactics.prototype.report=function(actor,target,point){this.contacts[actor.team][target.id]={id:target.id,position:copy(point||target.position),time:this.clock,reporter:actor.id};};
Tactics.prototype.hit=function(actor,from){if(!actor.brain||!from)return;actor.brain.memory={position:{x:Math.round(from.x/2)*2,y:Math.round((from.y||0)*2)/2,z:Math.round(from.z/2)*2},time:this.clock,kind:'sound'};actor.brain.coverTimer=0;actor.brain.lastHit=this.clock;};
Tactics.prototype.beginJump=function(bot,target,reason,actors){
  var b=bot.brain;if(b.jump||!b.motion.onGround||b.jumpCooldown>0||bot.attacking||b.reload>0)return false;
  if(actors.some(function(a){return a!==bot&&a.alive&&dist(a.position,target)<.9;}))return false;
  var from={x:bot.position.x,y:bot.position.y-b.baseY,z:bot.position.z},plan=this.motion.plan(from,target,this.obstacles,this.motionOptions);
  if(!plan){this.stats.rejectedJumps++;b.jumpCooldown=.6;return false;}
  this.cancelScope(bot);
  b.jump=this.motion.start(from,target,this.motionOptions);b.jump.reason=reason;b.jump.boxes=this.motion.localBoxes(from,target,this.obstacles,this.motionOptions);b.motion=b.jump;
  // A combat sidestep keeps the last observed threat in front. Do not read an
  // enemy's live position while airborne; traversal jumps still face the route.
  b.jump.lookAt=reason==='evade'?copy(b.aim):null;
  b.burst=0;b.jumpWait=0;b.state='jump';b.lastJumpReason=reason;this.stats.jumps++;this.stats[reason==='evade'?'evadeJumps':'obstacleJumps']++;return true;
};
Tactics.prototype.updateJump=function(bot,dt){
  var b=bot.brain,j=b.jump,oldY=bot.position.y;
  this.motion.advance(j,dt,j.boxes,this.motionOptions);bot.position.x=j.pos.x;bot.position.y=j.pos.y+b.baseY;bot.position.z=j.pos.z;
  var dy=bot.position.y-oldY;bot.eyeY+=dy;bot.aimY+=dy;bot.lowY+=dy;
  b.state=j.onGround?'traverse':'jump';turn(bot,j.lookAt||j.target,dt);
  if(j.done||j.failed){b.jump=null;b.jumpCooldown=j.reason==='evade'?4.5+this.random()*2:1.2;b.jumpRecovery=.18;b.shotWait=Math.max(b.shotWait,.18);b.path=[];b.repath=0;b.stuck=0;b.lastPos=copy(bot.position);this.stats.landings++;}
};
Tactics.prototype.tryEvade=function(bot,target,actors){
  var b=bot.brain,d=dist(bot.position,target.position);
  if(this.clock-b.lastHit>.7||b.lastHit<=b.lastEvade||b.jumpCooldown>0||b.reload>0||b.weapon==='knife'||d<6||d>24)return false;
  b.lastEvade=b.lastHit;if(this.random()>.35)return false;
  var dx=(target.position.x-bot.position.x)/d,dz=(target.position.z-bot.position.z)/d;
  for(var side=0;side<2;side++){
    var sign=b.strafe*(side?-1:1),goal={x:bot.position.x-dz*sign*2-dx*.6,y:0,z:bot.position.z+dx*sign*2-dz*.6};
    if(this.nav.layered)goal=this.floorGoal(goal,this.feet(bot).y);
    if(this.nav.clear(goal.x,goal.z,goal.y)&&this.beginJump(bot,goal,'evade',actors))return true;
  }return false;
};
Tactics.prototype.friendlyLine=function(bot,target,actors){
  var a=this.actorEye(bot),dx=target.x-a.x,dy=target.y-a.y,dz=target.z-a.z,len=dx*dx+dy*dy+dz*dz;
  for(var i=0;i<actors.length;i++){var f=actors[i];if(f===bot||!f.alive||f.team!==bot.team)continue;
    var t=((f.position.x-a.x)*dx+(f.aimY-a.y)*dy+(f.position.z-a.z)*dz)/len;
    if(t<=0||t>=1)continue;var dd=Math.hypot(a.x+dx*t-f.position.x,a.z+dz*t-f.position.z);
    if(dd<.58&&Math.abs(a.y+dy*t-f.aimY)<.85)return true;
  }return false;
};
Tactics.prototype.pickCover=function(bot,threat){
  var best=null,score=Infinity,nav=this.nav,eyeY=bot.eyeY;
  for(var i=0;i<nav.ground.length;i++){
    var o=nav.ground[i];if(o.max.y<1.5)continue;
    var cx=(o.min.x+o.max.x)/2,cz=(o.min.z+o.max.z)/2;if(Math.hypot(cx-bot.position.x,cz-bot.position.z)>13)continue;
    var pts=[[o.min.x-.85,o.min.z-.85],[o.max.x+.85,o.min.z-.85],[o.min.x-.85,o.max.z+.85],[o.max.x+.85,o.max.z+.85],[cx,o.min.z-.9],[cx,o.max.z+.9],[o.min.x-.9,cz],[o.max.x+.9,cz]];
    for(var j=0;j<pts.length;j++){var p={x:pts[j][0],y:eyeY,z:pts[j][1]},d=dist(p,bot.position);if(nav.layered)p=this.floorGoal(p,this.feet(bot).y);if(d<1||d>11||d>=score||!nav.clear(p.x,p.z,nav.layered?p.y:undefined))continue;
      var sight=copy(p);if(nav.layered)sight.y+=eyeY-this.feet(bot).y;
      if(!this.occluded(sight,threat))continue;var route=nav.route(nav.layered?this.feet(bot):bot.position,p);if(!route.length)continue;best=p;score=d;
    }
  }return best;
};
Tactics.prototype.move=function(bot,goal,speed,dt,actors,faceMove,arrivalRadius){
  var b=bot.brain,p=bot.position;b.repath-=dt;
  if(this.nav.layered)goal=this.floorGoal(goal);
  // 巡逻点/枪声估计点可能落在陈设内。使用最近的可走地面作为到达目标。
  if(!this.nav.clear(goal.x,goal.z,this.nav.layered?goal.y:undefined)){var nearest=this.nav.nearest(goal);if(nearest<0)return false;goal=this.nav.point(nearest);}
  var feet=this.nav.layered?this.feet(bot):p;
  // Patrol points describe an area, not a spot every solid body must occupy.
  // Keep exact approach for melee/pickup and validate floor/visibility at corners.
  if(arrivalRadius&&dist(p,goal)<=arrivalRadius&&(!this.nav.layered||Math.abs(feet.y-goal.y)<.26)&&this.nav.line(feet,goal)){b.path=[];b.stuck=0;return true;}
  if((!b.goal||dist(b.goal,goal)>1.4||Math.abs(b.goal.y-goal.y)>.8||!b.path.length)&&b.repath<=0){b.goal=copy(goal);b.path=this.nav.route(feet,goal,this.clock>=b.avoidJumpsUntil&&b.reload===0);b.repath=.7+this.random()*.3;this.stats.replans++;}
  while(b.path.length&&!b.path[0].jump){
    var first=b.path[0],after=b.path[1],near=dist(p,first);
    var exact=near<(this.nav.layered?.025:.28)&&(!this.nav.layered||Math.abs(feet.y-first.y)<.025);
    var bypass=after&&!after.jump&&near<.85&&(!this.nav.layered||Math.abs(feet.y-first.y)<.26)&&this.nav.line(feet,after);
    if(!exact&&!bypass)break;b.path.shift();
  }
  if(!b.path.length)return dist(p,goal)<1&&(!this.nav.layered||Math.abs(feet.y-goal.y)<.35)&&this.nav.line(feet,goal);
  var next=b.path[0];
  if(next.jump){
    if(dist(p,next.jump.from)<.42){
      if(this.beginJump(bot,next.jump.to,'obstacle',actors))this.updateJump(bot,dt);
      else if((b.jumpWait+=dt)>1.2){
        // A teammate or opponent may occupy the landing. Try a ground detour
        // after a short wait instead of queuing forever at the launch point.
        b.path=[];b.repath=0;b.jumpWait=0;b.avoidJumpsUntil=this.clock+3;
      }
      return false;
    }
    next=next.jump.from;
  }
  b.jumpWait=0;
  var d=dist(p,next)||1,dx=(next.x-p.x)/d,dz=(next.z-p.z)/d;
  for(var i=0;i<actors.length;i++){var a=actors[i];if(a===bot||!a.alive||Math.abs(this.feet(a).y-this.feet(bot).y)>1.8)continue;var dd=dist(p,a.position);if(dd<1.1&&dd>.02){dx+=(p.x-a.position.x)/dd*(1.1-dd)*1.5;dz+=(p.z-a.position.z)/dd*(1.1-dd)*1.5;}}
  var len=Math.hypot(dx,dz)||1,step=Math.min(speed*dt,d),nx=p.x+dx/len*step,nz=p.z+dz/len*step;
  if(this.nav.layered){
    var y=this.nav.heightAt(nx,nz,feet.y),standing=this.nav.heightAt(p.x,p.z,feet.y);
    // Actor separation can nudge a bot just outside the authored route margin.
    // Walk back under real collisions; never teleport it to the nearest node.
    if(standing===undefined&&this.nav.bodyClear(p.x,p.z,feet.y))this.walk(bot,nx-p.x,nz-p.z,0);
    else if(y!==undefined&&Math.abs(y-feet.y)<.28)this.walk(bot,nx-p.x,nz-p.z,0);
    else if(this.nav.clear(nx,p.z,feet.y))this.walk(bot,nx-p.x,0,0);else if(this.nav.clear(p.x,nz,feet.y))this.walk(bot,0,nz-p.z,0);
  }else if(this.nav.clear(nx,nz)){p.x=nx;p.z=nz;}else if(this.nav.clear(nx,p.z))p.x=nx;else if(this.nav.clear(p.x,nz))p.z=nz;
  if(faceMove)turn(bot,next,dt);
  if(dist(p,b.lastPos)<.025)b.stuck+=dt;else{b.stuck=0;b.lastPos=copy(p);}
  if(b.stuck>1.1){b.path=[];b.repath=0;b.stuck=0;b.strafe*=-1;}
  return false;
};
Tactics.prototype.cancelScope=function(bot){var b=bot.brain;b.scoped=false;b.scopeTime=0;b.aimStable=0;if(b.recon)b.recon.activeUntil=0;};
Tactics.prototype.setBotScope=function(bot,dt){var b=bot.brain;b.scopeTime+=dt;b.scoped=b.scopeTime>=.22;};
Tactics.prototype.canBotRecon=function(bot){var b=bot.brain;return Equipment&&Equipment.canRecon({alive:bot.alive,pvp:true,character:bot.characterId,weapon:b.weapon,scoped:b.scoped,goggles:bot.goggles})&&!b.reload&&!b.switchWait&&!b.jump&&b.motion.onGround&&!bot.throwing&&!bot.attacking;};
Tactics.prototype.reconDue=function(bot,seen){
  var b=bot.brain,r=b.recon;if(!r||this.clock<r.readyAt)return false;
  // Decisions to activate use only observations, previous intel and a patrol
  // timer. Hidden enemy positions are read ONLY after valid activation.
  return !!seen||!!(b.memory&&this.clock-b.memory.time<4)||this.clock-b.lastHit<2||this.clock>=b.probeAt&&(dist(bot.position,b.spawnPosition)>8||this.clock-b.spawnTime>18);
};
Tactics.prototype.updateRecon=function(bot,actors,seen){
  var b=bot.brain,r=b.recon;if(!r)return;
  if(!this.canBotRecon(bot)){r.activeUntil=0;return;}
  if(r.activeUntil<=this.clock&&this.reconDue(bot,seen)){
    r.activeUntil=this.clock+Equipment.reconDuration;r.readyAt=this.clock+Equipment.reconCooldown;r.nextScan=0;b.probeAt=r.readyAt;this.stats.reconUses++;
  }
  if(r.activeUntil<=this.clock||this.clock<r.nextScan)return;
  r.nextScan=this.clock+.12;r.contacts=actors.filter(function(a){return a.alive&&a.team!==bot.team;}).map(function(a){return {id:a.id,position:{x:a.position.x,y:a.aimY,z:a.position.z},ground:this.feet(a),time:this.clock};},this);this.stats.reconScans++;
};
Tactics.prototype.reconContact=function(bot){
  var b=bot.brain,contacts=b.recon?b.recon.contacts:[],best=null,score=Infinity;
  contacts.forEach(function(c){if(this.clock-c.time>6)return;var d=dist(bot.position,c.position);if(d<score){score=d;best=c;}},this);return best;
};
Tactics.prototype.chooseCombatWeapon=function(bot,seen){
  var b=bot.brain;if(!this.weapons[bot.primary]||!this.weapons[bot.primary].sniper)return;
  var contact=this.reconContact(bot),near=Math.min(seen?dist(bot.position,seen.position):Infinity,contact?dist(bot.position,contact.position):Infinity);
  if(near<11)b.nearThreatUntil=this.clock+2;
  var next=b.weapon;
  if(this.clock<b.nearThreatUntil&&bot.sidearm&&b.magazines.sidearm+b.reserves.sidearm>0)next=bot.sidearm;
  else if(near>17&&b.magazines.rifle+b.reserves.rifle>0)next=bot.primary;
  if(next!==b.weapon){b.weapon=next;b.reload=0;b.switchWait=next===bot.primary?.8:.5;b.shotWait=Math.max(b.shotWait,b.switchWait);b.burst=0;this.cancelScope(bot);}
  b.defend=contact&&dist(bot.position,contact.position)<11&&(!seen||seen.id!==contact.id&&dist(bot.position,seen.position)>14)?contact:null;
  if(b.defend){b.memory={position:copy(contact.position),time:contact.time,kind:'recon'};b.targetId=contact.id;b.aim=copy(contact.position);return true;}return false;
};
Tactics.prototype.defendRecon=function(bot,actors,dt){
  var b=bot.brain;if(!b.defend||this.clock-b.defend.time>4)return false;
  b.state='recon-defend';b.aim=copy(b.defend.position);turn(bot,b.aim,dt);this.cancelScope(bot);
  if(b.coverTimer<=0){b.cover=this.pickCover(bot,b.aim);b.coverTimer=1.8;}
  if(b.cover)this.move(bot,b.cover,this.level.speed,dt,actors,false,.8);
  else {var d=dist(bot.position,b.aim)||1,goal=this.floorGoal({x:bot.position.x+(bot.position.x-b.aim.x)/d*2,y:this.feet(bot).y,z:bot.position.z+(bot.position.z-b.aim.z)/d*2},this.feet(bot).y);if(this.nav.clear(goal.x,goal.z,this.nav.layered?goal.y:undefined))this.move(bot,goal,this.level.speed*.65,dt,actors,false);}
  return true;
};
Tactics.prototype.findSniperPost=function(bot,point,actors,force){
  var feet=this.feet(bot),height=bot.eyeY-feet.y,candidates=[],self=this;
  function add(x,z){var p=self.floorGoal({x:x,y:feet.y,z:z},feet.y);if(!self.nav.clear(x,z,self.nav.layered?p.y:undefined))return;
    if(actors.some(function(a){return a!==bot&&a.alive&&a.team===bot.team&&dist(a.position,p)<1.4;}))return;
    var walk=dist(feet,p);if(force&&walk<2)return;var range=dist(p,point),eye={x:x,y:p.y+height,z:z};
    var blocked=self.occluded(eye,point),score=Math.abs(range-34)*.22+walk*.3+(blocked?15:0)+(range<16?(16-range)*3:0);
    var contacts=bot.brain.recon&&bot.brain.recon.contacts||[];
    contacts.forEach(function(c){if(self.clock-c.time<6&&c.id!==bot.brain.targetId&&dist(p,c.position)<24&&!self.occluded(eye,c.position))score+=7;});
    if(self.occluded({x:x+1.4,y:eye.y,z:z},point)||self.occluded({x:x-1.4,y:eye.y,z:z},point))score-=3;
    candidates.push({position:p,score:score});
  }
  add(feet.x,feet.z);for(var ring=0;ring<2;ring++)for(var i=0;i<8;i++){var a=i*Math.PI/4,r=ring?13:6;add(feet.x+Math.sin(a)*r,feet.z+Math.cos(a)*r);}
  candidates.sort(function(a,b){return a.score-b.score;});
  for(var j=0;j<Math.min(4,candidates.length);j++){var p=candidates[j].position;if(dist(p,feet)<.5||this.nav.route(this.nav.layered?feet:bot.position,p).length)return p;}return null;
};
Tactics.prototype.sniperDecision=function(bot,seen,aim,actors,dt){
  var b=bot.brain,w=this.weapons[b.weapon];if(!w||!w.sniper){this.cancelScope(bot);return false;}
  var moved=dist(bot.position,b.previousSniperPosition);b.previousSniperPosition=copy(bot.position);if(moved>.04)b.aimStable=0;
  if(b.switchWait>0){this.cancelScope(bot);b.state='switch';return true;}
  // Bolt recovery also owns the state when a target ducks out of sight.
  if(this.clock-b.lastSniperShot<SniperCycle.duration){
    b.state='sniper-cycle';this.cancelScope(bot);
    if(seen){b.aim=copy(aim);turn(bot,aim,dt);var range=dist(bot.position,seen.position)||1,dx=(aim.x-bot.position.x)/range,dz=(aim.z-bot.position.z)/range,goal=this.floorGoal({x:bot.position.x-dz*b.strafe*1.2,y:this.feet(bot).y,z:bot.position.z+dx*b.strafe*1.2},this.feet(bot).y);
      if(this.clock-b.lastSniperShot<.55&&this.nav.clear(goal.x,goal.z,this.nav.layered?goal.y:undefined))this.move(bot,goal,.75,dt,actors,false);
    }return true;
  }
  if(seen){
    b.sniperPost=null;b.aim=copy(aim);turn(bot,aim,dt);var d=dist(bot.position,seen.position);
    if(b.react===0&&b.shotWait>.7&&this.grenade&&this.grenade(bot,seen,actors)){this.cancelScope(bot);b.state='grenade';this.stats.grenades++;return true;}
    var pressure=b.recon.contacts.filter(function(c){return this.clock-c.time<4&&c.id!==seen.id&&dist(bot.position,c.position)<24;},this).length;
    if(d<18||d>66||bot.hp<32&&b.cover||pressure>=2){
      b.state=pressure>=2?'recon-reposition':d<18?'sniper-withdraw':'sniper-reposition';this.cancelScope(bot);
      if(this.clock>=b.postThink){b.cycleGoal=bot.hp<32&&b.cover?b.cover:this.findSniperPost(bot,aim,actors,true);b.postThink=this.clock+1.8;this.stats.sniperRepositions++;}
      if(b.cycleGoal)this.move(bot,b.cycleGoal,this.level.speed*.8,dt,actors,false,.8);return true;
    }
    b.state='sniper-aim';this.setBotScope(bot,dt);this.updateRecon(bot,actors,seen);
    var facing=Math.abs(angle(Math.atan2(aim.x-bot.position.x,aim.z-bot.position.z)-b.yaw))<.045;
    b.aimStable=facing&&b.react===0?b.aimStable+dt:0;
    if(b.scoped&&b.aimStable>=this.level.react+.15&&b.shotWait<=0&&b.jumpRecovery===0&&b.magazines.rifle>0){
      var fresh=this.visible(bot,seen);
      if(fresh&&!this.friendlyLine(bot,fresh,actors)&&this.fire(bot,fresh,w,this.level.error*.22)!==false){b.magazines.rifle--;b.shots++;this.stats.shots++;this.stats.sniperShots++;b.shotWait=w.shootInterval;b.lastSniperShot=this.clock;this.cancelScope(bot);b.state='sniper-fire';this.noise(bot.team,bot.position,36);}
      else {this.stats.blockedShots++;b.shotWait=.15;}
    }return true;
  }
  this.updateRecon(bot,actors,null);var intel=this.reconContact(bot);
  if(intel){b.memory={position:copy(intel.position),time:intel.time,kind:'recon'};b.targetId=intel.id;}
  if(b.memory){
    b.aim=copy(b.memory.position);turn(bot,b.aim,dt);
    if(this.clock>=b.postThink||!b.sniperPost){var force=this.clock>=b.postUntil&&b.postUntil>0,first=!b.sniperPost;b.sniperPost=this.findSniperPost(bot,b.memory.position,actors,force);b.postThink=this.clock+2;if(force||first)b.postUntil=this.clock+4.5;this.stats.sniperRepositions++;}
    if(b.sniperPost&&dist(bot.position,b.sniperPost)>.8){
      b.state=intel?'recon-reposition':'sniper-reposition';
      var active=b.recon&&b.recon.activeUntil>this.clock;
      if(!active)this.cancelScope(bot);else b.aimStable=0;
      this.move(bot,b.sniperPost,active?.8:this.level.speed*.8,dt,actors,false,.8);
    }else {b.state=intel?'recon-watch':'sniper-watch';this.setBotScope(bot,dt);this.updateRecon(bot,actors,null);}
    return true;
  }
  if(this.reconDue(bot,null)&&bot.characterId==='claude_true'&&bot.goggles&&bot.goggles.charges>0){
    b.state='recon-survey';this.setBotScope(bot,dt);this.updateRecon(bot,actors,null);return true;
  }
  this.cancelScope(bot);return false;
};
Tactics.prototype.step=function(actors,dt,matchClock){
  dt=Math.min(.1,Math.max(0,dt));this.frameDt=dt;this.clock=matchClock===undefined?this.clock+dt:matchClock;
  this.noises=this.noises.filter(function(n){return this.clock-n.time<2.5;},this);
  for(var ai=0;ai<actors.length;ai++){
    var bot=actors[ai];if(!bot.alive||!bot.brain)continue;var b=bot.brain,seen=null,aim=null;b.scan-=dt;b.coverTimer-=dt;b.shotWait-=dt;b.switchWait=Math.max(0,b.switchWait-dt);b.jumpCooldown=Math.max(0,b.jumpCooldown-dt);b.jumpRecovery=Math.max(0,b.jumpRecovery-dt);
    // Traversal owns movement until a safe landing. No mid-air firing or melee.
    if(b.jump){this.cancelScope(bot);this.updateJump(bot,dt);continue;}
    if(this.nav.layered){this.walk(bot,0,0,dt);if(!b.motion.onGround){this.cancelScope(bot);b.state='fall';continue;}}
    if(this.danger&&this.danger(bot,actors,dt)){this.cancelScope(bot);continue;}
    if(bot.throwing){this.cancelScope(bot);b.state='grenade';continue;}
    if(bot.attacking){this.cancelScope(bot);b.state='melee';continue;}
    // 已锁定对象每步重验遮挡；全候选列表按不同相位低频扫描。
    if(b.visibleId){var held=actors.find(function(a){return a.id===b.visibleId;});aim=this.visible(bot,held);if(aim)seen=held;}
    if(b.scan<=0){
      b.scan=.18;var best=seen?dist(bot.position,seen.position)*.75:Infinity;
      for(var j=0;j<actors.length;j++){var target=actors[j],d=dist(bot.position,target.position);if(d>=best)continue;var point=this.visible(bot,target);if(point){seen=target;aim=point;best=d;}}
    }
    if(seen){
      if(b.targetId!==seen.id||!b.visibleId)b.react=this.level.react;
      b.targetId=seen.id;b.visibleId=seen.id;b.memory={position:copy(aim),time:this.clock,kind:'visual'};b.aim=copy(aim);this.report(bot,seen,aim);
    }else{
      b.visibleId=null;b.burst=0;
      // 没有视野时绝不读取目标实时坐标。枪声与无线电仅提供过去位置。
      if(!b.memory||this.clock-b.memory.time>2){
        var heard=this.noises.filter(function(n){return n.team!==bot.team&&n.time>b.heardAt&&dist(n.position,bot.position)<n.radius;}).pop();
        if(heard){b.heardAt=heard.time;b.memory={position:{x:Math.round(heard.position.x/3)*3,y:Math.round((heard.position.y||0)*2)/2,z:Math.round(heard.position.z/3)*3},time:heard.time,kind:'sound'};this.stats.hearings++;}
        else {var contacts=this.contacts[bot.team],fresh=null;Object.keys(contacts).forEach(function(k){var c=contacts[k];if(this.clock-c.time<3&&c.reporter!==bot.id&&dist(c.position,bot.position)<32&&(!fresh||c.time>fresh.time))fresh=c;},this);
          if(fresh)b.memory={position:copy(fresh.position),time:fresh.time,kind:'radio'};
        }
      }
      if(b.memory&&this.clock-b.memory.time>6){b.memory=null;b.targetId=null;b.cover=null;}
    }
    if(this.loot&&this.loot(bot,seen,actors,dt)){this.cancelScope(bot);continue;}
    if(this.chooseCombatWeapon(bot,seen)){seen=null;aim=null;b.visibleId=null;}
    var slot=b.weapon===(bot.primary===undefined?'rifle':bot.primary)?'rifle':'sidearm',w=this.weapons[b.weapon]||this.weapons.pistol;
    // Re-evaluate usable owned slots after a drop or resupply. A knife never reloads,
    // and returning rifle ammunition must not strand a bot on an empty sidearm.
    var primary=bot.primary===undefined?'rifle':bot.primary,sidearm=bot.sidearm===undefined?'pistol':bot.sidearm;
    if(b.weapon==='knife'||!(b.magazines[slot]+b.reserves[slot])){
      var next=primary&&b.magazines.rifle+b.reserves.rifle>0?primary:sidearm&&b.magazines.sidearm+b.reserves.sidearm>0?sidearm:'knife';
      if(next!==b.weapon){b.weapon=next;b.reload=0;}
      slot=b.weapon===(bot.primary===undefined?'rifle':bot.primary)?'rifle':'sidearm';w=this.weapons[b.weapon];
    }
    // 优先级行为树：换弹/避险 > 可见目标交战 > 记忆调查 > 分路推进。
    if(b.reload>0){b.reload=Math.max(0,b.reload-dt);if(b.reload===0){var take=Math.min(w.magSize-b.magazines[slot],b.reserves[slot]);b.magazines[slot]+=take;b.reserves[slot]-=take;}}
    else if(!w.melee&&!(w.sniper&&this.clock-b.lastSniperShot<SniperCycle.duration)&&(b.magazines[slot]===0||(!seen&&b.magazines[slot]<Math.ceil(w.magSize*.35)))&&b.reserves[slot]>0){b.reload=w.reloadTime;b.burst=0;b.cover=null;}
    if(b.memory&&(b.reload>0||bot.hp<32)&&b.coverTimer<=0){b.cover=this.pickCover(bot,b.memory.position);b.coverTimer=2.5;}
    // Looking at the opponent and following a retreat path are separate jobs.
    // Reload time also counts as observing an already visible opponent, so a
    // completed reload does not restart the target acquisition delay.
    if(seen){b.react=Math.max(0,b.react-dt);turn(bot,aim,dt);}
    if(b.reload>0){
      this.cancelScope(bot);
      b.state='reload';if(b.cover)this.move(bot,b.cover,this.level.speed*1.12,dt,actors,!seen);else if(!seen&&b.memory)turn(bot,b.memory.position,dt);
    }else if(b.switchWait>0){this.cancelScope(bot);b.state='switch';
    }else if(!seen&&this.defendRecon(bot,actors,dt)){
      // A recon snapshot can warn about a flank; it never authorizes shooting.
    }else if(this.sniperDecision(bot,seen,aim,actors,dt)){
      // Dedicated sniper / private recon subtree has handled this actor.
    }else if(seen){
      b.state=b.react>0?'react':'engage';
      var d=dist(bot.position,seen.position);
      if(b.react===0&&this.grenade&&this.grenade(bot,seen,actors)){b.state='grenade';this.stats.grenades++;continue;}
      if(this.tryEvade(bot,seen,actors)){this.updateJump(bot,dt);continue;}
      if(bot.hp<32&&b.cover&&dist(bot.position,b.cover)>.8){b.state='cover';this.move(bot,b.cover,this.level.speed,dt,actors,false);}
      else if(d>(w.melee?w.range*.8:24)){this.move(bot,this.floorGoal(b.memory.position,b.memory.position.y-1.2),this.level.speed*(w.melee?1.15:.85),dt,actors,false);}
      else if(b.react===0&&!w.melee){
        b.strafeTimer-=dt;if(b.strafeTimer<=0){b.strafeTimer=.8+this.random();b.strafe*= -1;}
        // 枪口稳定后短点射；射击时慢移，停火时拉扯。
        var vx=(aim.x-bot.position.x)/(d||1),vz=(aim.z-bot.position.z)/(d||1),speed=b.burst>0?.32:1.6;
        var sx=bot.position.x+(-vz*b.strafe-vx*(d<8?1:0))*speed*dt,sz=bot.position.z+(vx*b.strafe-vz*(d<8?1:0))*speed*dt;
        if(this.nav.clear(sx,sz,this.nav.layered?this.feet(bot).y:undefined)){if(this.nav.layered)this.walk(bot,sx-bot.position.x,sz-bot.position.z,0);else{bot.position.x=sx;bot.position.z=sz;}}else b.strafe*=-1;
      }
      var facing=Math.abs(angle(Math.atan2(aim.x-bot.position.x,aim.z-bot.position.z)-b.yaw))<.12;
      if(!b.jump&&b.jumpRecovery===0&&b.react===0&&facing&&b.shotWait<=0&&(b.magazines[slot]>0||w.melee&&d<=w.range)){
        var freshAim=this.visible(bot,seen);
        if(freshAim&&!this.friendlyLine(bot,freshAim,actors)&&this.fire(bot,freshAim,w,this.level.error)!==false){
          if(!w.melee)b.magazines[slot]--;b.shots++;this.stats.shots++;if(b.burst<=0)b.burst=2+Math.floor(this.random()*3);b.burst--;
          b.shotWait=w.melee?w.shootInterval:(b.burst>0?w.shootInterval:.35+this.random()*.35);this.noise(bot.team,bot.position,w.melee?7:28);
        }else {this.stats.blockedShots++;b.shotWait=.14;}
      }
    }else if(b.memory){
      b.state='search';b.aim=copy(b.memory.position);
      if(dist(bot.position,b.memory.position)>1.4||this.nav.layered&&Math.abs(this.feet(bot).y-this.floorGoal(b.memory.position,b.memory.position.y-1.2).y)>.5)this.move(bot,this.floorGoal(b.memory.position,b.memory.position.y-1.2),this.level.speed*.95,dt,actors,true);
      else {b.searchScan+=dt;b.yaw+=dt*.9;}
    }else{
      b.state='advance';var teamRoutes=this.routes[bot.team]||this.routes,route=teamRoutes[b.slot%teamRoutes.length],index=b.routeStep%route.length,q=route[index],flip=this.routes[bot.team]?1:bot.team==='red'?1:-1;
      var goal={x:q[0],y:q[2]||0,z:q[1]*flip};
      if(this.move(bot,goal,this.level.speed,dt,actors,true,this.nav.radius*2+.03)){b.routeStep+=b.routeDirection;if(b.routeStep>=route.length){b.routeStep=route.length-2;b.routeDirection=-1;}if(b.routeStep<0){b.routeStep=1;b.routeDirection=1;}b.path=[];b.repath=0;}
      if(b.stuck>.6)b.yaw+=dt*.8;
    }
    if(!seen&&!(w.sniper&&b.memory)&&b.state!=='recon-defend')b.aim={x:bot.position.x+Math.sin(b.yaw)*8,y:bot.eyeY-.2,z:bot.position.z+Math.cos(b.yaw)*8};
  }
};
var api={Navigation:Navigation,Tactics:Tactics,segmentBox:segmentBox,levels:LEVELS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishTactics=api;
})(typeof window!=='undefined'?window:globalThis);
