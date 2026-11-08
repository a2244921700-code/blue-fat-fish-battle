/* Original desert arena, with Dust II's long / catwalk / mid / two-level
 * tunnels connectivity. Coordinates and art are authored for this game's scale. */
(function(root){
'use strict';
function create(){
 var m={id:'sand-twin-courts',name:'沙海双城',version:2,half:76,limit:75,spawnZ:69,baseZ:67,baseSignZ:75.2,
  solids:[],buildings:[],arches:[],crates:[],palms:[],props:[],gates:[],surfaces:[],jumpAnchors:[],signs:[],awnings:[],
  zones:[{name:'A · 高台',short:'A',x:46,z:-41,y:5.4},{name:'中路低地',short:'MID',x:-5,z:0,y:0},{name:'B · 城堡',short:'B',x:-51,z:-39,y:2.8},{name:'A 小道',short:'SHORT',x:11,z:6,y:3.2},{name:'上层隧道',short:'UPPER',x:-54,z:16,y:3.2},{name:'下层隧道',short:'LOWER',x:-31,z:5,y:0},{name:'长 A',short:'LONG',x:60,z:8,y:1.8},{name:'A 坑',short:'PIT',x:70,z:33,y:0}]};
 function box(name,x,y,z,w,h,d,kind){var s={name,x,y,z,w,h,d,kind:kind||'stone',min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}};m.solids.push(s);return s;}
 function surface(name,x0,z0,x1,z1,y,kind){var s={name,x0,z0,x1,z1,y,kind:kind||'court'};m.surfaces.push(s);return s;}
 function floor(name,x0,z0,x1,z1,y,slab){surface(name,x0,z0,x1,z1,y);if(y>0)box(name,(x0+x1)/2,slab?y-.2:y/2,(z0+z1)/2,x1-x0,slab?.4:y,z1-z0,'terrain');}
 // Fine real risers are shared by locomotion, grenades, ragdolls and bullets;
 // no hidden wedge with an oversized axis-aligned collision box.
 function ramp(name,x0,z0,x1,z1,a,b,axis,steps){
  var s=surface(name,x0,z0,x1,z1,0,'ramp');s.axis=axis;s.a=a;s.b=b;s.steps=steps||Math.ceil(Math.abs(b-a)/.13);
  for(var i=0;i<s.steps;i++){var t0=i/s.steps,t1=(i+1)/s.steps,lo=a+(b-a)*(b>a?t1:t0),l=axis==='x'?x0+(x1-x0)*t0:z0+(z1-z0)*t0,r=axis==='x'?x0+(x1-x0)*t1:z0+(z1-z0)*t1;
   if(lo>.001)box(name+'/踏面'+i,axis==='x'?(l+r)/2:(x0+x1)/2,lo/2,axis==='z'?(l+r)/2:(z0+z1)/2,axis==='x'?r-l:x1-x0,lo,axis==='z'?r-l:z1-z0,'terrain');
  }
 }
 function building(name,x0,z0,x1,z1,h,variant,base){base=base||0;var b=box(name,(x0+x1)/2,base+h/2,(z0+z1)/2,x1-x0,h,z1-z0,'building');b.variant=variant||0;m.buildings.push(b);return b;}
 function crate(x,z,w,d,h,y){y=y||0;var c=box('补给箱',x,y+h/2,z,w,h,d,'crate');m.crates.push(c);return c;}
 function arch(name,x,z,width,opening,h,y,turn,doors,profile){
  y=y||0;turn=turn||0;profile=profile||{};var spring=profile.spring||2.7,rise=profile.rise||.62,c=Math.cos(turn),s=Math.sin(turn);
  function part(label,xx,yy,w,hh){var X=x+xx*c,Z=z-xx*s;box(name+'/'+label,X,y+yy,Z,Math.abs(c)*w+Math.abs(s)*1.2,hh,Math.abs(s)*w+Math.abs(c)*1.2,label==='拱顶'?'arch':'stone');}
  var pier=(width-opening)/2,r=opening/2;part('门柱',-width/2+pier/2,h/2,pier,h);part('门柱',width/2-pier/2,h/2,pier,h);
  for(var i=0;i<12;i++){var l=-r+opening*i/12,rr=l+opening/12,bottom=spring+Math.sqrt(Math.max(0,r*r-Math.max(Math.abs(l),Math.abs(rr))**2))*rise;part('拱顶',(l+rr)/2,(bottom+h)/2,opening/12,h-bottom);}
  m.arches.push({name,x,z,y,w:width,opening,h,turn,spring,rise});
  if(doors){[-1,1].forEach(function(side){var leaf={name:name+'门扇',x:x+side*(r-.07),z:z,y,side:-side,width:r-.11,radius:r,spring:2.7,rise:.62,angle:-Math.PI*68/180,thickness:.24};m.gates.push(leaf);
   for(var j=0;j<18;j++){var u0=j*leaf.width/18,u1=(j+1)*leaf.width/18,xx0=leaf.side*u0,xx1=leaf.side*u1,cc=Math.cos(leaf.angle),ss=Math.sin(leaf.angle),px=leaf.x+(xx0+xx1)*cc/2,pz=leaf.z-(xx0+xx1)*ss/2,ht=2.7+Math.sqrt(Math.max(0,r*r-(r-u1)**2))*.62;
    box(name+'/开启门板',px,y+ht/2,pz,Math.abs(xx1-xx0)*cc+Math.abs(ss)*.24,ht,Math.abs(xx1-xx0)*Math.abs(ss)+cc*.24,'gate');}
  });}
 }
 // Playable routes, including actual overlap between catwalk/tunnel floors.
 floor('红方基地',-20,58,20,74,0);floor('南部集散区',-60,43,58,58,0);
 floor('蓝方基地',-20,-74,20,-58,0);floor('守方后场',-46,-60,42,-48,0);
 floor('CT 中路',-22,-58,26,-18,0);floor('CT 横街',-30,-48,34,-18,0);
 ramp('T 斜坡',-14,30,4,44,3.2,0,'z');floor('中路上口',-14,22,15,30,3.2);
 ramp('中路下坡',-14,8,4,22,0,3.2,'z');floor('中路低地',-16,-24,6,8,0);
 // Most of short A is a filled retaining platform. Only the CT crossing is a
 // bridge; leaving the whole lane as a slab creates an unsupported long shelf.
 floor('A 小道实体基座',4,-10,15,25,3.2);floor('A 小道北桥',4,-18,15,-10,3.2,true);
 floor('A 小道转角桥',12,-18,34,-10,3.2,true);floor('CT 桥下通路',4,-18,34,-10,0);
 [14,23,32].forEach(function(x){[-17.3,-10.7].forEach(function(z){box('小道桥柱',x,1.38,z,.7,2.76,.7,'post');});});
 ramp('A 小道石阶',26,-30,34,-18,5.4,3.2,'z',10);floor('A 高台',30,-52,66,-30,5.4);
 ramp('CT 上 A 坡道',30,-68,40,-52,0,5.4,'z');floor('CT 坡道入口',14,-70,40,-64,0);
 floor('长 A',54,-14,66,30,1.8);ramp('长 A 上台坡',54,-30,66,-14,5.4,1.8,'z');
 floor('A 门外',44,28,66,44,1.8);floor('A 门外横街',20,34,54,44,1.8);ramp('T 至 A 门坡',20,44,30,54,1.8,0,'z');
 floor('A 坑',66,28,74,42,0);ramp('A 坑出口',66,38,73,42,1.8,0,'x');
 floor('B 庭院',-66,-52,-38,-24,2.8);floor('B 后台',-65,-51,-50,-45,4.1);
 ramp('B 大门坡',-38,-34,-22,-24,2.8,0,'x');floor('B 门外',-30,-42,-16,-22,0);
 floor('上层 B 洞',-60,-22,-48,30,3.2,true);ramp('B 洞出口缓坡',-60,-28,-48,-22,2.8,3.2,'z');ramp('T 至 B 洞坡',-60,30,-48,44,3.2,0,'z');
 floor('上层回廊',-60,10,-36,24,3.2,true);floor('洞内上桥',-52,3,-36,12,3.2,true);
 floor('下层隧道',-48,1,-16,9,0);floor('下洞至中路',-20,-1,-12,10,0);
 ramp('B 洞层间石阶',-36,9,-28,25,0,3.2,'z',14);floor('B 洞阶顶',-48,24,-28,29,3.2,true);
 floor('B 窗外垫台',-36,-45,-30,-39,1.4);ramp('B 窗垫台石阶',-30,-45,-26,-39,1.4,0,'x',7);
 crate(1.5,-3,3,3,1.6);surface('中路跳箱',0,-4.5,3,-1.5,1.6,'box');
 function jump(name,from,to){m.jumpAnchors.push({name,from,to});m.jumpAnchors.push({name:name+'返程',from:to,to:from});}
 jump('中箱上沿', {x:-1.5,y:0,z:-3},{x:1.5,y:1.6,z:-3});jump('中箱上 A 小道',{x:2,y:1.6,z:-3},{x:5.4,y:3.2,z:-3});
 jump('B 窗跳入',{x:-35.2,y:1.4,z:-42},{x:-39,y:2.8,z:-42});
 jump('B 后台跳上',{x:-54,y:2.8,z:-42.8},{x:-54,y:4.1,z:-46});
 // Blocks define bends and choke points instead of mirrored open boulevards.
 building('南侧旧城',-47,59,-22,74,10,2);building('南侧集市',22,58,73,74,9,1);
 building('B 洞外民居',-45,30,-18,42,11,0);building('西侧城堡',-74,-55,-61,37,11,1);
 building('中路西侧民居',-46,-22,-18,0,10,2).plainSouthBelow=4.4;building('下洞北墙',-48,-1,-21,1,6.5,0).plainSouthBelow=6.5;
 building('A 门内旅馆',18,0,52,29,12,1);building('A 小道东侧',16,1,18,30,7.6,0);
 building('A 短道内庭',35,-26,52,-2,11,2);building('A 点后墙',41,-56,68,-52,8.2,1,5.4);
 building('蓝方西侧房屋',-44,-74,-22,-60,10,2);building('蓝方东侧房屋',43,-74,74,-57,11,1);
 building('B 点后墙',-67,-56,-37,-52,7.6,2,2.8);
 box('长 A 外侧护墙',67.3,3.1,5,1.6,6.2,44);box('A 高台外墙',67.4,4.5,-41,1.6,9,26);
 // Tunnel envelope: real ceiling above both floors, punctuated by skylights.
 box('B 洞东墙',-47,4.9,-10,2,9.8,24);box('洞厅东墙',-27,4.3,18,2,8.6,23);
 box('上洞西侧折角',-57,5.2,-9,6,4,1.8);box('上洞东侧折角',-51,5.2,-18,6,4,1.8);
 box('B 洞外西墙',-61,4.2,19,2,8.4,30);box('下洞南墙',-36,1.8,10,23,3.6,1.0);
 // Keep the lower approach to the stair open at x -36..-28.
 m.solids.pop();box('下洞南墙',-22.5,1.8,10,9,3.6,1);
 [-16,-5,6,17,27].forEach(function(z){box('B 洞分段顶棚',-54,7.4,z,14,.45,8,'roof');});box('层间楼梯顶棚',-32,7.6,18,12,.45,23,'roof');
 box('下洞顶棚',-26.55,3.85,5,20.9,.4,10,'roof');
 box('下洞门侧北墙',-18.55,2.2,.7,4.9,4.4,1.4);box('下洞门侧南墙',-17.05,2.2,9.3,1.9,4.4,1.4);
 box('小道西侧矮墙',4.15,3.475,-12,.35,.55,12);box('A 高台前沿矮墙',44,5.725,-30.18,14,.65,.36);
 // Window has an actual opening above its sill, plus a normal door route.
 box('B 窗南墙',-37.5,4.6,-47.5,1,9.2,7);box('B 窗北墙',-37.5,4.6,-36,1,9.2,8);
 box('B 窗台',-37.5,1.4,-42,1,2.8,4);box('B 窗楣',-37.5,8,-42,1,2.4,4);
 arch('中门',-5,-8,22,8,6.8,0,0,true);arch('A 长门',60,28,12,8,7,1.8,0,true);arch('B 洞口',-54,-24,12,9,6.8,2.8,0,false);
 arch('B 下洞入口',-16.6,5,10,7,4.4,0,Math.PI/2,false,{spring:2.2,rise:.4});
 box('基地内挡墙',0,1.25,53,8,2.5,1.2);box('蓝方出门挡墙',0,1.25,-55,7,2.5,1.2);
 // Readable cover: no random boxes closing a narrow navigation connection.
 [[38,-43,4,3,1.5,5.4],[57,-47,3,3,2.5,5.4],[43,-32,3,2.5,1.3,5.4],[-45,-33,3.5,3,2.2,2.8],[-60,-37,3,3,1.4,2.8],[-48,-48,2.4,2.4,1.6,2.8],[-7,27,3,2.5,1.2,3.2],[57,12,2.6,3,1.5,1.8],[23,38,2,2,1.2,1.8],[-55,18,2,2,1.15,3.2],[-21,50,3,3,1.6,0],[19,-51,3,3,1.4,0]].forEach(function(a){crate.apply(null,a);});
 [[-75,0,1.5,151],[75,0,1.5,151],[0,-76,152,1.2],[0,76,152,1.2]].forEach(function(a){box('城界',a[0],4.6,a[1],a[2],9.2,a[3]);});
 [[-19,47],[46,46],[71,-15],[-69,-12],[23,-62]].forEach(function(p){m.palms.push({x:p[0],z:p[1]});box('棕榈树干',p[0],2.1,p[1],.8,4.2,.8,'palm');});
 m.awnings=[{x:36,z:39,y:5.4,w:12,d:6,turn:0},{x:60,z:3,y:5.5,w:11,d:5,turn:0},{x:-52,z:-38,y:7.1,w:11,d:5,turn:0}];
 m.awnings.forEach(function(a,i){a.floor=i===2?2.8:1.8;[-1,1].forEach(function(x){[-1,1].forEach(function(z){box('棚架立柱',a.x+x*a.w/2,(a.y+a.floor)/2,a.z+z*a.d/2,.15,a.y-a.floor,.15,'post');});});});
 m.props=[{type:'cart',x:40,z:49,y:0},{type:'barrels',x:63,z:-34,y:5.4},{type:'barrels',x:18,z:-46,y:0},{type:'barrels',x:-60,z:-30,y:2.8}];
 m.props.forEach(function(p){box('街边补给',p.x,p.y+.8,p.z,p.type==='cart'?2.1:1.8,1.6,p.type==='cart'?3.4:1.6,'prop');});
 m.signs=[{text:'A  长门',x:60,y:7.8,z:28.72,w:6},{text:'MID  中门',x:-5,y:6.1,z:-7.26,w:6},{text:'B  上层隧道',x:-54,y:8.6,z:-23.25,w:6},{text:'A  高台',x:45,y:8.3,z:-51.3,w:6},{text:'B  下层隧道',x:-15.78,y:4.2,z:5,w:3.4,turn:Math.PI/2}];
 var red=[[[0,62,0],[24,50,0],[26,39,1.8],[60,35,1.8],[60,15,1.8],[60,-20,3.2],[48,-39,5.4],[35,-58,3.4],[12,-65,0]],[[0,62,0],[-8,47,0],[-6,27,3.2],[10,22,3.2],[10,-14,3.2],[30,-14,3.2],[30,-28,5],[42,-40,5.4],[35,-60,2.7],[10,-65,0]],[[0,62,0],[-52,48,0],[-54,22,3.2],[-54,-12,3.2],[-54,-35,2.8],[-44,-28,2.8],[-25,-28,.5],[-4,-40,0],[0,-65,0]],[[0,62,0],[-8,47,0],[-7,27,3.2],[-7,13,1.7],[-7,-5,0],[-7,-20,0],[-4,-40,0],[0,-65,0]],[[0,62,0],[-54,48,0],[-54,27,3.2],[-31,26,3.2],[-31,10,.2],[-30,5,0],[-14,5,0],[-6,-2,0],[-5,-40,0],[0,-65,0]]];
 m.routes={red:red,blue:red.map(function(r){return r.slice().reverse();})};
 return m;
}
function height(s,x,z){if(s.kind!=='ramp')return s.y;var t=s.axis==='x'?(x-s.x0)/(s.x1-s.x0):(z-s.z0)/(s.z1-s.z0);t=Math.max(0,Math.min(1,t));var index=Math.min(s.steps-1,Math.floor(t*s.steps));return s.a+(s.b-s.a)*(s.b>s.a?(index+1)/s.steps:index/s.steps);}
var api={create:create,height:height};if(typeof module==='object'&&module.exports)module.exports=api;root.FishFpsLayout=api;
})(typeof window==='undefined'?globalThis:window);
