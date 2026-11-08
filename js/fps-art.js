/* OpenAI Codex · 阵营装备与固定基地。骨骼臂章、脚环与共享的合批武器。 */
(function(){
'use strict';
var T=THREE, cache={}, palette={red:0xf17066,blue:0x65b8ff};
function shared(r){r.userData.artShared=true;if(window.FishRenderStyle)FishRenderStyle.material(r);return r;}
function material(key,color){return cache[key]||(cache[key]=shared(new T.MeshStandardMaterial({color:color,roughness:.68,metalness:.28})));}
function box(){return cache.box||(cache.box=shared(new T.BoxGeometry(1,1,1)));}
function block(parent,x,y,z,w,h,d,mat){var m=new T.Mesh(box(),mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function weapon(kind){
  kind=kind||'rifle';var key='weapon:'+kind;
  if(!cache[key]){
    var src=FishCombat.playerWeapon(kind),hands=[];src.traverse(function(n){if(n.name==='procedural-hand')hands.push(n);});hands.forEach(function(n){src.remove(n);});src.rotation.set(0,Math.PI,0);src.updateMatrixWorld(true);var groups={};
    src.traverse(function(m){if(!m.isMesh||m.userData.sniperMoving)return;var g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
      if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      var k=m.material.uuid;if(!groups[k])groups[k]={material:m.material,parts:[]};groups[k].parts.push(g);
    });
    var parts=[];Object.keys(groups).forEach(function(k){var batch=groups[k],g=new T.BufferGeometry();['position','normal','uv'].forEach(function(attr){
      var len=0;batch.parts.forEach(function(p){len+=p.attributes[attr].array.length;});var a=new Float32Array(len),offset=0;
      batch.parts.forEach(function(p){a.set(p.attributes[attr].array,offset);offset+=p.attributes[attr].array.length;});g.setAttribute(attr,new T.BufferAttribute(a,attr==='uv'?2:3));
    });g.computeBoundingSphere();batch.parts.forEach(function(p){p.dispose();});parts.push({geometry:shared(g),material:batch.material});});
    cache[key]={parts:parts,muzzle:src.muzzleTip.getWorldPosition(new T.Vector3()),bolt:src.bolt,spentCase:src.spentCase};
  }
  var rig=new T.Group();rig.name='FPS/'+kind;var data=cache[key];data.parts.forEach(function(p){rig.add(new T.Mesh(p.geometry,p.material));});
  if(data.bolt){var moving=new T.Group();moving.rotation.y=Math.PI;rig.add(moving);rig.bolt=data.bolt.clone(true);rig.spentCase=data.spentCase.clone(true);moving.add(rig.bolt,rig.spentCase);rig.boltGrip=rig.bolt.getObjectByName('sniper-bolt-grip');}
  rig.muzzleTip=new T.Object3D();rig.muzzleTip.position.copy(data.muzzle);rig.add(rig.muzzleTip);
  rig.flash=FishCombat.flashMesh();rig.flash.position.copy(data.muzzle);rig.flash.position.z+=.10;rig.flash.rotation.y=Math.PI;rig.flash.scale.set(.8,.8,1.2);rig.flash.visible=false;rig.add(rig.flash);
  return rig;
}
function equip(e){
  var color=palette[e.team],team=material('team:'+e.team,color),dark=material('pack',0x283842);
  if(e.character){
    e.equipment=[];['UpperArm_L','UpperArm_R'].forEach(function(name){var band=block(e.character.bones[name],0,.025,0,.09,.025,.085,team);e.equipment.push(band);});
    e.gunMesh=e.character.equip(e.pvpPrimary||'rifle');
    var geo=cache.ring||(cache.ring=shared(new T.RingGeometry(.46,.53,24)));
    var rm=cache['ring:'+e.team]||(cache['ring:'+e.team]=shared(new T.MeshBasicMaterial({color:color,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide})));
    e.teamRing=new T.Mesh(geo,rm);e.teamRing.rotation.x=-Math.PI/2;e.teamRing.position.y=.055-e.baseY;e.mesh.add(e.teamRing);return;
  }
  // 背包和肩侧识别条增加厚度，脸部与服饰主体保持原样。
  e.equipment=[block(e.mesh,-.53,-.55,-.14,.25,.36,.22,dark),block(e.mesh,.53,-.55,-.14,.25,.36,.22,dark),
    block(e.mesh,-.77,-.05,.03,.13,.42,.20,team),block(e.mesh,.77,-.05,.03,.13,.42,.20,team)];
  e.gunMesh=weapon('rifle');e.gunMesh.position.set(.61,-.18,.23);e.gunMesh.scale.setScalar(1.25);e.mesh.add(e.gunMesh);
  var g=cache.ring||(cache.ring=shared(new T.RingGeometry(.56,.66,24)));
  var mat=cache['ring:'+e.team]||(cache['ring:'+e.team]=shared(new T.MeshBasicMaterial({color:color,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide})));
  e.teamRing=new T.Mesh(g,mat);e.teamRing.rotation.x=-Math.PI/2;e.mesh.add(e.teamRing);
}
function bases(scene,map){
  var baseZ=map?map.baseZ:40,spawnZ=map?map.spawnZ:41.5,signZ=map?map.baseSignZ:44.8;
  var root=new T.Group();root.name='FPS/红蓝部署区';
  ['red','blue'].forEach(function(team){var flip=team==='red'?1:-1,z=baseZ*flip,c=palette[team],mat=material('team:'+team,c);
    // 标线高于地面，避免与沙地共面闪烁；基地保持通行，不新增隐形碰撞。
    [-14,14].forEach(function(x){block(root,x,.035,z,.16,.025,6,mat);});
    block(root,0,.035,(spawnZ+1.5)*flip,28,.025,.16,mat);
    for(var i=0;i<8;i++)block(root,-10.5+i*3,.04,(baseZ-2)*flip,1.6,.02,.16,mat);
    var cv=document.createElement('canvas');cv.width=512;cv.height=96;var ctx=cv.getContext('2d');
    if(ctx){ctx.fillStyle=team==='red'?'#422a2b':'#223b52';ctx.fillRect(0,0,512,96);ctx.fillStyle=team==='red'?'#ffa297':'#9dd6ff';ctx.font='bold 37px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(team==='red'?'RED  /  红队部署区':'BLUE  /  蓝队部署区',256,61);
      var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;var sign=new T.Mesh(new T.PlaneGeometry(10,1.875),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));sign.position.set(0,3.0,signZ*flip);sign.rotation.y=team==='red'?Math.PI:0;
      sign.name='调试路标/'+team+'部署区';sign.userData.debugMapSign=true;sign.visible=false;root.add(sign);}
  });scene.add(root);return root;
}
window.FishPvpArt={equip:equip,weapon:weapon,bases:bases};
})();
