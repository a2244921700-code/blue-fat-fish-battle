/* 沙海双城 — an original FPS arena inspired by desert-city long/mid/tunnel routes.
 * Layout is pure data, independent of Three.js. Endless never builds this map.
 * Units: metres. Y=feet, south/red=+Z, north/blue=-Z.
 */
(function(root){
  'use strict';
  function createLayout(){
    var map={id:'sand-twin-courts',name:'沙海双城',half:76,limit:75,solids:[],buildings:[],arches:[],crates:[],palms:[],props:[],gates:[],
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
      solid('商旅通道顶棚',50,3.65,30*f,14,0.5,22.8,'roof');
      arch(50,18*f,14,10,7.8);arch(50,42*f,14,10,7.8);
      arch(-52,18*f,26,10,7.8);
      // Street props have matching solid footprints and leave tactical lanes open.
      [{type:'cart',x:-62,z:32*f,w:2.02,d:3.45,h:1.55},{type:'barrels',x:-21.5,z:29*f,w:1.55,d:1.35,h:1.25},{type:'barrels',x:62,z:5*f,w:1.55,d:1.35,h:1.25}].forEach(function(p){map.props.push(p);solid('商旅陈设/'+p.type,p.x,p.h/2,p.z,p.w,p.h,p.d,'prop');if(p.type==='cart')[-1,1].forEach(function(s){solid('货车车辕',p.x+s*.55,.72,p.z+2,.09,.12,1.5,'prop');});});
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
    [-1,1].forEach(function(side){
      // Both leaves share the opening's elliptical profile. The west leaf swings
      // south and the east leaf north, leaving a wide central passage.
      var leaf={name:side<0?'中门西扇':'中门东扇',x:side*4.43,z:0,side:-side,width:4.39,radius:4.5,spring:2.7,rise:.62,angle:-Math.PI*62/180,thickness:.24};map.gates.push(leaf);
      for(var i=0;i<20;i++){
        var u0=i*leaf.width/20,u1=(i+1)*leaf.width/20,a=gatePoint(leaf,u0,0,0),b=gatePoint(leaf,u1,0,0);
        var dx=Math.abs(Math.sin(leaf.angle))*leaf.thickness/2,dz=Math.abs(Math.cos(leaf.angle))*leaf.thickness/2;
        var top=Math.max(gateTop(leaf,u0),gateTop(leaf,u1));
        solid(leaf.name+'/门板', (a.x+b.x)/2,top/2,(a.z+b.z)/2,Math.abs(a.x-b.x)+dx*2,top,Math.abs(a.z-b.z)+dz*2,'gate');
      }
    });
    // Staggered cover breaks the long street sightline without sealing the lane.
    crate(-58,1,3.4,3,2.3);crate(-50,-7,2,2,1.1);
    crate(52,-2,4,3.6,2.2);crate(45,6,2,2,1.1);
    return map;
  }
  function gateTop(leaf,u){var closedX=Math.abs(leaf.x)-u;return leaf.spring+Math.sqrt(Math.max(0,leaf.radius*leaf.radius-closedX*closedX))*leaf.rise-.075;}
  function gatePoint(leaf,u,y,depth){var x=leaf.side*u,c=Math.cos(leaf.angle),s=Math.sin(leaf.angle);return {x:leaf.x+x*c+depth*s,y:y,z:leaf.z-x*s+depth*c};}
  var cache={};
  function shared(o){o.userData=o.userData||{};o.userData.artShared=true;return o;}
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
    var T=root.THREE,obj=new T.Object3D();obj.position.set(x,y,z);obj.scale.set(sx||1,sy||1,sz||1);obj.rotation.set(rx||0,ry||0,rz||0);obj.updateMatrix();
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
    var T=root.THREE,v=new T.Vector3().subVectors(b,a),o=new T.Object3D();o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());o.scale.set(r,v.length(),r);o.updateMatrix();
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
    var m=new T.Mesh(new T.PlaneGeometry(w||5,(w||5)/4),new T.MeshStandardMaterial({map:tex,roughness:.85}));m.position.set(x,y,z);m.rotation.y=turn||0;group.add(m);
  }
  function shellGeometry(face,source){
    var T=root.THREE,r=face.rect,ps=[],ns=[],uv=[],colors=[];
    [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].forEach(function(p){
      var v={x:0,y:0,z:0};v[face.axis]=face.plane;v[face.u]=p[0];v[face.v]=p[1];ps.push(v.x,v.y,v.z);
      var n={x:0,y:0,z:0};n[face.axis]=face.side;ns.push(n.x,n.y,n.z);uv.push(p[0]/4,p[1]/4);
      var level=source&&source.h?Math.max(0,Math.min(1,(v.y-source.min.y)/source.h)):1;
      var shade=face.axis==='y'&&face.side<0?.72:.81+.19*Math.min(1,level*3);colors.push(shade,shade,shade);
    });
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(face.side>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.userData.temporary=true;return g;
  }
  function architecturalShell(b,map){
    var solids=map.solids.filter(function(s){return s.kind==='building'||s.kind==='stone'||s.kind==='roof';});
    var faces=root.FishMapSurfaces.exposedFaces(solids);map.shellFaceCount=faces.length;
    faces.forEach(function(f){var s=solids[f.source],name=s.kind==='building'?['facade','ivory','ochre'][s.variant]:'plaster';
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
    var T=root.THREE,r=a.opening/2,shape=new T.Shape();
    shape.moveTo(-r,a.h);shape.lineTo(r,a.h);shape.lineTo(r,2.7);
    for(var i=0;i<=24;i++){var x=r-a.opening*i/24;shape.lineTo(x,2.7+Math.sqrt(Math.max(0,r*r-x*x))*.62);}
    shape.closePath();var g=new T.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false,curveSegments:12});g.userData.temporary=true;
    var uv=g.attributes.uv;for(var u=0;u<uv.count;u++)uv.setXY(u,uv.getX(u)/4,uv.getY(u)/4);
    b.add(g,'plaster',a.x,0,a.z-.6);
    // Beveled, curved wedge stones follow the actual opening, with visible joints.
    for(var j=0;j<20;j++){
      var lo=j*Math.PI/20+.008,hi=(j+1)*Math.PI/20-.008,shape2=new T.Shape();
      for(var q=0;q<=4;q++){var t=lo+(hi-lo)*q/4,xx=Math.cos(t)*(r+.37),yy=2.7+Math.sin(t)*(r*.62+.37);if(q)shape2.lineTo(xx,yy);else shape2.moveTo(xx,yy);}
      for(var q2=4;q2>=0;q2--){var t2=lo+(hi-lo)*q2/4;shape2.lineTo(Math.cos(t2)*(r+.025),2.7+Math.sin(t2)*(r*.62+.025));}shape2.closePath();
      [-1,1].forEach(function(f){var wedge=new T.ExtrudeGeometry(shape2,{depth:.17,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1,curveSegments:4});wedge.userData.temporary=true;b.add(wedge,j%4?'cream':'stone',a.x,0,a.z+(f>0?.61:-.78));});
    }
    [-1,1].forEach(function(side){
      var xx=a.x+side*(r+.22);
      for(var yy=.3;yy<2.8;yy+=.46)b.box('cream',xx,yy,a.z,.43,.40,1.38);
      b.box('cream',xx,2.72,a.z,.65,.18,1.6);
      [-1,1].forEach(function(f){root.FishFpsDetail.lantern(b,a.x+side*(r+1.05),3.22,a.z+f*.95,.82);});
    });
    b.box('cream',a.x,a.h+.14,a.z,a.w+.2,.28,1.5);
    [-1,1].forEach(function(f){b.box('tile',a.x,a.h-.43,a.z+f*.635,a.w-.18,.24,.07);});
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
      obstacles.push({mesh:{name:s.name},min:new T.Vector3(s.min.x,s.min.y,s.min.z),max:new T.Vector3(s.max.x,s.max.y,s.max.z),mapId:map.id});

      if(s.kind==='door'){
        b.box('wood',s.x,s.y,s.z,s.w,s.h,s.d);
        [.5,1.5,2.5].forEach(function(y){b.box('iron',s.x,y,s.z+.27,s.w,.12,.05);b.box('iron',s.x,y,s.z-.27,s.w,.12,.05);});
      }
      if(s.kind==='fountain')fountain(b,s.x,s.z);
    });
    architecturalShell(b,map);
    b.flush();yield {progress:28,label:'裁剪建筑交界面，搭建 152 米双区战场'};
    for(var bi=0;bi<map.buildings.length;bi++){root.FishFpsDetail.building(b,map.buildings[bi],map);if(bi%6===5)yield {progress:30+bi*.5,label:'制作立体窗框、木阳台与屋顶轮廓'};}
    map.arches.forEach(function(a){archArt(b,a);});
    map.gates.forEach(function(leaf){root.FishFpsDetail.gate(b,leaf,gateTop,gatePoint);});
    map.crates.forEach(function(c){crateDetails(b,c);});
    b.flush();yield {progress:46,label:'连接长街、中门、商旅通道与侧巷'};
    var pavingRects=[];
    function paved(x,z,w,d){pavingRects.push([x-w/2,z-d/2,x+w/2,z+d/2]);}
    [-1,1].forEach(function(f){paved(0,46*f,124,5.5);paved(0,16*f,125,5.5);paved(0,34*f,22,22);paved(0,67*f,37,12);paved(50,30*f,13.8,22.8);});
    paved(-52,0,25,28);paved(50,0,25,28);paved(0,0,21,24);paving(b,pavingRects);
    root.FishFpsDetail.street(b,map);
    [-1,1].forEach(function(f){[-54,-46].forEach(function(x){b.box('wood',x,3,46*f,.16,6,.16);});});
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
    map.zones.forEach(function(z){
      [-1,1].forEach(function(f){sign(group,z.short+'  /  '+(z.short==='A'?'长街':z.short==='B'?'商旅庭院':'中央门廊'),z.x,z.short==='MID'?6.25:6.85,(z.short==='MID'?0:18*f)+f*.73,f>0?0:Math.PI,null,z.short==='MID'?5.5:7);});
    });
    [-1,1].forEach(function(f){
      sign(group,'A  ←   中门   →  B',0,7.35,59.73*f,f>0?0:Math.PI,null,8);
    });
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
  var api={createLayout:createLayout,buildSteps:buildSteps,applyLighting:applyLighting,gateTop:gateTop,gatePoint:gatePoint};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishFpsMap=api;
})(typeof window!=='undefined'?window:globalThis);
