'use strict';
const assert=require('node:assert/strict'),{create,rules}=require('../js/radiation.js');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS | '+name);}
const origin={x:0,y:0,z:0};
test('10 米边界及跳跃高度：圆内减速一半，圆外正常',()=>{const r=create();r.add(origin);assert.equal(r.speedAt({x:10,y:5,z:0}),.5);assert.equal(r.speedAt({x:10.001,z:0}),1);assert.equal(r.speedAt({x:7.1,z:7.1}),1);});
test('持续接触每满 1 秒扣 2 点，半秒不提前扣血',()=>{const r=create();r.add(origin);assert.equal(r.step(.5,origin).damage,0);assert.equal(r.step(.5,origin).damage,2);assert.equal(r.step(4,origin).damage,8);});
test('重叠三个污染区仍每秒 2 点且只减速 50%',()=>{const r=create();for(let i=0;i<3;i++)r.add({x:i,z:0});assert.equal(r.speedAt(origin),.5);assert.equal(r.step(5,origin).damage,10);});
test('离开立即恢复速度且停止计时，再进入重新累计接触时间',()=>{const r=create();r.add(origin);r.step(.7,origin);assert.equal(r.step(1,{x:11,z:0}).damage,0);assert.equal(r.speedAt({x:11,z:0}),1);assert.equal(r.step(.8,origin).damage,0);assert.equal(r.step(.2,origin).damage,2);});
test('15 秒到期，跨越到期的大步长只计算有效时间',()=>{const r=create();r.add(origin);assert.equal(r.step(20,origin).damage,30);assert.equal(r.zones.length,0);assert.equal(r.speedAt(origin),1);assert.equal(r.step(3,origin).damage,0);});
test('重叠区按各自寿命消散，不提前删除新区域',()=>{const r=create();r.add(origin);r.step(10,{x:30,z:0});r.add(origin);assert.equal(r.step(8,origin).damage,16);assert.equal(r.zones.length,1);assert.equal(r.zones[0].remaining,7);});
test('30 / 60 / 144 FPS 的总伤害与寿命一致',()=>{for(const hz of [30,60,144]){const r=create();r.add(origin);let damage=0;for(let i=0;i<hz*16;i++)damage+=r.step(1/hz,origin).damage;assert.equal(damage,30);assert.equal(r.zones.length,0);}});
test('无时间推进时不扣血，清理后接触累计也归零',()=>{const r=create();r.add(origin);r.step(.8,origin);assert.equal(r.step(0,origin).damage,0);r.clear();r.add(origin);assert.equal(r.step(.3,origin).damage,0);assert.equal(rules.duration,15);});
console.log('Radiation rules: '+passed+' checks passed');
