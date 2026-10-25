'use strict';
const assert=require('node:assert/strict'),{createLayout}=require('../js/fps-map.js'),{Navigation,segmentBox}=require('../js/fps-ai.js');
const map=createLayout(),nav=new Navigation(map.solids,map.limit,1,.46);let count=0;
function test(name,fn){fn();count++;console.log('PASS | '+name);}
test('FPS 独立 152×152m，面积为原图的 2.85 倍',()=>{assert.equal(map.half*2,152);assert(map.half**2/45**2>2.85);});
test('两侧 27 个候选部署点均可通行，32 人部署无需重叠',()=>{for(const f of [-1,1])for(let row=0;row<3;row++)for(const x of [0,-1,1,-2,2,-3,3,-4,4])assert(nav.clear(x*2.7,(map.spawnZ-row*2.1)*f));});
test('每条分路双向贯通，路标和每段平滑路径都可行走',()=>{
 for(const route of map.routes)for(const f of [-1,1]){let p={x:0,z:69*f};for(const q of route){const target={x:q[0],z:q[1]*f};assert(nav.clear(target.x,target.z),'Blocked route point '+JSON.stringify(target));const path=nav.route(p,target);assert(path.length,'No path '+JSON.stringify(target));for(const next of path){assert(nav.line(p,next));p=next;}assert(Math.hypot(p.x-target.x,p.z-target.z)<.01);}}
});
test('两个广场可通过南、北侧巷直接转点',()=>{for(const z of [-16,16]){const from={x:-52,z},to={x:50,z},path=nav.route(from,to);assert(path.length);let prev=from;for(const p of path){assert(nav.line(prev,p));prev=p;}assert(Math.hypot(prev.x-to.x,prev.z-to.z)<.01);}});
test('站在部署位不能直接向对方部署位开火',()=>{for(const x of [-10.8,0,10.8])assert(map.solids.some(o=>segmentBox({x,y:1.7,z:69},{x,y:1.7,z:-69},o)));});
test('地面可走网格属于同一个连通战场',()=>{const q=[nav.index({x:0,z:69})],seen=new Uint8Array(nav.blocked.length);seen[q[0]]=1;for(let head=0;head<q.length;head++){const i=q[head],x=i%nav.n,z=Math.floor(i/nav.n);for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,nz=z+dz,j=nz*nav.n+nx;if(nx>=0&&nz>=0&&nx<nav.n&&nz<nav.n&&!seen[j]&&!nav.blocked[j]&&nav.line(nav.point(i),nav.point(j))){seen[j]=1;q.push(j);}}}const total=Array.from(nav.blocked).filter(v=>!v).length;assert.equal(q.length,total,'Unreachable walkable pockets');});
test('空间分桶与完整障碍判定在整个地图上相同',()=>{for(let x=-75;x<=75;x+=1.7)for(let z=-75;z<=75;z+=1.7){const full=!nav.ground.some(o=>x>o.min.x-.46&&x<o.max.x+.46&&z>o.min.z-.46&&z<o.max.z+.46);assert.equal(nav.clear(x,z),full);}});
test('确定性布局不随重开漂移',()=>{assert.deepEqual(createLayout(),map);assert.equal(nav.stats.failed,0);});
test('双扇门按拱洞裁形，绕真实门轴打开 62 度并保持中路畅通',()=>{
 const {gateTop,gatePoint}=require('../js/fps-map.js');assert.equal(map.gates.length,2);
 for(const leaf of map.gates){assert(Math.abs(leaf.angle)>Math.PI/3);assert(leaf.width>4);for(let u=0;u<=leaf.width;u+=.15){const closedX=Math.abs(leaf.x)-u,hole=2.7+Math.sqrt(4.5**2-closedX**2)*.62;assert(Math.abs(hole-gateTop(leaf,u)-.075)<1e-6);const p=gatePoint(leaf,u,1,0);assert(map.solids.some(s=>s.kind==='gate'&&p.x>=s.min.x-1e-6&&p.x<=s.max.x+1e-6&&p.z>=s.min.z-1e-6&&p.z<=s.max.z+1e-6));}assert(Math.abs(gatePoint(leaf,leaf.width,0,0).z)>3.8);}
 assert(nav.line({x:0,z:-7},{x:0,z:7}));
});
console.log('FPS map: '+count+' scenarios passed; navigation '+JSON.stringify(nav.stats));
