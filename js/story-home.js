/* OpenAI Codex · Act I home. Owned resources, solid door openings and real cover. */
(function(root){
'use strict';
function build(scene,obstacles,wallMeshes){
 var T=THREE,group=new T.Group(),materials={},H=3.7;group.name='story/home';scene.add(group);
 function texture(kind){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');
  if(kind==='wood'){g.fillStyle='#bd956a';g.fillRect(0,0,256,256);for(var y=0;y<256;y+=32){g.fillStyle=['#bd956a','#c69f77','#ad8259'][y/32%3];g.fillRect(0,y,256,31);g.fillStyle='#8d6848';g.fillRect((y/32%2)*128,y,1,32);for(var j=0;j<5;j++){g.strokeStyle='rgba(108,76,46,.10)';g.beginPath();g.moveTo(0,y+4+j*5);g.bezierCurveTo(80,y+j*5,180,y+8+j*5,256,y+4+j*5);g.stroke();}}}
  else if(kind==='fabric'){g.fillStyle='#ffffff';g.fillRect(0,0,256,256);g.strokeStyle='#d6d4cc';g.lineWidth=1;for(var i=0;i<256;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
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
 box(20,.012,6.35,0xc8bca2,0,.008,-7.72);cabinet(-3.4,-10.5,9,.9,.8,0xe2ceaa);cabinet(8.7,-10.2,1.1,2.3,.9,0xd3dad4);box(8,.6,.43,0xd8c49c,-3.4,2.4,-10.7,true);box(1.15,.03,.65,0x344147,-4.8,1,-10.5);for(var s of [-1,1])cyl(.18,.18,.025,0x697578,-4.8+s*.27,1.025,-10.5);box(.8,.035,.5,0x909c9c,-1.5,1,-10.5);cyl(.025,.025,.35,0xbfc5bb,-1.5,1.17,-10.75);cabinet(-1.85,-5.1,1.35,2.3,.8,0x75918b);
 table(-5,-7.9,2.3,1.4,.89);chair(-6.7,-7.9,Math.PI/2);chair(-3.3,-7.9,-Math.PI/2);rug(-5,-7.9,4.5,3,0x9a8c70);
 var rice=new T.Group();rice.name='story/rice-bowl';rice.position.set(-5,1.02,-7.9);group.add(rice);cyl(.22,.12,.16,0xf9edd6,0,0,0,rice);ball(.2,0xfff9e8,0,.085,0,[1,.55,1],rice);for(var i=0;i<2;i++)box(.018,.018,.42,0xb68249,-4.7+i*.04,.98,-7.8,false,null,group);
 cyl(.02,.02,.5,0x715a40,-5,3.35,-7.9);cyl(.24,.4,.25,0xffe7b5,-5,3.0,-7.9);
 cabinet(-4,9.5,2,.95,.6,0x9e7c55);plant(-5.5,9.1);picture(-4,2,9.97,Math.PI,1.6,.85);rug(0,8.6,3.4,1.5,0x8f9c8d);picture(2,2,5.16,0,1.4,.8);
 var doorPivot=new T.Group();doorPivot.position.set(-1.88,0,10.15);group.add(doorPivot);var door=box(3.76,2.76,.12,0x78583f,1.88,1.38,0,false,null,doorPivot);var doorCollider=solid(door,'story-door');box(.22,.06,.1,0xcab17b,3.15,1.2,-.12,false,null,doorPivot);for(var yy of [.65,2])box(3.1,1,.025,0x8a694a,1.88,yy,-.075,false,null,doorPivot);
 var hemi=new T.HemisphereLight(0xffebd1,0xb0b9b8,2.0);group.add(hemi);var sun=new T.DirectionalLight(0xffe4b7,1.65);sun.position.set(-4,8,6);sun.target.position.set(0,0,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:35});sun.shadow.bias=-.00004;sun.shadow.normalBias=.018;group.add(sun,sun.target);
 for(var l of [[-7,2.6,-.6,0xffd699,4,11],[5,2.9,-.5,0xffdda8,4,12],[-5,2.8,-7.9,0xffd291,4,11],[1,3,7.7,0xffdbad,4,10]]){var light=new T.PointLight(l[3],l[4],l[5],2);light.position.set(l[0],l[1],l[2]);group.add(light);cyl(.22,.22,.08,0xffe6b2,l[0],3.6,l[2]);}
 var used=new Set();group.traverse(function(o){if(o.material)used.add(o.material);});Object.keys(materials).forEach(function(k){if(!used.has(materials[k]))materials[k].dispose();});
 return {name:'白饭与消息',root:group,hemi:hemi,sun:sun,spawn:{x:-5.2,z:1.5},checkpoint:{x:0,z:7.8},exit:{x:0,z:9.2},rice:{x:-5,y:1.12,z:-7.9},riceMesh:rice,doorPivot:doorPivot,doorCollider:doorCollider,half:9.7,height:H,
  route:[{x:3.1,z:.1,wait:7,face:0},{x:2.6,z:-2.7},{x:0,z:-3.4},{x:0,z:-6.3},{x:3,z:-8,wait:8,face:Math.PI},{x:0,z:-6.3},{x:0,z:-3.4},{x:2.6,z:-2.7}],noWeapon:true,noHud:true};
}
root.FishStoryHome={build:build};
})(window);
