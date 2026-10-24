'use strict';
const assert=require('node:assert/strict');
const {Tactics,Navigation}=require('../js/fps-ai.js');
const weapons={rifle:{magSize:6,reloadTime:.8,shootInterval:.1},pistol:{magSize:4,reloadTime:.6,shootInterval:.2}};
const box=(x,z,w,d,h=3,minY=0)=>({min:{x:x-w/2,y:minY,z:z-d/2},max:{x:x+w/2,y:h,z:z+d/2}});
let count=0;function test(name,fn){fn();console.log('PASS | '+name);count++;}
function actor(id,team,x,z,yaw=0){return {id,team,position:{x,y:1.4,z},eyeY:1.9,aimY:1.5,lowY:.7,hp:100,alive:true,yaw,sidearm:'pistol'};}
function create(obstacles=[],extra={}){return new Tactics({obstacles,weapons,random:()=>.5,...extra});}
test('110° 总视野：正前方可见、背后与 60° 侧方不可见',()=>{let t=create(),a=actor('a','red',0,0),b=actor('b','blue',0,10);assert(t.visible(a,b));b.position.z=-10;assert.equal(t.visible(a,b),null);b.position={x:8.66,y:1.4,z:5};assert.equal(t.visible(a,b),null);});
test('不同目标使用各自端点，隔墙目标隐藏、另一目标可见',()=>{let t=create([box(0,5,3,1)]),a=actor('a','red',0,0),b=actor('b','blue',0,10),c=actor('c','blue',8,10);assert.equal(t.visible(a,b),null);assert(t.visible(a,c));});
test('低掩体允许看到头部；完整墙体不允许；屋顶下可走',()=>{let a=actor('a','red',0,0),b=actor('b','blue',0,10);assert(create([box(0,5,3,1,1.2)]).visible(a,b));assert.equal(create([box(0,5,3,1)]).visible(a,b),null);assert(new Navigation([box(0,0,8,8,4,3)],20,1,.46).clear(0,0));});
test('A* 绕过墙体，平滑后每一段连续可走且不穿拐角',()=>{let nav=new Navigation([box(0,0,1,14),box(3,7,6,1)],20,1,.46),from={x:-5,y:0,z:0},to={x:8,y:0,z:0},path=nav.route(from,to);assert(path.length>1);for(const p of path){assert(nav.line(from,p));from=p;}assert(Math.hypot(from.x-to.x,from.z-to.z)<.1);});
test('不可到达目标安全返回空路径',()=>{let nav=new Navigation([box(0,0,1,50)],20,1,.46);assert.equal(nav.route({x:-5,y:0,z:0},{x:5,y:0,z:0}).length,0);});
test('丢失视线停止开火、最后目击位置不会追随隐藏目标',()=>{let t=create(),a=actor('a','red',0,0),b=actor('b','blue',0,10);t.reset(a,0);a.brain.yaw=0;t.step([a,b],.05);assert(a.brain.memory);let old={...a.brain.memory.position};t.obstacles.push(box(0,5,30,1));b.position.x=4;for(let i=0;i<10;i++)t.step([a,b],.05);assert.equal(a.brain.visibleId,null);assert.deepEqual(a.brain.memory.position,old);assert.equal(a.brain.shots,0);});
test('反应延迟与换弹时间阻止连续无限射击',()=>{let fired=0,t=create([],{fire:()=>{fired++;return true;}}),a=actor('a','red',0,0),b=actor('b','blue',0,10);t.reset(a,0);a.brain.yaw=0;a.brain.shotWait=0;for(let i=0;i<5;i++)t.step([a,b],.05);assert.equal(fired,0);for(let i=0;i<70;i++)t.step([a,b],.05);assert(fired>=6&&fired<20);a.brain.magazines.rifle=0;a.brain.reload=0;t.step([a,b],.05);assert(a.brain.reload>0);let n=fired;for(let i=0;i<10;i++)t.step([a,b],.05);assert.equal(fired,n);});
test('友军挡住枪线时不开火',()=>{let t=create(),a=actor('a','red',0,0),friend=actor('f','red',0,4),enemy=actor('e','blue',0,10);assert(t.friendlyLine(a,{x:0,y:1.5,z:10},[a,friend,enemy]));friend.position.x=4;assert(!t.friendlyLine(a,{x:0,y:1.5,z:10},[a,friend,enemy]));});
test('枪声只生成有误差的历史位置，过期后清除',()=>{let t=create([box(0,5,30,1)]),a=actor('a','red',0,0);t.reset(a,0);t.noise('blue',{x:2.1,y:1.4,z:10.2},30);t.step([a],.05);assert.equal(a.brain.memory.kind,'sound');assert.equal(a.brain.memory.position.x,3);for(let i=0;i<130;i++)t.step([a],.05);assert.equal(a.brain.memory,null);});
test('主副武器弹尽后改用近战，必须接近目标才能攻击',()=>{let hits=0,t=create([],{fire:(a,p,w)=>{assert(w.melee);assert(Math.hypot(p.x-a.position.x,p.z-a.position.z)<=w.range);hits++;return true;}}),a=actor('a','red',0,0),b=actor('b','blue',0,7);t.reset(a,0);a.brain.yaw=0;a.brain.magazines={rifle:0,sidearm:0};a.brain.reserves={rifle:0,sidearm:0};for(let i=0;i<120;i++)t.step([a,b],.05);assert.equal(a.brain.weapon,'knife');assert(hits>0);});
console.log('FPS AI: '+count+' scenarios passed');
