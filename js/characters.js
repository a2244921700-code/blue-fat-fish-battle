/* OpenAI Codex · Authored rigs, deduplicated motion data, independent mixers. */
(function(){
'use strict';
var T=THREE,assets={},pending={},motionPending=null,clipSets={},baseMeta={},instances=new Set(),viewOrigins={},HEIGHT_SCALE=2;
var base='assets/characters/runtime/',manifest=FISH_CHARACTER_MANIFEST;
manifest.animations.forEach(function(m){baseMeta[m.name]=m;});
function script(url){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=url;s.onload=function(){s.remove();resolve();};s.onerror=function(){s.remove();reject(new Error('无法载入角色资源 '+url));};document.head.appendChild(s);});}
function decode(encoded){var raw=atob(encoded),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes.buffer;}
function parseMotionData(data){
 var buffer=decode(data.data),pool=data.pool.map(function(p){return new Float32Array(buffer,p[0],p[1]);});
 Object.keys(data.characters).forEach(function(id){var clips={};data.characters[id].forEach(function(c){clips[c.name]=new T.AnimationClip(c.name,-1,c.tracks.map(function(t){var Type=t.type==='quaternion'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack;return new Type(t.name,pool[t.times],pool[t.values],t.step?T.InterpolateDiscrete:T.InterpolateLinear);}));});clipSets[id]=clips;});
}
function motions(){if(motionPending)return motionPending;motionPending=script(base+'motion-data.js').then(function(){
 parseMotionData(window.FISH_MOTION_DATA);delete window.FISH_MOTION_DATA;
}).catch(function(e){motionPending=null;throw e;});return motionPending;}
function parse(buffer,id){id=id||'deepseek';return new Promise(function(resolve,reject){new FishGLTF.GLTFLoader().parse(buffer,'',function(gltf){
 assets[id]=gltf;gltf.animations=Object.values(clipSets[id]||{});
 gltf.scene.traverse(function(o){if(o.geometry)o.geometry.userData.artShared=true;if(o.material){o.material.userData.artShared=true;Object.keys(o.material).forEach(function(k){var t=o.material[k];if(t&&t.isTexture){t.userData.artShared=true;t.anisotropy=4;}});}});
 if(window.FishRenderStyle)FishRenderStyle.applyTree(gltf.scene,'character');resolve(gltf);
 },reject);});}
function loadModel(id){
 if(assets[id])return Promise.resolve(assets[id]);if(pending[id])return pending[id];
 pending[id]=(async function(){await script(base+manifest.characters[id].file);var buffer=decode(window.FISH_MODEL_DATA[id]);delete window.FISH_MODEL_DATA[id];return await parse(buffer,id);})().catch(function(err){delete pending[id];throw err;});return pending[id];
}
async function load(progress,ids){
 ids=ids||Object.keys(manifest.characters);
 if(progress)progress('读取角色与共享动作');await motions();
 for(var id of ids)await loadModel(id);
 if(progress)progress('解析蒙皮、91 个动作与装备');await FishHelmet.load();if(window.FishGoggles)await FishGoggles.load(ids);return assets.deepseek;
}
function profile(weapon){return weapon==='knife'?'Dagger':weapon==='sword'?'LongSword':weapon==='rifle'||weapon==='sniper'?'Rifle':weapon==='pistol'||weapon==='fishpistol'?'Pistol':'Unarmed';}
function locomotionSuffix(state){
 if(state.grounded===false)return 'JumpLoop';
 var crouch=state.crouch?'Crouch':'';
 if(!(state.speed>.06))return crouch+'Idle';
 // Players supply velocity; bots supply frame displacement. Direction tests
 // must be independent of those units and of the render frame rate.
 var f=state.forward===undefined?1:state.forward,side=state.side||0,length=Math.hypot(f,side)||1;
 return crouch+(Math.abs(side)>Math.abs(f)*1.2?(side>0?'StrafeLeft':'StrafeRight'):f/length<-.2?'WalkBack':!crouch&&state.speed>1.2?'Run':'Walk');
}
function V(x,y,z){return new T.Vector3(x||0,y||0,z||0);}
var specs=[
 ['head','Head','Head',.145,[0,.105,.048],[0,.265,.025]],
 ['chest','Spine','Neck',.075],['abdomen','Pelvis','Spine',.087],['pelvis','Pelvis','Pelvis',.073,[0,-.045,0],[0,-.02,0]]
];
['L','R'].forEach(function(side){specs.push(['upperArm','UpperArm_'+side,'Forearm_'+side,.039],['forearm','Forearm_'+side,'Hand_'+side,.033],['hand','Hand_'+side,'Hand_'+side,.032,[0,0,0],[0,.03,0]],['thigh','Thigh_'+side,'Shin_'+side,.044],['shin','Shin_'+side,'Foot_'+side,.035],['foot','Foot_'+side,'Toe_'+side,.036]);});
function create(opts){
 opts=opts||{};var characterId=opts.character||'deepseek',asset=assets[characterId],clips=clipSets[characterId];
 if(!asset)throw new Error('角色尚未载入，请通过场景载入流程进入');
 var meta=Object.assign({},baseMeta);(manifest.characters[characterId].animationOverrides||[]).forEach(function(m){meta[m.name]=m;});
 var root=new T.Group();root.name=characterId+'/character';
 var model=FishSkeletonUtils.clone(asset.scene);model.scale.setScalar(HEIGHT_SCALE);root.add(model);
 var bones={},meshes=[],skeletons=new Set();model.traverse(function(o){if(o.isBone||o.name.indexOf('Socket_')===0)bones[o.name]=o;if(o.isSkinnedMesh){meshes.push(o);skeletons.add(o.skeleton);o.frustumCulled=false;o.castShadow=!opts.view;o.receiveShadow=!opts.view;
  // The world rig is complete even for its owner. Camera-specific hiding happens
  // only during the local render pass, not by removing body meshes or hitboxes.
  if(opts.view)o.visible=o.name==='Mesh_Arms';
 }});
 // Three meshes reference the same cloned bones: one bone texture/update per character.
 var sharedSkeleton=meshes[0].skeleton;meshes.forEach(function(m){if(m.skeleton.bones.every(function(b,i){return b===sharedSkeleton.bones[i];})){m.skeleton=sharedSkeleton;}});
 skeletons.forEach(function(s){if(s!==sharedSkeleton)s.dispose();});
 // Calibrate the entire first-person rig against an authored neutral grip,
 // not a character's height guess. Arms and gun retain their shared animation.
 if(opts.view){
  if(!viewOrigins[characterId]){
   var sampler=new T.AnimationMixer(model);sampler.clipAction(clips.RifleIdle).play();sampler.update(0);root.updateMatrixWorld(true);
   var grip=V(-.005,.025,-.048).applyMatrix4(bones.Socket_Weapon.matrixWorld).applyAxisAngle(V(0,1,0),Math.PI);
   viewOrigins[characterId]=V(-.03,.10,-.04).sub(grip);sampler.stopAllAction();sampler.uncacheRoot(model);
  }
  root.rotation.y=Math.PI;
 }
 var mixer=new T.AnimationMixer(model),actions={},current=null,currentName='',oneShot=null,attack=null,weapon=null,weaponId=null;
 var upper=new Set(manifest.upperBody),fireAction=null,reloadAction=null,lastReload=false,grenadeUpper=null;
 var caps=specs.map(function(s,i){return {id:i,part:s[0],multiplier:FishHitboxes.multipliers[s[0]],a:V(),b:V(),radius:s[3]*HEIGHT_SCALE,spec:s};});
 var scale=V(),lastGround=true,lastCrouch=false,aimPitch=0;
 var aimApplied=false,aimChest=new T.Quaternion(),aimNeck=new T.Quaternion();
 var boltApplied=false,boltBones=['UpperArm_R','Forearm_R','Hand_R'].map(function(n){return {bone:bones[n],q:new T.Quaternion()};}),boltWeaponPosition=V(),boltWeaponRotation=new T.Quaternion(),boltWeaponScale=V(),weaponHome=null;
 var api={characterId:characterId,root:root,model:model,bones:bones,meshes:meshes,mixer:mixer,capsules:caps,weapon:null,attack:null,view:!!opts.view,local:!!opts.local};
 // PropertyMixer can skip writing an unchanged animation track. Restore our
 // previous procedural layer first, or constant neck tracks accumulate pitch
 // every frame (including update(0)), spinning the owner's head and shadow.
 function restoreAimPose(){if(!aimApplied)return;bones.Chest.quaternion.copy(aimChest);bones.Neck.quaternion.copy(aimNeck);aimApplied=false;}
 function beginAimPose(){restoreAimPose();aimChest.copy(bones.Chest.quaternion);aimNeck.copy(bones.Neck.quaternion);aimApplied=true;}
 function restoreBoltPose(){if(!boltApplied)return;boltBones.forEach(function(p){p.bone.quaternion.copy(p.q);});if(weapon){weapon.position.copy(boltWeaponPosition);weapon.quaternion.copy(boltWeaponRotation);weapon.scale.copy(boltWeaponScale);}boltApplied=false;}
 function applyBoltPose(t){
  var phase=FishSniperCycle.animate(weapon,t);api.boltTime=phase.active?t:null;if(!phase.active||!weapon.boltGrip)return;
  boltBones.forEach(function(p){p.q.copy(p.bone.quaternion);});boltWeaponPosition.copy(weapon.position);boltWeaponRotation.copy(weapon.quaternion);boltWeaponScale.copy(weapon.scale);boltApplied=true;
  root.updateWorldMatrix(true,true);var held=weapon.matrixWorld.clone(),target=bones.Grip_R.getWorldPosition(V()).lerp(weapon.boltGrip.getWorldPosition(V()),phase.hand);
  // Socket_Weapon is attached to the right hand. Hold the rifle at its animated
  // support position while that hand reaches the bolt, then restore the mount
  // before the next animation sample. The left support grip stays in place.
  for(var pass=0;pass<5;pass++)[bones.Forearm_R,bones.UpperArm_R].forEach(function(joint){
   root.updateWorldMatrix(true,true);var origin=joint.getWorldPosition(V()),from=bones.Grip_R.getWorldPosition(V()).sub(origin),to=target.clone().sub(origin);if(from.lengthSq()<1e-8||to.lengthSq()<1e-8)return;
   var rotation=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=joint.getWorldQuaternion(new T.Quaternion()).premultiply(rotation);
   joint.quaternion.copy(joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
  });
  root.updateWorldMatrix(true,true);new T.Matrix4().copy(weapon.parent.matrixWorld).invert().multiply(held).decompose(weapon.position,weapon.quaternion,weapon.scale);
 }
 function action(name){if(!actions[name])actions[name]=mixer.clipAction(clips[name]);return actions[name];}
 function play(name,once,fade){
  if(!clips[name]||currentName===name)return;
  var next=action(name);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);next.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=!!once;next.play();
  if(current){current.fadeOut(fade===undefined?.12:fade);next.fadeIn(fade===undefined?.12:fade);}current=next;currentName=name;
 }
 function cancel(){attack=null;api.attack=null;oneShot=null;if(current&&/Attack/.test(currentName)){current.stop();currentName='';} }
 function equip(id){
  if(id===weaponId)return weapon;restoreBoltPose();restoreAimPose();cancel();weaponId=id;
  if(opts.view){root.position.copy(viewOrigins[characterId]);if(id==='sniper'){root.position.y-=.05;root.position.z-=.12;}}
  if(weapon){FishArt.disposeTree(weapon);weapon=null;}
  if(id==='grenade'){
   weapon=FishCombat.grenade();weapon.scale.setScalar(opts.view?.38:.5);weapon.muzzleTip=new T.Object3D();weapon.add(weapon.muzzleTip);bones.Socket_Throwable.add(weapon);
  }else if(id==='knife'||id==='sword'){
   // Measured v004 GLB: the mount's +Y is the blade axis (left wrist [+.02,-.037,0]).
   // Convert weapon +Z to mount +Y; the manifest describes the Blender authoring axes.
   weapon=FishCombat.rigBlade(id);weapon.rotation.x=-Math.PI/2;bones.Socket_Melee.add(weapon);
  }else if(id==='rifle'||id==='sniper'||id==='pistol'||id==='fishpistol'){
   weapon=FishPvpArt.weapon(id==='rifle'||id==='sniper'?id:'pistol');weapon.scale.setScalar(.5);weapon.rotation.x=-Math.PI/2;weapon.position.set(-.005,.025,-.048);bones.Socket_Weapon.add(weapon);
  }
  if(weapon)weapon.traverse(function(o){if(o.isMesh&&o!==weapon.flash){o.castShadow=!opts.view;o.receiveShadow=!opts.view;}});
  weaponHome=weapon?{position:weapon.position.clone(),rotation:weapon.quaternion.clone(),scale:weapon.scale.clone()}:null;
  api.weapon=weapon;api.weaponId=id;
  play(profile(id)+'Idle',false,.16);mixer.update(0);root.updateMatrixWorld(true);return weapon;
 }
 function readBlade(){
  if(!weapon||!weapon.userData.blade)return null;
  root.updateWorldMatrix(true,true);var d=weapon.userData.blade;
  var a=V().fromArray(d.base).applyMatrix4(weapon.matrixWorld),b=V().fromArray(d.tip).applyMatrix4(weapon.matrixWorld);weapon.getWorldScale(scale);
  return {a:a,b:b,radius:d.radius*Math.max(scale.x,scale.y,scale.z),length:a.distanceTo(b)};
 }
 function startAttack(heavy){
  if(attack||!weapon||!weapon.userData.blade)return null;
  restoreBoltPose();restoreAimPose();
  var name=profile(weaponId)+'Attack'+(heavy?'Heavy':'Light'),m=meta[name];
  play(name,true,.06);attack={time:0,previousTime:0,heavy:!!heavy,duration:m.duration_seconds,events:m.events_seconds,hit:new Set(),previousBlade:null};api.attack=attack;oneShot=null;
  mixer.update(0);updateCapsules();attack.previousBlade=readBlade();return attack;
 }
 function updateCapsules(){
  root.updateWorldMatrix(true,true);model.getWorldScale(scale);var s=Math.max(scale.x,scale.y,scale.z);
  caps.forEach(function(c){var sp=c.spec;c.a.fromArray(sp[4]||[0,0,0]).applyMatrix4(bones[sp[1]].matrixWorld);c.b.fromArray(sp[5]||[0,0,0]).applyMatrix4(bones[sp[2]].matrixWorld);c.radius=sp[3]*s;});return caps;
 }
 function fire(){
  var name=profile(weaponId)+'Fire';if(!clips[name])return;
  if(!actions[name+'Upper']){
   var additive=clips[name].clone();T.AnimationUtils.makeClipAdditive(additive,0,clips[profile(weaponId)+'Idle']);
   additive.name=name+'Upper';additive.tracks=additive.tracks.filter(function(t){return upper.has(t.name.split('.')[0]);});actions[name+'Upper']=mixer.clipAction(additive);
  }
  fireAction=actions[name+'Upper'];fireAction.reset().setLoop(T.LoopOnce,1).setEffectiveWeight(.8).play();
 }
 function aimAt(target){
  if(!weapon||weapon.userData.blade||opts.view)return;
  restoreBoltPose();
  beginAimPose();
  // Rotate the complete chest/arms chain, so neither hand detaches from the weapon.
  for(var i=0;i<3;i++){
   root.updateWorldMatrix(true,true);var from=weapon.muzzleTip.getWorldPosition(V()),want=V(target.x,target.y,target.z).sub(from).normalize();
   if(want.lengthSq()<.1)break;
   var forward=V(0,0,1).applyQuaternion(weapon.getWorldQuaternion(new T.Quaternion()));
   var delta=new T.Quaternion().setFromUnitVectors(forward,want),world=bones.Chest.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
   bones.Chest.quaternion.copy(bones.Chest.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
  }
 }
 function filtered(name,upperOnly){
  var key=name+(upperOnly?'UpperOnly':'LowerOnly');
  if(!clips[key]){clips[key]=clips[name].clone();clips[key].name=key;clips[key].tracks=clips[key].tracks.filter(function(t){return upper.has(t.name.split('.')[0])===upperOnly;});}meta[key]=meta[name];
  return key;
 }
 function update(dt,state){
  if(api.frozen)return null;
  restoreBoltPose();restoreAimPose();api.boltTime=null;
  state=state||{};if(state.weapon!==undefined)equip(state.weapon);
  var p=profile(weaponId);
  if(state.grenadeTime!==undefined){
   if(reloadAction)reloadAction.stop();lastReload=false;if(fireAction)fireAction.stop();oneShot=null;
   if(opts.view){play('GrenadeThrow',true,.07);current.setEffectiveTimeScale(1);mixer.update(dt);current.time=state.grenadeTime;}
   else {
    // Keep the authored throwing arms while the lower body continues walking,
    // crouching or jumping. Selecting slot 4 must not make a character glide.
    var lower=locomotionSuffix(state);
    play(filtered('Unarmed'+lower,false),false,.1);current.setEffectiveTimeScale(1);
    if(!grenadeUpper)grenadeUpper=action(filtered('GrenadeThrow',true));
    grenadeUpper.setLoop(T.LoopOnce,1).setEffectiveWeight(1).setEffectiveTimeScale(0);grenadeUpper.clampWhenFinished=true;grenadeUpper.play();
    mixer.update(dt);grenadeUpper.time=state.grenadeTime;lastGround=state.grounded!==false;lastCrouch=!!state.crouch;
   }
   mixer.update(0);
   if(weapon)weapon.visible=weaponId==='grenade'&&state.grenadeHeld!==false;
   updateCapsules();api.clip='GrenadeThrow';api.time=state.grenadeTime;return null;
  }
  if(grenadeUpper)grenadeUpper.stop();
  if(weapon)weapon.visible=true;
  if(attack){
   attack.previousTime=attack.time;attack.time=Math.min(attack.duration,attack.time+dt);mixer.update(dt);
  }else{
   var ground=state.grounded!==false,crouch=!!state.crouch;
   if(ground!==lastGround){oneShot={name:p+(ground?'JumpLand':'JumpStart'),time:0};lastGround=ground;}
   else if(crouch!==lastCrouch&&ground){oneShot={name:p+(crouch?'CrouchDown':'CrouchUp'),time:0};lastCrouch=crouch;}
   var suffix=locomotionSuffix(state);
   var name=oneShot?oneShot.name:p+suffix;if(!clips[name])name=p+'Idle';
   if(state.reload&&clips[p+'Reload']){
    name=filtered(name,false);
    if(!lastReload){reloadAction=action(filtered(p+'Reload',true));reloadAction.reset().setLoop(T.LoopOnce,1).setEffectiveWeight(1).setEffectiveTimeScale(meta[p+'Reload'].duration_seconds/(state.reloadDuration||meta[p+'Reload'].duration_seconds));reloadAction.clampWhenFinished=true;reloadAction.play();}
    lastReload=true;
   }else{if(lastReload&&reloadAction)reloadAction.stop();lastReload=false;}
   play(name,!!oneShot);
   if(oneShot){oneShot.time+=dt;if(oneShot.time>=meta[name].duration_seconds)oneShot=null;}
   var speed=meta[name].reference_speed_mps;
   current.setEffectiveTimeScale(speed?Math.max(.5,Math.min(3.2,state.speed/(speed*HEIGHT_SCALE))):1);
   mixer.update(dt);
  }
  if(!opts.view&&!attack&&!state.reload){
   if(state.aim)aimAt(state.aim);else{beginAimPose();aimPitch=state.pitch||0;bones.Chest.rotateX(-aimPitch*.65);bones.Neck.rotateX(-aimPitch*.2);}
  }
  applyBoltPose(weaponId==='sniper'&&!attack&&!state.reload?state.boltTime:null);
  updateCapsules();api.clip=currentName;api.time=current?current.time:0;return attack;
 }
 function finishAttack(){if(attack&&attack.time>=attack.duration){attack=null;api.attack=null;currentName='';}}
 function freezePose(){
  var pose=Object.keys(bones).map(function(name){var b=bones[name];return [b,b.position.clone(),b.quaternion.clone(),b.scale.clone()];});
  aimApplied=false;boltApplied=false;if(weapon&&weapon.spentCase)weapon.spentCase.visible=false;
  cancel();mixer.stopAllAction();pose.forEach(function(p){p[0].position.copy(p[1]);p[0].quaternion.copy(p[2]);p[0].scale.copy(p[3]);});api.frozen=true;updateCapsules();
 }
 function copyPoseFrom(other){restoreBoltPose();restoreAimPose();Object.keys(bones).forEach(function(n){if(other.bones[n]){bones[n].position.copy(other.bones[n].position);bones[n].quaternion.copy(other.bones[n].quaternion);bones[n].scale.copy(other.bones[n].scale);}});updateCapsules();}
 function reset(){restoreBoltPose();restoreAimPose();cancel();mixer.stopAllAction();api.frozen=false;current=null;currentName='';lastGround=true;lastCrouch=false;lastReload=false;if(weapon&&weaponHome){weapon.position.copy(weaponHome.position);weapon.quaternion.copy(weaponHome.rotation);weapon.scale.copy(weaponHome.scale);}FishSniperCycle.animate(weapon,null);api.boltTime=null;play(profile(weaponId)+'Idle',false,0);mixer.update(0);updateCapsules();}
 function dispose(){cancel();mixer.stopAllAction();mixer.uncacheRoot(model);var set=new Set();meshes.forEach(function(m){set.add(m.skeleton);});set.forEach(function(s){s.dispose();});FishArt.disposeTree(root);instances.delete(api);}
 Object.assign(api,{equip:equip,update:update,updateCapsules:updateCapsules,readBlade:readBlade,startAttack:startAttack,cancelAttack:cancel,finishAttack:finishAttack,reset:reset,fire:fire,aimAt:aimAt,freezePose:freezePose,copyPoseFrom:copyPoseFrom,dispose:dispose});
 equip(opts.weapon||'unarmed');update(0,{});instances.add(api);return api;
}
window.FishCharacters={load:load,parse:parse,parseMotionData:parseMotionData,create:create,grenade:manifest.grenade,ready:function(id){return !!assets[id||'deepseek'];},scale:HEIGHT_SCALE,stats:function(){var ids=Object.keys(assets),details={};ids.forEach(function(id){details[id]={bones:manifest.characters[id].bones,triangles:manifest.characters[id].triangles,animations:assets[id].animations.length};});return {loaded:!!ids.length,animations:ids.length?assets[ids[0]].animations.length:0,characters:ids,details:details,instances:instances.size,bones:46,triangles:9978};}};
})();
