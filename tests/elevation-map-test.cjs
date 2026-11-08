'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {createLayout,gateTop,gatePoint}=require('../js/fps-map.js'),{Tactics,segmentBox}=require('../js/fps-ai.js'),Physics=require('../js/player-physics.js'),Motion=require('../js/fps-locomotion.js'),Surfaces=require('../js/map-surfaces.js');
const map=createLayout(),options={obstacles:map.solids,limit:map.limit,cell:1,surfaces:map.surfaces,jumpAnchors:map.jumpAnchors,routes:map.routes,weapons:{rifle:{magSize:30},pistol:{magSize:12}},random:()=>.5},tactics=new Tactics(options),nav=tactics.nav,checks=[];
function test(name,fn){fn();checks.push(name);console.log('PASS | '+name);}
function actor(t,team,slot,from){const b={id:'bot',team,alive:true,hp:100,sidearm:'pistol',baseY:1.4,position:{x:from.x,y:from.y+1.4,z:from.z},eyeY:from.y+1.6,aimY:from.y+.9,lowY:from.y+.35};b.brain=t.reset(b,slot);return b;}
function advance(t,b,to,dt){t.clock+=dt;b.brain.jumpCooldown=Math.max(0,b.brain.jumpCooldown-dt);if(b.brain.jump){t.updateJump(b,dt);return false;}t.walk(b,0,0,dt);return t.move(b,to,3.35,dt,[b],true);}
test('地图尺寸、作者定义的布局与确定性重建',()=>{assert.equal(map.version,2);assert.equal(map.half,76);assert.deepEqual(createLayout(),map);assert(map.surfaces.some(s=>s.y===5.4));});
test('两侧全部 54 个候选部署点站立空间完整',()=>{for(const sign of [-1,1])for(let row=0;row<3;row++)for(const x of [0,-1,1,-2,2,-3,3,-4,4])assert(nav.clear(x*2.7,(map.spawnZ-row*2.1)*sign,0));});
test('两端部署没有直接贯通枪线',()=>{for(const x of [-10.8,0,10.8])assert(map.solids.some(o=>segmentBox({x,y:1.7,z:69},{x,y:1.7,z:-69},o)));});
test('每个战术区都能从两端部署位到达',()=>{for(const z of map.zones)for(const sign of [-1,1]){const p=nav.route({x:0,y:0,z:69*sign},z);assert(p.length,z.short);assert(Math.hypot(p.at(-1).x-z.x,p.at(-1).z-z.z)<.1);}});
test('小道桥面与桥下、B 洞上下层保留独立节点',()=>{for(const [x,z] of [[20,-14],[-45,5]]){assert.equal(nav.heightAt(x,z,0),0);assert.equal(nav.heightAt(x,z,3.2),3.2);assert.notEqual(nav.index({x,y:0,z}),nav.index({x,y:3.2,z}));assert(!nav.line({x,y:0,z},{x,y:3.2,z}));}assert(nav.stats.layers>300);});
test('五条分路在 30 / 60 / 144 FPS 均可实际双向走完',()=>{
 for(const fps of [30,60,144])for(const team of ['red','blue'])for(let slot=0;slot<5;slot++){
  const t=new Tactics(options),b=actor(t,team,slot,{x:0,y:0,z:team==='red'?69:-69}),last=map.routes[team][slot].length-2;let done=false;
  for(let i=0;i<fps*140;i++){t.step([b],1/fps);assert(Number.isFinite(b.position.y));if(b.brain.routeDirection===-1&&b.brain.routeStep===last){done=true;break;}}
  assert(done,JSON.stringify({fps,team,slot,position:b.position,step:b.brain.routeStep}));
 }
});
test('八条跳跃连接全部通过同一真实重力与碰撞模拟',()=>{assert.equal(nav.stats.jumpLinks,8);assert.equal(nav.stats.rejectedJumpLinks,0);for(const j of Object.values(nav.jumpLinks).flat())assert(Motion.plan(j.from,j.to,map.solids,{}),j.name);});
test('AI 从中路连续跳上箱体和小道，不穿过高度差',()=>{
 for(const fps of [30,60,144]){const t=new Tactics(options),b=actor(t,'blue',0,{x:0,y:0,z:-20});let done=false,maxStep=0;
  for(let i=0;i<fps*60;i++){const p={...b.position};done=advance(t,b,{x:11,y:3.2,z:6},1/fps);maxStep=Math.max(maxStep,Math.hypot(b.position.x-p.x,b.position.z-p.z));if(done)break;}
  assert(done);assert.equal(t.stats.obstacleJumps,2);assert.equal(t.stats.landings,2);assert(maxStep<5.3/fps+.01);
 }
});
test('B 窗可双向跳越，落地高度分别匹配窗外与平台',()=>{const links=Object.values(nav.jumpLinks).flat().filter(j=>j.name.startsWith('B 窗'));assert.equal(links.length,2);for(const j of links){const t=new Tactics(options),b=actor(t,'red',0,j.from);assert(t.beginJump(b,j.to,'obstacle',[b]));for(let i=0;i<300&&b.brain.jump;i++)t.updateJump(b,1/60);assert(!b.brain.jump);assert(Math.abs(t.feet(b).y-j.to.y)<.01);}});
test('地形身体检测的空间分桶与全量碰撞一致',()=>{
 for(let x=-72;x<=72;x+=3.7)for(let z=-72;z<=72;z+=3.7)for(const y of [0,1.8,3.2,5.4]){const full=!map.solids.some(o=>x>o.min.x-.46+1e-5&&x<o.max.x+.46-1e-5&&z>o.min.z-.46+1e-5&&z<o.max.z+.46-1e-5&&y<o.max.y-1e-5&&y+1.9>o.min.y+1e-5);assert.equal(nav.bodyClear(x,z,y),full);}
});
test('开启的拱形门在各自台面上，门板碰撞与铰链一致',()=>{
 assert.equal(map.gates.length,4);for(const l of map.gates){assert(Math.abs(l.angle)>Math.PI/3);for(let u=0;u<l.width;u+=.1){const hole=l.spring+Math.sqrt(l.radius*l.radius-(l.radius-.07-u)**2)*l.rise;assert(Math.abs(hole-gateTop(l,u)-.075)<1e-6);const p=gatePoint(l,u,1,0);assert.equal(p.y,l.y+1);assert(map.solids.some(o=>o.kind==='gate'&&p.x>=o.min.x-1e-5&&p.x<=o.max.x+1e-5&&p.z>=o.min.z-1e-5&&p.z<=o.max.z+1e-5));}}
});
test('建筑与多层地形外壳没有重叠的同向共面面积',()=>{
 const boxes=map.solids.filter(s=>['building','stone','roof','terrain'].includes(s.kind)),faces=Surfaces.exposedFaces(boxes),groups=new Map();
 for(const f of faces){const key=[f.axis,f.side,f.plane.toFixed(5)].join('/'),old=groups.get(key)||[];for(const g of old){const a=f.rect,b=g.rect;assert(!(Math.min(a[2],b[2])-Math.max(a[0],b[0])>1e-5&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>1e-5),'coplanar shell overlap');}old.push(f);groups.set(key,old);}
});
test('低台阶不能把角色抬进顶棚，空中不启用自动上阶',()=>{
 const riser={min:{x:0,y:0,z:-3},max:{x:3,y:.2,z:3}},roof={min:{x:-3,y:2,z:-3},max:{x:4,y:2.2,z:3}},opts={obstacles:[riser,roof],radius:.46,height:1.9,limit:75,gravity:-21,stepHeight:.26};
 const b={pos:{x:-1,y:0,z:0},velY:0,onGround:true};for(let i=0;i<60;i++)Physics.step(b,.05,0,1/60,opts);assert(b.pos.x<=-.46+.0001);assert.equal(b.pos.y,0);
 const air={pos:{x:-1,y:0,z:0},velY:9.2,onGround:false};let previous={...air.pos};for(let i=0;i<90;i++){Physics.step(air,.01,0,1/60,opts);assert(Math.abs(air.pos.x-previous.x)<=.01001);assert(air.pos.y+1.9<=2.00001);previous={...air.pos};}
});
test('FPS 小台阶可走，无尽未启用上阶时保持原行为',()=>{
 const o={min:{x:0,y:0,z:-3},max:{x:4,y:.2,z:3}},b={pos:{x:-1,y:0,z:0},velY:0,onGround:true},c=JSON.parse(JSON.stringify(b));for(let i=0;i<45;i++){Physics.step(b,.05,0,1/60,{obstacles:[o],radius:.46,height:1.9,limit:75,gravity:-21,stepHeight:.26});Physics.step(c,.05,0,1/60,{obstacles:[o],radius:.46,height:1.9,limit:75,gravity:-21});}assert(b.pos.x>1&&b.pos.y===.2);assert(c.pos.x<=-.4599&&c.pos.y===0);
});
test('B 洞折角遮断长距离直线，仍保留上洞通路',()=>{assert(map.solids.some(o=>segmentBox({x:-54,y:4.8,z:20},{x:-54,y:4.8,z:-24},o)));assert(nav.route({x:-54,y:3.2,z:20},{x:-54,y:2.8,z:-28}).length);});
test('高台敌方手雷触发同层撤离，桥下不会透视楼板上的手雷',()=>{
 const G=require('../js/tactical-grenades.js'),t=new Tactics(options),b=actor(t,'red',0,{x:46,y:5.4,z:-41});b.brain.yaw=0;
 const g={team:'blue',pos:{x:46,y:5.56,z:-37},vel:{x:0,y:0,z:0},fuse:2.6},memory=G.observe(b,[g],t,[],0),exit=G.escape(b,memory,t,.2);assert.equal(memory.length,1);assert(exit);assert.equal(exit.y,5.4);assert(G.risk({...exit,y:exit.y+1},memory,t)<G.risk({x:46,y:6.4,z:-41},memory,t));
 const lower=actor(t,'red',0,{x:20,y:0,z:-17});lower.brain.yaw=0;const upper={team:'blue',pos:{x:20,y:3.36,z:-14},vel:{x:0,y:0,z:0},fuse:2};assert.equal(G.observe(lower,[upper],t,[],0).length,0);
});
test('枪声调查保存声音高度，不把楼上声音重置到地面',()=>{
 const t=new Tactics(options),b=actor(t,'red',0,{x:20,y:0,z:-14});t.noise('blue',{x:23,y:4.8,z:-14},26);t.step([b],.02);assert.equal(b.brain.memory.kind,'sound');assert(b.brain.memory.position.y>=4.5);assert.equal(t.floorGoal(b.brain.memory.position,b.brain.memory.position.y-1.2).y,3.2);
});
test('被角色推到导航边缘外时按碰撞走回，不瞬移或永久原地踏步',()=>{
 const t=new Tactics(options),b=actor(t,'red',0,{x:20.4,y:0,z:69});assert.equal(t.nav.heightAt(20.4,69,0),undefined);let done=false;
 for(let i=0;i<900;i++){const p={...b.position};done=advance(t,b,{x:12,y:0,z:69},1/60);assert(Math.hypot(p.x-b.position.x,p.z-b.position.z)<.06);if(done)break;}assert(done);
});
test('小道长段有实体基座，北侧桥下保持独立通行',()=>{
 assert(map.solids.some(o=>o.kind==='terrain'&&9>o.min.x&&9<o.max.x&&10>o.min.z&&10<o.max.z&&o.min.y===0&&o.max.y===3.2));
 assert(!nav.bodyClear(9,10,0));assert(nav.bodyClear(9,-14,0));assert.equal(map.solids.filter(o=>o.name==='小道桥柱').length,6);
});
test('下洞入口拱门连接实体侧墙与顶板，入口前是平整低地',()=>{
 const gate=map.arches.find(a=>a.name==='B 下洞入口'),roof=map.solids.find(o=>o.name==='下洞顶棚');assert(gate&&gate.turn===Math.PI/2);assert(roof.max.x<=gate.x+.6&&roof.max.x>=gate.x-.6);assert(nav.line({x:-14.5,y:0,z:5},{x:-25,y:0,z:5}));assert.equal(nav.heightAt(-12,5,0),0);
});
const out=path.join(__dirname,'elevation-map-results');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'logic-report.json'),JSON.stringify({checks,nav:nav.stats,colliders:map.solids.length,surfaces:map.surfaces.length},null,2));console.log(checks.length+' elevation-map checks passed');
