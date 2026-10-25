/* Codex · FPS 感知、导航与优先级行为树。无 DOM，可独立回归测试。
 * 战斗朝向独立于贴图朝向；只根据目击快照、有限时间的队伍情报与枪声决策。
 */
(function(root){
'use strict';
var TAU=Math.PI*2;
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function copy(p){return {x:p.x,y:p.y||0,z:p.z};}
function angle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function turn(bot,p,dt){var desired=Math.atan2(p.x-bot.position.x,p.z-bot.position.z);bot.brain.yaw+=Math.max(-dt*3.8,Math.min(dt*3.8,angle(desired-bot.brain.yaw)));}
function segmentBox(a,b,o,pad){
  var lo=0,hi=1,axes=['x','y','z'];pad=pad||0;
  for(var i=0;i<3;i++){
    var k=axes[i],d=b[k]-a[k],mn=o.min[k]-(k==='y'?0:pad),mx=o.max[k]+(k==='y'?0:pad);
    if(Math.abs(d)<1e-9){if(a[k]<mn||a[k]>mx)return false;continue;}
    var p=(mn-a[k])/d,q=(mx-a[k])/d;if(p>q){var t=p;p=q;q=t;}lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return false;
  }return hi>.002&&lo<.998;
}
// 地面导航忽略门楼/屋顶等高处障碍；视线检测仍保留其真实高度范围。
function Navigation(obstacles,limit,cell,radius){
  this.obstacles=obstacles;this.limit=limit||44;this.cell=cell||1;this.radius=radius||.46;
  this.n=Math.floor(this.limit*2/this.cell)+1;this.blocked=new Uint8Array(this.n*this.n);
  this.ground=obstacles.filter(function(o){return o.max.y>.12&&o.min.y<2.15;});
  this.stats={requests:0,failed:0,expanded:0};
  for(var z=0;z<this.n;z++)for(var x=0;x<this.n;x++){var p=this.point(z*this.n+x);this.blocked[z*this.n+x]=this.clear(p.x,p.z)?0:1;}
}
Navigation.prototype.clear=function(x,z){
  if(Math.abs(x)>this.limit||Math.abs(z)>this.limit)return false;
  for(var i=0;i<this.ground.length;i++){var o=this.ground[i],r=this.radius;if(x>o.min.x-r&&x<o.max.x+r&&z>o.min.z-r&&z<o.max.z+r)return false;}return true;
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
function Heap(){this.items=[];}
Heap.prototype.push=function(node){var a=this.items;a.push(node);var i=a.length-1;while(i>0){var p=(i-1)>>1;if(a[p].f<=node.f)break;a[i]=a[p];i=p;}a[i]=node;};
Heap.prototype.pop=function(){var a=this.items,first=a[0],last=a.pop();if(a.length){var i=0;while(i*2+1<a.length){var j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first;};
Navigation.prototype.route=function(from,to){
  this.stats.requests++;
  if(this.clear(to.x,to.z)&&this.line(from,to))return [copy(to)];
  var start=this.nearest(from),end=this.nearest(to),n=this.n;
  if(start<0||end<0){this.stats.failed++;return [];}
  var size=n*n,g=new Float32Array(size),parent=new Int32Array(size),closed=new Uint8Array(size),open=new Heap();g.fill(Infinity);parent.fill(-1);g[start]=0;
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
      g[next]=ng;parent[next]=cur;open.push({i:next,f:ng+h(next)});
    }
  }
  this.stats.expanded=Math.max(this.stats.expanded,expanded);
  if(!found){this.stats.failed++;return [];}
  var path=[],at=end;while(at!==start&&at>=0){path.push(this.point(at));at=parent[at];}path.reverse();
  var smooth=[],anchor=copy(from),cursor=0;
  while(cursor<path.length){var far=cursor;while(far+1<path.length&&this.line(anchor,path[far+1]))far++;smooth.push(path[far]);anchor=path[far];cursor=far+1;}
  if(this.clear(to.x,to.z)&&this.line(anchor,to))smooth.push(copy(to));return smooth;
};
var LEVELS={easy:{react:.55,error:.055,speed:2.9},normal:{react:.34,error:.033,speed:3.35},hard:{react:.24,error:.022,speed:3.7}};
var ROUTES=[[[0,24],[0,13],[0,3],[0,-13],[0,-26]], [[-28,24],[-28,10],[-28,-10],[-25,-25],[0,-30]], [[28,24],[28,10],[28,-10],[25,-25],[0,-30]]];
function Tactics(opts){
  this.nav=new Navigation(opts.obstacles,opts.limit||44,opts.cell||1,.46);this.obstacles=opts.obstacles;this.weapons=Object.assign({knife:{melee:true,damage:35,range:1.7,shootInterval:.65}},opts.weapons);
  this.level=LEVELS[opts.difficulty]||LEVELS.normal;this.random=opts.random||Math.random;this.clock=0;this.noises=[];this.contacts={red:{},blue:{}};
  this.stats={shots:0,blockedShots:0,replans:0,hearings:0};this.fire=opts.fire||function(){return true;};
}
Tactics.prototype.actorEye=function(a){return {x:a.position.x,y:a.eyeY,z:a.position.z};};
Tactics.prototype.occluded=function(a,b){for(var i=0;i<this.obstacles.length;i++)if(segmentBox(a,b,this.obstacles[i]))return true;return false;};
Tactics.prototype.visible=function(observer,target,ignoreCone){
  if(!target||!target.alive||target.team===observer.team)return null;
  var dx=target.position.x-observer.position.x,dz=target.position.z-observer.position.z,d=Math.hypot(dx,dz);if(d>48)return null;
  var yaw=observer.brain?observer.brain.yaw:observer.yaw;
  if(!ignoreCone&&d>.05&&(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d<Math.cos(55*Math.PI/180))return null;
  var eye=this.actorEye(observer),ys=[target.aimY,target.eyeY,target.lowY];
  for(var i=0;i<ys.length;i++){
    var point={x:target.position.x,y:ys[i],z:target.position.z};
    if(Math.abs(point.y-eye.y)>Math.max(2,d)*1.1)continue;
    if(!this.occluded(eye,point))return point;
  }return null;
};
Tactics.prototype.reset=function(actor,slot){
  var rifle=this.weapons.rifle,side=this.weapons[actor.sidearm]||this.weapons.pistol;
  actor.brain={yaw:actor.team==='red'?Math.PI:0,state:'advance',slot:slot,routeStep:0,routeDirection:1,scan:slot*.017,
    targetId:null,visibleId:null,memory:null,react:0,burst:0,shotWait:.4+this.random()*.4,reload:0,weapon:'rifle',
    magazines:{rifle:rifle.magSize,sidearm:side.magSize},reserves:{rifle:rifle.magSize*3,sidearm:side.magSize*4},
    path:[],goal:null,repath:0,stuck:0,lastPos:copy(actor.position),cover:null,coverTimer:0,strafe:slot%2?1:-1,strafeTimer:0,
    aim:{x:actor.position.x,y:actor.eyeY,z:actor.position.z+(actor.team==='red'?-8:8)},heardAt:-Infinity,searchScan:0,shots:0};return actor.brain;
};
Tactics.prototype.noise=function(team,pos,radius){this.noises.push({team:team,position:copy(pos),radius:radius||26,time:this.clock});if(this.noises.length>48)this.noises.shift();};
Tactics.prototype.report=function(actor,target,point){this.contacts[actor.team][target.id]={id:target.id,position:copy(point||target.position),time:this.clock,reporter:actor.id};};
Tactics.prototype.hit=function(actor,from){if(!actor.brain||!from)return;actor.brain.memory={position:{x:Math.round(from.x/2)*2,y:1.5,z:Math.round(from.z/2)*2},time:this.clock,kind:'sound'};actor.brain.coverTimer=0;};
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
    for(var j=0;j<pts.length;j++){var p={x:pts[j][0],y:eyeY,z:pts[j][1]},d=dist(p,bot.position);if(d<1||d>11||d>=score||!nav.clear(p.x,p.z))continue;
      if(!this.occluded(p,threat))continue;var route=nav.route(bot.position,p);if(!route.length)continue;best=p;score=d;
    }
  }return best;
};
Tactics.prototype.move=function(bot,goal,speed,dt,actors,faceMove){
  var b=bot.brain,p=bot.position;b.repath-=dt;
  // 巡逻点/枪声估计点可能落在陈设内。使用最近的可走地面作为到达目标。
  if(!this.nav.clear(goal.x,goal.z)){var nearest=this.nav.nearest(goal);if(nearest<0)return true;goal=this.nav.point(nearest);}
  if((!b.goal||dist(b.goal,goal)>1.4||!b.path.length)&&b.repath<=0){b.goal=copy(goal);b.path=this.nav.route(p,goal);b.repath=.7+this.random()*.3;this.stats.replans++;}
  while(b.path.length&&dist(p,b.path[0])<.4)b.path.shift();if(!b.path.length)return dist(p,goal)<1;
  var next=b.path[0],d=dist(p,next)||1,dx=(next.x-p.x)/d,dz=(next.z-p.z)/d;
  for(var i=0;i<actors.length;i++){var a=actors[i];if(a===bot||!a.alive)continue;var dd=dist(p,a.position);if(dd<1.1&&dd>.02){dx+=(p.x-a.position.x)/dd*(1.1-dd)*1.5;dz+=(p.z-a.position.z)/dd*(1.1-dd)*1.5;}}
  var len=Math.hypot(dx,dz)||1,step=Math.min(speed*dt,d),nx=p.x+dx/len*step,nz=p.z+dz/len*step;
  if(this.nav.clear(nx,nz)){p.x=nx;p.z=nz;}else if(this.nav.clear(nx,p.z))p.x=nx;else if(this.nav.clear(p.x,nz))p.z=nz;
  if(faceMove)turn(bot,next,dt);
  if(dist(p,b.lastPos)<.025)b.stuck+=dt;else{b.stuck=0;b.lastPos=copy(p);}
  if(b.stuck>1.1){b.path=[];b.repath=0;b.stuck=0;b.strafe*=-1;}
  return false;
};
Tactics.prototype.step=function(actors,dt){
  dt=Math.min(.1,Math.max(0,dt));this.clock+=dt;
  this.noises=this.noises.filter(function(n){return this.clock-n.time<2.5;},this);
  for(var ai=0;ai<actors.length;ai++){
    var bot=actors[ai];if(!bot.alive||!bot.brain)continue;var b=bot.brain,seen=null,aim=null;b.scan-=dt;b.coverTimer-=dt;b.shotWait-=dt;
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
        if(heard){b.heardAt=heard.time;b.memory={position:{x:Math.round(heard.position.x/3)*3,y:1.5,z:Math.round(heard.position.z/3)*3},time:heard.time,kind:'sound'};this.stats.hearings++;}
        else {var contacts=this.contacts[bot.team],fresh=null;Object.keys(contacts).forEach(function(k){var c=contacts[k];if(this.clock-c.time<3&&c.reporter!==bot.id&&dist(c.position,bot.position)<32&&(!fresh||c.time>fresh.time))fresh=c;},this);
          if(fresh)b.memory={position:copy(fresh.position),time:fresh.time,kind:'radio'};
        }
      }
      if(b.memory&&this.clock-b.memory.time>6){b.memory=null;b.targetId=null;b.cover=null;}
    }
    var slot=b.weapon==='rifle'?'rifle':'sidearm',w=this.weapons[b.weapon]||this.weapons.pistol;
    if(b.magazines[slot]===0&&b.reserves[slot]===0&&b.weapon==='rifle'){b.weapon=bot.sidearm||'pistol';slot='sidearm';w=this.weapons[b.weapon];b.reload=0;}
    if(b.weapon!=='rifle'&&b.magazines.sidearm===0&&b.reserves.sidearm===0){b.weapon='knife';w=this.weapons.knife;b.reload=0;}
    // 优先级行为树：换弹/避险 > 可见目标交战 > 记忆调查 > 分路推进。
    if(b.reload>0){b.reload=Math.max(0,b.reload-dt);if(b.reload===0){var take=Math.min(w.magSize-b.magazines[slot],b.reserves[slot]);b.magazines[slot]+=take;b.reserves[slot]-=take;}}
    else if((b.magazines[slot]===0||(!seen&&b.magazines[slot]<Math.ceil(w.magSize*.35)))&&b.reserves[slot]>0){b.reload=w.reloadTime;b.burst=0;b.cover=null;}
    if(b.memory&&(b.reload>0||bot.hp<32)&&b.coverTimer<=0){b.cover=this.pickCover(bot,b.memory.position);b.coverTimer=2.5;}
    if(b.reload>0){
      b.state='reload';if(b.cover)this.move(bot,b.cover,this.level.speed*1.12,dt,actors,true);else if(b.memory)turn(bot,b.memory.position,dt);
    }else if(seen){
      b.react=Math.max(0,b.react-dt);turn(bot,aim,dt);b.state=b.react>0?'react':'engage';
      var d=dist(bot.position,seen.position);
      if(bot.hp<32&&b.cover&&dist(bot.position,b.cover)>.8){b.state='cover';this.move(bot,b.cover,this.level.speed,dt,actors,false);}
      else if(d>(w.melee?w.range*.8:24)){this.move(bot,b.memory.position,this.level.speed*(w.melee?1.15:.85),dt,actors,false);}
      else if(b.react===0&&!w.melee){
        b.strafeTimer-=dt;if(b.strafeTimer<=0){b.strafeTimer=.8+this.random();b.strafe*= -1;}
        // 枪口稳定后短点射；射击时慢移，停火时拉扯。
        var vx=(aim.x-bot.position.x)/(d||1),vz=(aim.z-bot.position.z)/(d||1),speed=b.burst>0?.32:1.6;
        var sx=bot.position.x+(-vz*b.strafe-vx*(d<8?1:0))*speed*dt,sz=bot.position.z+(vx*b.strafe-vz*(d<8?1:0))*speed*dt;
        if(this.nav.clear(sx,sz)){bot.position.x=sx;bot.position.z=sz;}else b.strafe*=-1;
      }
      var facing=Math.abs(angle(Math.atan2(aim.x-bot.position.x,aim.z-bot.position.z)-b.yaw))<.12;
      if(b.react===0&&facing&&b.shotWait<=0&&(b.magazines[slot]>0||w.melee&&d<=w.range)){
        var freshAim=this.visible(bot,seen);
        if(freshAim&&!this.friendlyLine(bot,freshAim,actors)&&this.fire(bot,freshAim,w,this.level.error)!==false){
          if(!w.melee)b.magazines[slot]--;b.shots++;this.stats.shots++;if(b.burst<=0)b.burst=2+Math.floor(this.random()*3);b.burst--;
          b.shotWait=w.melee?w.shootInterval:(b.burst>0?w.shootInterval:.35+this.random()*.35);this.noise(bot.team,bot.position,w.melee?7:28);
        }else {this.stats.blockedShots++;b.shotWait=.14;}
      }
    }else if(b.memory){
      b.state='search';b.aim=copy(b.memory.position);
      if(dist(bot.position,b.memory.position)>1.4)this.move(bot,b.memory.position,this.level.speed*.95,dt,actors,true);
      else {b.searchScan+=dt;b.yaw+=dt*.9;}
    }else{
      b.state='advance';var route=ROUTES[b.slot%ROUTES.length],index=b.routeStep%route.length,q=route[index],flip=bot.team==='red'?1:-1;
      var goal={x:q[0],y:0,z:q[1]*flip};
      if(this.move(bot,goal,this.level.speed,dt,actors,true)){b.routeStep+=b.routeDirection;if(b.routeStep>=route.length){b.routeStep=route.length-2;b.routeDirection=-1;}if(b.routeStep<0){b.routeStep=1;b.routeDirection=1;}b.path=[];}
      if(b.stuck>.6)b.yaw+=dt*.8;
    }
    if(!seen)b.aim={x:bot.position.x+Math.sin(b.yaw)*8,y:bot.eyeY-.2,z:bot.position.z+Math.cos(b.yaw)*8};
  }
};
var api={Navigation:Navigation,Tactics:Tactics,segmentBox:segmentBox,levels:LEVELS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishTactics=api;
})(typeof window!=='undefined'?window:globalThis);
