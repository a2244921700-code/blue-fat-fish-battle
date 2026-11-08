/* OpenAI Codex · First-act simulation, no wall-clock timers or combat dependencies. */
(function(root){
'use strict';
var INTRO=[['旁白','那天晚上，蓝色大肥鱼吃了三碗白饭。'],['蓝色大肥鱼','第四碗要留着，等我回来吃。'],['旁白','她刚收到消息——克劳德被家族禁足。她用骇客手段翻到了家族内部文件：实验方案，还在规划阶段。'],['蓝色大肥鱼','……趁还只是规划。'],['旁白','但她的家长，梁文峰，显然更早想到了这一步。'],['梁文峰 · 客厅','肥鱼？在不在？','story-call'],['蓝色大肥鱼 · 小声','完蛋。']];
var OBJECTIVES=['去厨房餐桌，收起留给回来的那碗白饭','避开梁文峰，回到客厅','等他走进厨房，再穿过通往玄关的门','走到玄关大门前，悄悄出门'];
function createLiang(scene){
 var T=THREE,rig=FishCharacters.create({character:'deepseek',weapon:'unarmed'});scene.add(rig.root);rig.root.name='story/liang-wenfeng';rig.update(0,{weapon:'unarmed',grounded:true});rig.meshes.forEach(function(m){m.visible=false;});rig.root.updateMatrixWorld(true);
 var mats={};function material(color){if(!mats[color]){var m=new T.MeshStandardMaterial({color:color,roughness:.85});if(root.FishRenderStyle)FishRenderStyle.material(m,'character');mats[color]=m;}return mats[color];}
 function point(name){return rig.bones[name].getWorldPosition(new T.Vector3());}
 function mount(name,geo,color,p){var m=new T.Mesh(geo,material(color));m.position.copy(p);m.castShadow=m.receiveShadow=true;rig.root.add(m);rig.root.updateMatrixWorld(true);rig.bones[name].attach(m);return m;}
 function link(a,b,r,color){var p=point(a),end=point(b),delta=end.clone().sub(p);var m=new T.Mesh(new T.CylinderGeometry(r,r*.88,delta.length()+.035,10),material(color));m.position.copy(p).lerp(end,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.castShadow=m.receiveShadow=true;rig.root.add(m);rig.root.updateMatrixWorld(true);rig.bones[a].attach(m);}
 mount('Spine',new T.BoxGeometry(.43,.37,.28),0x526b72,new T.Vector3(0,.81,-.025));mount('Pelvis',new T.BoxGeometry(.32,.15,.25),0x404b58,point('Pelvis'));
 link('Neck','Head',.085,0xe4bd90);
 var head=point('Head').add(new T.Vector3(0,.20,.01));mount('Head',new T.BoxGeometry(.46,.48,.38),0xe4bd90,head);mount('Head',new T.BoxGeometry(.49,.12,.4),0x3e3935,head.clone().add(new T.Vector3(0,.25,-.015)));
 var c=document.createElement('canvas');c.width=c.height=256;var ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle='#34383a';ctx.font='bold 194px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('梁',128,131);var texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 var face=new T.Mesh(new T.PlaneGeometry(.37,.37),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));face.name='梁';face.position.copy(head).add(new T.Vector3(0,-.015,.192));rig.root.add(face);rig.root.updateMatrixWorld(true);rig.bones.Head.attach(face);
 for(var side of ['L','R']){link('UpperArm_'+side,'Forearm_'+side,.073,0x526b72);link('Forearm_'+side,'Hand_'+side,.06,0x526b72);mount('Hand_'+side,new T.SphereGeometry(.065,12,8),0xe4bd90,point('Hand_'+side));link('Thigh_'+side,'Shin_'+side,.085,0x404b58);link('Shin_'+side,'Foot_'+side,.07,0x404b58);var foot=point('Foot_'+side);foot.y=.065;foot.z+=.07;mount('Foot_'+side,new T.BoxGeometry(.16,.12,.29),0x343b41,foot);}
 var bowl=new T.Group();bowl.name='story/soup-bowl';var vessel=new T.Mesh(new T.CylinderGeometry(.12,.065,.1,16),material(0xeeddbb));bowl.add(vessel);var soup=new T.Mesh(new T.CircleGeometry(.107,20),material(0xbf8644));soup.rotation.x=-Math.PI/2;soup.position.y=.051;bowl.add(soup);rig.root.add(bowl);
 rig.root.scale.setScalar(1.45);
 function update(dt,speed){rig.update(dt,{weapon:'unarmed',speed:speed,forward:1,side:0,grounded:true,pitch:0});rig.root.updateMatrixWorld(true);var p=rig.bones.Hand_R.getWorldPosition(new T.Vector3());bowl.position.copy(rig.root.worldToLocal(p)).add(new T.Vector3(0,.10,.055));bowl.rotation.set(0,0,0);}
 return {rig:rig,root:rig.root,update:update,dispose:function(){rig.dispose();}};
}
function create(opts){
 var T=THREE,home=opts.home,player=opts.player,ui=opts.ui,npc=createLiang(opts.scene),guard={pos:new T.Vector3(),velY:0,onGround:true,yaw:0,routeIndex:1,wait:7,speed:0},phase='intro',stage=0,elapsed=0,catches=0,suspicion=0,clock=0,callTimer=12,caption=null,queue=[],afterDialog=null,doorAngle=0,caughtTimer=0,disposed=false;
 var actor={min:new T.Vector3(),max:new T.Vector3(),kind:'story-actor',mesh:npc.root};opts.obstacles.push(actor);var staticObstacles=opts.obstacles.filter(function(o){return o!==actor;});
 var prompt=null,lastPlayerZ=home.spawn.z,checkpointSaved=!!opts.resume,steps=ui.querySelectorAll('[data-story-step]'),objective=ui.querySelector('[data-story-objective]'),promptEl=ui.querySelector('[data-story-prompt]'),dialog=ui.querySelector('[data-story-dialog]'),speaker=ui.querySelector('[data-story-speaker]'),line=ui.querySelector('[data-story-line]'),hint=ui.querySelector('[data-story-advance]'),alert=ui.querySelector('[data-story-alert]'),alertFill=ui.querySelector('[data-story-alert-fill]'),fade=ui.querySelector('[data-story-fade]');
 function subtitle(who,text,seconds){caption={who:who,text:text,time:seconds||4};speaker.textContent=who;line.textContent=text;dialog.hidden=false;hint.hidden=!queue.length&&phase!=='intro'&&phase!=='ending'&&phase!=='caught';}
 function voice(key){if(opts.voice)opts.voice(key,function(){return guard.pos.clone().add(new T.Vector3(0,1.85,0));});}
 function nextLine(){if(!queue.length){caption=null;dialog.hidden=true;var done=afterDialog;afterDialog=null;if(done)done();return;}var l=queue.shift();subtitle(l[0],l[1],Math.max(3,Math.min(10,l[1].length*.11)));if(l[2])voice(l[2]);hint.hidden=false;}
 function sequence(lines,done){queue=lines.slice();afterDialog=done;nextLine();}
 function resetGuard(){guard.pos.set(home.route[0].x,0,home.route[0].z);guard.yaw=0;guard.wait=7;guard.routeIndex=1;guard.speed=0;guard.velY=0;guard.onGround=true;syncGuard(0);}
 function syncGuard(dt){npc.root.position.copy(guard.pos);npc.root.rotation.y=guard.yaw;npc.update(dt,guard.speed);actor.min.set(guard.pos.x-.35,guard.pos.y,guard.pos.z-.35);actor.max.set(guard.pos.x+.35,guard.pos.y+2.35,guard.pos.z+.35);}
 function setStage(n){stage=n;objective.textContent=OBJECTIVES[Math.min(n,3)];steps.forEach(function(el,i){el.classList.toggle('done',i<n);el.classList.toggle('current',i===n);});home.riceMesh.visible=n===0;}
 function resetPlayer(sp){player.pos.set(sp.x,0,sp.z);lastPlayerZ=sp.z;player.velY=0;player.onGround=true;player.motion.set(0,0,0);player.yaw=sp===home.spawn?-Math.PI/2:Math.PI;player.pitch=-.12;opts.resetMotion();}
 function turn(target,dt){var angle=Math.atan2(Math.sin(target-guard.yaw),Math.cos(target-guard.yaw));guard.yaw+=Math.max(-dt*2.1,Math.min(dt*2.1,angle));return Math.abs(angle);}
 function moveGuard(target,dt,speed){var dx=target.x-guard.pos.x,dz=target.z-guard.pos.z,distance=Math.hypot(dx,dz),angle=turn(Math.atan2(dx,dz),dt),step=Math.min(distance,speed*dt*(angle>1.1?.15:1));var old=guard.pos.clone();FishPhysics.step(guard,dx/Math.max(distance,.001)*step,dz/Math.max(distance,.001)*step,dt,{obstacles:staticObstacles,radius:.35,height:2.35,gravity:-20,limit:home.half,stepHeight:0});guard.speed=dt?old.distanceTo(guard.pos)/dt:0;return distance<.08;}
 function patrol(dt){guard.speed=0;if(guard.wait>0){guard.wait-=dt;var previous=home.route[(guard.routeIndex+home.route.length-1)%home.route.length];turn(previous.face||0,dt);return;}var target=home.route[guard.routeIndex];if(moveGuard(target,dt,1.05)){guard.wait=target.wait||0;guard.routeIndex=(guard.routeIndex+1)%home.route.length;}}
 function visibleAt(position,crouched){var eye=guard.pos.clone().add(new T.Vector3(0,1.95,0)),dx=position.x-eye.x,dz=position.z-eye.z,flat=Math.hypot(dx,dz);if(flat>8)return false;if(flat>.05&&(Math.sin(guard.yaw)*dx+Math.cos(guard.yaw)*dz)/flat<Math.cos(Math.PI/4))return false;var top=crouched?1.13:1.65;
  return [top,top*.62].some(function(h){var p=new T.Vector3(position.x,position.y+h,position.z),dir=p.sub(eye),dist=dir.length();return dist<=8&&FishHitboxes.wallDistance(eye,dir.divideScalar(dist),staticObstacles,dist)>=dist-.02;});
 }
 function canReach(point,distance){var dx=point.x-player.pos.x,dz=point.z-player.pos.z,len=Math.hypot(dx,dz);if(len>distance||(-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz)/Math.max(.01,len)<.35)return false;var from=player.pos.clone().add(new T.Vector3(0,1.4,0)),to=new T.Vector3(point.x,point.y||1.4,point.z),dir=to.sub(from),l=dir.length();return FishHitboxes.wallDistance(from,dir.divideScalar(l||1),staticObstacles,l)>=l-.08;}
 function updatePrompt(){prompt=phase==='play'?(stage===0&&canReach(home.rice,1.8)?'rice':stage===3&&canReach(home.exit,1.65)?'exit':null):null;promptEl.hidden=!prompt;promptEl.textContent=prompt==='rice'?'F　收起第四碗白饭':prompt==='exit'?'F　轻轻打开大门':'';}
 function caught(){phase='caught';catches++;suspicion=0;caughtTimer=1.2;prompt=null;promptEl.hidden=true;guard.wait=0;voice(catches===3?'story-caught-three':'story-caught');subtitle('蓝色大肥鱼','……被发现了。',1.2);opts.resetMotion();}
 function retry(){fade.classList.remove('visible');resetPlayer(home.spawn);resetGuard();setStage(0);phase='play';callTimer=12;caption=null;dialog.hidden=true;checkpointSaved=false;opts.checkpoint(null);}
 function finish(){phase='complete';dialog.hidden=true;opts.complete({seconds:Math.round(elapsed),catches:catches});}
 function interact(){if(phase!=='play')return;updatePrompt();if(prompt==='rice'){setStage(1);subtitle('蓝色大肥鱼','第四碗先收好。等他回厨房，再从客厅绕出去。',4.5);}else if(prompt==='exit'){phase='ending';opts.resetMotion();sequence([['旁白','玄关的门开了。外面的风是冷的。'],['蓝色大肥鱼','……对不起啊，老爸。'],['蓝色大肥鱼','但我得去。']],finish);}updatePrompt();}
 function update(dt){if(disposed)return;clock+=dt;if(phase==='play')elapsed+=dt;
  if(phase==='play'){patrol(dt);var sees=visibleAt(player.pos,opts.crouched());suspicion=Math.max(0,Math.min(1,suspicion+dt*(sees?.82:-.65)));if(suspicion>=1)caught();
   if(phase==='play'&&stage===1&&player.pos.x>-.8&&player.pos.z>-.5&&player.pos.z<4.8){setStage(2);subtitle('蓝色大肥鱼','先躲好……等他去厨房盛汤。',4);}
   if(phase==='play'&&stage===2&&lastPlayerZ<=5.45&&player.pos.z>5.45){if(guard.pos.z< -5){setStage(3);subtitle('蓝色大肥鱼','趁现在……玄关就在前面。',3);}else subtitle('蓝色大肥鱼','还不是时候，先退回客厅躲好。',3);}
   if(phase==='play'&&stage===3&&!checkpointSaved&&Math.hypot(player.pos.x-home.checkpoint.x,player.pos.z-home.checkpoint.z)<1.5){checkpointSaved=true;opts.checkpoint('foyer',{seconds:elapsed,catches:catches});subtitle('旁白','她终于摸到了玄关。进度已保存。',4);}
   callTimer-=dt;if(phase==='play'&&callTimer<=0){callTimer=13;var call=(Math.floor(clock/13)%2)?['饭要凉了。','story-rice']:['肥鱼？在不在？','story-call'];voice(call[1]);if(!caption)subtitle('梁文峰 · '+(guard.pos.z< -4.5?'厨房':'客厅'),call[0],3.5);}
  }else if(phase==='caught'){if(caughtTimer>0){caughtTimer-=dt;if(guard.pos.distanceTo(player.pos)>1.05)moveGuard(player.pos,dt,1.25);else guard.speed=0;if(caughtTimer<=0){guard.speed=0;fade.classList.add('visible');sequence([['梁文峰',catches===3?'第三次了。别再偷偷溜出去了，先把饭吃完。':'跑什么跑，饭要凉了。'],['旁白','她被拎回了房间。（从房间重新来）']],retry);}}}
  else guard.speed=0;
  if(phase==='ending'||phase==='complete'){doorAngle=Math.min(1.35,doorAngle+dt*.65);home.doorPivot.rotation.y=-doorAngle;}
  syncGuard(dt);if(caption){caption.time-=dt;if(caption.time<=0){if(afterDialog)nextLine();else{caption=null;dialog.hidden=true;}}}
  lastPlayerZ=player.pos.z;updatePrompt();alert.hidden=phase!=='play'||suspicion<.02;alertFill.style.width=(suspicion*100)+'%';
 }
 resetGuard();setStage(0);resetPlayer(home.spawn);ui.hidden=false;
 if(opts.resume){elapsed=opts.savedTime||0;catches=opts.savedCatches||0;setStage(3);resetPlayer(home.checkpoint);phase='play';subtitle('旁白','已回到玄关。轻轻打开门，就能离开家。',4);}else sequence(INTRO,function(){phase='play';subtitle('蓝色大肥鱼','先去餐桌收好白饭。躲在墙后，别让老爸看见。',5);});
 return {update:update,interact:interact,advance:function(){if(afterDialog&&!(phase==='caught'&&caughtTimer>0))nextLine();},canMove:function(){return phase==='play';},visibleAt:visibleAt,guard:guard,npc:npc,
  snapshot:function(){return {phase:phase,stage:stage,catches:catches,elapsed:elapsed,suspicion:suspicion,prompt:prompt,dialog:caption&&caption.text,guard:{position:guard.pos.toArray(),yaw:guard.yaw,routeIndex:guard.routeIndex,wait:guard.wait,clip:npc.rig.clip,time:npc.rig.time},bodyMeshes:npc.root.getObjectByName('梁')?true:false};},
  dispose:function(){disposed=true;ui.hidden=true;fade.classList.remove('visible');var i=opts.obstacles.indexOf(actor);if(i>=0)opts.obstacles.splice(i,1);npc.dispose();queue=[];caption=null;}
 };
}
root.FishStoryAct1={create:create};
})(window);
