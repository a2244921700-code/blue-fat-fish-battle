'use strict';
const assert=require('node:assert/strict'),H=require('../js/character-hitboxes.js');let count=0;
function test(name,f){f();count++;console.log('PASS | '+name);}
const V=(x=0,y=0,z=0)=>({x,y,z}),caps=(part,a,b,r)=>({part,a,b,radius:r,multiplier:H.multipliers[part]});
test('胸腹 1.0 / 头 1.75 与四肢倍率',()=>{assert.equal(H.multipliers.head,1.75);assert.equal(H.multipliers.chest,1);assert.equal(H.multipliers.abdomen,1);assert(H.multipliers.hand<H.multipliers.thigh);});
test('胶囊侧面与端帽返回最近实际表面',()=>{let c=caps('chest',V(0,0,0),V(0,1,0),.2);assert(Math.abs(H.rayCapsule(V(0,.5,2),V(0,0,-1),c,5)-1.8)<1e-8);assert(Math.abs(H.rayCapsule(V(0,3,0),V(0,-1,0),c,5)-1.8)<1e-8);});
test('射线在胶囊内 / 平行轴 / 最大距离',()=>{let c=caps('head',V(),V(0,1,0),.2);assert.equal(H.rayCapsule(V(0,.5,0),V(1,0,0),c,5),0);assert.equal(H.rayCapsule(V(1,3,0),V(0,-1,0),c,5),Infinity);assert.equal(H.rayCapsule(V(0,.5,2),V(0,0,-1),c,1),Infinity);});
test('最近手臂遮住胸部，不能同时扣两份伤害',()=>{const hit=H.raycast(V(0,.5,3),V(0,0,-1),[caps('chest',V(0,.4,0),V(0,.6,0),.2),caps('forearm',V(-.1,.5,.5),V(.1,.5,.5),.08)],5);assert.equal(hit.part,'forearm');});
test('空隙子弹不会打中旧整身大球',()=>{assert.equal(H.raycast(V(0,.4,3),V(0,0,-1),[caps('shin',V(-.2,0,0),V(-.2,.6,0),.06),caps('shin',V(.2,0,0),V(.2,.6,0),.06)],5),null);});
test('高速刀刃跨帧扫过仍命中',()=>{const hit=H.sweep({a:V(-1,0,0),b:V(-1,1,0),radius:.025},{a:V(1,0,0),b:V(1,1,0),radius:.025},[caps('chest',V(0,.2,0),V(0,.8,0),.08)]);assert(hit&&hit.part==='chest');});
test('只延长真实刀刃才够到远处',()=>{const c=[caps('abdomen',V(0,0,1),V(0,.1,1),.06)],short={a:V(),b:V(0,0,.5),radius:.025},long={a:V(),b:V(0,0,1.1),radius:.025};assert.equal(H.sweep(short,short,c),null);assert(H.sweep(long,long,c));assert.equal(H.meleeDamage(1,false,'pvp'),2*H.meleeDamage(.5,false,'pvp'));});
test('身体移动跨过静止刀刃也能检测',()=>{const b={a:V(),b:V(0,1,0),radius:.02};assert(H.sweep(b,b,[caps('chest',V(1,.4,0),V(1,.7,0),.1)],[caps('chest',V(-1,.4,0),V(-1,.7,0),.1)]));});
test('墙体挡住枪弹与近战刀刃',()=>{const boxes=[{min:V(-1,-1,.4),max:V(1,2,.6)}],blade={a:V(),b:V(0,0,1),radius:.025};assert.equal(H.wallDistance(V(),V(0,0,1),boxes,5),.4);assert.equal(H.sweep(blade,blade,[caps('chest',V(0,0,1),V(0,.2,1),.1)],null,boxes,V()),null);});
test('重击倍率与无尽 / AI / 对战独立标尺',()=>{assert.equal(H.meleeDamage(.5,true,'pvp'),H.meleeDamage(.5,false,'pvp')*1.85);assert(H.meleeDamage(.5,false,'enemy')>H.meleeDamage(.5,false,'endless'));});
console.log(count+' checks passed');
