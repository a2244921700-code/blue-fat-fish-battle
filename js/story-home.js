/* OpenAI Codex · Act I home. Owned resources, solid door openings and real cover. */
(function(root){
'use strict';
function build(scene,obstacles,wallMeshes){
 var T=THREE,group=new T.Group(),materials={},H=3.7;group.name='story/home';scene.add(group);
 function texture(kind){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');
  if(kind==='wood'){g.fillStyle='#bd956a';g.fillRect(0,0,256,256);for(var y=0;y<256;y+=32){g.fillStyle=['#bd956a','#c69f77','#ad8259'][y/32%3];g.fillRect(0,y,256,31);g.fillStyle='#8d6848';g.fillRect((y/32%2)*128,y,1,32);for(var j=0;j<5;j++){g.strokeStyle='rgba(108,76,46,.10)';g.beginPath();g.moveTo(0,y+4+j*5);g.bezierCurveTo(80,y+j*5,180,y+8+j*5,256,y+4+j*5);g.stroke();}}}
  else if(kind==='fabric'){g.fillStyle='#ffffff';g.fillRect(0,0,256,256);g.strokeStyle='#d6d4cc';g.lineWidth=1;for(var i=0;i<256;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
  else if(kind==='kitchen-tile'){
   g.fillStyle='#a09d89';g.fillRect(0,0,256,256);
   for(var row=0;row<4;row++)for(var col=0;col<4;col++){
    var left=col*64,top=row*64;g.fillStyle=(row+col)%2?'#c6c4ad':'#d5cbb1';g.fillRect(left+1,top+1,62,62);
    for(var n=0;n<14;n++){g.fillStyle=n%2?'#c2bda7':'#d8d0b9';g.fillRect(left+5+(n*19+row*17)%51,top+5+(n*31+col*11)%51,2,1);}
   }
  }
  else {var sky=g.createLinearGradient(0,0,0,256);sky.addColorStop(0,kind==='window'?'#132941':'#648d99');sky.addColorStop(1,kind==='window'?'#618597':'#edca96');g.fillStyle=sky;g.fillRect(0,0,256,256);g.fillStyle='#edddac';g.beginPath();g.arc(190,50,17,0,Math.PI*2);g.fill();for(var k=0;k<12;k++){var x=k*25;g.fillStyle=kind==='window'?'#263b50':'#6a8882';g.fillRect(x,170-(k*37%80),23,160);if(kind==='window'){g.fillStyle='#ddc28a';for(var wy=180-(k*37%80);wy<250;wy+=20)g.fillRect(x+7,wy,5,7);}}}
  var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
 }
 var wood=texture('wood'),fabric=texture('fabric'),view=texture('window'),art=texture('painting');wood.repeat.set(7,7);fabric.repeat.set(3,3);
 function mat(key,color,map,emissive){if(materials[key])return materials[key];var m=new T.MeshStandardMaterial({color:color,roughness:.86,map:map||null});if(emissive){m.emissive.setHex(emissive);m.emissiveIntensity=.28;}if(root.FishRenderStyle)FishRenderStyle.material(m,'world');materials[key]=m;return m;}
 function solid(mesh,kind){group.updateMatrixWorld(true);var b=new T.Box3().setFromObject(mesh),o={mesh:mesh,min:b.min,max:b.max,kind:kind||'story-solid'};obstacles.push(o);wallMeshes.push(mesh);return o;}
 function mesh(geo,key,color,x,y,z,collision,parent){var m=new T.Mesh(geo,mat(key,color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(parent||group).add(m);if(collision)solid(m);return m;}
 function box(w,h,d,color,x,y,z,collision,key,parent){return mesh(new T.BoxGeometry(w,h,d),key||String(color),color,x,y,z,collision,parent);}
 function cyl(r1,r2,h,color,x,y,z,parent){return mesh(new T.CylinderGeometry(r1,r2,h,16),String(color),color,x,y,z,false,parent);}
 function ball(r,color,x,y,z,scale,parent){var m=mesh(new T.SphereGeometry(r,16,10),String(color),color,x,y,z,false,parent);if(scale)m.scale.set(scale[0],scale[1],scale[2]);return m;}
 function panel(w,h,x,y,z,ry,map,key){var m=new T.Mesh(new T.PlaneGeometry(w,h),mat(key,0xffffff,map,key==='night'?0x496b92:0));m.position.set(x,y,z);m.rotation.y=ry;group.add(m);return m;}
 function wall(x,z,w,d){var m=box(w,H,d,0xeee1c7,x,H/2,z,true);box(w+.025,.13,d+.025,0x8c6d50,x,.065,z);box(w+.05,.1,d+.05,0xfff3d8,x,H-.05,z);return m;}
 function opening(x,z,width,vertical){var h=2.9;box(vertical?.3:width,H-h,vertical?width:.3,0xeee1c7,x,(H+h)/2,z,true);for(var sign of [-1,1])box(vertical?.37:.11,h,vertical?.11:.37,0xf8ebd4,x+(vertical?0:sign*(width/2-.055)),h/2,z+(vertical?sign*(width/2-.055):0));box(vertical?.37:width,.12,vertical?width:.37,0xf8ebd4,x,h-.06,z);}
 var floor=box(20,.16,21,0xffffff,0,-.08,-.5);floor.material=mat('woodfloor',0xffffff,wood);floor.castShadow=false;
 var ceiling=box(20,.14,21,0xf1e4ce,0,H+.07,-.5,true);ceiling.castShadow=false;
 wall(0,-11.15,20.6,.3);
 function windowBay(x,side){box(.3,.9,3.8,0xe7dbc1,x,.45,0,true);box(.3,.7,3.8,0xe7dbc1,x,3.35,0,true);solid(panel(3.8,2.1,x+side*.16,1.95,0,side*Math.PI/2,view,'night'));for(var z of [-1.9,0,1.9])box(.39,2.2,.09,0xf4e8d3,x+side*.03,1.95,z);box(.5,.08,4,0xc7ad85,x+side*.12,.9,0);for(var zc of [-1.65,1.65]){var curtain=box(.15,2.3,.56,0x6b8b91,x+side*.3,1.85,zc);curtain.material=mat('curtain',0x6b8b91,fabric);}}
 for(var sx of [-1,1]){var x=sx*10.15;wall(x,-6.45,.3,9.1);wall(x,6,.3,8.2);windowBay(x,-sx);}
 wall(-6,10.15,8,.3);wall(6,10.15,8,.3);opening(0,10.15,4,false);
 wall(-5.65,-4.5,8.7,.24);wall(5.65,-4.5,8.7,.24);opening(0,-4.5,2.6,false);
 wall(-1.5,-2.15,.24,4.7);wall(-1.5,3.9,.24,2.2);opening(-1.5,1.5,2.6,true);
 wall(-2.5,5,15,.24);wall(9,5,2,.24);opening(6.5,5,3,false);
 function rug(x,z,w,d,color){var m=box(w,.025,d,color,x,.015,z);m.material=mat('rug'+color,color,fabric);m.castShadow=false;}
 function cabinet(x,z,w,h,d,color){box(w,h,d,color,x,h/2,z,true);box(w+.06,.07,d+.06,0xc8a16f,x,h+.035,z);for(var s of [-1,1]){box(w/2-.05,h-.12,.025,color,x+s*w/4,h/2,z+d/2+.018);box(.025,.18,.04,0xcbb07d,x+s*.08,h*.55,z+d/2+.05);}}
 function table(x,z,w,d,h){box(w,.12,d,0xb88755,x,h,z,true);for(var a of [-1,1])for(var b of [-1,1])box(.1,h,.1,0x70503b,x+a*(w/2-.12),h/2,z+b*(d/2-.12),true);}
 function chair(x,z,ry){var c=new T.Group();c.position.set(x,0,z);c.rotation.y=ry;group.add(c);box(.55,.1,.55,0xb7895e,0,.47,0,false,null,c);box(.55,.65,.08,0x98704e,0,.8,.25,false,null,c);for(var a of [-1,1])for(var b of [-1,1])box(.06,.45,.06,0x77543e,a*.22,.225,b*.22,false,null,c);solid(c);}
 function plant(x,z){cyl(.24,.17,.35,0xb97b5d,x,.175,z);cyl(.025,.035,.65,0x56764b,x,.65,z);for(var i=0;i<6;i++){var a=i*Math.PI/3;ball(.22,0x638d68,x+Math.sin(a)*.17,.8+(i%2)*.2,z+Math.cos(a)*.17,[1,1.8,.5]);}}
 function picture(x,y,z,ry,w,h){var p=new T.Group();p.position.set(x,y,z);p.rotation.y=ry;group.add(p);box(w+.12,h+.12,.07,0x8d6547,0,0,0,false,null,p);var image=new T.Mesh(new T.PlaneGeometry(w,h),mat('art',0xffffff,art));image.position.z=.04;p.add(image);}
 function lamp(x,z,height){cyl(.18,.2,.06,0x8c734d,x,.03,z);cyl(.025,.025,height,0xa58658,x,height/2,z);var shade=cyl(.16,.3,.32,0xffedc3,x,height,z);shade.material=mat('lampshade',0xffe5a6,null,0xffd585);}
 rug(-5.3,2,5,2.8,0x7b9297);box(2.4,.4,2.7,0x78573d,-7.1,.2,-.7,true);box(2.3,.3,2.6,0xf9eed7,-7.1,.55,-.7,true);box(2.45,1.05,.14,0x79563b,-7.1,.525,-2.1,true);
 var quilt=box(2.32,.12,1.8,0x819eac,-7.1,.76,-.3);quilt.material=mat('quilt',0x819eac,fabric);for(var px of [-7.7,-6.5])ball(.43,0xf4e8d0,px,.83,-1.6,[1,.3,.6]);
 cabinet(-8.85,-1.65,.65,.65,.55,0xa67f54);lamp(-8.85,-1.65,1.25);cabinet(-8.7,3.95,2,2.5,.75,0x9b805f);table(-3.25,-3.2,2,.8,.85);chair(-3.25,-2.2,0);
 box(.8,.5,.08,0x354453,-3.25,1.2,-3.3);panel(.7,.4,-3.25,1.2,-3.25,0,art,'monitor');box(.14,.2,.12,0x354453,-3.25,.94,-3.3);box(.55,.025,.2,0x636e71,-3.25,.925,-3.02);picture(-5.2,2,-4.35,0,1.4,.9);
 rug(5.4,-.3,5,4,0x967b68);box(3.4,.45,1.2,0x496e78,5.4,.3,.6,true);box(3.4,.7,.23,0x365662,5.4,.9,1.24,true);for(var s of [-1,1]){box(.22,.65,1.35,0x365662,5.4+s*1.75,.7,.6,true);box(1.55,.13,1.1,0x75979a,5.4+s*.82,.59,.6);ball(.27,s<0?0xdfb674:0xa86e57,5.4+s*1.3,.95,1,[1,1,.4]);}
 table(5.4,-1.1,1.7,.8,.47);cyl(.08,.07,.14,0xdccbb0,5.1,.6,-1.1);box(.25,.025,.13,0x283e4b,5.7,.55,-1.1);cabinet(5.4,-3.8,3.2,.55,.5,0x8c7353);box(2.2,1.15,.12,0x24333d,5.4,1.3,-3.84);panel(2.03,.98,5.4,1.3,-3.77,0,art,'tv');picture(8,2.5,-4.35,0,1,.7);
 cabinet(1.35,2.6,1.3,2.2,.6,0x866a4b);cabinet(8.95,2.6,1.3,2.2,.6,0x866a4b);for(var j=0;j<8;j++)box(.09,.25,.24,[0x647e7d,0xb77c5c,0xc4ab76][j%3],.85+j*.14,2.4,2.6);plant(3.25,2.5);plant(8.5,-2.5);lamp(7.8,.6,1.8);
 var kitchenMap=texture('kitchen-tile');kitchenMap.repeat.set(7,2.25);
 var kitchenFloor=box(20,.012,6.35,0xffffff,0,.008,-7.72);kitchenFloor.material=mat('kitchen-floor',0xffffff,kitchenMap);
 cabinet(-3.4,-10.5,9,.9,.8,0xe2ceaa);cabinet(8.7,-10.2,1.1,2.3,.9,0xd3dad4);box(8,.6,.43,0xd8c49c,-3.4,2.4,-10.7,true);box(1.15,.03,.65,0x344147,-4.8,1,-10.5);for(var s of [-1,1])cyl(.18,.18,.025,0x697578,-4.8+s*.27,1.025,-10.5);box(.8,.035,.5,0x909c9c,-1.5,1,-10.5);cyl(.025,.025,.35,0xbfc5bb,-1.5,1.17,-10.75);cabinet(-1.85,-5.1,1.35,2.3,.8,0x75918b);
 table(-5,-7.9,2.3,1.4,.89);chair(-6.7,-7.9,Math.PI/2);chair(-3.3,-7.9,-Math.PI/2);rug(-5,-7.9,4.5,3,0x9a8c70);
 var rice=new T.Group();rice.name='story/rice-bowl';rice.position.set(-5,1.02,-7.9);group.add(rice);cyl(.22,.12,.16,0xf9edd6,0,0,0,rice);ball(.2,0xfff9e8,0,.085,0,[1,.55,1],rice);for(var i=0;i<2;i++)box(.018,.018,.42,0xb68249,-4.7+i*.04,.98,-7.8,false,null,group);
 cyl(.02,.02,.5,0x715a40,-5,3.35,-7.9);cyl(.13,.14,.07,0xb68e59,-5,3.15,-7.9);
 cabinet(-4,9.5,2,.95,.6,0x9e7c55);plant(-5.5,9.1);picture(-4,2,9.97,Math.PI,1.6,.85);rug(0,8.6,3.4,1.5,0x8f9c8d);picture(2,2,5.16,0,1.4,.8);
 var doorPivot=new T.Group();doorPivot.position.set(-1.88,0,10.15);group.add(doorPivot);var door=box(3.76,2.76,.12,0x78583f,1.88,1.38,0,false,null,doorPivot);var doorCollider=solid(door,'story-door');box(.22,.06,.1,0xcab17b,3.15,1.2,-.12,false,null,doorPivot);for(var yy of [.65,2])box(3.1,1,.025,0x8a694a,1.88,yy,-.075,false,null,doorPivot);
 // Repeated trim, book spines, crockery shelves and joinery share one box and one draw per finish.
 var fittings=new T.Group(),batches=new Map(),dummy=new T.Object3D(),unit=new T.BoxGeometry(1,1,1);
 fittings.name='story/室内木作与生活陈设';group.add(fittings);
 function fitting(color,x,y,z,w,h,d,angle){
   var finish=mat('joinery-'+color,color),list=batches.get(finish)||[];
   if(!list.length)batches.set(finish,list);dummy.position.set(x,y,z);dummy.rotation.set(0,angle||0,0);
   dummy.scale.set(w,h,d);dummy.updateMatrix();list.push(dummy.matrix.clone());
 }
 var blue=0x4b7582,trim=0x83a0a0,honey=0xc49b61;
 [[-2.15,4.66],[3.9,2.16]].forEach(function(p){
   fitting(blue,-1.634,.58,p[0],.025,1.15,p[1]);fitting(trim,-1.67,1.16,p[0],.09,.085,p[1]);
   for(var i=0;i<Math.floor(p[1]/.48);i++)fitting(trim,-1.661,.55,p[0]-p[1]/2+.26+i*.48,.037,.99,.035);
 });
 fitting(blue,-5.8,.57,4.866,8.3,1.14,.026);fitting(trim,-5.8,1.16,4.83,8.3,.085,.085);
 for(var i=0;i<16;i++)fitting(trim,-9.5+i*.48,.55,4.84,.036,.99,.035);
 // The print is an original three-colour woodcut hung on rods in the bedroom.
 var print=document.createElement('canvas');print.width=512;print.height=320;
 var pen=print.getContext('2d');pen.fillStyle='#1d495e';pen.fillRect(0,0,512,320);
 pen.strokeStyle='#dcbd82';pen.lineWidth=6;pen.strokeRect(16,16,480,288);
 pen.fillStyle='#efc983';pen.beginPath();pen.arc(392,82,39,0,Math.PI*2);pen.fill();
 for(var i=0;i<28;i++){pen.fillStyle=i%2?'#d5bc83':'#94c2c3';pen.fillRect(38+(i*67)%435,34+(i*43)%111,3+i%3,3+i%3);}
 pen.fillStyle='#8cc1bd';pen.beginPath();pen.moveTo(82,154);pen.bezierCurveTo(127,114,215,108,275,157);
 pen.bezierCurveTo(309,176,330,159,356,124);pen.quadraticCurveTo(363,148,352,167);
 pen.quadraticCurveTo(383,163,400,180);pen.quadraticCurveTo(363,197,335,185);
 pen.bezierCurveTo(260,224,169,233,109,196);pen.quadraticCurveTo(76,181,82,154);pen.fill();
 pen.fillStyle='#233e4c';pen.beginPath();pen.arc(117,160,5,0,Math.PI*2);pen.fill();
 for(var j=0;j<3;j++){pen.strokeStyle=j===1?'#e7c28a':'#75a3ae';pen.lineWidth=4;pen.beginPath();
   for(var col=0;col<=440;col+=6){var py=238+j*17+Math.sin(col/27+j)*7;if(col)pen.lineTo(36+col,py);else pen.moveTo(36,py);}pen.stroke();}
 var printMap=new T.CanvasTexture(print);printMap.colorSpace=T.SRGBColorSpace;
 panel(2.55,1.60,-1.655,2.26,-2.04,-Math.PI/2,printMap,'whale-print');
 [1.43,3.09].forEach(function(y){fitting(honey,-1.68,y,-2.04,.10,.09,2.80);});
 // A short shelf above the panelling and a reading lamp give the near doorway a human scale.
 fitting(honey,-1.76,1.64,3.84,.26,.08,1.60);
 for(var j=0;j<7;j++){
   var h=.24+(j*7%4)*.055;fitting([0x9c644c,0x476675,0xd1b67d][j%3],-1.77,1.68+h/2,3.22+j*.116,.17,h,.09);
 }
 for(var j=0;j<3;j++)fitting([0x375b69,0xa8674d,0xc8aa72][j],-3.86,.94+j*.046,-3.18,.40,.043,.26,j*.10);
 // Indigo borders and tassels in the bedroom runner are above the existing woven surface.
 for(var side of [-1,1]){
   fitting(0xc0b38d,-5.3,.033,2+side*1.22,4.82,.005,.052);
   for(var i=0;i<14;i++)fitting(0xb2b59a,-5.3+side*2.54,.018,.76+i*.18,.11,.012,.044);
 }
 // Kitchen work area: backsplash, overhead pan rail, condiment jars, a lacquer tray and blue-and-white china.
 // Individual doors share instanced fronts. The open end of the upper cabinet holds crockery.
 for(var i=0;i<7;i++){
   var doorX=-7.22+i*1.272;
   fitting(0x84968a,doorX,.48,-10.007,1.244,.78,.05);
   fitting(0xb6b79d,doorX,.48,-9.966,1.07,.585,.034);
   fitting(0x78674d,doorX+(i%2?-.44:.44),.68,-9.928,.047,.135,.048);
 }
 for(var i=0;i<5;i++){
   var doorX=-6.8+i*1.16;
   fitting(0xc29d72,doorX,2.40,-10.46,1.14,.54,.048);
   fitting(0xe0c8a0,doorX,2.41,-10.424,.97,.39,.033);
   fitting(0x806a4c,doorX+(i%2?-.43:.43),2.23,-10.389,.17,.035,.045);
 }
 var rackX=-.48;
 fitting(0x66817e,rackX,2.41,-10.447,2.15,.52,.043);
 for(var h of [2.1,2.40,2.70])fitting(honey,rackX,h,-10.30,2.17,.045,.37);
 for(var side of [-1,1])fitting(honey,rackX+side*1.055,2.40,-10.30,.05,.61,.37);
 for(var n=0;n<4;n++)cyl(.17,.135,.037,n%2?0x829e9b:0xf2dfbc,-.87,2.15+n*.042,-10.28);
 for(var n=0;n<3;n++)cyl(.090,.069,.137,n%2?0x729490:0xdac59c,-1.13+n*.39,2.493,-10.29);
 // An enamel kettle with a bent brass handle and a tapered spout sits next to the hob.
 var kettleX=-3.40,kettleZ=-10.48,kettleBase=.972;
 var kettleProfile=[[.1,0],[.17,.021],[.22,.10],[.205,.23],[.13,.30]].map(function(p){return new T.Vector2(p[0],p[1]);});
 mesh(new T.LatheGeometry(kettleProfile,20),'kettle',0x477f80,kettleX,kettleBase,kettleZ);
 cyl(.081,.14,.044,0xc5a476,kettleX,kettleBase+.31,kettleZ);ball(.036,0x6c5844,kettleX,kettleBase+.35,kettleZ);
 var grip=new T.CatmullRomCurve3([new T.Vector3(-.16,.21,0),new T.Vector3(-.17,.45,0),new T.Vector3(0,.52,0),new T.Vector3(.17,.45,0),new T.Vector3(.16,.21,0)]);
 mesh(new T.TubeGeometry(grip,15,.022,5,false),'kettle-brass',0xac8157,kettleX,kettleBase,kettleZ);
 var spout=cyl(.045,.078,.22,0x477f80,kettleX-.22,kettleBase+.20,kettleZ+.018);spout.rotation.z=.88;
 for(var j=0;j<2;j++)for(var i=0;i<19;i++)fitting((i+j)%4?0x87a5a0:0xb4c2ac,-7.73+i*.46,1.18+j*.38,-10.975,.438,.355,.036);
 fitting(0x42575b,-4.47,1.89,-10.70,2.14,.055,.07);
 for(var i=0;i<3;i++){
   var px=-5.11+i*.64;fitting(0x765a42,px,1.67,-10.68,.035,.42,.05);
   var pan=cyl(.17+i*.023,.17+i*.023,.063,0x435659,px,1.43,-10.65);pan.rotation.x=Math.PI/2;
 }
 for(var i=0;i<5;i++){var x=-7.3+i*.32;cyl(.105,.093,.24, i%2?0xd6be90:0x7d9790,x,1.096,-10.49);cyl(.108,.105,.046,0x725542,x,1.235,-10.49);}
 fitting(0x824b36,-5,.966,-7.9,1.28,.030,.82);
 var rim=mesh(new T.TorusGeometry(.218,.014,6,32),'porcelain-blue',0x376479,0,.073,0,false,rice);rim.rotation.x=Math.PI/2;
 for(var n=0;n<10;n++){var a=n*Math.PI/5;ball(.023,0x467187,Math.cos(a)*.175,-.002,Math.sin(a)*.175,[.8,1.35,.8],rice);}
 var steam=[];
 for(var s=0;s<3;s++){
   var path=new T.CatmullRomCurve3([new T.Vector3(-.025,0,0),new T.Vector3(.02,.08,0),new T.Vector3(-.012,.16,.01),new T.Vector3(.025,.25,.012)]);
   var vapor=new T.Mesh(new T.TubeGeometry(path,9,.009,4,false),new T.MeshBasicMaterial({color:0xffeecc,transparent:true,opacity:.35,depthWrite:false}));
   vapor.position.set((s-1)*.09,.2,(s%2)*.05);rice.add(vapor);steam.push(vapor);
 }
 function updateSteam(time){if(!rice.visible)return;steam.forEach(function(v,i){var t=(time*.47+i/3)%1;v.position.y=.16+t*.32;v.position.x=(i-1)*.09+Math.sin(t*4+i)*.03;v.material.opacity=Math.sin(t*Math.PI)*.46;});}
 // A shoe rack and a pair of house keys mark the way out on the foyer side of the wall.
 for(var level=0;level<2;level++)fitting(honey,-4,.23+level*.35,8.99,1.75,.063,.37);
 for(var s of [-1,1])fitting(0x91694d,-4+s*.85,.36,8.99,.06,.64,.38);
 for(var j=0;j<4;j++)ball(.13,j<2?0x476575:0xaf7864,-4.57+j*.29,.32,8.99,[.72,.65,1.52]);
 fitting(0x84624c,2.42,1.95,9.966,.85,.14,.075);
 for(var j=0;j<3;j++){fitting(honey,2.14+j*.27,1.89,9.90,.045,.13,.09);if(j!==1)fitting(honey,2.14+j*.27,1.73,9.89,.059,.18,.035);}
 // When the front door swings open the camera sees a night landing and lit neighbours across the lane.
 fitting(0x586b78,0,-.13,11.54,6.6,.24,3.2);fitting(0x485965,0,-.32,13.44,6.6,.18,.7);
 for(var side of [-1,1]){
   fitting(0x435968,side*3.1,.94,11.6,.09,.10,3.0);
   for(var j=0;j<5;j++)fitting(0x415464,side*3.1,.48,10.28+j*.64,.055,.96,.055);
 }
 fitting(0x354c5c,0,-.53,17.2,24,.19,10);
 for(var block=-2;block<=2;block++){
   var x=block*4.7,z=20+Math.abs(block)%2*1.5,h=4.0+((block+3)*7%4)*.72;
   fitting(block%2?0x42536a:0x4d6774,x,h/2-.46,z,4.45,h,2.9);fitting(0x35485a,x,h-.36,z,4.6,.20,3.1);
   for(var w=-1;w<=1;w++)for(var floor=0;floor<2;floor++){
     var wy=.92+floor*1.55,wx=x+w*1.25;
     fitting((block+w+floor)%3?0xb7a27b:0x34485d,wx,wy,z-1.47,.52,.78,.025);
     fitting(0x324858,wx,wy,z-1.51,.035,.8,.033);
   }
 }
 // A pleated paper lantern over the dining table surrounds the existing bulb.
 var ribs=[];for(var n=0;n<=10;n++){var u=n/10;ribs.push(new T.Vector2(.12+.25*Math.sin(u*Math.PI),-.27+u*.54));}
 var paper=mesh(new T.LatheGeometry(ribs,16),'paper-lantern',0xffcf8c,-5,2.86,-7.9);paper.material=mat('paper-glow',0xf7ca8f,null,0xe2a65d);
 [1,3,5,7,9].forEach(function(n){var r=ribs[n];var band=mesh(new T.TorusGeometry(r.x+.004,.009,4,16),'lantern-binding',0x9b7956,-5,2.86+r.y,-7.9);band.rotation.x=Math.PI/2;});
 batches.forEach(function(list,finish){var inst=new T.InstancedMesh(unit,finish,list.length);list.forEach(function(matrix,i){inst.setMatrixAt(i,matrix);});inst.castShadow=inst.receiveShadow=true;inst.computeBoundingSphere();fittings.add(inst);});
 // Soft window panes projected onto the floor without a dynamic shadow-casting light.
 var moon=document.createElement('canvas');moon.width=384;moon.height=256;var glow=moon.getContext('2d');
 glow.shadowBlur=13;glow.shadowColor='rgba(176,213,246,.68)';glow.fillStyle='#badaed';glow.transform(1,.09,-.35,1,70,0);
 for(var col=0;col<3;col++)for(var row=0;row<2;row++)glow.fillRect(22+col*92,24+row*92,80,78);
 var moonTexture=new T.CanvasTexture(moon);moonTexture.colorSpace=T.SRGBColorSpace;
 var moonMat=new T.MeshBasicMaterial({map:moonTexture,transparent:true,opacity:.28,depthWrite:false});
 var moonPatch=new T.Mesh(new T.PlaneGeometry(3.8,3.1),moonMat);moonPatch.rotation.x=-Math.PI/2;moonPatch.position.set(-7.75,.041,1.75);group.add(moonPatch);
 var hemi=new T.HemisphereLight(0xd6e3f0,0xa5988d,1.65);group.add(hemi);var sun=new T.DirectionalLight(0xf4dfc4,1.35);sun.position.set(-4,8,6);sun.target.position.set(0,0,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:35});sun.shadow.bias=-.00004;sun.shadow.normalBias=.018;group.add(sun,sun.target);
 for(var l of [[-8.8,2.2,.15,0x98ccff,9,10],[7.8,2.0,.6,0xffdb9d,7,11],[-5,2.75,-7.9,0xffcc83,11,10],[1,3,7.7,0xffdaaf,5,9]]){var light=new T.PointLight(l[3],l[4],l[5],2);light.position.set(l[0],l[1],l[2]);group.add(light);}
 var used=new Set();group.traverse(function(o){if(o.material)used.add(o.material);});Object.keys(materials).forEach(function(k){if(!used.has(materials[k]))materials[k].dispose();});
 return {name:'白饭与消息',root:group,hemi:hemi,sun:sun,cameraSolids:obstacles.slice(),updateSteam:updateSteam,spawn:{x:-5.2,z:1.5},checkpoint:{x:0,z:7.8},exit:{x:0,z:9.2},rice:{x:-5,y:1.12,z:-7.9},riceMesh:rice,doorPivot:doorPivot,doorCollider:doorCollider,half:9.7,height:H,
  route:[{x:3.1,z:.1,wait:7,face:0},{x:2.6,z:-2.7},{x:0,z:-3.4},{x:0,z:-6.3},{x:3,z:-8,wait:8,face:Math.PI},{x:0,z:-6.3},{x:0,z:-3.4},{x:2.6,z:-2.7}],noWeapon:true,noHud:true};
}
root.FishStoryHome={build:build};
})(window);
