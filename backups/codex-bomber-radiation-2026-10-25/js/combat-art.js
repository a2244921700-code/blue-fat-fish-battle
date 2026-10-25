/* OpenAI Codex · 战斗表现层。Three.js r159 / 纯本地，无额外运行依赖。
 * 玩家模型朝 -Z；敌方武器与炮弹统一朝 +Z。伤害、射速、碰撞仍由 game.js 管理。
 * 固定几何/材质缓存使用 artShared 标记，与 FishArt.disposeTree 协同回收。
 */
(function () {
'use strict';
var T = THREE, geometries = {}, materials = {};
function shared(resource) { resource.userData.artShared = true; return resource; }
function geo(key, make) { return geometries[key] || (geometries[key] = shared(make())); }
function mat(name) {
  if (materials[name]) return materials[name];
  var palette = {
    steel: [0x72929c, .32, .65], dark: [0x233746, .5, .42], rubber: [0x15242c, .88, .08],
    sand: [0xd4ba88, .57, .32], ivory: [0xeee3cb, .4, .35], bronze: [0xc68d45, .34, .65],
    teal: [0x2a969b, .4, .48], blade: [0xc8e8ed, .22, .7], edge: [0xf3f7ed, .25, .48],
    olive: [0x526654, .6, .3], purple: [0x70659a, .4, .5], red: [0xb94d34, .5, .25]
  };
  var p = palette[name] || palette.steel;
  return materials[name] = shared(new T.MeshStandardMaterial({color:p[0],roughness:p[1],metalness:p[2]}));
}
function glow(name, color) {
  return materials[name] || (materials[name] = shared(new T.MeshBasicMaterial({color:color,toneMapped:false})));
}
function mesh(parent, geometry, material, x, y, z) {
  var m = new T.Mesh(geometry, typeof material === 'string' ? mat(material) : material);
  m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m;
}
function box(p,w,h,d,x,y,z,m,bevel) {
  var key = ['box',w,h,d,bevel ? 1 : 0].join(':');
  return mesh(p,geo(key,function(){
    if (!bevel) return new T.BoxGeometry(w,h,d);
    var r = Math.min(w,h,d)*.13, s = new T.Shape();
    s.moveTo(-w/2+r,-h/2); s.lineTo(w/2-r,-h/2);s.lineTo(w/2,-h/2+r);
    s.lineTo(w/2,h/2-r);s.lineTo(w/2-r,h/2);s.lineTo(-w/2+r,h/2);
    s.lineTo(-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.closePath();
    var g = new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.35,bevelSegments:1,steps:1,curveSegments:1});
    g.translate(0,0,-d/2+r);return g;
  }),m,x,y,z);
}
function tube(p,r,len,x,y,z,m,open) {
  var g=geo(['tube',r,len,!!open].join(':'),function(){return new T.CylinderGeometry(r,r,len,12,1,!!open);});
  var n=mesh(p,g,m,x,y,z);n.rotation.x=Math.PI/2;return n;
}
function ring(p,r,thick,x,y,z,m) {
  return mesh(p,geo('ring:'+r+':'+thick,function(){return new T.TorusGeometry(r,thick,5,16);}),m,x,y,z);
}
function anchor(p,x,y,z) { var a=new T.Object3D();a.position.set(x,y,z);p.add(a);return a; }
function grip(p,x,y,z,w,h,d) {
  var g=new T.Group();g.position.set(x,y,z);g.rotation.x=-.24;p.add(g);
  box(g,w,h,d,0,-h*.35,0,'rubber',true);
  for(var i=0;i<4;i++)box(g,w*1.03,.012,d*.78,0,-i*h*.19,0,'teal');
  box(g,w*1.15,.025,d*1.1,0,-h*.85,0,'steel',true);return g;
}
function hand(p,z) {
  // 手套袖口和握持手，保持轮廓简单，避免枪械悬空。
  var g=new T.Group();g.rotation.x=-.2;g.position.set(.015,-.10,z);p.add(g);
  box(g,.104,.105,.11,0,0,0,'sand',true);
  for(var i=0;i<3;i++)box(g,.12,.021,.046,0,.027-i*.027,-.052,'rubber',true);
  box(g,.105,.11,.095,.012,-.102,.035,'dark',true);
  box(g,.108,.022,.102,.01,-.055,.02,'teal',true);
}
function playerWeapon(kind) {
  var g=new T.Group();g.name='player-'+kind;
  if(kind==='knife') {
    // 双斜面刀刃：中脊厚，两侧刃口薄，不再用长方体充当刀刃。
    mesh(g,bladeGeometry(.10,.49,.024),'blade',0,.01,-.055).rotation.x=-Math.PI/2;
    box(g,.16,.035,.045,0,0,-.04,'bronze',true);
    tube(g,.027,.19,0,0,.075,'rubber');
    for(var k=0;k<6;k++)ring(g,.027,.004,0,0,.005+k*.027,'teal');
    ring(g,.031,.008,0,0,.17,'bronze');hand(g,.08);
    g.muzzleTip=anchor(g,0,.01,-.55);
    g.rotation.set(.55,.55,-.15);
    return g;
  }
  var rifle=kind==='rifle';
  if(!rifle) {
    box(g,.10,.065,.30,0,.005,-.025,'sand',true);
    var slide=new T.Group();g.add(slide);g.slide=slide;
    box(slide,.105,.085,.34,0,.068,-.06,'steel',true);
    box(slide,.083,.012,.23,0,.115,-.045,'dark');
    box(slide,.007,.038,.10,-.056,.067,-.03,'teal');
    box(slide,.007,.028,.06,.056,.067,.025,'rubber');
    for(var i=0;i<4;i++)box(slide,.109,.047,.009,0,.068,.043+i*.015,'dark');
    tube(g,.023,.10,0,.065,-.267,'dark');ring(g,.024,.006,0,.065,-.319,'steel');
    mesh(g,geo('pistol-bore',function(){return new T.CircleGeometry(.016,12);}),glow('bore',0x08151c),0,.065,-.321).rotation.y=Math.PI;
    grip(g,0,-.025,.063,.078,.15,.088);hand(g,.077);
    box(g,.082,.015,.12,0,-.061,-.065,'dark',true);
    box(g,.014,.045,.015,0,-.025,-.06,'steel');
    box(slide,.045,.022,.016,0,.119,.067,'dark',true);
    for(var s=-1;s<=1;s+=2)box(slide,.008,.008,.004,s*.015,.122,.078,glow('sight',0x92f1db));
    box(slide,.013,.022,.016,0,.12,-.19,'dark');
    g.muzzleTip=anchor(g,0,.065,-.335);
  } else {
    box(g,.115,.13,.43,0,.025,-.015,'sand',true);
    box(g,.10,.045,.44,0,.107,-.02,'steel',true);
    box(g,.106,.108,.32,0,.045,-.38,'teal',true);
    for(var j=0;j<5;j++) {
      box(g,.112,.025,.026,0,.068,-.265-j*.052,'rubber',true);
      box(g,.12,.012,.018,0,.115,-.22-j*.061,'steel');
    }
    tube(g,.026,.27,0,.055,-.63,'steel');tube(g,.038,.085,0,.055,-.797,'dark');
    ring(g,.037,.008,0,.055,-.844,'bronze');
    mesh(g,geo('rifle-bore',function(){return new T.CircleGeometry(.025,12);}),glow('bore',0x08151c),0,.055,-.847).rotation.y=Math.PI;
    var mag=new T.Group();g.add(mag);mag.position.set(0,-.06,-.105);mag.rotation.x=-.17;g.magazine=mag;
    box(mag,.075,.20,.12,0,-.10,0,'dark',true);
    for(var mi=0;mi<3;mi++)box(mag,.079,.011,.093,0,-.06-mi*.052,0,'steel');
    grip(g,0,-.035,.11,.082,.17,.09);hand(g,.122);
    box(g,.08,.065,.20,0,.035,.26,'dark',true);
    box(g,.095,.14,.09,0,-.006,.375,'sand',true);box(g,.10,.147,.022,0,-.006,.427,'rubber',true);
    box(g,.079,.018,.15,0,.145,-.03,'dark',true);
    box(g,.012,.085,.032,-.039,.187,-.015,'dark',true);box(g,.012,.085,.032,.039,.187,-.015,'dark',true);
    box(g,.085,.012,.032,0,.229,-.015,'steel',true);
    box(g,.006,.010,.009,0,.171,-.028,glow('sight',0x92f1db));
    box(g,.012,.07,.014,0,.139,-.53,'steel');
    box(g,.009,.033,.095,-.061,.035,.015,'rubber',true);
    box(g,.012,.016,.035,-.069,.035,.012,'bronze',true);
    g.muzzleTip=anchor(g,0,.055,-.86);
  }
  return g;
}
function bladeGeometry(w,len,t) {
  return geo(['blade',w,len,t].join(':'),function(){
    // Y 为长轴；中脊与左右刃口构成独立法线的金属斜面。
    var v=[[-w/2,0,0],[w/2,0,0],[w/2,len*.76,0],[0,len,0],[-w/2,len*.76,0],[0,0,t],[0,len*.75,t],[0,0,-t],[0,len*.75,-t]];
    var faces=[[0,5,6],[0,6,4],[4,6,3],[3,6,2],[2,6,5],[2,5,1],[0,4,8],[0,8,7],[4,3,8],[3,2,8],[2,1,7],[2,7,8],[0,7,5],[1,5,7]];
    var a=[];faces.forEach(function(f){f.forEach(function(i){a.push.apply(a,v[i]);});});
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.computeVertexNormals();return g;
  });
}
function bossWeapon(mode) {
  // 相对位置按「少女形态 Boss 立绘」调校：武器贴近右手侧、略微下移，
  // 缩放从 1.5 降到 1.05，避免大剑/巨炮横在身体正中央挡住脸与围裙。
  var g=new T.Group();g.name='boss-'+mode;g.position.set(-2.06,-1.52,.34);g.scale.setScalar(1.05);g.aimMode=mode;
  if(mode==='charge') {
    var blade=mesh(g,bladeGeometry(.39,2.15,.065),'blade',0,0,.02);blade.rotation.x=Math.PI/2;
    box(g,.095,.045,1.45,0,.075,.85,'teal',true);
    box(g,.8,.13,.18,0,0,0,'bronze',true);
    for(var si=-1;si<=1;si+=2)box(g,.16,.22,.22,si*.37,.055,.025,'steel',true);
    tube(g,.095,.52,0,0,-.32,'rubber');
    for(var ri=0;ri<5;ri++)ring(g,.096,.013,0,0,-.12-ri*.09,'bronze');
    mesh(g,geo('pommel',function(){return new T.IcosahedronGeometry(.14,0);}), 'teal',0,0,-.63);
    g.muzzleTip=anchor(g,0,0,2.2);
  } else if(mode==='summon') {
    tube(g,.07,1.9,0,0,.37,'dark');tube(g,.09,.42,0,0,-.25,'bronze');
    for(var bi=0;bi<4;bi++)ring(g,.08,.018,0,0,-.55+bi*.5,'bronze');
    var head=mesh(g,geo('crystal',function(){return new T.OctahedronGeometry(.29,0);}),glow('aether',0xae8dff),0,0,1.43);g.orb=head;
    var orbit=ring(g,.43,.035,0,0,1.43,'bronze');orbit.rotation.x=.8;g.orbit=orbit;
    var orbit2=ring(g,.38,.024,0,0,1.43,'steel');orbit2.rotation.y=.9;
    g.muzzleTip=anchor(g,0,0,1.7);
  } else if(mode==='barrage') {
    box(g,.86,.58,.5,0,0,-.08,'dark',true);box(g,.91,.12,.45,0,-.29,-.08,'sand',true);
    g.barrels=[];g.muzzles=[];
    [[0,.19],[-.29,-.12],[.29,-.12]].forEach(function(p,i){
      var b=new T.Group();b.position.set(p[0],p[1],.08);g.add(b);
      tube(b,.115,1.02,0,0,.50,'steel');tube(b,.14,.27,0,0,.13,'teal');
      ring(b,.122,.027,0,0,.92,'bronze');tube(b,.112,.18,0,0,1.035,'dark',true);
      ring(b,.112,.018,0,0,1.13,'steel');
      mesh(b,geo('cannon-bore',function(){return new T.CircleGeometry(.088,12);}),glow('bore',0x08151c),0,0,1.07);
      g.barrels.push(b);g.muzzles.push(anchor(b,0,0,1.15));
    });
    box(g,.08,.13,.30,-.49,0,-.05,'bronze',true);box(g,.08,.13,.30,.49,0,-.05,'bronze',true);
    g.muzzleTip=g.muzzles[0];
  } else {
    tube(g,.205,1.20,0,0,.32,'olive');tube(g,.25,.18,0,0,-.28,'sand');
    ring(g,.21,.035,0,0,.09,'bronze');ring(g,.21,.035,0,0,.61,'bronze');
    tube(g,.225,.26,0,0,.99,'steel',true);ring(g,.225,.035,0,0,1.13,'sand');
    mesh(g,geo('launcher-bore',function(){return new T.CircleGeometry(.18,16);}),glow('bore',0x08151c),0,0,1.08);
    box(g,.11,.08,.27,0,.245,.2,'dark',true);box(g,.13,.06,.07,0,.29,.29,'teal',true);
    box(g,.045,.11,.30,-.21,0,.2,'teal',true);
    box(g,.05,.045,.14,-.237,0,.2,glow('indicator',0x88e5cc));
    grip(g,0,-.21,-.02,.14,.30,.17);
    g.muzzleTip=anchor(g,0,0,1.17);
  }
  return g;
}
function fishGun() {
  var g=new T.Group();g.position.set(-.44,-.44,.23);g.scale.setScalar(1.65);
  box(g,.09,.085,.35,0,0,.09,'sand',true);tube(g,.034,.23,0,0,.36,'steel');
  ring(g,.036,.01,0,0,.48,'bronze');box(g,.10,.02,.24,0,.055,.08,'teal');
  grip(g,0,-.05,-.025,.075,.13,.08);g.muzzleTip=anchor(g,0,0,.5);return g;
}
function fishSword() {
  var g=new T.Group();
  mesh(g,bladeGeometry(.09,.59,.018),'blade',0,.025,0);
  box(g,.024,.36,.02,0,.23,.021,'teal');
  box(g,.25,.043,.063,0,0,0,'bronze',true);
  box(g,.05,.16,.05,0,-.10,0,'rubber',true);
  for(var i=0;i<4;i++)box(g,.054,.013,.054,0,-.045-i*.035,0,'teal',true);
  mesh(g,geo('fish-pommel',function(){return new T.IcosahedronGeometry(.044,0);}), 'bronze',0,-.20,0);
  g.position.set(-.5,-.46,.3);g.scale.setScalar(1.35);return g;
}
function grenade() {
  var g=new T.Group();
  var body=mesh(g,geo('grenade-body',function(){return new T.SphereGeometry(.108,12,8);}), 'olive',0,0,0);body.scale.y=1.16;
  for(var i=-1;i<=1;i++)ring(g,Math.sqrt(1-Math.pow(i*.35,2))*.111,.008,0,i*.04,0,'dark').rotation.x=Math.PI/2;
  var cap=tube(g,.031,.07,0,.135,0,'steel');cap.rotation.x=0;
  box(g,.025,.018,.12,0,.17,.03,'bronze',true);
  var lever=box(g,.025,.12,.018,0,.108,.09,'steel',true);lever.rotation.x=-.3;
  ring(g,.034,.007,.055,.16,0,'steel').rotation.y=.35;
  return g;
}
var _origin=new T.Vector3(),_local=new T.Vector3(),_q=new T.Quaternion();
var _look=new T.Matrix4(),_parentInverse=new T.Matrix4(),_localUp=new T.Vector3();
var _up=new T.Vector3(0,1,0),_axis=new T.Vector3(0,0,1),_direction=new T.Vector3();
function aimNode(node,target,offset) {
  node.getWorldPosition(_origin);_local.copy(target);
  if(offset) {
    _direction.subVectors(target,_origin).applyAxisAngle(_up,-offset);_local.copy(_origin).add(_direction);
  }
  if(_local.distanceToSquared(_origin)<.00001)return;
  if(node.parent){
    // 使用完整逆矩阵，包含普通鱼呼吸时的非等比缩放。
    _parentInverse.copy(node.parent.matrixWorld).invert();
    _local.applyMatrix4(_parentInverse);_localUp.copy(_up).transformDirection(_parentInverse);
    _look.lookAt(_local,node.position,_localUp);
  } else {_look.lookAt(_local,_origin,_up);}
  node.quaternion.setFromRotationMatrix(_look);node.updateWorldMatrix(false,true);
}
function aimWeapon(g,target,spread) {
  aimNode(g,target,0);
  if(g.barrels)g.barrels.forEach(function(b,i){aimNode(b,target,i===1?spread:i===2?-spread:0);});
}
function muzzleDirection(a,out) { return a.getWorldDirection(out); }
function projectile() {
  var g=new T.Group();g.name='boss-rocket';
  tube(g,.15,.46,0,0,-.03,'steel');
  var tip=mesh(g,geo('rocket-tip',function(){return new T.ConeGeometry(.15,.25,10);}), 'red',0,0,.31);tip.rotation.x=Math.PI/2;
  ring(g,.153,.028,0,0,.12,'bronze');
  for(var i=0;i<4;i++){var fin=box(g,.06,.20,.23,0,.15,-.21,'dark');fin.position.applyAxisAngle(_axis,i*Math.PI/2);fin.rotation.z=i*Math.PI/2;}
  tube(g,.10,.06,0,0,-.28,glow('exhaust',0xffc568));
  return g;
}
function flashMesh() {
  var texture=geoTexture();
  var g=geo('flash-planes',function(){
    var coords=[],uv=[];
    function quad(a,b,c,d){[a,b,c,a,c,d].forEach(function(v){coords.push.apply(coords,v);});uv.push(0,0,1,0,1,1,0,0,1,1,0,1);}
    quad([-.11,-.11,-.03],[.11,-.11,-.03],[.11,.11,-.03],[-.11,.11,-.03]);
    quad([-.07,0,.01],[.07,0,.01],[.015,0,-.26],[-.015,0,-.26]);
    quad([0,-.07,.01],[0,.07,.01],[0,.015,-.26],[0,-.015,-.26]);
    var b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(coords,3));b.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return b;
  });
  return new T.Mesh(g,new T.MeshBasicMaterial({map:texture,color:0xffd599,transparent:true,opacity:1,side:T.DoubleSide,forceSinglePass:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
}
var softTexture;
function geoTexture() {
  if(softTexture)return softTexture;
  var c=document.createElement('canvas');c.width=c.height=64;var ctx=c.getContext('2d');
  var gr=ctx.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.2,'rgba(255,255,255,.94)');gr.addColorStop(.5,'rgba(255,255,255,.36)');gr.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);softTexture=shared(new T.CanvasTexture(c));return softTexture;
}

// 固定容量特效池：冲击环、示踪线、烟团共用几何；不在每发子弹时分配几何或纹理。
function effects(scene) {
  var active=[],free=[],created=0,MAX=112;
  var ringGeo=geo('fx-ring',function(){return new T.RingGeometry(.92,1,48);});
  var lineGeo=geo('fx-line',function(){return new T.CylinderGeometry(1,1,1,5);});
  var puffGeo=geo('fx-puff',function(){return new T.PlaneGeometry(1,1);});
  var flareGeo=geo('fx-flare',function(){return new T.IcosahedronGeometry(1,1);});
  var slashGeo=geo('fx-slash',function(){return new T.RingGeometry(.79,1,28,1,-.8,2.1);});
  var p1=new T.Vector3(),p2=new T.Vector3(),unitY=new T.Vector3(0,1,0);
  function take(kind,color,life) {
    var f=free.pop();
    if(!f && created>=MAX){f=active.shift();scene.remove(f.mesh);}
    if(!f){f={mesh:new T.Mesh(puffGeo,new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false}))};created++;}
    var m=f.mesh;m.geometry=kind==='ring'?ringGeo:kind==='line'?lineGeo:kind==='slash'?slashGeo:kind==='flare'?flareGeo:puffGeo;
    var mt=m.material;var map=kind==='puff'?geoTexture():null;
    if(mt.map!==map){mt.map=map;mt.needsUpdate=true;}
    mt.color.set(color);mt.blending=T.NormalBlending;mt.opacity=1;
    m.position.set(0,0,0);m.quaternion.identity();m.scale.set(1,1,1);m.visible=true;m.renderOrder=kind==='flare'?1:0;
    f.kind=kind;f.t=0;f.life=life;f.size=1;f.grow=0;f.rise=0;f.alpha=1;f.spin=0;f.fadePower=2;
    scene.add(m);active.push(f);return f;
  }
  function puff(pos,color,size,life,rise) {
    var f=take('puff',color,life);f.mesh.position.copy(pos);f.size=size;f.grow=size*.9;f.rise=rise||0;f.alpha=.7;f.mesh.scale.setScalar(size);return f;
  }
  function shock(pos,color,radius) {
    var f=take('ring',color,.55);f.mesh.position.set(pos.x,.07,pos.z);f.mesh.rotation.x=-Math.PI/2;
    f.size=.15;f.grow=radius;f.alpha=.72;f.mesh.scale.setScalar(.15);return f;
  }
  return {
    tracer:function(from,to,color,width){
      var dist=from.distanceTo(to);if(dist<.05)return;
      var f=take('line',color||0xffd58c,.07);
      f.mesh.position.copy(from).lerp(to,.5);p1.subVectors(to,from).normalize();f.mesh.quaternion.setFromUnitVectors(unitY,p1);
      f.mesh.scale.set(width||.012,dist,width||.012);f.alpha=.85;
    },
    muzzle:function(pos,color,size){var f=puff(pos,color||0xffd291,size||.45,.08,0);f.alpha=1;},
    trail:function(pos,color,size){puff(pos,color,size,.24,.16).alpha=.42;},
    impact:function(pos,color){var f=puff(pos,color,.30,.16,.15);f.alpha=.85;},
    explosion:function(pos,radius,color,mushroom){
      shock(pos,color||0xffb352,radius);
      var fire=puff(pos,0xffad45,radius*.65,.3,.8);fire.alpha=.95;fire.fadePower=.65;
      var core=puff(pos,0xffefbf,radius*.30,.16,.7);core.alpha=1;core.fadePower=.8;
      // 极短的立体焰核保证日间仍能读清爆点，随后完全交给轻薄烟尘。
      for(var fi=0;fi<3;fi++){
        var flash=take('flare',fi===1?0xffe2a1:0xff9b38,.23+fi*.015);
        flash.mesh.position.set(pos.x+(fi-1)*radius*.13,pos.y+(fi===1?.32:0),pos.z);
        flash.size=radius*(fi===1?.16:.12);flash.grow=radius*.10;flash.rise=.6;flash.fadePower=1.2;
        flash.mesh.scale.setScalar(flash.size);
      }
      for(var i=0;i<7;i++){
        var a=i*Math.PI*2/7;p2.set(pos.x+Math.cos(a)*radius*.19,pos.y+.15+(i%3)*radius*.10,pos.z+Math.sin(a)*radius*.19);
        var f=puff(p2,i%2?0xbba78b:0x736d65,radius*.42,.75+(i%3)*.16,.8+i*.1);f.alpha=.55;f.grow=radius*.45;
      }
      if(mushroom){
        for(var j=0;j<4;j++){p2.set(pos.x,pos.y+j*.7,pos.z);var stem=puff(p2,0xb8a58d,1.0+j*.15,1.35,j*.14+.7);stem.alpha=.58;}
        for(var c=0;c<6;c++){var ca=c*Math.PI/3;p2.set(pos.x+Math.cos(ca)*1.1,pos.y+2.8,pos.z+Math.sin(ca)*1.1);var cap=puff(p2,0xc8b89e,2,1.55,.95);cap.alpha=.56;cap.grow=1.2;}
      }
    },
    slash:function(pos,dir,heavy){var f=take('slash',heavy?0xffd286:0xc6f9ff,.19);f.mesh.position.copy(pos);f.mesh.quaternion.setFromUnitVectors(_axis,dir);f.mesh.rotateZ(heavy?-.65:.45);f.size=heavy?.8:.5;f.grow=.4;f.spin=-2.2;f.mesh.scale.setScalar(f.size);f.alpha=.6;},
    pulse:function(pos,color,radius){shock(pos,color,radius);},
    update:function(dt,camera){
      camera.getWorldQuaternion(_q);
      for(var i=active.length-1;i>=0;i--){var f=active[i];f.t+=dt;var k=f.t/f.life;
        if(k>=1){scene.remove(f.mesh);free.push(f);active.splice(i,1);continue;}
        f.mesh.material.opacity=f.alpha*Math.pow(1-k,f.fadePower);
        if(f.kind!=='line'){var s=f.size+f.grow*(1-Math.pow(1-k,2));f.mesh.scale.setScalar(s);f.mesh.position.y+=f.rise*dt;}
        if(f.kind==='puff')f.mesh.quaternion.copy(_q);
        if(f.spin)f.mesh.rotateZ(f.spin*dt);
      }
    },
    clear:function(){while(active.length){var f=active.pop();scene.remove(f.mesh);free.push(f);}},
    stats:function(){return {active:active.length,allocated:created,capacity:MAX};}
  };
}
window.FishCombat={playerWeapon:playerWeapon,bossWeapon:bossWeapon,fishGun:fishGun,fishSword:fishSword,grenade:grenade,aimWeapon:aimWeapon,muzzleDirection:muzzleDirection,projectile:projectile,flashMesh:flashMesh,effects:effects};
})();
