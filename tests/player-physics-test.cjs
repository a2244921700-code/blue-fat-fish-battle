'use strict';
const assert=require('node:assert/strict'),physics=require('../js/player-physics.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS | '+name);}
const box=(x,y,z,w,h,d)=>({min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}});
const body=(x=0,y=0,z=0,vy=0)=>({pos:{x,y,z},velY:vy,onGround:y===0&&vy===0});
const run=(b,obs,dt=1/60,dx=0,dz=0,height=1.86)=>physics.step(b,dx,dz,dt,{obstacles:obs,radius:.45,height,limit:75,gravity:-21});
test('顶棚下原地跳跃：停止上升、原路落地，水平坐标不变',()=>{const b=body(17,0,-11,9.2),roof=box(17,3.6,-11,10.4,.4,10);let hit=false,max=0;for(let i=0;i<90;i++){hit=run(b,[roof]).ceiling||hit;max=Math.max(max,b.pos.y);}assert(hit);assert(max<=1.54001);assert.equal(b.pos.x,17);assert.equal(b.pos.z,-11);assert.equal(b.pos.y,0);assert(b.onGround);});
test('移动顶头没有侧向闪现，位移不超过输入距离',()=>{for(const sign of [-1,1]){const b=body(0,0,0,9.2),roof=box(0,3.6,0,14,.4,24);for(let i=0;i<90;i++){const x=b.pos.x,z=b.pos.z;run(b,[roof],1/60,sign*.055,-.055);assert(Math.abs(b.pos.x-x)<=.055001);assert(Math.abs(b.pos.z-z)<=.055001);assert(b.pos.y+1.86<=roof.min.y+.00001);}}});
test('高速上升也不能穿过薄顶棚',()=>{const b=body(0,0,0,250);run(b,[box(0,2.5,0,6,.06,6)],.05);assert(b.pos.y+1.86<=2.47+.00001);assert(b.velY<=0);});
test('高速下落落在箱顶，没有穿透或吸附到旁边墙顶',()=>{const b=body(0,12,0,-80);run(b,[box(0,.825,0,2,1.65,2),box(4,3,0,2,6,2)],.3);assert.equal(b.pos.y,1.65);assert(b.onGround);});
test('横向扫掠挡住薄墙，允许沿墙滑动',()=>{const b=body(-3,0,0);run(b,[box(0,2,0,.1,4,20)],.016,8,2);assert(Math.abs(b.pos.x+.5)<.0001);assert.equal(b.pos.z,2);});
test('走下掩体开始下落，不悬空、不被吸回顶面',()=>{const b=body(0,1.65,0);b.onGround=true;const obs=[box(0,.825,0,2,1.65,2)];run(b,obs,.1,2,0);assert(b.pos.y<1.65);assert(!b.onGround);for(let i=0;i<60;i++)run(b,obs);assert.equal(b.pos.y,0);});
test('箱顶水平移动不会被箱体推走',()=>{const b=body(0,1.65,0);run(b,[box(0,.825,0,4,1.65,4)],.05,.2,.1);assert.equal(b.pos.y,1.65);assert.equal(b.pos.x,.2);assert.equal(b.pos.z,.1);});
test('站起必须保留头部空间，离开低顶棚后可以恢复高度',()=>{const obs=[box(0,1.5,0,4,.3,4)];assert.equal(physics.heightLimit({x:0,y:0,z:0},obs,.45,1.86),1.35);assert.equal(physics.heightLimit({x:4,y:0,z:0},obs,.45,1.86),1.86);});
test('初始意外重叠也不执行整箱宽度的边缘投射',()=>{const b=body(0,2,0);run(b,[box(0,3.6,0,20,.4,20)],.01,.05,.05);assert(Math.hypot(b.pos.x,b.pos.z)<=.071);});
test('不在脚下的顶棚不会挡住跳跃',()=>{const b=body(8,0,0,9.2);let max=0;for(let i=0;i<90;i++){run(b,[box(0,2.5,0,4,.4,4)]);max=Math.max(max,b.pos.y);}assert(max>1.85);assert.equal(b.pos.y,0);});
test('不同帧率都挡顶并稳定落地',()=>{for(const dt of [1/144,1/60,1/30,.1]){const b=body(0,0,0,9.2);for(let t=0;t<2;t+=dt){run(b,[box(0,2.6,0,10,.2,10)],dt);assert(b.pos.y+1.86<=2.50001);}assert.equal(b.pos.y,0);}});
console.log('Physics: '+count+' scenarios passed');
