'use strict';
const assert=require('node:assert/strict'),P=require('../js/grenade-physics.js');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS | '+name);}
function grenade(vel,fuse=3,pos={x:0,y:1.6,z:0}){return {pos:{...pos},vel:{...vel},fuse};}
function box(min,max){return {min,max};}
const aim={x:0,y:Math.SQRT1_2,z:-Math.SQRT1_2},still={x:0,y:0,z:0};
test('前冲、后退与侧移分别改变世界空间出手速度',()=>{
 const base=P.launchVelocity(aim,still),forward=P.launchVelocity(aim,{x:0,y:0,z:-6}),back=P.launchVelocity(aim,{x:0,y:0,z:6}),side=P.launchVelocity(aim,{x:6,y:0,z:0});
 assert.equal(forward.z,base.z-6);assert.equal(back.z,base.z+6);assert.equal(side.x,6);
});
test('跳投更远、更高，后退投更近',()=>{
 function fly(m){const g=grenade(P.launchVelocity(aim,m));let peak=0;while(g.fuse>1e-8){P.step(g,1/60,[]);peak=Math.max(peak,g.pos.y);}return {range:-g.pos.z,peak};}
 const normal=fly(still),run=fly({x:0,y:0,z:-6}),jump=fly({x:0,y:9.2,z:-6}),back=fly({x:0,y:0,z:6});
 assert(back.range<normal.range&&normal.range<run.range&&run.range<jump.range);assert(jump.peak>normal.peak+6);
 console.log('  trajectory metres:',JSON.stringify({back,normal,run,jump}));
});
test('落地反弹但保留引信，3 秒到期才爆炸',()=>{
 const g=grenade({x:3,y:-4,z:0});let bounced=false;
 for(let i=0;i<60;i++){const r=P.step(g,1/60,[]);bounced=bounced||r.bounces>0;assert(!r.expired);assert(g.pos.y>=P.radius-1e-5);}
 assert(bounced);assert(g.fuse>1.99);assert(P.step(g,2,[]).expired);
});
test('预热后可在空中引爆，与触地无关',()=>{
 const g=grenade(P.launchVelocity(aim,still),1.25);const result=P.step(g,4,[]);assert(result.expired);assert(g.pos.y>6);assert.equal(g.age,1.25);
});
test('高速弹体连续碰撞，不能穿过 5 厘米薄墙',()=>{
 const wall=box({x:2,y:0,z:-5},{x:2.05,y:10,z:5}),g=grenade({x:100,y:0,z:0});const hit=P.step(g,.05,[wall]);assert(hit.bounces);assert(g.vel.x<0);assert(g.pos.x<2-P.radius);assert(g.fuse>0);
});
test('打中天花板向下反弹，不被送到屋顶',()=>{
 const roof=box({x:-4,y:2.8,z:-4},{x:4,y:3.3,z:4}),g=grenade({x:0,y:20,z:0});P.step(g,.12,[roof]);assert(g.vel.y<0);assert(g.pos.y<2.8-P.radius);
});
test('墙角反弹不会穿墙或抬升到障碍物顶部',()=>{
 const walls=[box({x:2,y:0,z:-5},{x:2.1,y:7,z:5}),box({x:-5,y:0,z:2},{x:5,y:7,z:2.1})],g=grenade({x:45,y:0,z:45});P.step(g,.20,walls);assert(g.vel.x<0&&g.vel.z<0);assert(g.pos.y<1.6&&g.pos.y>=P.radius);assert(g.pos.x<1.87&&g.pos.z<1.87);
});
test('静止地雷停止抖动，但休眠不冻结引信',()=>{
 const g=grenade({x:.1,y:0,z:.1},3,{x:0,y:P.radius,z:0});P.step(g,.5,[]);assert(g.sleeping);const pos={...g.pos};P.step(g,2.5,[]);assert.deepEqual(g.pos,pos);assert.equal(g.fuse,0);
});
test('30 与 60 FPS 的固定物理子步给出相同落点',()=>{
 function sim(dt){const g=grenade(P.launchVelocity(aim,{x:3,y:0,z:-6}));while(g.fuse>1e-8)P.step(g,dt,[]);return g;}
 const a=sim(1/30),b=sim(1/60);assert(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y,a.pos.z-b.pos.z)<.002);
});
test('暂停零步长不走引信，已到时的弹体仍可确定性处理',()=>{
 const g=grenade({x:1,y:2,z:3}),copy=JSON.stringify(g);assert(!P.step(g,0,[]).expired);assert.equal(JSON.stringify(g),copy);g.fuse=0;assert(P.step(g,0,[]).expired);
});
console.log('Grenade physics: '+checks+' scenarios passed');
