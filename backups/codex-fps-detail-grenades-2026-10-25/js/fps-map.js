/* 沙海双城 — an original FPS arena inspired by desert-city long/mid/tunnel routes.
 * Layout is pure data, independent of Three.js. Endless never builds this map.
 * Units: metres. Y=feet, south/red=+Z, north/blue=-Z.
 */
(function(root){
  'use strict';
  function createLayout(){
    var map={id:'sand-twin-courts',name:'沙海双城',half:76,limit:75,solids:[],buildings:[],arches:[],crates:[],palms:[],
      spawnZ:69,baseZ:67,baseSignZ:75.2,
      zones:[{name:'A · 长街广场',short:'A',x:-52,z:0},{name:'中央门廊',short:'MID',x:0,z:0},{name:'B · 商旅庭院',short:'B',x:50,z:0}],
      routes:[
        [[-22,62],[-48,47],[-58,30],[-58,14],[-52,0],[-58,-14],[-58,-30],[-48,-47],[-22,-62]],
        [[20,62],[20,46],[5,40],[0,24],[0,7],[0,-7],[0,-24],[5,-40],[20,-46],[20,-62]],
        [[22,62],[50,47],[50,30],[50,14],[46,3],[50,-14],[50,-30],[50,-47],[22,-62]],
        [[-20,62],[-19,46],[-19,18],[-7,16],[0,7],[0,-7],[-7,-16],[-19,-18],[-19,-46],[-20,-62]]
      ]};
    function solid(name,x,y,z,w,h,d,kind){
      var s={name:name,x:x,y:y,z:z,w:w,h:h,d:d,kind:kind||'stone',min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}};
      map.solids.push(s);return s;
    }
    function building(x,z,w,d,h,variant){var b=solid('砂岩民居',x,h/2,z,w,h,d,'building');b.variant=variant||0;map.buildings.push(b);}
    function crate(x,z,w,d,h){var c=solid('货箱掩体',x,h/2,z,w,h,d,'crate');map.crates.push(c);}
    function arch(x,z,width,opening,h){
      var pier=(width-opening)/2,r=opening/2;
      solid('门廊西柱',x-width/2+pier/2,h/2,z,pier,h,1.2);
      solid('门廊东柱',x+width/2-pier/2,h/2,z,pier,h,1.2);
      // Narrow strips approximate the curved soffit. Each strip belongs to the
      // same visible arch, and cannot push a jumping player out of the tunnel.
      for(var i=0;i<12;i++){
        var l=-r+opening*i/12,rr=-r+opening*(i+1)/12,edge=Math.max(Math.abs(l),Math.abs(rr));
        var bottom=2.7+Math.sqrt(Math.max(0,r*r-edge*edge))*.62;
        solid('拱门顶',x+(l+rr)/2,(bottom+h)/2,z,opening/12,h-bottom,1.2,'arch');
      }
      map.arches.push({x:x,z:z,w:width,opening:opening,h:h});
    }
    solid('北城墙',0,3.6,-76,153,7.2,1.2);
    solid('南城墙',0,3.6,76,153,7.2,1.2);
    solid('西城墙',-76,3.6,0,1.2,7.2,151);
    solid('东城墙',76,3.6,0,1.2,7.2,151);
    [-1,1].forEach(function(f){
      // The depot masks spawn-to-spawn sightlines and feeds two independent exits.
      building(-9.5,54*f,8,10,9.2,1);building(9.5,54*f,8,10,9.2,1);
      arch(0,59*f,27,11,8.7);arch(0,49*f,27,11,8.7);
      solid('基地门楼顶棚',0,6.8,54*f,11,.4,8.8,'roof');
      solid('基地内侧挡板',0,1.3,46*f,7,2.6,1.2,'stone');
      building(-31,32*f,16,22,8.2,0);
      building(36,30*f,14,24,8.8,1);
      building(64,30*f,14,24,7.1,2);
      building(-70,33*f,10,28,9.4,2);
      building(-57,61*f,24,17,7,0);
      building(56,61*f,27,17,9,1);
      // Walkable covered lane: ceiling is solid, the passage beneath is open.
      solid('商旅通道顶棚',50,3.65,30*f,14,0.5,24,'roof');
      arch(50,18*f,14,10,7.8);arch(50,42*f,14,10,7.8);
      arch(-52,18*f,26,10,7.8);
      crate(-51,30*f,4.6,3.2,2.6);
      crate(-43,7*f,3,3.5,1.35);
      crate(58,7*f,3.4,3.6,2.5);
      crate(40,9*f,2.6,3.2,1.35);
      crate(-22,48*f,2.2,2.4,1.2);
      crate(24,46*f,2.6,2.8,1.4);
      crate(7,19*f,2.2,3.5,1.4);
      solid('中庭水台',0,.45,34*f,4.2,.9,4.2,'fountain');
      solid('水台中心柱',0,1.5,34*f,1,1.3,1,'detail');
      [[-62,8],[-24,59],[25,59],[69,10]].forEach(function(p){
        map.palms.push({x:p[0],z:p[1]*f});solid('棕榈树干',p[0],2.1,p[1]*f,.8,4.2,.8,'palm');
      });
      [-39,38].forEach(function(x){solid('沿街商铺柜台',x,.6,7*f,1.1,1.2,4.2,'detail');solid('商铺遮阳棚',x,2.7,7*f,2.3,.09,4.8,'detail');});
      [-54,-46].forEach(function(x){solid('长街遮阳棚支柱',x,3,46*f,.16,6,.16,'detail');});
    });
    building(-25,0,24,24,9,2);building(25,0,24,24,10,1);
    building(-70,0,10,24,7.4,0);building(70,0,10,24,8,2);
    arch(0,0,26,9,7);
    solid('中门西扇',-2.7,1.5,-.8,2.4,3,.5,'door');
    solid('中门东扇',2.7,1.5,.8,2.4,3,.5,'door');
    // Staggered cover breaks the long street sightline without sealing the lane.
    crate(-58,1,3.4,3,2.3);crate(-50,-7,2,2,1.1);
    crate(52,-2,4,3.6,2.2);crate(45,6,2,2,1.1);
    return map;
  }
  var cache={};
  function shared(o){o.userData=o.userData||{};o.userData.artShared=true;return o;}
  function plasterTexture(){
    if(cache.plasterTexture)return cache.plasterTexture;
    var c=document.createElement('canvas');c.width=c.height=512;var x=c.getContext('2d'),seed=76391;
    function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    x.fillStyle='#e9d9bc';x.fillRect(0,0,512,512);
    for(var i=0;i<12500;i++){x.fillStyle=i%3?'rgba(116,88,55,.055)':'rgba(255,253,236,.28)';x.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*2);}
    for(var k=0;k<85;k++){
      var xx=rand()*512,yy=rand()*512;x.fillStyle='rgba(155,124,81,.06)';x.beginPath();x.ellipse(xx,yy,7+rand()*23,3+rand()*8,rand()*3,0,Math.PI*2);x.fill();
    }
    var t=new root.THREE.CanvasTexture(c);t.colorSpace=root.THREE.SRGBColorSpace;t.wrapS=t.wrapT=root.THREE.RepeatWrapping;t.anisotropy=4;
    return cache.plasterTexture=shared(t);
  }
  function material(name){
    if(cache[name])return cache[name];var T=root.THREE,p={roughness:.9};
    var base=root.FishArt.material(name==='plaster'?'wall':name==='pavers'?'paving':name==='crate'?'crate':'trim');
    if(name==='plaster'||name==='pavers'||name==='crate')p.map=base.map;
    if(name==='plaster'||name==='pavers'){p.bumpMap=base.bumpMap;p.bumpScale=name==='plaster'?.035:.02;}
    if(name==='facade'||name==='ivory'||name==='ochre'){p.map=plasterTexture();p.bumpMap=p.map;p.bumpScale=.018;}
    var colors={plaster:0xead7b4,pavers:0xe1d9c8,facade:0xf1dfbd,ivory:0xfff6df,ochre:0xe6be87,cream:0xf2ddb7,foot:0xa38a69,teal:0x3c8581,dark:0x244c50,wood:0x795337,iron:0x343d3c,terra:0xb16b49,cloth:0x488c87,coral:0xb96346,crate:0xffffff,water:0x4c949d};
    p.color=colors[name]||0xe3ccaa;
    if(name==='iron'){p.metalness=.6;p.roughness=.55;}
    if(name==='water'){p.metalness=.2;p.roughness=.2;}
    if(name==='lamp'){p.color=0xffdf99;p.emissive=0xffbc58;p.emissiveIntensity=.65;}
    return cache[name]=shared(new T.MeshStandardMaterial(p));
  }
  function primitive(name){
    if(cache['geo:'+name])return cache['geo:'+name];var T=root.THREE,g;
    if(name==='box')g=new T.BoxGeometry(1,1,1);
    else if(name==='cylinder')g=new T.CylinderGeometry(1,1,1,16);
    else if(name==='dome')g=new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
    else if(name==='ring')g=new T.TorusGeometry(1,.08,6,24);
    else if(name==='pot')g=new T.LatheGeometry([[0,0],[.27,0],[.4,.12],[.48,.5],[.36,.9],[.22,1.05],[.27,1.12],[.27,1.2],[.18,1.2],[.18,1.07],[.28,.92],[.38,.5],[.31,.14],[0,.14]].map(function(p){return new T.Vector2(p[0],p[1]);}),20);
    return cache['geo:'+name]=shared(g);
  }
  // Batch by material and 38m district. Frustum culling remains useful on a large
  // map. Visible geometry (not enlarged collision proxies) stops bullet rays.
  function Batch(group,walls){this.group=group;this.walls=walls;this.parts={};this.partsCount=0;}
  Batch.prototype.add=function(g,name,x,y,z,sx,sy,sz,rx,ry,rz){
    var T=root.THREE,obj=new T.Object3D();obj.position.set(x,y,z);obj.scale.set(sx||1,sy||1,sz||1);obj.rotation.set(rx||0,ry||0,rz||0);obj.updateMatrix();
    var key=name+':'+Math.floor(x/38)+':'+Math.floor(z/38),b=this.parts[key]||(this.parts[key]={name:name,list:[]});
    b.list.push({g:g,m:obj.matrix.clone()});this.partsCount++;
  };
  Batch.prototype.box=function(name,x,y,z,w,h,d,ry,rz){
    // World-sized wall UVs keep bricks consistent on a gate and a whole building.
    if(name==='plaster'||name==='pavers'||name==='facade'||name==='ivory'||name==='ochre'){
      var g=root.FishArt.boxGeometry(w,h,d,4);this.add(g,name,x,y,z,1,1,1,0,ry,rz);g.userData.temporary=true;
    }else this.add(primitive('box'),name,x,y,z,w,h,d,0,ry,rz);
  };
  Batch.prototype.flush=function(){
    var T=root.THREE,self=this;
    Object.keys(this.parts).forEach(function(key){
      var data=self.parts[key],ps=[],ns=[],uv=[],ids=[],v=new T.Vector3(),n=new T.Vector3();
      data.list.forEach(function(p){
        var g=p.g,a=g.attributes,offset=ps.length/3,nmat=new T.Matrix3().getNormalMatrix(p.m);
        for(var i=0;i<a.position.count;i++){
          v.fromBufferAttribute(a.position,i).applyMatrix4(p.m);ps.push(v.x,v.y,v.z);
          n.fromBufferAttribute(a.normal,i).applyMatrix3(nmat).normalize();ns.push(n.x,n.y,n.z);
          uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);
        }
        if(g.index)for(var k=0;k<g.index.count;k++)ids.push(offset+g.index.getX(k));
        else for(var j=0;j<a.position.count;j++)ids.push(offset+j);
        if(g.userData.temporary)g.dispose();
      });
      var merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(ps,3));merged.setAttribute('normal',new T.Float32BufferAttribute(ns,3));merged.setAttribute('uv',new T.Float32BufferAttribute(uv,2));merged.setIndex(ids);merged.computeBoundingSphere();
      var mesh=new T.Mesh(merged,material(data.name));mesh.name='街区/'+key;mesh.castShadow=true;mesh.receiveShadow=true;self.group.add(mesh);self.walls.push(mesh);
    });
    this.parts={};
  };
  function sign(group,text,x,y,z,turn,color,w){
    var T=root.THREE,cv=document.createElement('canvas');cv.width=512;cv.height=128;var ctx=cv.getContext('2d');
    ctx.fillStyle='#244c50';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color||'#e3c28c';ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);
    ctx.fillStyle=color||'#f8dfab';ctx.font='bold 47px Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
    var m=new T.Mesh(new T.PlaneGeometry(w||5,(w||5)/4),new T.MeshStandardMaterial({map:tex,roughness:.85}));m.position.set(x,y,z);m.rotation.y=turn||0;group.add(m);
  }
  function decorateBuilding(b,o){
    var T=root.THREE,x=o.x,z=o.z,w=o.w,d=o.d,h=o.h;
    b.box(['facade','ivory','ochre'][o.variant],x,h/2,z,w,h,d);
    // Raised cornice occupies its own height, rather than duplicating the roof face.
    b.box('cream',x,h+.15,z,w+.32,.3,d+.32);
    b.box('foot',x,.22,z,w+.13,.44,d+.13);
    [-1,1].forEach(function(side){
      b.box('cream',x, h+ .7,z+side*(d/2-.18),w,.8,.36);
      b.box('cream',x+side*(w/2-.18),h+.7,z,.36,.8,d-.72);
      for(var level=0;level<Math.floor(h/3.2);level++){
        var y=2.2+level*2.9;
        for(var u=-w/2+2;u<w/2-1;u+=3.5){
          if(level===0&&Math.abs(u)<1.5)continue;
          var zz=z+side*(d/2+.025);
          b.box('dark',x+u,y,zz,1.15,1.55,.05);
          b.box('cream',x+u,y-.85,zz+side*.05,1.5,.15,.23);
          [-1,1].forEach(function(s){b.box(o.variant===2?'wood':'teal',x+u+s*.39,y,zz+side*.06,.35,1.42,.08);});
          for(var sl=-.5;sl<=.5;sl+=.25)b.box('foot',x+u,y+sl,zz+side*.11,.95,.04,.03);
        }
        for(var v=-d/2+2;v<d/2-1;v+=3.6){
          var xx=x+side*(w/2+.03);
          b.box('teal',xx,y,z+v,.08,1.45,1.05);b.box('cream',xx,y-.82,z+v,.25,.14,1.4);
          for(var bar=-.45;bar<.55;bar+=.24)b.box('dark',xx+side*.05,y,z+v+bar,.03,1.3,.035);
        }
      }
      var doorZ=z+side*(d/2+.04);
      b.box('dark',x,1.28,doorZ,1.9,2.56,.08);
      b.box('wood',x,1.22,doorZ+side*.06,1.6,2.4,.08);
      for(var slat=-.6;slat<=.7;slat+=.2)b.box('foot',x+slat,1.22,doorZ+side*.11,.035,2.3,.03);
      b.box('cream',x,2.65,doorZ,2.15,.22,.24);
      [-1,1].forEach(function(edge){b.box('cream',x+edge*.99,1.3,doorZ,.18,2.6,.23);});
      b.box('iron',x+.48,1.1,doorZ+side*.16,.11,.2,.09);
      // Masonry corner quoins are inset into the solid volume, with no top overlap.
      for(var yy=.7;yy<h-.4;yy+=.66){
        b.box('cream',x+side*(w/2-.38),yy,z-d/2-.04,.72,.28,.12);
        b.box('cream',x+side*(w/2-.38),yy,z+d/2+.04,.72,.28,.12);
      }
    });
    if(o.variant===1){
      var radius=Math.min(w,d)*.28;
      b.add(primitive('cylinder'),'cream',x,h+.85,z,radius+.24,.6,radius+.24);
      b.add(primitive('dome'),'teal',x,h+1.15,z,radius,radius*.85,radius);
      b.add(primitive('cylinder'),'iron',x,h+1.4+radius*.85,z,.05,.6,.05);
    }else{
      b.box('plaster',x+w*.2,h+.8,z,2.7,1.3,3);
      b.box('cream',x+w*.2,h+1.51,z,2.9,.12,3.2);
    }
  }
  function crateDetails(b,c){
    b.box('crate',c.x,c.y,c.z,c.w,c.h,c.d);
    [-1,1].forEach(function(f){
      [-1,1].forEach(function(k){
        b.box('wood',c.x+k*(c.w/2-.12),c.y,c.z+f*(c.d/2+.035),.19,c.h,.07);
        b.box('wood',c.x,c.y+k*(c.h/2-.12),c.z+f*(c.d/2+.035),c.w,.19,.07);
        b.box('iron',c.x+k*c.w*.28,c.y+c.h/2+.025,c.z,.11,.05,c.d);
      });
      b.box('wood',c.x,c.y,c.z+f*(c.d/2+.08),Math.hypot(c.w,c.h)*.85,.13,.09,0,Math.atan2(c.h,c.w));
    });
  }
  function archArt(b,a){
    var T=root.THREE,r=a.opening/2,shape=new T.Shape();
    shape.moveTo(-r,a.h);shape.lineTo(r,a.h);shape.lineTo(r,2.7);
    for(var i=0;i<=24;i++){var x=r-a.opening*i/24;shape.lineTo(x,2.7+Math.sqrt(Math.max(0,r*r-x*x))*.62);}
    shape.closePath();var g=new T.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false,curveSegments:12});g.userData.temporary=true;
    var uv=g.attributes.uv;for(var u=0;u<uv.count;u++)uv.setXY(u,uv.getX(u)/4,uv.getY(u)/4);
    b.add(g,'plaster',a.x,0,a.z-.6);
    // Individual voussoirs on each face explain the arch structure at eye level.
    for(var j=0;j<=18;j++){
      var ang=j*Math.PI/18,xx=Math.cos(ang)*(r+.18),yy=2.7+Math.sin(ang)*(r*.62+.18);
      [-1,1].forEach(function(f){b.box('cream',a.x+xx,yy,a.z+f*.65,.42,.38,.13,0,ang-Math.PI/2);});
    }
    b.box('cream',a.x,a.h+.13,a.z,a.w+.2,.26,1.5);
  }
  function fountain(b,x,z){
    b.box('cream',x,.45,z,4.2,.9,4.2);b.box('water',x,.92,z,3.6,.035,3.6);
    b.add(primitive('cylinder'),'cream',x,1.22,z,.5,.6,.5);
    b.add(primitive('cylinder'),'teal',x,1.55,z,1,.12,1);
    b.add(primitive('cylinder'),'cream',x,1.85,z,.16,.6,.16);
  }
  function* buildSteps(scene,obstacles,wallMeshes,map){
    var T=root.THREE,group=new T.Group();group.name='FPS/沙海双城';scene.add(group);
    var b=new Batch(group,wallMeshes);
    var ground=new T.Mesh(new T.PlaneGeometry(250,250),root.FishArt.material('sand'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;group.add(ground);wallMeshes.push(ground);
    map.solids.forEach(function(s){
      obstacles.push({mesh:{name:s.name},min:new T.Vector3(s.min.x,s.min.y,s.min.z),max:new T.Vector3(s.max.x,s.max.y,s.max.z),mapId:map.id});
      if(s.kind==='stone'||s.kind==='roof')b.box('plaster',s.x,s.y,s.z,s.w,s.h,s.d);
      if(s.kind==='door'){
        b.box('wood',s.x,s.y,s.z,s.w,s.h,s.d);
        [.5,1.5,2.5].forEach(function(y){b.box('iron',s.x,y,s.z+.27,s.w,.12,.05);b.box('iron',s.x,y,s.z-.27,s.w,.12,.05);});
      }
      if(s.kind==='fountain')fountain(b,s.x,s.z);
    });
    b.flush();yield {progress:28,label:'搭建 152 米双区战场与部署区'};
    map.buildings.forEach(function(o){decorateBuilding(b,o);});
    map.arches.forEach(function(a){archArt(b,a);});
    map.crates.forEach(function(c){crateDetails(b,c);});
    b.flush();yield {progress:46,label:'连接长街、中门、商旅通道与侧巷'};
    // Paving ribbons and tiled courts sit above sand, never coplanar with it.
    [-1,1].forEach(function(f){
      b.box('pavers',0,.015,46*f,124,.03,5.5);
      b.box('pavers',0,.016,16*f,125,.032,5.5);
      b.box('pavers',0,.018,34*f,22,.036,22);
      b.box('pavers',0,.014,67*f,37,.028,12);
      // Hanging teal awnings, timber rafters and brass lanterns in the B passage.
      for(var k=0;k<5;k++){
        var z=(21+k*4.5)*f;
        b.box('wood',50,3.32,z,13,.15,.18);
        [-1,1].forEach(function(side){
          var x=50+side*6.1;
          b.box('iron',x,2.8,z,.07,.6,.07);b.box('iron',x,2.51,z,.3,.06,.3);
          b.box('lamp',x,2.75,z,.21,.4,.21);b.box('iron',x,2.98,z,.3,.08,.3);
        });
      }
      // Shop fronts are tucked against buildings, outside movement corridors.
      [-1,1].forEach(function(side){
        var x=side<0?-39:38,zz=7*f;
        b.box('wood',x,.6,zz,1.1,1.2,4.2);
        b.box('cloth',x,2.7,zz,2.3,.09,4.8);
        for(var q=-1;q<=1;q++)b.add(primitive('pot'),q%2?'teal':'terra',x,1.2,zz+q*1.2,.65,.65,.65);
      });
      // Broad approach awnings give each courtyard a recognizable silhouette.
      for(var a=0;a<4;a++)b.box(a%2?'cream':'cloth',-50+(a-1.5)*2,5.1,46*f,1.98,.075,4.6);
      [-54,-46].forEach(function(x){b.box('wood',x,3,46*f,.16,6,.16);});
    });
    b.box('pavers',-52,.012,0,25,.024,28);b.box('pavers',50,.012,0,25,.024,28);b.box('pavers',0,.012,0,21,.024,24);
    // Set dressing along protected edges, never invisible collision clutter.
    map.buildings.forEach(function(o,i){
      if(i%2)return;var x=o.x-o.w/2+.8,z=o.z+o.d/2+.48;
      for(var k=0;k<3;k++)b.add(primitive('pot'),k===1?'teal':'terra',x+k*.82,0,z,.6,.8+(k%2)*.25,.6);
    });
    // Distance skyline uses the same batched stone vocabulary, outside boundaries.
    for(var k2=0;k2<12;k2++){
      var xx=-100+k2*18,hh=9+(k2%4)*3;
      [-1,1].forEach(function(f){b.box('plaster',xx,hh/2,94*f,15,hh,17);b.box('cream',xx,hh+.2,94*f,15.3,.4,17.3);});
    }
    b.flush();yield {progress:62,label:'制作砂岩街区、青绿圆顶与商铺细节'};
    map.palms.forEach(function(p){var tree=root.FishArt.palm(p.x,p.z,false);group.add(tree);wallMeshes.push(tree.userData.trunk,tree.userData.leaves);});
    // Light, distant cloud clusters add a skyline without expensive transparent
    // layers or per-frame animation. They are neither colliders nor ray targets.
    var cloudGeo=cache.cloudGeo||(cache.cloudGeo=shared(new T.SphereGeometry(1,10,6)));
    var cloudMat=cache.cloudMat||(cache.cloudMat=shared(new T.MeshBasicMaterial({color:0xf6ebd7})));
    var clouds=new T.InstancedMesh(cloudGeo,cloudMat,32),dummy=new T.Object3D();clouds.name='远景/积云';
    for(var ci=0;ci<32;ci++){
      var cluster=Math.floor(ci/4),angle=cluster*Math.PI/4,lump=ci%4;
      dummy.position.set(Math.cos(angle)*145+lump*5,48+(cluster%3)*8+Math.sin(lump*1.5)*2,Math.sin(angle)*145);
      dummy.scale.set(7+lump,2.3+Math.sin(lump),4);dummy.updateMatrix();clouds.setMatrixAt(ci,dummy.matrix);
    }
    clouds.computeBoundingSphere();group.add(clouds);
    map.zones.forEach(function(z){
      [-1,1].forEach(function(f){sign(group,z.short+'  /  '+(z.short==='A'?'长街':z.short==='B'?'商旅庭院':'中央门廊'),z.x,z.short==='MID'?6.25:6.85,(z.short==='MID'?0:18*f)+f*.73,f>0?0:Math.PI,null,z.short==='MID'?5.5:7);});
    });
    [-1,1].forEach(function(f){
      sign(group,'A  ←   中门   →  B',0,7.35,59.73*f,f>0?0:Math.PI,null,8);
    });
    group.userData.modelParts=b.partsCount;map.modelParts=b.partsCount;
    yield {progress:76,label:'整理分区碰撞、战术路线与地图标记'};
  }
  var api={createLayout:createLayout,buildSteps:buildSteps};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishFpsMap=api;
})(typeof window!=='undefined'?window:globalThis);
