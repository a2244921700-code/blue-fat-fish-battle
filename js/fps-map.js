/* 沙海双城 — an original FPS arena inspired by desert-city long/mid/tunnel routes.
 * Layout is pure data, independent of Three.js. Endless never builds this map.
 * Units: metres. Y=feet, south/red=+Z, north/blue=-Z.
 */
(function(root){
  'use strict';
  var Layout=root.FishFpsLayout;
  if(typeof module==='object'&&module.exports)Layout=require('./fps-layout.js');
  function createLayout(){return (Layout||root.FishFpsLayout).create();}
  function gateTop(leaf,u){var closedX=leaf.radius-.07-u;return leaf.spring+Math.sqrt(Math.max(0,leaf.radius*leaf.radius-closedX*closedX))*leaf.rise-.075;}
  function gatePoint(leaf,u,y,depth){var x=leaf.side*u,c=Math.cos(leaf.angle),s=Math.sin(leaf.angle);return {x:leaf.x+x*c+depth*s,y:(leaf.y||0)+y,z:leaf.z-x*s+depth*c};}
  var cache={};
  function shared(o){o.userData=o.userData||{};o.userData.artShared=true;if(root.FishRenderStyle)root.FishRenderStyle.material(o);return o;}
  function material(name){
    if(cache[name])return cache[name];var T=root.THREE,p={roughness:.91,vertexColors:true,envMapIntensity:.12};
    var kinds={plaster:'stone',stone:'stone',pavers:'paving',facade:'plaster',ivory:'plaster',ochre:'plaster',wood:'wood',tile:'tile',cloth:'cloth',sand:'sand'};
    if(kinds[name]){p.map=root.FishFpsDetail.texture(kinds[name]);p.bumpMap=p.map;p.bumpScale=name==='plaster'||name==='stone'?.065:name==='pavers'?.045:.025;}
    if(name==='crate')p.map=root.FishArt.material('crate').map;
    var colors={plaster:0xfff9ed,stone:0xfff1dc,pavers:0xf5efe4,facade:0xffffff,ivory:0xfff8ed,ochre:0xf4ddbd,cream:0xf2e5d1,foot:0x9e978a,teal:0x387b79,dark:0x203839,wood:0xf5e5d1,iron:0x354446,terra:0xb67155,cloth:0xffffff,coral:0xb96346,crate:0xffffff,water:0x397d85,bronze:0xaf8b50,tile:0xffffff,sand:0xffffff};
    p.color=colors[name]||0xe3ccaa;
    if(name==='iron'||name==='bronze'){p.metalness=.55;p.roughness=.47;}
    if(name==='teal'||name==='tile'){p.roughness=.44;p.metalness=.08;}
    if(name==='water'){p.metalness=.22;p.roughness=.23;}
    if(name==='cloth')p.side=T.DoubleSide;
    if(name==='lamp'){p.color=0xffd98b;p.emissive=0xffad51;p.emissiveIntensity=1.2;}
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
    var T=root.THREE,obj=new T.Object3D();y+=this.offsetY||0;obj.position.set(x,y,z);obj.scale.set(sx||1,sy||1,sz||1);obj.rotation.set(rx||0,ry||0,rz||0);obj.updateMatrix();
    if(this.frame){obj.matrix.premultiply(this.frame);x=obj.matrix.elements[12];z=obj.matrix.elements[14];}
    var key=name+':'+Math.floor(x/38)+':'+Math.floor(z/38),b=this.parts[key]||(this.parts[key]={name:name,list:[]});
    b.list.push({g:g,m:obj.matrix.clone()});this.partsCount++;
  };
  Batch.prototype.box=function(name,x,y,z,w,h,d,ry,rz){
    // World-sized wall UVs keep bricks consistent on a gate and a whole building.
    if(['plaster','stone','pavers','facade','ivory','ochre','wood','tile','sand'].indexOf(name)>=0){
      var g=root.FishArt.boxGeometry(w,h,d,name==='wood'?2:name==='tile'?1:4);this.add(g,name,x,y,z,1,1,1,0,ry,rz);g.userData.temporary=true;
    }else this.add(primitive('box'),name,x,y,z,w,h,d,0,ry,rz);
  };
  Batch.prototype.beam=function(name,a,b,r){
    var T=root.THREE,v=new T.Vector3().subVectors(b,a),o=new T.Object3D();o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());o.scale.set(r,v.length(),r);o.position.y+=this.offsetY||0;o.updateMatrix();
    if(this.frame){o.matrix.premultiply(this.frame);o.position.setFromMatrixPosition(o.matrix);}
    var key=name+':'+Math.floor(o.position.x/38)+':'+Math.floor(o.position.z/38),bucket=this.parts[key]||(this.parts[key]={name:name,list:[]});bucket.list.push({g:primitive('cylinder'),m:o.matrix.clone()});this.partsCount++;
  };
  Batch.prototype.flush=function(){
    var T=root.THREE,self=this;
    Object.keys(this.parts).forEach(function(key){
      var data=self.parts[key],ps=[],ns=[],uv=[],colors=[],ids=[],v=new T.Vector3(),n=new T.Vector3();
      data.list.forEach(function(p){
        var g=p.g,a=g.attributes,offset=ps.length/3,nmat=new T.Matrix3().getNormalMatrix(p.m);
        for(var i=0;i<a.position.count;i++){
          v.fromBufferAttribute(a.position,i).applyMatrix4(p.m);ps.push(v.x,v.y,v.z);
          n.fromBufferAttribute(a.normal,i).applyMatrix3(nmat).normalize();ns.push(n.x,n.y,n.z);
          uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);colors.push(a.color?a.color.getX(i):1,a.color?a.color.getY(i):1,a.color?a.color.getZ(i):1);
        }
        if(g.index)for(var k=0;k<g.index.count;k++)ids.push(offset+g.index.getX(k));
        else for(var j=0;j<a.position.count;j++)ids.push(offset+j);
        if(g.userData.temporary)g.dispose();
      });
      var merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(ps,3));merged.setAttribute('normal',new T.Float32BufferAttribute(ns,3));merged.setAttribute('uv',new T.Float32BufferAttribute(uv,2));merged.setAttribute('color',new T.Float32BufferAttribute(colors,3));merged.setIndex(ids);merged.computeBoundingSphere();
      var mesh=new T.Mesh(merged,material(data.name));mesh.name='街区/'+key;mesh.castShadow=true;mesh.receiveShadow=true;self.group.add(mesh);self.walls.push(mesh);
    });
    this.parts={};
  };
  function sign(group,text,x,y,z,turn,color,w){
    var T=root.THREE,cv=document.createElement('canvas');cv.width=512;cv.height=128;var ctx=cv.getContext('2d');
    ctx.fillStyle='#244c50';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color||'#e3c28c';ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);
    ctx.fillStyle=color||'#f8dfab';ctx.font='bold 47px Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
    var m=new T.Mesh(new T.PlaneGeometry(w||5,(w||5)/4),new T.MeshStandardMaterial({map:tex,roughness:.85}));m.position.set(x,y,z);m.rotation.y=turn||0;
    m.name='调试路标/'+text;m.userData.debugMapSign=true;m.visible=false;group.add(m);
  }
  function setDebugVisible(scene,visible){
    if(scene)scene.traverse(function(o){if(o.userData.debugMapSign)o.visible=!!visible;});
  }
  function shellGeometry(face,source){
    var T=root.THREE,r=face.rect,ps=[],ns=[],uv=[],colors=[];
    [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].forEach(function(p){
      var v={x:0,y:0,z:0};v[face.axis]=face.plane;v[face.u]=p[0];v[face.v]=p[1];ps.push(v.x,v.y,v.z);
      var n={x:0,y:0,z:0};n[face.axis]=face.side;ns.push(n.x,n.y,n.z);
      // Brick courses stay horizontal on both wall orientations. Face winding
      // axes are not UV axes (the X wall's first winding axis is vertical).
      if(face.axis==='y')uv.push(v.x/4,v.z/4);else uv.push((face.axis==='x'?v.z:v.x)/4,v.y/4);
      var level=source&&source.h?Math.max(0,Math.min(1,(v.y-source.min.y)/source.h)):1;
      var shade=face.axis==='y'&&face.side<0?.72:.81+.19*Math.min(1,level*3);colors.push(shade,shade,shade);
    });
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(face.side>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.userData.temporary=true;return g;
  }
  function architecturalShell(b,map){
    var solids=map.solids.filter(function(s){return s.kind==='building'||s.kind==='stone'||s.kind==='roof'||s.kind==='terrain';});
    var faces=root.FishMapSurfaces.exposedFaces(solids);map.shellFaceCount=faces.length;
    faces.forEach(function(f){var s=solids[f.source],name=s.kind==='building'?['facade','ivory','ochre'][s.variant]:s.kind==='terrain'&&f.axis==='y'&&f.side>0?'pavers':'plaster';
      // Geometry is in world space; use the source district key for culling.
      var g=shellGeometry(f,s);g.translate(-s.x,-s.y,-s.z);b.add(g,name,s.x,s.y,s.z);
    });
  }
  function paving(b,rects){
    root.FishMapSurfaces.unionRectangles(rects).forEach(function(r){var cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;
      var g=shellGeometry({axis:'y',u:'z',v:'x',side:1,plane:.028,rect:[r[1],r[0],r[3],r[2]]});g.translate(-cx,0,-cz);b.add(g,'pavers',cx,0,cz);
    });
  }
  function crateDetails(b,c){
    b.box('crate',c.x,c.y,c.z,c.w,c.h,c.d);
    [-1,1].forEach(function(f){
      [-1,1].forEach(function(k){
        b.box('wood',c.x+k*(c.w/2-.12),c.y,c.z+f*(c.d/2+.035),.19,c.h,.07);
        b.box('wood',c.x,c.y+k*(c.h/2-.12),c.z+f*(c.d/2+.035),c.w-.43,.19,.07);

      });
      b.box('wood',c.x,c.y,c.z+f*(c.d/2+.08),Math.hypot(c.w,c.h)*.85,.13,.09,0,Math.atan2(c.h,c.w));
    });
    [-1,1].forEach(function(k){b.box('iron',c.x+k*c.w*.28,c.y+c.h/2+.035,c.z,.11,.07,c.d);});
  }
  function archArt(b,a){
    var T=root.THREE,r=a.opening/2,shape=new T.Shape(),spring=a.spring||2.7,rise=a.rise||.62,previous=b.frame,oldY=b.offsetY,frame=new T.Object3D();
    frame.position.set(a.x,a.y||0,a.z);frame.rotation.y=a.turn||0;frame.updateMatrix();b.frame=frame.matrix;b.offsetY=0;a=Object.assign({},a,{x:0,y:0,z:0});
    shape.moveTo(-r,a.h);shape.lineTo(r,a.h);shape.lineTo(r,spring);
    for(var i=0;i<=24;i++){var x=r-a.opening*i/24;shape.lineTo(x,spring+Math.sqrt(Math.max(0,r*r-x*x))*rise);}
    shape.closePath();var g=new T.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false,curveSegments:12});g.userData.temporary=true;
    var uv=g.attributes.uv;for(var u=0;u<uv.count;u++)uv.setXY(u,uv.getX(u)/4,uv.getY(u)/4);
    b.add(g,'plaster',a.x,0,a.z-.6);
    // Beveled, curved wedge stones follow the actual opening, with visible joints.
    for(var j=0;j<20;j++){
      var lo=j*Math.PI/20+.008,hi=(j+1)*Math.PI/20-.008,shape2=new T.Shape();
      for(var q=0;q<=4;q++){var t=lo+(hi-lo)*q/4,xx=Math.cos(t)*(r+.37),yy=spring+Math.sin(t)*(r*rise+.37);if(q)shape2.lineTo(xx,yy);else shape2.moveTo(xx,yy);}
      for(var q2=4;q2>=0;q2--){var t2=lo+(hi-lo)*q2/4;shape2.lineTo(Math.cos(t2)*(r+.025),spring+Math.sin(t2)*(r*rise+.025));}shape2.closePath();
      [-1,1].forEach(function(f){var wedge=new T.ExtrudeGeometry(shape2,{depth:.17,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1,curveSegments:4});wedge.userData.temporary=true;b.add(wedge,j%4?'cream':'stone',a.x,0,a.z+(f>0?.61:-.78));});
    }
    [-1,1].forEach(function(side){
      var xx=a.x+side*(r+.22);
      for(var yy=.3;yy<spring+.1;yy+=.46)b.box('cream',xx,yy,a.z,.43,.40,1.38);
      b.box('cream',xx,spring+.02,a.z,.65,.18,1.6);
      [-1,1].forEach(function(f){root.FishFpsDetail.lantern(b,a.x+side*(r+1.05),spring+.52,a.z+f*.95,.82);});
    });
    b.box('cream',a.x,a.h+.14,a.z,a.w+.2,.28,1.5);
    [-1,1].forEach(function(f){b.box('tile',a.x,a.h-.43,a.z+f*.635,a.w-.18,.24,.07);});
    b.frame=previous;b.offsetY=oldY;
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
    var groundGeo=new T.PlaneGeometry(250,250),guv=groundGeo.attributes.uv;
    for(var u=0;u<guv.count;u++)guv.setXY(u,guv.getX(u)*45,guv.getY(u)*45);
    var groundMat=material('sand').clone();groundMat.vertexColors=false;groundMat.userData.artShared=false;
    var ground=new T.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;group.add(ground);wallMeshes.push(ground);
    map.solids.forEach(function(s){
      obstacles.push({mesh:{name:s.name},min:new T.Vector3(s.min.x,s.min.y,s.min.z),max:new T.Vector3(s.max.x,s.max.y,s.max.z),mapId:map.id,kind:s.kind});

      if(s.kind==='door'){
        b.box('wood',s.x,s.y,s.z,s.w,s.h,s.d);
        [.5,1.5,2.5].forEach(function(y){b.box('iron',s.x,y,s.z+.27,s.w,.12,.05);b.box('iron',s.x,y,s.z-.27,s.w,.12,.05);});
      }
      if(s.kind==='fountain')fountain(b,s.x,s.z);
    });
    architecturalShell(b,map);
    b.flush();yield {progress:28,label:'裁剪建筑交界面，搭建 152 米双区战场'};
    for(var bi=0;bi<map.buildings.length;bi++){b.offsetY=map.buildings[bi].min.y;root.FishFpsDetail.building(b,map.buildings[bi],map);b.offsetY=0;if(bi%6===5)yield {progress:30+bi*.5,label:'制作立体窗框、木阳台与屋顶轮廓'};}
    map.arches.forEach(function(a){archArt(b,a);});
    map.gates.forEach(function(leaf){root.FishFpsDetail.gate(b,leaf,gateTop,gatePoint);});
    map.crates.forEach(function(c){crateDetails(b,c);});
    b.flush();yield {progress:46,label:'连接长街、中门、商旅通道与侧巷'};
    var pavingRects=map.surfaces.filter(function(s){return s.y===0&&s.kind!=='ramp';}).map(function(s){return [s.x0,s.z0,s.x1,s.z1];});
    paving(b,pavingRects);root.FishFpsDetail.street(b,map);
    b.flush();yield {progress:62,label:'布置织物棚、灯笼、货车、陶器与城外天际线'};
    map.palms.forEach(function(p){var tree=root.FishArt.palm(p.x,p.z,false);group.add(tree);wallMeshes.push(tree.userData.trunk,tree.userData.leaves);});
    // Light, distant cloud clusters add a skyline without expensive transparent
    // layers or per-frame animation. They are neither colliders nor ray targets.
    var cloudGeo=cache.cloudGeo||(cache.cloudGeo=shared(new T.SphereGeometry(1,16,10)));
    var cloudMat=cache.cloudMat||(cache.cloudMat=shared(new T.MeshStandardMaterial({color:0xf4f1e5,roughness:1,envMapIntensity:.15})));
    var clouds=new T.InstancedMesh(cloudGeo,cloudMat,32),dummy=new T.Object3D();clouds.name='远景/积云';
    for(var ci=0;ci<32;ci++){
      var cluster=Math.floor(ci/4),angle=cluster*Math.PI/4,lump=ci%4;
      dummy.position.set(Math.cos(angle)*145+lump*5,48+(cluster%3)*8+Math.sin(lump*1.5)*2,Math.sin(angle)*145);
      dummy.scale.set(7+lump,2.3+Math.sin(lump),4);dummy.updateMatrix();clouds.setMatrixAt(ci,dummy.matrix);
    }
    clouds.computeBoundingSphere();group.add(clouds);
    map.signs.forEach(function(s){sign(group,s.text,s.x,s.y,s.z,s.turn||0,null,s.w);});
    group.userData.modelParts=b.partsCount;map.modelParts=b.partsCount;
    yield {progress:76,label:'整理分区碰撞、战术路线与地图标记'};
  }
  function applyLighting(scene,hemi,sun,renderer){
    var T=root.THREE;
    if(!cache.sky){
      var c=document.createElement('canvas');c.width=4;c.height=512;var ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
      gradient.addColorStop(0,'#3287bd');gradient.addColorStop(.44,'#91c7df');gradient.addColorStop(.8,'#d8dbcc');gradient.addColorStop(1,'#ebd2ac');ctx.fillStyle=gradient;ctx.fillRect(0,0,4,512);
      cache.sky=shared(new T.CanvasTexture(c));cache.sky.colorSpace=T.SRGBColorSpace;
    }
    scene.background=cache.sky;scene.fog.color.setHex(0xd6c6b0);scene.fog.near=74;scene.fog.far=240;
    hemi.color.setHex(0xa3c7f0);hemi.groundColor.setHex(0x6b8ca5);hemi.intensity=1.05;
    sun.position.set(-65,60,38);sun.color.setHex(0xffdfb4);sun.intensity=2.7;
    sun.shadow.mapSize.set(4096,4096);
    var csh=sun.shadow.camera;csh.left=-112;csh.right=112;csh.top=105;csh.bottom=-105;csh.near=1;csh.far=255;csh.updateProjectionMatrix();
    sun.shadow.bias=-.00012;sun.shadow.normalBias=.035;sun.shadow.radius=2;
    if(renderer)renderer.toneMappingExposure=1.02;
  }
  var api={createLayout:createLayout,buildSteps:buildSteps,applyLighting:applyLighting,setDebugVisible:setDebugVisible,gateTop:gateTop,gatePoint:gatePoint};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishFpsMap=api;
})(typeof window!=='undefined'?window:globalThis);
