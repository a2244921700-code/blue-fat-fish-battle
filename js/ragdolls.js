/* OpenAI Codex · Physical ragdolls, cannon-es 0.20.0. Rendering stays on the original skin. */
(function(){
'use strict';
var T=THREE,C=CANNON;
function cv(p){return new C.Vec3(p.x,p.y,p.z);}
function tv(p){return new T.Vector3(p.x,p.y,p.z);}
function create(obstacles){
 var world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});
 world.broadphase=new C.SAPBroadphase(world);world.solver.iterations=8;world.solver.tolerance=.001;
 world.defaultContactMaterial.friction=.65;world.defaultContactMaterial.restitution=.035;
 world.defaultContactMaterial.contactEquationStiffness=1e7;world.defaultContactMaterial.contactEquationRelaxation=4;
 var ground=new C.Body({mass:0,collisionFilterGroup:1,collisionFilterMask:6});ground.addShape(new C.Plane());ground.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(ground);
 var staticBoxes=[],staticCount=1;
 function syncObstacles(next){
 staticBoxes.forEach(function(b){world.removeBody(b);});staticBoxes=[];
 next.forEach(function(o){
  var x=o.max.x-o.min.x,y=o.max.y-o.min.y,z=o.max.z-o.min.z;if(x<=0||y<=0||z<=0||o.max.y<=.04)return;
  var b=new C.Body({mass:0,collisionFilterGroup:1,collisionFilterMask:6,position:new C.Vec3((o.min.x+o.max.x)/2,(o.min.y+o.max.y)/2,(o.min.z+o.max.z)/2)});
  b.addShape(new C.Box(new C.Vec3(x/2,y/2,z/2)));world.addBody(b);staticBoxes.push(b);
 });
 staticCount=staticBoxes.length+1;world.broadphase.dirty=true;
 }
 syncObstacles(obstacles);
 var records=new Set(),loose=new Set(),weapons=new Set(),fixed=1/120,accumulator=0,nextWeaponId=1;
 function removeWeapon(rec){if(!weapons.has(rec))return;if(!rec.settled)world.removeBody(rec.body);FishArt.disposeTree(rec.object);weapons.delete(rec);}
 function clearWeapons(){Array.from(weapons).forEach(removeWeapon);}
 function addWeapon(object,options){
  object.updateWorldMatrix(true,true);
  var q=object.getWorldQuaternion(new T.Quaternion()),scale=object.getWorldScale(new T.Vector3());
  var bounds=options.bounds,offset=bounds.getCenter(new T.Vector3()).multiply(scale),size=bounds.getSize(new T.Vector3()).multiply(scale);
  var center=object.getWorldPosition(new T.Vector3()).add(offset.clone().applyQuaternion(q));
  var body=new C.Body({mass:options.id==='sniper'?4.8:options.id==='rifle'?3.4:.9,position:cv(center),quaternion:new C.Quaternion(q.x,q.y,q.z,q.w),linearDamping:.12,angularDamping:.28,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.6,collisionFilterGroup:4,collisionFilterMask:1});
  body.addShape(new C.Box(new C.Vec3(Math.max(.04,size.x/2),Math.max(.04,size.y/2),Math.max(.04,size.z/2))));
  body.velocity.copy(cv(options.velocity));body.angularVelocity.set(1.2,1.8,.8);world.addBody(body);
  var rec={uid:nextWeaponId++,id:options.id,mag:options.mag,reserve:options.reserve,object:object,body:body,offset:offset,age:0,settled:false,landed:false,still:0,ttl:45,claim:null};
  body.addEventListener('collide',function(event){if(Math.abs(event.contact.ni.y)>.5)rec.landed=true;});weapons.add(rec);return rec;
 }
 function removeLoose(rec){if(!loose.has(rec))return;world.removeBody(rec.body);FishArt.disposeTree(rec.object);loose.delete(rec);}
 function clearLoose(){Array.from(loose).forEach(removeLoose);}
 function addLoose(object,options){
  options=options||{};while(loose.size>=96)removeLoose(loose.values().next().value);
  object.updateWorldMatrix(true,true);var scale=object.getWorldScale(new T.Vector3()),q=object.getWorldQuaternion(new T.Quaternion());
  var h=options.height*Math.abs(scale.y),radius=options.width*Math.max(Math.abs(scale.x),Math.abs(scale.z))*.5;
  var offset=new T.Vector3(0,h*.5,0),center=object.getWorldPosition(new T.Vector3()).add(offset.clone().applyQuaternion(q));
  var body=new C.Body({mass:.8,position:cv(center),quaternion:new C.Quaternion(q.x,q.y,q.z,q.w),linearDamping:.12,angularDamping:.22,allowSleep:true,sleepSpeedLimit:.15,sleepTimeLimit:.8,collisionFilterGroup:4,collisionFilterMask:1});
  // A compact convex proxy keeps fallen helmets inexpensive. +Y is up.
  body.addShape(new C.Cylinder(radius*.83,radius,h,12));
  var v=options.velocity||{x:0,y:0,z:0},kick=options.impulse||{x:0,y:0,z:1};
  body.velocity.set((v.x||0)+kick.x*1.5,(v.y||0)+1.7,(v.z||0)+kick.z*1.5);body.angularVelocity.set(2.4,.8,-1.7);
  world.addBody(body);var rec={object:object,body:body,offset:offset,age:0,landed:false,groundAge:0,ttl:options.ttl||10};
  body.addEventListener('collide',function(event){var c=event.contact,p=c.bi===body?c.ri:c.rj;
   if(Math.abs(c.ni.y)>.5&&p.y<0)rec.landed=true;
  });loose.add(rec);return rec;
 }
 function add(rig,options){
  options=options||{};rig.freezePose();rig.updateCapsules();rig.root.updateWorldMatrix(true,true);
  var nodes=rig.bones,bodies=[],constraints=[],bindings=[],byName={};
  function position(name){return nodes[name].getWorldPosition(new T.Vector3());}
  function body(name,bone,a,b,r,mass){
   var center=a.clone().lerp(b,.5),direction=b.clone().sub(a),length=direction.length();direction.normalize();
   var q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),length>.001?direction:new T.Vector3(0,1,0));
   // No corpse-to-corpse contacts: joint constraints and map contacts remain fully physical.
   var rb=new C.Body({mass:mass,position:cv(center),quaternion:new C.Quaternion(q.x,q.y,q.z,q.w),linearDamping:.16,angularDamping:.5,
    allowSleep:true,sleepSpeedLimit:.16,sleepTimeLimit:.65,collisionFilterGroup:2,collisionFilterMask:1});
   if(length>.015){rb.addShape(new C.Cylinder(r,r,length,6));rb.addShape(new C.Sphere(r),new C.Vec3(0,length/2,0));rb.addShape(new C.Sphere(r),new C.Vec3(0,-length/2,0));}
   else rb.addShape(new C.Sphere(r));
   var velocity=options.velocity||{x:0,y:0,z:0};rb.velocity.set(velocity.x,Math.max(-5,velocity.y||0)+(options.blast?2.8:.15),velocity.z);
   rb.angularVelocity.set(.25,0,.35);world.addBody(rb);bodies.push(rb);byName[name]=rb;
   var boneNode=nodes[bone],local=position(bone).sub(center).applyQuaternion(q.clone().invert());
   bindings.push({bone:boneNode,body:rb,local:local,rotation:q.clone().invert().multiply(boneNode.getWorldQuaternion(new T.Quaternion()))});
   return rb;
  }
  var caps=rig.capsules,scale=rig.model.getWorldScale(new T.Vector3()).x;
  body('torso','Pelvis',position('Pelvis'),position('Neck'),.082*scale,5);
  body('head','Head',caps[0].a,caps[0].b,caps[0].radius,2.8);
  function joint(a,b,at,angle,twist){
   var pa=byName[a],pb=byName[b],p=cv(at),axis=pb.position.vsub(p);if(axis.length()<.001)axis.set(0,1,0);axis.normalize();
   var c=new C.ConeTwistConstraint(pa,pb,{pivotA:pa.pointToLocalFrame(p),pivotB:pb.pointToLocalFrame(p),axisA:pa.vectorToLocalFrame(axis),axisB:pb.vectorToLocalFrame(axis),angle:angle,twistAngle:twist,maxForce:1800,collideConnected:false});
   world.addConstraint(c);constraints.push(c);
  }
  joint('torso','head',position('Neck'),.65,.65);
  ['L','R'].forEach(function(side){
   var upper=position('UpperArm_'+side),elbow=position('Forearm_'+side),hand=position('Hand_'+side),hip=position('Thigh_'+side),knee=position('Shin_'+side),foot=position('Foot_'+side),toe=position('Toe_'+side);
   body('arm'+side,'UpperArm_'+side,upper,elbow,.039*scale,.55);body('forearm'+side,'Forearm_'+side,elbow,hand,.033*scale,.4);
   var handEnd=nodes['Hand_'+side].localToWorld(new T.Vector3(0,.03,0));body('hand'+side,'Hand_'+side,hand,handEnd,.032*scale,.16);
   body('thigh'+side,'Thigh_'+side,hip,knee,.044*scale,.85);body('shin'+side,'Shin_'+side,knee,foot,.035*scale,.65);body('foot'+side,'Foot_'+side,foot,toe,.036*scale,.3);
   joint('torso','arm'+side,upper,1.45,.85);joint('arm'+side,'forearm'+side,elbow,1.3,.25);joint('forearm'+side,'hand'+side,hand,.65,.35);
   joint('torso','thigh'+side,hip,1.15,.55);joint('thigh'+side,'shin'+side,knee,1.15,.18);joint('shin'+side,'foot'+side,foot,.6,.3);
  });
  // A small hit-direction impulse breaks an unnaturally balanced standing pose.
  var impulse=options.impulse||{x:0,y:0,z:1};byName.torso.applyImpulse(new C.Vec3(impulse.x*5,options.blast?8:1,impulse.z*5));
  byName.torso.angularVelocity.set(impulse.z*.85,.25,-impulse.x*.85);
  var rec={rig:rig,bodies:bodies,constraints:constraints,bindings:bindings,age:0,owner:options.owner||null,ttl:options.ttl===undefined?5:options.ttl};
  records.add(rec);return rec;
 }
 function sync(rec){
  // Parent first: pelvis, head, then each limb chain. Preserve the authored local scales.
  rec.bindings.forEach(function(link){
   var b=link.body,q=new T.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w),pos=link.local.clone().applyQuaternion(q).add(tv(b.position));
   var bone=link.bone;bone.parent.updateWorldMatrix(true,false);bone.position.copy(bone.parent.worldToLocal(pos));
   bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q.multiply(link.rotation)));bone.updateWorldMatrix(false,true);
  });
  rec.rig.root.updateWorldMatrix(true,true);
 }
 function remove(rec){if(!records.has(rec))return;rec.constraints.forEach(function(c){world.removeConstraint(c);});rec.bodies.forEach(function(b){world.removeBody(b);});records.delete(rec);}
 function update(dt){
  var expired=[];if(dt<=0||(!records.size&&!loose.size&&!weapons.size))return expired;
  accumulator+=Math.min(.2,dt);var steps=0;
  while(accumulator>=fixed&&steps<24){world.step(fixed);accumulator-=fixed;steps++;}
  records.forEach(function(rec){rec.age+=dt;sync(rec);if(rec.age>=rec.ttl)expired.push(rec);});
  loose.forEach(function(rec){rec.age+=dt;var b=rec.body,o=rec.object,q=new T.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
   var p=tv(b.position).sub(rec.offset.clone().applyQuaternion(q));o.position.copy(o.parent.worldToLocal(p));o.quaternion.copy(o.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
   if(rec.landed)rec.groundAge+=dt;if(rec.groundAge>=rec.ttl||rec.age>=30)removeLoose(rec);
  });
  weapons.forEach(function(rec){
   rec.age+=dt;if(rec.age>=rec.ttl){removeWeapon(rec);return;}
   if(rec.settled)return;
   var b=rec.body,o=rec.object,q=new T.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
   o.position.copy(o.parent.worldToLocal(tv(b.position).sub(rec.offset.clone().applyQuaternion(q))));o.quaternion.copy(o.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
   rec.still=rec.landed&&b.velocity.length()<.16&&b.angularVelocity.length()<.2?rec.still+dt:0;
   if(rec.landed&&(b.sleepState===C.Body.SLEEPING||rec.still>.5)){rec.settled=true;b.velocity.setZero();b.angularVelocity.setZero();world.removeBody(b);}
  });return expired;
 }
 function dispose(){Array.from(records).forEach(remove);clearLoose();clearWeapons();world.bodies.slice().forEach(function(b){world.removeBody(b);});accumulator=0;}
 return {add:add,remove:remove,addLoose:addLoose,clearLoose:clearLoose,loose:loose,addWeapon:addWeapon,removeWeapon:removeWeapon,clearWeapons:clearWeapons,weapons:weapons,update:update,dispose:dispose,syncObstacles:syncObstacles,records:records,stats:function(){var sleeping=0;records.forEach(function(r){r.bodies.forEach(function(b){if(b.sleepState===C.Body.SLEEPING)sleeping++;});});return {ragdolls:records.size,looseProps:loose.size,droppedWeapons:weapons.size,dynamicBodies:world.bodies.length-staticCount,staticBodies:staticCount,constraints:world.constraints.length,sleeping:sleeping};}};
}
window.FishRagdolls={create:create};
})();
