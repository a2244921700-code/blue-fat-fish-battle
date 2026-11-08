/* Layered, authored-surface A*. Feet coordinates throughout. A bridge and the
 * lane below it are distinct nodes; jumps are simulated before becoming edges. */
(function(root){
'use strict';
var Layout=root.FishFpsLayout,Motion=root.FishBotMotion;
if(typeof module==='object'&&module.exports){Layout=require('./fps-layout.js');Motion=require('./fps-locomotion.js');}
function copy(p){return {x:p.x,y:p.y,z:p.z};}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function Heap(){this.a=[];}
Heap.prototype.push=function(v){var a=this.a,i=a.length;a.push(v);while(i){var p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;};
Heap.prototype.pop=function(){var a=this.a,out=a[0],last=a.pop();if(a.length){var i=0;while(i*2+1<a.length){var j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return out;};
function Navigation(obstacles,limit,cell,radius,options,surfaces,anchors){
 this.layered=true;this.obstacles=obstacles;this.limit=limit;this.cell=cell||1;this.radius=radius||.46;this.height=options.height||1.9;this.stepHeight=.26;this.n=Math.floor(limit*2/this.cell)+1;
 this.surfaces=surfaces;this.nodes=[];this.grid=new Map();this.edges=[];this.jumpLinks={};this.buckets={};this.surfaceBuckets={};
 this.stats={requests:0,failed:0,expanded:0,jumpLinks:0,rejectedJumpLinks:0,layers:0};
 this.ground=obstacles.filter(function(o){return o.kind!=='terrain'&&o.kind!=='roof';});
 var self=this;
 function add(b,x0,z0,x1,z1,o){for(var z=Math.floor(z0/8);z<=Math.floor(z1/8);z++)for(var x=Math.floor(x0/8);x<=Math.floor(x1/8);x++)(b[x+','+z]||(b[x+','+z]=[])).push(o);}
 obstacles.forEach(function(o){add(self.buckets,o.min.x-self.radius,o.min.z-self.radius,o.max.x+self.radius,o.max.z+self.radius,o);});
 surfaces.forEach(function(s){add(self.surfaceBuckets,s.x0,s.z0,s.x1,s.z1,s);});
 for(var iz=0;iz<this.n;iz++)for(var ix=0;ix<this.n;ix++){
  var x=ix*this.cell-limit,z=iz*this.cell-limit,levels=this.levels(x,z),ids=[];
  levels.forEach(function(y){if(self.bodyClear(x,z,y)){var id=self.nodes.length;self.nodes.push({x:x,y:y,z:z,ix:ix,iz:iz});ids.push(id);}});
  if(ids.length)this.grid.set(iz*this.n+ix,ids);if(ids.length>1)this.stats.layers++;
 }
 this.costs=new Float32Array(this.nodes.length);this.parents=new Int32Array(this.nodes.length);this.closed=new Uint8Array(this.nodes.length);this.parentJumps=new Array(this.nodes.length);
 (anchors||[]).forEach(function(a){
  var start=self.nearest(a.from),end=self.nearest(a.to);if(start<0||end<0||start===end)return;
  var from=self.point(start),to=self.point(end);if(distance(from,a.from)>1.25||distance(to,a.to)>1.25){self.stats.rejectedJumpLinks++;return;}
  var plan=Motion.plan(from,to,obstacles,options);if(!plan){self.stats.rejectedJumpLinks++;return;}
  plan.name=a.name;plan.index=end;plan.cost=distance(from,to)+.65;(self.jumpLinks[start]||(self.jumpLinks[start]=[])).push(plan);self.stats.jumpLinks++;
 });
}
Navigation.prototype.local=function(x,z){return this.buckets[Math.floor(x/8)+','+Math.floor(z/8)]||[];};
Navigation.prototype.bodyClear=function(x,z,y){
 if(Math.abs(x)>this.limit||Math.abs(z)>this.limit)return false;
 var obs=this.local(x,z),r=this.radius;
 for(var i=0;i<obs.length;i++){var o=obs[i];if(x>o.min.x-r+1e-5&&x<o.max.x+r-1e-5&&z>o.min.z-r+1e-5&&z<o.max.z+r-1e-5&&y<o.max.y-1e-5&&y+this.height>o.min.y+1e-5)return false;}return true;
};
Navigation.prototype.levels=function(x,z){
 var surfaces=this.surfaceBuckets[Math.floor(x/8)+','+Math.floor(z/8)]||[],out=[],r=this.radius,obs=this.local(x,z);
 for(var i=0;i<surfaces.length;i++){
  var s=surfaces[i];if(x<s.x0-1e-5||x>s.x1+1e-5||z<s.z0-1e-5||z>s.z1+1e-5)continue;var y=Layout.height(s,x,z),support=y;
  // At a stair edge the actor stands on the higher tread under its footprint.
  for(var j=0;j<obs.length;j++){var o=obs[j];if(o.max.y>support&&o.max.y<=y+this.stepHeight+1e-5&&x>o.min.x-r+1e-5&&x<o.max.x+r-1e-5&&z>o.min.z-r+1e-5&&z<o.max.z+r-1e-5)support=o.max.y;}
  if(!out.some(function(v){return Math.abs(v-support)<.005;}))out.push(support);
 }return out;
};
Navigation.prototype.heightAt=function(x,z,preferred){
 var levels=this.levels(x,z),best,delta=Infinity;preferred=Number.isFinite(preferred)?preferred:0;
 for(var i=0;i<levels.length;i++){var y=levels[i],d=Math.abs(y-preferred);if(d<delta&&this.bodyClear(x,z,y)){best=y;delta=d;}}return best;
};
Navigation.prototype.clear=function(x,z,y){var h=this.heightAt(x,z,y);return h!==undefined&&(y===undefined||Math.abs(h-y)<=this.stepHeight+.015);};
Navigation.prototype.point=function(i){return copy(this.nodes[i]);};
Navigation.prototype.index=function(p){var x=Math.round((p.x+this.limit)/this.cell),z=Math.round((p.z+this.limit)/this.cell),ids=this.grid.get(z*this.n+x)||[],best=-1,d=Infinity;for(var i=0;i<ids.length;i++){var v=Math.abs(this.nodes[ids[i]].y-(p.y||0));if(v<d){d=v;best=ids[i];}}return best;};
Navigation.prototype.nearest=function(p){
 var cx=Math.round((p.x+this.limit)/this.cell),cz=Math.round((p.z+this.limit)/this.cell),best=-1,score=Infinity;
 for(var dz=-6;dz<=6;dz++)for(var dx=-6;dx<=6;dx++){
  var ids=this.grid.get((cz+dz)*this.n+cx+dx)||[];
  for(var i=0;i<ids.length;i++){var n=this.nodes[ids[i]],d=Math.hypot(n.x-p.x,n.z-p.z)+Math.abs(n.y-(p.y||0))*2.5;if(d<score){score=d;best=ids[i];}}
 }return best;
};
Navigation.prototype.line=function(a,b){
 var count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.22)),y=a.y;
 for(var i=0;i<=count;i++){var t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,h=this.heightAt(x,z,y);if(h===undefined||Math.abs(h-y)>this.stepHeight+.015)return false;y=h;}
 return Math.abs(y-b.y)<this.stepHeight+.015;
};
Navigation.prototype.neighbors=function(index){
 if(this.edges[index])return this.edges[index];var p=this.nodes[index],out=[];
 for(var dz=-1;dz<=1;dz++)for(var dx=-1;dx<=1;dx++){
  if(!dx&&!dz)continue;var ids=this.grid.get((p.iz+dz)*this.n+p.ix+dx)||[];
  for(var i=0;i<ids.length;i++){var q=this.nodes[ids[i]];if(Math.abs(q.y-p.y)>.8||!this.line(p,q))continue;out.push({index:ids[i],cost:distance(p,q)});}
 }this.edges[index]=out;return out;
};
Navigation.prototype.route=function(from,to,allowJumps){
 this.stats.requests++;if(this.line(from,to))return [copy(to)];
 var start=this.nearest(from),end=this.nearest(to);if(start<0||end<0){this.stats.failed++;return [];}
 var costs=this.costs,parent=this.parents,closed=this.closed,pj=this.parentJumps,open=new Heap(),self=this,expanded=0,found=false;
 costs.fill(Infinity);parent.fill(-1);closed.fill(0);pj.fill(null);costs[start]=0;open.push({i:start,f:distance(this.nodes[start],this.nodes[end])});
 while(open.a.length){
  var cur=open.pop().i;if(closed[cur])continue;if(cur===end){found=true;break;}closed[cur]=1;expanded++;
  var links=this.neighbors(cur);if(allowJumps!==false)links=links.concat(this.jumpLinks[cur]||[]);
  for(var k=0;k<links.length;k++){var link=links[k],next=link.index,c=costs[cur]+link.cost;if(closed[next]||c>=costs[next])continue;costs[next]=c;parent[next]=cur;pj[next]=link.from?link:null;open.push({i:next,f:c+distance(self.nodes[next],self.nodes[end])});}
 }
 this.stats.expanded=Math.max(this.stats.expanded,expanded);if(!found){this.stats.failed++;return [];}
 var path=[],at=end;while(at!==start){var p=this.point(at);if(pj[at])p.jump=pj[at];path.push(p);at=parent[at];}path.reverse();
 var smooth=[],anchor=from,cursor=0;
 while(cursor<path.length){
  if(path[cursor].jump){var jump=path[cursor].jump;if(distance(anchor,jump.from)>.02)smooth.push(copy(jump.from));smooth.push(path[cursor]);anchor=path[cursor++];continue;}
  var far=cursor;while(far+1<path.length&&!path[far+1].jump&&this.line(anchor,path[far+1]))far++;smooth.push(path[far]);anchor=path[far];cursor=far+1;
 }
 if(distance(anchor,to)>.02&&this.line(anchor,to))smooth.push(copy(to));return smooth;
};
root.FishHeightNavigation=Navigation;if(typeof module==='object'&&module.exports)module.exports=Navigation;
})(typeof window==='undefined'?globalThis:window);
