/* 沙海哨站 · Codex 美术模块。Three.js r159 / classic script / 无外部资源。
 * 缓存只存固定数量的材质与基础几何；实例与临时资源由 disposeTree 回收。
 */
(function () {
'use strict';
var cache = Object.create(null), anisotropy = 4;
function seeded(seed) {
  return function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function shared(value) { value.userData.artShared = true; return value; }
function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(key, paint, repeat, data) {
  if (cache[key]) return cache[key];
  var c = canvas(512, 512); paint(c.getContext('2d'), seeded(7413));
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat || 1, repeat || 1); t.anisotropy = anisotropy;
  return (cache[key] = shared(t));
}
function grain(x, r, count, dark, light) {
  for (var i = 0; i < count; i++) {
    x.fillStyle = i % 2 ? dark : light;
    x.fillRect(r() * 512, r() * 512, 0.5 + r() * 1.5, 0.5 + r() * 1.5);
  }
}
function sand(x, r) {
  x.fillStyle = '#cdb184'; x.fillRect(0, 0, 512, 512);
  // 周期一致的低对比风纹，平铺边缘不会出现接缝。
  for (var y = -16; y < 544; y += 10) {
    x.beginPath();
    for (var xx = 0; xx <= 512; xx += 4) {
      var yy = y + Math.sin(xx / 512 * Math.PI * 4 + y * 0.03) * 4;
      if (!xx) x.moveTo(xx, yy); else x.lineTo(xx, yy);
    }
    x.strokeStyle = 'rgba(112,81,47,.10)'; x.lineWidth = 2; x.stroke();
  }
  grain(x, r, 23000, 'rgba(91,65,38,.12)', 'rgba(255,241,204,.22)');
}
function stone(x, r) {
  x.fillStyle = '#a28c70'; x.fillRect(0, 0, 512, 512);
  for (var row = 0; row < 8; row++) {
    for (var col = -1; col < 5; col++) {
      var bx = col * 128 + (row % 2) * 64, by = row * 64, tone = Math.round(r() * 16);
      x.fillStyle = 'rgb(' + (196 + tone) + ',' + (174 + tone) + ',' + (140 + tone) + ')';
      x.fillRect(bx + 2, by + 2, 124, 60);
      x.fillStyle = 'rgba(255,246,215,.24)'; x.fillRect(bx + 3, by + 3, 122, 2);
      x.fillStyle = 'rgba(93,68,40,.12)'; x.fillRect(bx + 3, by + 58, 122, 3);
      for (var k = 0; k < 7; k++) {
        x.fillStyle = 'rgba(92,66,42,.09)';
        x.fillRect(bx + r() * 120, by + 7 + r() * 48, 2 + r() * 9, 1 + r() * 2);
      }
    }
  }
  grain(x, r, 17000, 'rgba(98,71,45,.14)', 'rgba(255,247,222,.20)');
}
function paving(x, r) {
  x.fillStyle = '#988a74'; x.fillRect(0, 0, 512, 512);
  for (var y = 0; y < 4; y++) for (var j = 0; j < 4; j++) {
    var n = Math.round(r() * 18);
    x.fillStyle = 'rgb(' + (173 + n) + ',' + (163 + n) + ',' + (140 + n) + ')';
    x.fillRect(j * 128 + 3, y * 128 + 3, 122, 122);
    x.strokeStyle = 'rgba(249,233,202,.25)'; x.lineWidth = 2;
    x.strokeRect(j * 128 + 5, y * 128 + 5, 118, 118);
  }
  grain(x, r, 13000, 'rgba(74,70,56,.1)', 'rgba(244,236,212,.18)');
}
function wood(x, r) {
  x.fillStyle = '#846244'; x.fillRect(0, 0, 512, 512);
  for (var i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? '#8e6b47' : '#9a7650'; x.fillRect(i * 64 + 3, 0, 59, 512);
  }
  for (var j = 0; j < 700; j++) {
    x.fillStyle = 'rgba(45,30,16,.12)'; x.fillRect(r() * 512, r() * 512, 1 + r(), 16 + r() * 110);
  }
  x.strokeStyle = '#3f4848'; x.lineWidth = 21; x.strokeRect(12, 12, 488, 488);
  x.lineWidth = 12; x.beginPath(); x.moveTo(22, 22); x.lineTo(490, 490); x.stroke();
  x.fillStyle = '#b9aa86';
  [[15,15],[497,15],[15,497],[497,497]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 4, 0, 7); x.fill(); });
}
function waveTexture(x) {
  x.fillStyle = '#719a9a'; x.fillRect(0, 0, 512, 512);
  for (var y = -32; y < 550; y += 19) {
    x.beginPath();
    for (var j = 0; j <= 512; j += 4) {
      var yy = y + Math.sin(j / 512 * Math.PI * 6 + y) * 7;
      if (!j) x.moveTo(j, yy); else x.lineTo(j, yy);
    }
    x.strokeStyle = 'rgba(222,249,232,.48)'; x.lineWidth = 2; x.stroke();
  }
}
function mat(name) {
  if (cache['mat:' + name]) return cache['mat:' + name];
  var p = { roughness: 0.9 };
  if (name === 'sand') p = { map: texture('sand', sand, 36), bumpMap: texture('sand-height', sand, 36, true), bumpScale: 0.045, roughness: 1 };
  else if (name === 'wall') p = { map: texture('stone', stone), bumpMap: texture('stone-height', stone, 1, true), bumpScale: 0.045, roughness: 0.96 };
  else if (name === 'paving') p = { map: texture('paving', paving), bumpMap: texture('paving-height', paving, 1, true), bumpScale: 0.025, roughness: 0.93 };
  else if (name === 'crate') p = { map: texture('wood', wood), bumpMap: texture('wood-height', wood, 1, true), bumpScale: 0.025, roughness: 0.86 };
  else if (name === 'water') p = { color: 0x258c94, map: texture('water', waveTexture, 3), bumpMap: texture('water-height', waveTexture, 3, true), bumpScale: 0.10, roughness: 0.32, metalness: 0.04, envMapIntensity: 0.35, emissive: 0x0b555c, emissiveIntensity: 0.35 };
  else if (name === 'mesa') p = { map: texture('mesa-strata', function(x,r) {
    x.fillStyle='#bca180'; x.fillRect(0,0,512,512);
    for(var y=0;y<512;y+=32){
      x.fillStyle=y%64?'rgba(110,77,47,.13)':'rgba(245,219,178,.15)';
      x.fillRect(0,y,512,24+r()*6);
    }
    grain(x,r,10000,'rgba(77,53,29,.1)','rgba(247,224,191,.1)');
  }), roughness: 1 };
  else if (name === 'leaves') p = { vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 };
  else {
    var colors = { trim: 0xe0ccb0, base: 0x967c5b, teal: 0x397f80, dark: 0x204b50, wood: 0x68503c, bronze: 0xb99b64, rock: 0xb5a187, mesa: 0xc3a582, leafDry: 0x8e8d4e };
    p.color = colors[name] || 0xc6b395;
    if (name === 'bronze') { p.metalness = 0.45; p.roughness = 0.42; }
  }
  return (cache['mat:' + name] = shared(new THREE.MeshStandardMaterial(p)));
}
function boxGeometry(w, h, d, unit) {
  var g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  var dimensions = [[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for (var face = 0; face < 6; face++) for (var k = 0; k < 4; k++) {
    var i = face * 4 + k;
    uv.setXY(i, uv.getX(i) * dimensions[face][0] / (unit || 4), uv.getY(i) * dimensions[face][1] / (unit || 4));
  }
  return g;
}
function unitBox() { return cache.box || (cache.box = shared(new THREE.BoxGeometry(1, 1, 1))); }
// 檐口接管墙顶：删除原盒体被覆盖的朝上三角形，侧面、碰撞高度保持不变。
function removeCoveredTop(geometry) {
  var index=geometry.index, normal=geometry.attributes.normal, kept=[];
  for(var i=0;i<index.count;i+=3){
    var a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    if(normal.getY(a)>.99 && normal.getY(b)>.99 && normal.getY(c)>.99)continue;
    kept.push(a,b,c);
  }
  geometry.setIndex(kept);geometry.clearGroups();
}
// 同高度矩形的并集：每个顶面单元只生成一次，转角处不再叠放完整盒子。
// 仅沿并集轮廓生成侧面；不同高度保留各自台阶，不用 polygonOffset 掩盖重叠。
function wallCaps(root,rects) {
  var levels={},positions=[];
  function snap(v){return Math.round(v*100000)/100000;}
  function coords(values){return Array.from(new Set(values.map(snap))).sort(function(a,b){return a-b;});}
  function quad(a,b,c,d){[a,b,c,a,c,d].forEach(function(v){positions.push(v[0],v[1],v[2]);});}
  rects.forEach(function(r){var key=snap(r.top);(levels[key]||(levels[key]=[])).push(r);});
  Object.keys(levels).forEach(function(level){
    var list=levels[level],xs=[],zs=[],top=Number(level),bottom=top-.24;
    list.forEach(function(r){xs.push(r.x0,r.x1);zs.push(r.z0,r.z1);});
    xs=coords(xs);zs=coords(zs);
    var nx=xs.length-1,nz=zs.length-1,filled=new Uint8Array(nx*nz);
    list.forEach(function(r){
      var x0=xs.indexOf(snap(r.x0)),x1=xs.indexOf(snap(r.x1)),z0=zs.indexOf(snap(r.z0)),z1=zs.indexOf(snap(r.z1));
      for(var x=x0;x<x1;x++)for(var z=z0;z<z1;z++)filled[x*nz+z]=1;
    });
    function has(x,z){return x>=0&&x<nx&&z>=0&&z<nz&&filled[x*nz+z];}
    for(var x=0;x<nx;x++)for(var z=0;z<nz;z++){
      if(!has(x,z))continue;
      var x0=xs[x],x1=xs[x+1],z0=zs[z],z1=zs[z+1];
      quad([x0,top,z0],[x0,top,z1],[x1,top,z1],[x1,top,z0]);
      quad([x0,bottom,z0],[x1,bottom,z0],[x1,bottom,z1],[x0,bottom,z1]);
      if(!has(x-1,z))quad([x0,bottom,z0],[x0,bottom,z1],[x0,top,z1],[x0,top,z0]);
      if(!has(x+1,z))quad([x1,bottom,z1],[x1,bottom,z0],[x1,top,z0],[x1,top,z1]);
      if(!has(x,z-1))quad([x1,bottom,z0],[x0,bottom,z0],[x0,top,z0],[x1,top,z0]);
      if(!has(x,z+1))quad([x0,bottom,z1],[x1,bottom,z1],[x1,top,z1],[x0,top,z1]);
    }
  });
  var geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  var mesh=new THREE.Mesh(geometry,mat('trim'));mesh.name='围墙/合并檐口';
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function batcher(root) {
  var buckets = {}, transform = new THREE.Object3D();
  return {
    box: function (name, x, y, z, w, h, d, turn) {
      (buckets[name] || (buckets[name] = [])).push([x,y,z,w,h,d,turn || 0]);
    },
    flush: function () {
      Object.keys(buckets).forEach(function (name) {
        var list = buckets[name], mesh = new THREE.InstancedMesh(unitBox(), mat(name), list.length);
        mesh.name = '建筑细节/' + name; mesh.castShadow = true; mesh.receiveShadow = true;
        list.forEach(function (a, i) {
          transform.position.set(a[0],a[1],a[2]); transform.scale.set(a[3],a[4],a[5]); transform.rotation.set(0,a[6],0);
          transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); root.add(mesh);
      });
    }
  };
}
function palm(x, z, dry) {
  var r = seeded(Math.round((x + 50) * 192 + z + 50)), g = new THREE.Group();
  var height = 4.6 + r() * 1.2;
  var path = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.12,height*.4,.1),new THREE.Vector3(.38,height,.18)]);
  var trunk = new THREE.Mesh(new THREE.TubeGeometry(path, 9, 0.18, 7, false), mat('wood'));
  trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
  var pos = [], cols = [], color = new THREE.Color();
  function vertex(v) { pos.push(v[0],v[1],v[2]); cols.push(color.r,color.g,color.b); }
  for (var j = 0; j < 11; j++) {
    var a = j / 11 * Math.PI * 2, len = 2.6 + r() * 1.2;
    color.setHex(dry ? (j % 2 ? 0x8b9153 : 0xb1a764) : (j % 2 ? 0x477f61 : 0x749965));
    for (var s = 0; s < 7; s++) {
      var t = s / 7, u = (s + 1) / 7;
      function at(k, side) {
        var width = Math.sin(k * Math.PI) * 0.31;
        return [0.38 + Math.cos(a) * k * len - Math.sin(a) * width * side,
          height + Math.sin(k * Math.PI) * .65 - k * k * 1.3 - Math.abs(side) * .08,
          0.18 + Math.sin(a) * k * len + Math.cos(a) * width * side];
      }
      var p0=at(t,-1), p1=at(t,1), p2=at(u,-1), p3=at(u,1);
      [p0,p2,p1,p1,p2,p3].forEach(vertex);
    }
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols,3)); geo.computeVertexNormals();
  var leaves = new THREE.Mesh(geo, mat('leaves')); leaves.castShadow = true;
  g.add(leaves); g.position.set(x,0,z); g.userData.trunk = trunk; g.userData.leaves = leaves;
  g.name = '沙漠棕榈'; return g;
}
function sign(root, x, y, z, title, subtitle, turn) {
  var c = canvas(512,256), ctx=c.getContext('2d');
  ctx.fillStyle='#245355'; ctx.fillRect(0,0,512,256);
  ctx.strokeStyle='#b7c5a9'; ctx.lineWidth=3; ctx.strokeRect(12,12,488,232);
  ctx.fillStyle='#f6e7c5'; ctx.textAlign='center'; ctx.font='bold 112px sans-serif'; ctx.fillText(title,256,140);
  ctx.font='24px Microsoft YaHei, sans-serif'; ctx.fillText(subtitle,256,206);
  var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=anisotropy;
  var m=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.05),new THREE.MeshStandardMaterial({map:t,roughness:.85}));
  m.position.set(x,y,z); m.rotation.y=turn||0; root.add(m);
}
function build(scene, obstacles, poolWater) {
  var root=new THREE.Group(); root.name='沙海哨站/环境细节'; scene.add(root);
  var b=batcher(root), r=seeded(20261021), palms=[],capRects=[];
  // 沿原碰撞体贴合装饰。檐口不改变原有通路或箱子的跳跃高度。
  obstacles.forEach(function (o) {
    var w=o.max.x-o.min.x, d=o.max.z-o.min.z, h=o.max.y-o.min.y;
    if (o.min.y!==0 || h<2.8 || (w>2 && d>2)) return;
    if(!o.mesh || o.mesh.geometry.type!=='BoxGeometry' || o.mesh.material!==mat('wall'))return;
    var cx=(o.min.x+o.max.x)/2, cz=(o.min.z+o.max.z)/2;
    removeCoveredTop(o.mesh.geometry);
    capRects.push({x0:o.min.x-.075,x1:o.max.x+.075,z0:o.min.z-.075,z1:o.max.z+.075,top:h});
    b.box('base',cx,.22,cz,w+.06,.44,d+.06);
    b.box('bronze',cx,h-.42,cz,w+.04,.055,d+.04);
    var along=w>d, length=along?w:d;
    if (length>5) for (var s=1; s<length; s+=4.2) {
      var px=along?o.min.x+s:cx, pz=along?cz:o.min.z+s;
      b.box('trim',px,h*.5,pz,along?.25:w+.12,h-.4,along?d+.12:.25);
    }
  });
  var caps=wallCaps(root,capRects);
  // 中央拱门：跨在现有 3.5m 门洞上方，不缩窄门洞。
  [[0,9.04,0],[0,-9.04,Math.PI],[-11.04,0,-Math.PI/2],[11.04,0,Math.PI/2]].forEach(function (p) {
    var shape=new THREE.Shape(); shape.absarc(0,3.4,2.04,0,Math.PI,false);
    shape.lineTo(-1.75,3.4); shape.absarc(0,3.4,1.75,Math.PI,0,true); shape.closePath();
    var arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,curveSegments:16}),mat('trim'));
    arch.position.set(p[0],0,p[1]); arch.rotation.y=p[2]; arch.castShadow=true; root.add(arch);
    var crest=new THREE.Mesh(new THREE.OctahedronGeometry(.23),mat('bronze'));
    crest.position.set(p[0],5.1,p[1]); root.add(crest);
  });
  // 百叶窗、窗台与嵌墙灯。只用几种实例化材质。
  [-1,1].forEach(function (side) {
    [-6.2,6.2].forEach(function (x) {
      var z=side*9.02;
      b.box('dark',x,1.95,z,1.5,1.6,.06);
      b.box('trim',x,1.10,z,1.85,.16,.3);
      b.box('trim',x,2.80,z,1.85,.13,.2);
      for(var j=0;j<8;j++) b.box('teal',x,1.3+j*.18,z+side*.05,1.38,.105,.06);
      b.box('bronze',x,1.96,z+side*.1,.06,1.5,.07);
    });
  });
  sign(root,-17,2.0,12.04,'A','西侧庭院 / COURTYARD');
  sign(root,17,2.0,12.04,'B','东侧回廊 / ARCADE');
  // 标牌挂在廊道端部侧墙上，不横挡入口。
  root.children[root.children.length-2].position.x=-21.45;
  root.children[root.children.length-1].position.x=21.45;
  // 道路与中央圆形拼花，略抬高以防 z-fighting。
  function road(x,z,w,d) {
    var g=new THREE.PlaneGeometry(w,d), uv=g.attributes.uv;
    for(var j=0;j<uv.count;j++) uv.setXY(j,uv.getX(j)*w/4,uv.getY(j)*d/4);
    var m=new THREE.Mesh(g,mat('paving')); m.rotation.x=-Math.PI/2; m.position.set(x,.018,z); m.receiveShadow=true; root.add(m);
    for(var s=-d/2;s<d/2;s+=2) [-1,1].forEach(function(side){b.box('trim',x+side*(w/2+.08),.025,z+s+.95,.16,.045,1.86);});
  }
  road(0,21,4.2,27); road(0,-3,3.45,21); road(-17,-2,5,28); road(17,-2,5,28);
  var medallion = texture('medallion',function(x){
    x.clearRect(0,0,512,512); x.translate(256,256);
    x.fillStyle='#b5a184'; x.beginPath(); x.arc(0,0,250,0,Math.PI*2); x.fill();
    x.strokeStyle='#526e66'; x.lineWidth=13;
    [235,202].forEach(function(rad){x.beginPath();x.arc(0,0,rad,0,Math.PI*2);x.stroke();});
    for(var i=0;i<8;i++){x.save();x.rotate(i*Math.PI/4);x.beginPath();x.moveTo(0,-180);x.lineTo(32,-64);x.lineTo(0,-24);x.lineTo(-32,-64);x.closePath();x.fillStyle=i%2?'#d6c3a1':'#527c76';x.fill();x.restore();}
  });
  var seal=new THREE.Mesh(new THREE.PlaneGeometry(8.5,8.5),new THREE.MeshStandardMaterial({map:medallion,transparent:true,alphaTest:.1,roughness:1,depthWrite:false}));
  seal.rotation.x=-Math.PI/2; seal.position.set(0,.032,23); seal.receiveShadow=true; seal.renderOrder=-1; root.add(seal);
  // 城墙外的塔楼与远处砂岩台地，均在可玩边界以外。
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){
    var x=sx*47.4,z=sz*47.4;
    b.box('base',x,3.7,z,4.6,7.4,4.6); b.box('trim',x,7.35,z,5,.32,5);
    for(var k=-1;k<=1;k++){
      b.box('trim',x+k*1.6,7.9,z-2.2,.85,.9,.6);b.box('trim',x+k*1.6,7.9,z+2.2,.85,.9,.6);
      b.box('trim',x-2.2,7.9,z+k*1.6,.6,.9,.85);b.box('trim',x+2.2,7.9,z+k*1.6,.6,.9,.85);
    }
  });});
  var mesaGeo=new THREE.CylinderGeometry(.65,1.1,1,7); // 宽底平顶的风蚀台地
  var mesas=new THREE.InstancedMesh(mesaGeo,mat('mesa'),30), temp=new THREE.Object3D();
  for(var i=0;i<30;i++){
    var a=i/30*Math.PI*2, dist=95+r()*35, h=8+r()*17;
    temp.position.set(Math.cos(a)*dist,h*.5-2,Math.sin(a)*dist);temp.scale.set(13+r()*12,h,9+r()*15);temp.rotation.y=r()*6.28;temp.updateMatrix();mesas.setMatrixAt(i,temp.matrix);
  }
  mesas.computeBoundingSphere();root.add(mesas);
  // 低矮草叶和碎石用实例绘制，避免数百个独立 draw call。
  var grassGeo=new THREE.BufferGeometry();
  grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.16,0,0,.16,0,0,.08,1,0,0,0,-.16,0,0,.16,0,.8,-.08],3));grassGeo.computeVertexNormals();
  var grassMat=new THREE.MeshStandardMaterial({color:0x9b9b62,side:THREE.DoubleSide,roughness:1});
  var grassPositions=[];
  for(var tries=0;tries<800&&grassPositions.length<160;tries++){
    var gx=-43+r()*86,gz=-43+r()*86;
    if(Math.abs(gx)<3||Math.abs(Math.abs(gx)-17)<3)continue;
    if(Math.pow(gx+28,2)+Math.pow(gz-28,2)<23)continue;
    if(obstacles.some(function(o){return gx>o.min.x-.6&&gx<o.max.x+.6&&gz>o.min.z-.6&&gz<o.max.z+.6;}))continue;
    grassPositions.push([gx,gz]);
  }
  var grass=new THREE.InstancedMesh(grassGeo,grassMat,grassPositions.length);
  grassPositions.forEach(function(p,i){temp.position.set(p[0],.01,p[1]);temp.rotation.set(0,r()*6.28,0);temp.scale.set(.8+r(),.18+r()*.42,.8+r());temp.updateMatrix();grass.setMatrixAt(i,temp.matrix);});
  grass.computeBoundingSphere();root.add(grass);
  // 绿洲边缘的石块与纹理水面。
  for(var k=0;k<36;k++){var ang=k/36*Math.PI*2;b.box('trim',-28+Math.cos(ang)*4.32,.19,28+Math.sin(ang)*4.32,.57,.34,.37,-ang);}
  if(poolWater)poolWater.material=mat('water');
  // 两片遮阳布为回廊提供色彩和清晰的轮廓，不侵入地面走线。
  var clothUniform={value:0};
  var clothMat=new THREE.MeshStandardMaterial({color:0x377f80,side:THREE.DoubleSide,roughness:1});
  clothMat.onBeforeCompile=function(shader){
    shader.uniforms.uBreeze=clothUniform;
    shader.vertexShader='uniform float uBreeze;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x * 1.8 + uBreeze) * 0.09;');
  };
  [-17,17].forEach(function(x){
    var roof=new THREE.Mesh(new THREE.PlaneGeometry(9.2,6,16,8),clothMat);roof.rotation.x=-Math.PI/2;roof.position.set(x,3.5,6);roof.receiveShadow=true;root.add(roof);
    b.box('wood',x,3.56,3,9.5,.11,.11);b.box('wood',x,3.56,9,9.5,.11,.11);
  });
  // 发光灯芯不使用额外动态点光源；夜间仍可辨认路径。
  var lampMat=new THREE.MeshStandardMaterial({color:0xffd798,emissive:0xffb85e,emissiveIntensity:.35,roughness:.4});
  [-9,9].forEach(function(x){
    [-9.12,9.12].forEach(function(z){
      b.box('bronze',x,2.35,z,.34,.64,.32);
      var lamp=new THREE.Mesh(new THREE.BoxGeometry(.23,.43,.34),lampMat);lamp.position.set(x,2.35,z+Math.sign(z)*.06);root.add(lamp);
    });
  });
  b.flush();
  var sun=new THREE.Mesh(new THREE.SphereGeometry(4,16,12),new THREE.MeshBasicMaterial({color:0xffecc9,fog:false,toneMapped:false}));
  sun.position.set(-90,100,65);root.add(sun);
  var starGeo=new THREE.BufferGeometry(), stars=[];
  for(var j=0;j<120;j++){var ang=r()*Math.PI*2,y=45+r()*95;stars.push(Math.cos(ang)*140,y,Math.sin(ang)*140);}
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  var star=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xc6d9ee,size:.36,fog:false,transparent:true,opacity:.75,depthWrite:false}));root.add(star);
  return {root:root,wallCaps:caps,water:poolWater,clothTime:clothUniform,lamp:lampMat,sun:sun,stars:star,palms:palms};
}
function setTheme(world, idx) {
  if(!world)return;
  world.lamp.emissiveIntensity=idx>=3?2.3:.35;
  world.stars.visible=idx>=3; world.sun.visible=idx!==2;
  world.sun.material.color.setHex([0xffecc9,0xffc58e,0xe5cd99,0xe98c84,0xcbdcf1][idx]);
  world.sun.position.y=idx===1?21:100;
}
function update(world, time) {
  if(!world)return;
  world.clothTime.value=time*.65;
  if(world.water){world.water.material.map.offset.set(time*.006,time*.003);world.water.material.bumpMap.offset.set(-time*.009,time*.004);}
  world.palms.forEach(function(p,i){p.rotation.z=Math.sin(time*.9+i*1.7)*.018;});
}
function fishGeometry(size) {
  var key='fish:'+size;
  if(cache[key])return cache[key];
  var g=new THREE.PlaneGeometry(size,size,12,12),p=g.attributes.position;
  for(var i=0;i<p.count;i++){
    var x=p.getX(i)/size*2,y=p.getY(i)/size*2;
    p.setZ(i,Math.max(0,1-x*x)*Math.max(0,1-y*y)*size*.045);
  }
  g.computeVertexNormals();g.computeBoundingSphere();return(cache[key]=shared(g));
}
function fishDetails(mesh,size,tex) {
  var back=new THREE.Mesh(fishGeometry(size),new THREE.MeshBasicMaterial({map:tex,color:0x485675,alphaTest:.15,side:THREE.DoubleSide}));
  back.position.z=-size*.018;back.scale.set(1.012,1.012,1);back.name='原画浅浮雕背层';mesh.add(back);
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:.15,side:THREE.DoubleSide});
}
function shadow(size) {
  var t=texture('contact-shadow',function(x){var g=x.createRadialGradient(256,256,15,256,256,245);g.addColorStop(0,'rgba(37,33,30,.55)');g.addColorStop(.45,'rgba(37,33,30,.26)');g.addColorStop(1,'rgba(37,33,30,0)');x.fillStyle=g;x.fillRect(0,0,512,512);});
  var g=cache.shadowGeo||(cache.shadowGeo=shared(new THREE.PlaneGeometry(1,1)));
  var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,opacity:.5,toneMapped:false}));
  m.rotation.x=-Math.PI/2;m.scale.set(size*.95,size*.7,1);m.name='接地软阴影';m.renderOrder=1;return m;
}
// 只删除与边界连通的背景色，保留原画内部白衣、眼白与头饰。
function removeBackground(data,w,h) {
  var corners=[0,(w-1)*4,(h-1)*w*4,(w*h-1)*4];
  if(!corners.every(function(i){return data[i+3]===255;}))return;
  var br=0,bg=0,bb=0;corners.forEach(function(i){br+=data[i];bg+=data[i+1];bb+=data[i+2];});br/=4;bg/=4;bb/=4;
  var seen=new Uint8Array(w*h),queue=new Uint32Array(w*h),head=0,tail=0;
  function visit(p){
    if(seen[p])return;seen[p]=1;var i=p*4,dr=data[i]-br,dg=data[i+1]-bg,db=data[i+2]-bb;
    if(dr*dr+dg*dg+db*db>46*46*3)return;
    data[i+3]=0;queue[tail++]=p;
  }
  for(var x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
  for(var y=1;y<h-1;y++){visit(y*w);visit(y*w+w-1);}
  while(head<tail){var p=queue[head++],xx=p%w;if(xx>0)visit(p-1);if(xx<w-1)visit(p+1);if(p>=w)visit(p-w);if(p<(h-1)*w)visit(p+w);}
}
function disposeTree(root, protectedTexture) {
  if(!root)return;
  var geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(function(o){
    if(o.geometry)geometries.add(o.geometry);
    if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);});
    if(o.customDepthMaterial)materials.add(o.customDepthMaterial);
    if(o.isInstancedMesh)o.dispose();
    if(o.isLight&&o.shadow)o.shadow.dispose();
  });
  geometries.forEach(function(g){if(!g.userData.artShared)g.dispose();});
  materials.forEach(function(m){
    if(m.userData.artShared)return;
    Object.keys(m).forEach(function(k){var v=m[k];if(v&&v.isTexture&&v!==protectedTexture&&!v.userData.artShared)textures.add(v);});m.dispose();
  });
  textures.forEach(function(t){t.dispose();});
  if(root.parent)root.parent.remove(root);
}
window.FishArt={
  configure:function(renderer){anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()||1);},
  material:mat,boxGeometry:boxGeometry,palm:palm,build:build,setTheme:setTheme,update:update,
  fishGeometry:fishGeometry,fishDetails:fishDetails,shadow:shadow,removeBackground:removeBackground,disposeTree:disposeTree
};
})();
