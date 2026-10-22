/* 沙海商旅哨站 · 场景模型细化（OpenAI Codex，2026-10-22）
 * 固定种子、分区域合批、共享基础资源；零下载，兼容 Three.js r159 / file://。
 * 实体陈设同时登记碰撞和射击遮挡；城外布景无需参与游戏碰撞。
 */
(function () {
'use strict';
var cache = Object.create(null), PI = Math.PI;
function random(seed) { return function () { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
function shared(v) { v.userData.artShared = true; return v; }
function geo(key, make) { return cache[key] || (cache[key] = shared(make())); }
function boxGeo() { return geo('box',function(){return new THREE.BoxGeometry(1,1,1);}); }
function cylinder() { return geo('cylinder',function(){return new THREE.CylinderGeometry(1,1,1,12);}); }
function ball() { return geo('ball',function(){return new THREE.SphereGeometry(1,12,8);}); }
function ring() { return geo('ring',function(){return new THREE.TorusGeometry(1,.07,6,24);}); }
function lathe(key, points) { return geo(key,function(){return new THREE.LatheGeometry(points.map(function(p){return new THREE.Vector2(p[0],p[1]);}),24);}); }
function tex(kind) {
  var key='texture/'+kind; if(cache[key])return cache[key];
  var c=document.createElement('canvas');c.width=c.height=512;
  var x=c.getContext('2d'),r=random(83021);
  x.fillStyle=kind==='timber'?'#956d48':kind==='plaster'?'#c7a881':kind==='tile'?'#24676a':'#ded1ad';x.fillRect(0,0,512,512);
  if(kind==='timber') {
    for(var i=0;i<650;i++){x.strokeStyle=i%3?'rgba(47,27,13,.16)':'rgba(245,216,157,.18)';var bx=r()*512,by=r()*512;x.beginPath();x.moveTo(bx,by);x.bezierCurveTo(bx-3,by+30,bx+5,by+70,bx,by+160);x.stroke();}
    [55,180,320,443].forEach(function(y){x.strokeStyle='rgba(45,26,12,.3)';x.lineWidth=3;x.beginPath();x.ellipse(260,y,9,29,.2,0,7);x.stroke();});
  } else if(kind==='tile') {
    for(var row=0;row<4;row++)for(var col=0;col<4;col++){
      var a=col*128+64,b=row*128+64;x.strokeStyle='#bd9f62';x.lineWidth=4;x.beginPath();
      for(var j=0;j<16;j++){var t=j*PI/8,rad=j%2?23:48;var xx=a+Math.cos(t)*rad,yy=b+Math.sin(t)*rad;if(j)x.lineTo(xx,yy);else x.moveTo(xx,yy);}x.closePath();x.stroke();
      x.strokeStyle='#80a39a';x.lineWidth=2;x.strokeRect(col*128+3,row*128+3,122,122);
    }
  } else if(kind.indexOf('cloth')===0) {
    x.fillStyle=kind==='cloth-red'?'#9e503a':'#246f72';
    for(var k=0;k<8;k++)if(k%2===0)x.fillRect(k*64,0,64,512);
    x.strokeStyle='#bb8d4d';x.lineWidth=5;[20,50,462,492].forEach(function(y){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();});
    for(var q=0;q<12;q++){x.save();x.translate(q*48,478);x.rotate(PI/4);x.fillRect(-5,-5,10,10);x.restore();}
    x.fillStyle='rgba(255,248,209,.13)';for(var f=0;f<512;f+=3){x.fillRect(f,0,1,512);x.fillRect(0,f,512,1);}
  } else {
    for(var n=0;n<150;n++){var px=r()*512,py=r()*512;x.fillStyle='rgba(104,69,40,.035)';x.beginPath();x.ellipse(px,py,3+r()*35,2+r()*15,0,0,7);x.fill();}
    x.strokeStyle='rgba(89,60,35,.17)';x.lineWidth=1;
    for(var t=0;t<9;t++){var cx=r()*512,cy=r()*512;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+5,cy+13);x.lineTo(cx-4,cy+30);x.lineTo(cx+2,cy+45);x.stroke();}
  }
  for(var g=0;g<10000;g++){x.fillStyle=g%2?'rgba(255,240,200,.08)':'rgba(40,28,17,.06)';x.fillRect(r()*512,r()*512,1,1);}
  var texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
  return(cache[key]=shared(texture));
}
function material(name) {
  if(cache['mat/'+name])return cache['mat/'+name];
  var colors={stone:0xc9b08b,cream:0xe1ceb0,plaster:0xffffff,timber:0xffffff,tile:0xffffff,terra:0xb56543,glaze:0x327b7e,iron:0x37484a,bronze:0xb58949,rope:0xb4a17a,leaf:0x6c8760,dry:0x96925a,fruit:0xc88a35,shadow:0x243c3b};
  var p={color:colors[name]||0xffffff,roughness:.88};
  if(['plaster','timber','tile'].indexOf(name)>=0){p.map=tex(name);p.bumpMap=p.map;p.bumpScale=name==='tile'?.012:.035;}
  if(name.indexOf('cloth')===0){p.map=tex(name);p.side=THREE.DoubleSide;p.roughness=1;}
  if(name==='glaze'||name==='tile'){p.roughness=.34;p.metalness=.08;}
  if(name==='iron'||name==='bronze'){p.metalness=.65;p.roughness=.4;}
  if(name==='leaf'||name==='dry')p.side=THREE.DoubleSide;
  return(cache['mat/'+name]=shared(new THREE.MeshStandardMaterial(p)));
}
// 保留各区域自己的包围盒；同材质构件合为一个索引网格，减少提交和阴影调用。
function Batch(root) { this.root=root;this.parts={};this.count=0; }
Batch.prototype.add=function(g,mat,x,y,z,sx,sy,sz,rx,ry,rz){
  var o=new THREE.Object3D();o.position.set(x,y,z);o.scale.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz);o.rotation.set(rx||0,ry||0,rz||0);o.updateMatrix();
  (this.parts[mat]||(this.parts[mat]=[])).push({geo:g,matrix:o.matrix.clone()});this.count++;
};
Batch.prototype.box=function(mat,x,y,z,w,h,d,ry,rz){this.add(boxGeo(),mat,x,y,z,w,h,d,0,ry||0,rz||0);};
Batch.prototype.beam=function(mat,a,b,r){
  var v=new THREE.Vector3().subVectors(b,a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());
  var m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(r,v.length(),r));
  (this.parts[mat]||(this.parts[mat]=[])).push({geo:cylinder(),matrix:m});this.count++;
};
Batch.prototype.flush=function(wallMeshes){
  var self=this,triangles=0;
  Object.keys(this.parts).forEach(function(name){
    var ps=[],ns=[],uvs=[],ids=[],v=new THREE.Vector3(),n=new THREE.Vector3(),normal=new THREE.Matrix3();
    self.parts[name].forEach(function(item){
      var g=item.geo,p=g.attributes.position,no=g.attributes.normal,u=g.attributes.uv,offset=ps.length/3;normal.getNormalMatrix(item.matrix);
      for(var i=0;i<p.count;i++){
        v.fromBufferAttribute(p,i).applyMatrix4(item.matrix);ps.push(v.x,v.y,v.z);
        n.fromBufferAttribute(no,i).applyMatrix3(normal).normalize();ns.push(n.x,n.y,n.z);
        uvs.push(u?u.getX(i):0,u?u.getY(i):0);
      }
      if(g.index)for(var j=0;j<g.index.count;j++)ids.push(offset+g.index.getX(j));else for(var k=0;k<p.count;k++)ids.push(offset+k);
    });
    var out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));out.setIndex(ids);out.computeBoundingBox();out.computeBoundingSphere();
    var mesh=new THREE.Mesh(out,material(name));mesh.name=self.root.name+'/'+name;mesh.castShadow=true;mesh.receiveShadow=true;self.root.add(mesh);triangles+=ids.length/3;
    if(wallMeshes)wallMeshes.push(mesh);
  });
  this.root.userData.modelParts=this.count;this.root.userData.triangles=triangles;this.parts={};
};
function group(parent,name){var g=new THREE.Group();g.name=name;parent.add(g);return g;}
function potGeo(){return lathe('pot',[[0,0],[.25,0],[.35,.06],[.46,.28],[.47,.53],[.39,.76],[.24,.91],[.21,1.03],[.28,1.05],[.28,1.12],[.20,1.12],[.18,1.02],[.20,.92],[.32,.75],[.40,.51],[.38,.28],[.22,.10],[0,.10]]);}
function pot(b,x,y,z,s,name){
  b.add(potGeo(),name||'terra',x,y,z,s,s,s);
  b.add(ring(),'rope',x,y+s*.87,z,s*.26,s*.26,s*.26,PI/2);
  [-1,1].forEach(function(side){b.add(ring(),name||'terra',x+side*s*.35,y+s*.76,z,s*.16,s*.22,s*.16,0,PI/2);});
}
function crateDetails(root,w,h,d){
  var b=new Batch(root);
  [-1,1].forEach(function(side){
    [-1,1].forEach(function(edge){
      b.box('timber',edge*(w/2-.09),0,side*(d/2+.018),.15,h,.055);
      b.box('timber',side*(w/2+.018),0,edge*(d/2-.09),.055,h,.15);
      b.box('iron',edge*(w/2-.09),side*(h/2-.09),0,.17,.06,d+.05);
    });
    b.box('timber',0,side*(h/2-.08),d/2+.025,w,.13,.06);
    b.box('timber',0,side*(h/2-.08),-d/2-.025,w,.13,.06);
    b.box('timber',0,0,side*(d/2+.055),Math.sqrt(w*w+h*h)*.87,.11,.05,0,Math.atan2(h,w));
  });
  // 顶盖板缝为凹槽视觉；板件仅增加到原碰撞高度以内。
  for(var k=-1;k<=1;k++)b.box('iron',k*w/4,h/2-.008,0,.016,.012,d-.1);
  b.flush();
}
function dressCrate(mesh){
  var p=mesh.geometry.parameters;if(!p||!p.width)return;
  var root=group(mesh,'木箱/立体包边与交叉撑');crateDetails(root,p.width,p.height,p.depth);
}
function build(scene,obstacles,wallMeshes){
  var root=group(scene,'沙海商旅哨站/精细模型'),r=random(20261022),clothTime={value:0},animated=[],lights=[],solidCount=0;
  var originals=obstacles.slice();
  function collider(x,y,z,w,h,d,label){
    // 碰撞代理仅作逻辑 AABB；射线使用实际可见的合批模型，避免跨空隙的假墙。
    var proxy=new THREE.Object3D();proxy.name=label;proxy.position.set(x,y,z);root.add(proxy);
    obstacles.push({mesh:proxy,min:new THREE.Vector3(x-w/2,y-h/2,z-d/2),max:new THREE.Vector3(x+w/2,y+h/2,z+d/2),detail:true});solidCount++;
  }
  function area(name){return new Batch(group(root,name));}
  function lantern(b,x,y,z){
    b.add(cylinder(),'bronze',x,y-.32,z,.21,.1,.21);b.add(cylinder(),'bronze',x,y+.32,z,.25,.1,.25);
    var cap=geo('lamp-cap',function(){return new THREE.ConeGeometry(.28,.26,6);});b.add(cap,'bronze',x,y+.48,z);
    for(var k=0;k<6;k++){var a=k*PI/3;b.box('iron',x+Math.cos(a)*.19,y,z+Math.sin(a)*.19,.035,.61,.035);}
    b.add(ring(),'iron',x,y+.71,z,.12,.12,.12);
    var lm=new THREE.MeshStandardMaterial({color:0xffdf9b,emissive:0xffaf55,emissiveIntensity:.45,roughness:.5});lights.push(lm);
    var m=new THREE.Mesh(geo('lamp-core',function(){return new THREE.CylinderGeometry(.17,.17,.48,6);}),lm);m.position.set(x,y,z);b.root.add(m);
  }
  function archGeo(i){return geo('gate-stone/'+i,function(){
    var s=new THREE.Shape(),a=i*PI/15+.009,z=(i+1)*PI/15-.009;
    s.absarc(0,0,2.21,a,z,false);s.absarc(0,0,1.77,z,a,true);s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:.78,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1,curveSegments:3});
  });}
  // 四向门楼：独立拱石、柱头、厚檐、釉砖和旗杆，而不是一圈薄片。
  [[0,8.5,0],[0,-8.5,PI],[-10.5,0,-PI/2],[10.5,0,PI/2]].forEach(function(p,index){
    var g=group(root,'石拱门楼/'+index);g.position.set(p[0],0,p[1]);g.rotation.y=p[2];var b=new Batch(g);
    [-1,1].forEach(function(s){
      b.box('stone',s*2.04,1.6,0,.52,3.2,1.02);b.box('cream',s*2.04,.18,0,.62,.36,1.12);
      // 柱头高出旧墙顶 5cm，避免新旧两个朝上面再次共面。
      b.box('cream',s*2.04,3.30,0,.7,.30,1.15);b.box('bronze',s*2.04,2.95,.54,.38,.055,.04);
      b.box('stone',s*2.47,4.43,0,.48,2.2,.95);
      for(var y=3.7;y<5.5;y+=.48)b.box('cream',s*2.47,y,.5,.44,.055,.08);
      lantern(b,s*2.65,2.45,.86);
    });
    for(var i=0;i<15;i++)b.add(archGeo(i),i%3?'cream':'stone',0,3.4,-.39);
    b.box('stone',0,5.65,0,5.5,.30,1);b.box('tile',0,5.86,0,5.65,.14,1.08);b.box('cream',0,6.02,0,5.9,.18,1.25);
    for(var k=-2;k<=2;k++)b.box('stone',k*1.15,6.30,0,.54,.38,1);
    b.add(geo('crest',function(){return new THREE.OctahedronGeometry(.23);}), 'bronze',0,5.48,.56,1,1,.35);
    // 只为高处构件补碰撞；门洞自地面到 3.4m 完整保留。
    g.updateMatrixWorld(true);
    [-1,1].forEach(function(side){var c=new THREE.Vector3(side*2.04,3.3,0).applyMatrix4(g.matrixWorld);collider(c.x,c.y,c.z,index<2?.7:1.15,.3,index<2?1.15:.7,'门楼/柱头');});
    for(var a=0;a<15;a++){
      var bb=new THREE.Box3().setFromBufferAttribute(archGeo(a).attributes.position);bb.translate(new THREE.Vector3(0,3.4,-.39));bb.applyMatrix4(g.matrixWorld);
      var c=bb.getCenter(new THREE.Vector3()),s=bb.getSize(new THREE.Vector3());collider(c.x,c.y,c.z,s.x,s.y,s.z,'门楼/拱石碰撞');
    }
    var top=new THREE.Vector3(0,5.85,0).applyMatrix4(g.matrixWorld);collider(top.x,top.y,top.z,index<2?5.9:1.25,.52,index<2?1.25:5.9,'门楼/上檐碰撞');
    [-1,1].forEach(function(side){var c=new THREE.Vector3(side*2.47,4.43,0).applyMatrix4(g.matrixWorld);collider(c.x,c.y,c.z,index<2?.48:.95,2.2,index<2?.95:.48,'门楼/上立柱');});
    for(var crenel=-2;crenel<=2;crenel++){var c=new THREE.Vector3(crenel*1.15,6.30,0).applyMatrix4(g.matrixWorld);collider(c.x,c.y,c.z,index<2?.54:1,.38,index<2?1:.54,'门楼/垛口');}
    b.flush(wallMeshes);
  });
  // 外侧墙面增加嵌砖、石基和窗框；从不覆盖可行走的原墙顶。
  var walls=area('庭院墙面/石基与花砖');
  [-1,1].forEach(function(side){
    [-6.2,6.2].forEach(function(x){
      walls.box('tile',x,3.00,side*9.065,6.35,.24,.07);
      [-1,1].forEach(function(a){walls.box('stone',x+a*.86,1.95,side*9.12,.16,1.8,.20);});
      for(var k=-3;k<=3;k++)walls.box('stone',x+k*.83,.43,side*9.06,.77,.3,.17);
    });
  });walls.flush(wallMeshes);
  // 轮廓层：城外的多层民居、圆顶和钟塔，围绕竞技场形成完整聚落。
  function house(x,z,w,d,h,turn,index){
    var g=group(root,'城外建筑/'+index);g.position.set(x,0,z);g.rotation.y=turn;var b=new Batch(g);
    b.box('plaster',0,h/2,0,w,h,d);b.box('stone',0,.35,0,w+.3,.7,d+.3);
    b.box('cream',0,h-.35,0,w+.30,.24,d+.3);b.box('terra',0,h+.05,0,w+.45,.2,d+.45);
    [-1,1].forEach(function(side){b.box('plaster',0,h+.48,side*d/2,w,.7,.24);b.box('plaster',side*w/2,h+.48,0,.24,.7,d);});
    for(var row=0;row<2;row++)for(var col=-1;col<=1;col++){
      var wx=col*w*.28,wy=2.3+row*(h*.44);b.box('shadow',wx,wy,d/2+.014,1.05,1.65,.03);
      [-1,1].forEach(function(s){b.box('cream',wx+s*.58,wy,d/2+.09,.12,1.85,.16);});b.box('cream',wx,wy-.9,d/2+.18,1.4,.16,.42);
      for(var q=-2;q<=2;q++)b.box('timber',wx+q*.17,wy,d/2+.10,.045,1.6,.06);
      b.box('timber',wx,wy,d/2+.12,1.02,.08,.09);
    }
    if(index%3===0){
      b.add(geo('dome',function(){return new THREE.SphereGeometry(1,24,12,0,PI*2,0,PI/2);}), 'glaze',0,h+.8,0,w*.36,w*.29,w*.36);
      b.add(cylinder(),'cream',0,h+.64,0,w*.38,.4,w*.38);b.add(ball(),'bronze',0,h+w*.29+1,0,.16,.30,.16);
    }else{b.box('plaster',-w*.17,h+1.45,-d*.15,w*.48,2.7,d*.58);b.box('cream',-w*.17,h+2.84,-d*.15,w*.52,.2,d*.62);}
    for(var t=-2;t<=2;t++)b.box('timber',t*w*.18,h-.6,d/2+.3,.13,.16,.72);
    b.flush();
  }
  [[-34,-54,12,10,9,0],[-19,-57,10,9,13,.12],[12,-55,12,11,10,-.08],[31,-54,14,10,12,0],[-54,-26,10,12,10,PI/2],[-55,-4,12,10,8,PI/2],[-55,28,13,12,12,PI/2],[55,-27,13,10,11,-PI/2],[55,3,11,10,9,-PI/2],[55,29,12,12,13,-PI/2]].forEach(function(p,i){house(p[0],p[1],p[2],p[3],p[4],p[5],i);});
  var tower=area('北侧风塔');
  tower.box('plaster',-5,6,-54,5,12,5);tower.box('tile',-5,10.7,-54,5.1,.55,5.1);tower.box('cream',-5,12,-54,5.8,.35,5.8);
  tower.add(cylinder(),'cream',-5,14,-54,2.4,3.6,2.4);
  for(var c=0;c<8;c++){var ang=c*PI/4;tower.box('shadow',-5+Math.sin(ang)*2.23,14,-54+Math.cos(ang)*2.23,.9,2,.15,ang);tower.add(cylinder(),'stone',-5+Math.sin(ang+.21)*2.30,14,-54+Math.cos(ang+.21)*2.30,.14,3.4,.14);}
  tower.add(geo('dome',function(){return new THREE.SphereGeometry(1,24,12,0,PI*2,0,PI/2);}), 'glaze',-5,15.8,-54,2.6,2.5,2.6);
  tower.add(cylinder(),'bronze',-5,18.5,-54,.08,1.4,.08);tower.add(ball(),'bronze',-5,19.1,-54,.24,.30,.24);tower.flush();
  // 主沙地只有 150m 宽；补城外沙丘地基，俯视时不再从台地间看到天空漏底。
  var terrainGeo=new THREE.RingGeometry(72,230,96,8),terrainPos=terrainGeo.attributes.position;
  for(var ti=0;ti<terrainPos.count;ti++){var tx=terrainPos.getX(ti),tz=terrainPos.getY(ti),rr=Math.sqrt(tx*tx+tz*tz);terrainPos.setZ(ti,-.18+(rr-72)/158*(Math.sin(tx*.035)+Math.cos(tz*.03))*2);}
  terrainGeo.computeVertexNormals();var terrain=new THREE.Mesh(terrainGeo,material('stone'));terrain.rotation.x=-PI/2;terrain.name='城外沙丘地基';terrain.receiveShadow=true;root.add(terrain);
  // 边界城垛使用离散石块，不与原 5m 墙顶共面。
  var parapets=area('外围城防/垛口与射孔');
  for(var edge=-1;edge<=1;edge+=2)for(var t=-42;t<=42;t+=3.5){
    if(Math.abs(t)<2)continue; // 中轴处保留连续墙顶通行段。
    parapets.box('stone',t,5.39,edge*45.7,.95,.78,.80);
    parapets.box('stone',edge*45.7,5.39,t,.8,.78,.95);
    collider(t,5.39,edge*45.7,.95,.78,.80,'城防/垛口');
    collider(edge*45.7,5.39,t,.80,.78,.95,'城防/垛口');
  }
  parapets.flush(wallMeshes);
  // 后续区域由下方工厂生成，全部使用同一组材质与基础几何。
  buildMarkets();buildOasis();buildProps();buildPlanting();
  var parts=0,triangles=0,batches=0;
  root.traverse(function(o){parts+=o.userData.modelParts||0;triangles+=o.userData.triangles||0;if(o.isMesh)batches++;});
  root.userData.detailStats={parts:parts,triangles:triangles,batches:batches,solidColliders:solidCount};
  return {root:root,clothTime:clothTime,animated:animated,lights:lights};

  function clothMaterial(name){
    var m=material(name).clone();m.userData.artShared=false;
    m.onBeforeCompile=function(shader){
      shader.uniforms.uBreeze=clothTime;
      shader.vertexShader='uniform float uBreeze;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.x * 2.2 + uBreeze * 1.3) * 0.045 * sin(uv.x * 3.14159265);');
    };return m;
  }
  function buildMarkets() {
    [-17,17].forEach(function(cx,index){
      var b=area(index?'东市/赭红织物摊':'西市/青绿陶器摊'),cloth=clothMaterial(index?'cloth-red':'cloth-teal');
      var roofGeo=new THREE.PlaneGeometry(9.5,6.4,24,12),p=roofGeo.attributes.position;
      for(var i=0;i<p.count;i++){
        var x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,3.55+Math.cos(x/9.5*PI)*.85+Math.sin(z*2)*.045,z);
      }roofGeo.computeVertexNormals();
      var roof=new THREE.Mesh(roofGeo,cloth);roof.position.set(cx,0,6);roof.castShadow=true;roof.receiveShadow=true;roof.name='条纹织物/弧形篷顶';b.root.add(roof);
      [-1,1].forEach(function(s){
        b.box('timber',cx,3.58,6+s*3.2,9.7,.13,.13);
        b.beam('rope',new THREE.Vector3(cx-4.75,3.56,6+s*3.2),new THREE.Vector3(cx,4.44,6+s*3.2),.035);
        b.beam('rope',new THREE.Vector3(cx,4.44,6+s*3.2),new THREE.Vector3(cx+4.75,3.56,6+s*3.2),.035);
        [-1,1].forEach(function(t){b.add(cylinder(),'timber',cx+t*4.8,1.8,6+s*3.2,.10,3.6,.10);b.add(ball(),'bronze',cx+t*4.8,3.7,6+s*3.2,.13,.13,.13);});
        var valance=new THREE.PlaneGeometry(9.5,.42,32,1),vp=valance.attributes.position;
        for(var v=0;v<vp.count;v++){var vx=vp.getX(v),vy=vp.getY(v);vp.setY(v,vy+Math.cos(vx/9.5*PI)*.85-(vy<0?Math.sin((vx+4.75)*PI*2)*.075:0));}
        valance.computeVertexNormals();var edge=new THREE.Mesh(valance,cloth);edge.position.set(cx,3.34,6+s*3.23);edge.castShadow=true;b.root.add(edge);
        lantern(b,cx+s*3.2,2.75,9.3);
      });
      [-1,1].forEach(function(s){
        var tx=cx+s*3.6,tz=6;
        b.box('timber',tx,.52,tz,1.45,.94,3.1);b.box('timber',tx,1.03,tz,1.65,.12,3.3);
        for(var k=-3;k<=3;k++)b.box('cream',tx-s*.74,.52,tz+k*.41,.035,.67,.055);
        collider(tx,.55,tz,1.65,1.1,3.3,'市集/木柜');
        for(var j=0;j<5;j++){var sc=.38+(j%3)*.09;pot(b,tx+(j%2)*.25,1.09,tz-1.15+j*.55,sc,index?'terra':j%2?'glaze':'terra');}
        collider(tx+.1,1.38,tz,1.05,.56,2.9,'市集/柜上陶器');
        // 卷好的织物、藤筐和铜盘都由真实立体几何组成。
        b.add(cylinder(),index?'terra':'glaze',tx,.32,tz+2.1,.26,.64,.26,0,0,PI/2);
        b.add(ring(),'rope',tx,.32,tz+2.1,.27,.27,.27,0,PI/2);
        collider(tx,.33,tz+2.1,.7,.66,.58,'市集/织物卷');
      });b.flush(wallMeshes);
    });
    // 庭院高处的绳索和彩旗，留出整个地面通行空间。
    var flags=area('中央庭院/悬挂彩旗');
    function point(t){return new THREE.Vector3(-10.4+t*20.8,5.8-Math.sin(t*PI)*1.35,1.5);}
    for(var n=0;n<24;n++){
      flags.beam('rope',point(n/24),point((n+1)/24),.018);
      if(n%2===0){var v=point((n+.5)/24),fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute([-.30,0,0,.30,0,0,.07,-.7,.03],3));fg.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,.5,0],2));fg.computeVertexNormals();flags.add(fg,n%4?'cloth-red':'cloth-teal',v.x,v.y,v.z);fg.dispose();}
    }
    [-10.4,10.4].forEach(function(x){flags.add(cylinder(),'timber',x,4.55,1.5,.045,2.6,.045);});flags.flush();
  }
  function buildOasis() {
    var b=area('绿洲/雕花叠水喷泉'),cx=-28,cz=28;
    var pedestal=lathe('fountain-base',[[0,0],[.64,0],[.70,.14],[.70,.25],[.48,.32],[.32,.56],[.26,1.1],[.40,1.26],[0,1.26]]);
    b.add(pedestal,'cream',cx,.28,cz);
    var bowl=lathe('fountain-bowl',[[.30,1.12],[.65,1.21],[1.05,1.40],[1.13,1.56],[1.10,1.65],[.97,1.65],[.92,1.49],[.54,1.34],[.30,1.29]]);
    b.add(bowl,'glaze',cx,.28,cz);
    b.add(cylinder(),'bronze',cx,1.95,cz,.16,.75,.16);b.add(ball(),'bronze',cx,2.4,cz,.24,.34,.24);
    b.add(ring(),'bronze',cx,1.93,cz,1.09,1.09,1.09,PI/2);
    collider(cx,.85,cz,1.4,1.7,1.4,'喷泉/底座');collider(cx,1.8,cz,2.2,.36,2.2,'喷泉/水盘');collider(cx,2.2,cz,.48,.7,.48,'喷泉/喷头');
    var basin=new THREE.Mesh(new THREE.CircleGeometry(.98,48),FishArt.material('water'));basin.rotation.x=-PI/2;basin.position.set(cx,1.88,cz);b.root.add(basin);
    // 四条弧形水流 + 共用一个动态点缓冲；不创建逐粒子材质或计时器。
    var wm=new THREE.MeshStandardMaterial({color:0x82c6c6,emissive:0x2c8086,emissiveIntensity:.28,roughness:.22,metalness:.1});
    for(var j=0;j<4;j++){
      var a=j*PI/2,pts=[];
      for(var k=0;k<=20;k++){var t=k/20,rr=.2+t*2.1;pts.push(new THREE.Vector3(cx+Math.cos(a)*rr,2.36+t*.9-t*t*3.18,cz+Math.sin(a)*rr));}
      var stream=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),28,.029,5,false),wm);stream.name='喷泉/弧形水流';b.root.add(stream);
    }
    var drops=new Float32Array(72*3),dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(drops,3).setUsage(THREE.DynamicDrawUsage));
    var points=new THREE.Points(dg,new THREE.PointsMaterial({color:0xc0efdd,size:.075,transparent:true,opacity:.8,depthWrite:false}));points.frustumCulled=false;b.root.add(points);
    animated.push(function(time){for(var i=0;i<72;i++){var t=(i/18+time*.6)%1,a=Math.floor(i/18)*PI/2,rr=.22+t*2.15;drops[i*3]=cx+Math.cos(a)*rr;drops[i*3+1]=2.38+t*.9-t*t*3.18;drops[i*3+2]=cz+Math.sin(a)*rr+Math.sin(i*13.7)*.06;}dg.attributes.position.needsUpdate=true;});
    // 釉砖逐块立在池壁上，水面仍使用原先唯一的平面。
    for(var n=0;n<64;n++){var an=n/64*PI*2;b.box(n%4?'glaze':'cream',cx+Math.cos(an)*4.16,.17,cz+Math.sin(an)*4.16,.35,.23,.07,PI/2-an);}
    b.flush(wallMeshes);
  }
  function buildProps() {
    var b=area('陈设/陶罐与货运');
    [[-8,11.5],[8,11.5],[-23.7,14],[23.7,14],[-35,36],[32,36]].forEach(function(p,i){
      pot(b,p[0],.02,p[1],1.25,i%2?'glaze':'terra');collider(p[0],.72,p[1],1.18,1.44,1.18,'陶罐/大罐');
      pot(b,p[0]+1.15,.02,p[1]+.25,.8,'terra');collider(p[0]+1.15,.47,p[1]+.25,.76,.94,.76,'陶罐/小罐');
      b.add(ring(),'rope',p[0]-.12,.12,p[1]+1.0,.4,.4,.4,PI/2);
    });
    // 木制货车：独立车轴、轮箍、辐条、层叠货物及牵引杆。
    [[24,18],[-35,7]].forEach(function(p){
      var x=p[0],z=p[1];b.box('timber',x,.69,z,2.7,.2,2.0);
      [-1,1].forEach(function(s){
        for(var row=0;row<3;row++){b.box('timber',x+s*1.3,.91+row*.23,z,.10,.17,2);b.box('timber',x,.91+row*.23,z+s*.96,2.7,.17,.1);}
        b.box('iron',x+s*1.25,1.11,z+.93,.10,.88,.12);b.box('iron',x+s*1.25,1.11,z-.93,.10,.88,.12);
        b.add(ring(),'iron',x+s*1.58,.56,z,.55,.55,.55,0,PI/2);
        b.add(cylinder(),'timber',x+s*1.58,.56,z,.12,.26,.12,0,0,PI/2);
        for(var q=0;q<12;q++){var a=q*PI/6;b.beam('timber',new THREE.Vector3(x+s*1.58,.56,z),new THREE.Vector3(x+s*1.58,.56+Math.sin(a)*.52,z+Math.cos(a)*.52),.035);}
        b.beam('timber',new THREE.Vector3(x+s*.75,.65,z+.9),new THREE.Vector3(x+s*.8,.37,z+3),.065);
      });
      b.beam('iron',new THREE.Vector3(x-1.8,.56,z),new THREE.Vector3(x+1.8,.56,z),.07);
      for(var c=-1;c<=1;c++){b.add(ball(),'rope',x+c*.64,1.17,z,.39,.43,.65);b.add(ring(),'rope',x+c*.64,1.57,z,.14,.14,.14,PI/2);}
      collider(x,.8,z,3.4,1.6,2.15,'货车/车厢');collider(x,.4,z+2,1.8,.5,2,'货车/牵引杆');
    });
    originals.forEach(function(o){
      if(!o.mesh||!o.mesh.geometry)return;
      if(o.mesh.material===FishArt.material('crate'))dressCrate(o.mesh);
      if(o.mesh.geometry.type==='CylinderGeometry'&&o.mesh.geometry.parameters.height===.95){
        var x=o.mesh.position.x,z=o.mesh.position.z;
        o.mesh.geometry.dispose();o.mesh.geometry=lathe('barrel-body',[[0,-.475],[.31,-.475],[.35,-.4],[.39,0],[.35,.4],[.31,.475],[0,.475]]);o.mesh.material=material('timber');
        [-.35,0,.35].forEach(function(h){b.add(ring(),'iron',x,.48+h,z,h===0?.39:.36,h===0?.39:.36,h===0?.39:.36,PI/2);});
        b.add(cylinder(),'iron',x+.12,.969,z,.055,.024,.055);
      }
    });b.flush(wallMeshes);
    // 原有角塔外立面和屋顶梁托，让近景不再是单一大盒子。
    var trims=area('建筑/角塔石带与檐托');
    [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){var x=sx*47.4,z=sz*47.4;
      for(var y=1;y<7;y+=1.35){trims.box('cream',x,y,z,4.68,.18,4.68);}
      for(var yy=2;yy<7;yy+=2){trims.box('shadow',x,yy,z-sz*2.32,.24,1.1,.04);trims.box('shadow',x-sx*2.32,yy,z,.04,1.1,.24);}
    });});
    for(var x=12.4;x<22;x+=.8)trims.box('timber',x,3.25,-5.95,.18,.22,.72);
    trims.flush(wallMeshes);
  }
  function buildPlanting() {
    var b=area('植被与风化碎石');
    var pebble=geo('pebble',function(){return new THREE.IcosahedronGeometry(1,1);});
    function agave(x,z,scale,dry){
      var positions=[];
      for(var a=0;a<13;a++){
        var angle=a/13*PI*2,len=(.6+r()*.5)*scale;
        for(var k=0;k<4;k++){
          function at(t,s){var w=Math.sin(t*PI)*.12*scale;return [x+Math.cos(angle)*t*len-Math.sin(angle)*w*s,.03+Math.sin(t*PI*.8)*len*.78,z+Math.sin(angle)*t*len+Math.cos(angle)*w*s];}
          var p=at(k/4,-1),q=at(k/4,1),v=at((k+1)/4,-1),w=at((k+1)/4,1);[p,q,v,q,w,v].forEach(function(v){positions.push(v[0],v[1],v[2]);});
        }
      }
      var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();b.add(g,dry?'dry':'leaf',0,0,0);g.dispose();
    }
    [[-32,24],[-31,32],[-25,24],[-23,30],[-28,34],[-37,15],[29,11],[-28,-8],[8,-31],[-40,27],[39,25],[-9,13],[10,13],[-24,-18],[24,-18]].forEach(function(p,i){
      agave(p[0],p[1],i<5?1.05:.65,i>=5);
      for(var j=0;j<12;j++){var a=r()*PI*2,dist=.7+r()*1.5,sc=.04+r()*.16;b.add(pebble,j%3?'stone':'terra',p[0]+Math.cos(a)*dist,sc*.25,p[1]+Math.sin(a)*dist,sc,sc*.6,sc*1.4,0,r()*PI);}
    });
    // 池畔芦苇和小花簇，以真实细长几何丰富近景；不构成实体障碍。
    for(var i=0;i<65;i++){
      var a=r()*PI*2,rr=4.65+r()*.7,x=-28+Math.cos(a)*rr,z=28+Math.sin(a)*rr,h=.4+r()*.6;
      if(a<.45||a>5.7)continue;
      b.beam('leaf',new THREE.Vector3(x,.03,z),new THREE.Vector3(x+.08,h,z+.04),.017);
      b.add(ball(),i%4?'dry':'fruit',x+.08,h,z+.04,.045,.11,.045);
    }
    b.flush();
  }
}
function setTheme(world,idx){if(world)world.lights.forEach(function(m){m.emissiveIntensity=idx>=3?2.7:.45;});}
function update(world,time){if(!world)return;world.clothTime.value=time;world.animated.forEach(function(fn){fn(time);});}
window.FishSceneDetail={build:build,setTheme:setTheme,update:update,dressCrate:dressCrate};
})();
