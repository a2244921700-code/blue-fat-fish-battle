'use strict';
const assert=require('node:assert/strict'),S=require('../js/map-surfaces.js'),{createLayout}=require('../js/fps-map.js');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS | '+name);}
const box=(x,y,z,w,h,d)=>({min:{x,y,z},max:{x:x+w,y:y+h,z:z+d}});
const area=f=>(f.rect[2]-f.rect[0])*(f.rect[3]-f.rect[1]);
function overlap(a,b){return Math.min(a[2],b[2])-Math.max(a[0],b[0])>1e-6&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>1e-6;}
test('完全重叠体仅保留一套外表面',()=>{const b=box(0,0,0,2,2,2);assert.equal(S.exposedFaces([b,b]).reduce((n,f)=>n+area(f),0),20);});
test('并排房屋去掉共用内墙且保留所有外墙',()=>{const faces=S.exposedFaces([box(0,0,0,2,2,2),box(2,0,0,2,2,2)]);assert.equal(faces.reduce((n,f)=>n+area(f),0),32);assert(!faces.some(f=>f.axis==='x'&&f.plane===2));});
test('局部体积交叠不会删掉外露半面',()=>{
 const faces=S.exposedFaces([box(0,0,0,4,4,4),box(0,0,3.4,4,3.5,1.2)]);
 for(const side of [-1,1]){const x=faces.filter(f=>f.axis==='x'&&f.side===side);assert(Math.abs(x.reduce((n,f)=>n+area(f),0)-18.1)<1e-6);}
});
test('FPS 全地图结构面不再存在任何共面面积重叠',()=>{
 const solids=createLayout().solids.filter(s=>['building','stone','roof'].includes(s.kind)),faces=S.exposedFaces(solids);
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){const a=faces[i],b=faces[j];if(a.axis===b.axis&&Math.abs(a.plane-b.plane)<1e-6)assert(!overlap(a.rect,b.rect),JSON.stringify({a,b}));}
 for(const f of faces){const p={x:0,y:0,z:0};p[f.axis]=f.plane+f.side*.0001;p[f.u]=(f.rect[0]+f.rect[2])/2;p[f.v]=(f.rect[1]+f.rect[3])/2;assert(!solids.some(s=>p.x>s.min.x&&p.x<s.max.x&&p.y>s.min.y&&p.y<s.max.y&&p.z>s.min.z&&p.z<s.max.z));}
 console.log('  '+solids.length+' structural volumes → '+faces.length+' exposed rectangles');
});
test('交叉铺路按面积合并且没有重叠顶面',()=>{const rects=S.unionRectangles([[-5,-1,5,1],[-1,-5,1,5],[-2,-2,2,2]]);for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)assert(!overlap(rects[i],rects[j]));assert.equal(rects.reduce((s,r)=>s+(r[2]-r[0])*(r[3]-r[1]),0),40);});
console.log('Map surfaces: '+checks+' scenarios passed');
