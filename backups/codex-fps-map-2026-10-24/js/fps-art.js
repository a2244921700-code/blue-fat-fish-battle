/* OpenAI Codex · 阵营装备与固定基地。保留原始角色贴图，重复武器按材质合批并共享。 */
(function(){
'use strict';
var T=THREE, cache={}, palette={red:0xf17066,blue:0x65b8ff};
function shared(r){r.userData.artShared=true;return r;}
function material(key,color){return cache[key]||(cache[key]=shared(new T.MeshStandardMaterial({color:color,roughness:.68,metalness:.28})));}
function box(){return cache.box||(cache.box=shared(new T.BoxGeometry(1,1,1)));}
function block(parent,x,y,z,w,h,d,mat){var m=new T.Mesh(box(),mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function weapon(kind){
  kind=kind||'rifle';var key='weapon:'+kind;
  if(!cache[key]){
    var src=FishCombat.playerWeapon(kind);src.rotation.set(0,Math.PI,0);src.updateMatrixWorld(true);var groups={};
    src.traverse(function(m){if(!m.isMesh)return;var g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
      if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      var k=m.material.uuid;if(!groups[k])groups[k]={material:m.material,parts:[]};groups[k].parts.push(g);
    });
    var parts=[];Object.keys(groups).forEach(function(k){var batch=groups[k],g=new T.BufferGeometry();['position','normal','uv'].forEach(function(attr){
      var len=0;batch.parts.forEach(function(p){len+=p.attributes[attr].array.length;});var a=new Float32Array(len),offset=0;
      batch.parts.forEach(function(p){a.set(p.attributes[attr].array,offset);offset+=p.attributes[attr].array.length;});g.setAttribute(attr,new T.BufferAttribute(a,attr==='uv'?2:3));
    });g.computeBoundingSphere();batch.parts.forEach(function(p){p.dispose();});parts.push({geometry:shared(g),material:batch.material});});
    cache[key]={parts:parts,muzzle:src.muzzleTip.getWorldPosition(new T.Vector3())};
  }
  var rig=new T.Group();rig.name='FPS/'+kind;var data=cache[key];data.parts.forEach(function(p){rig.add(new T.Mesh(p.geometry,p.material));});
  rig.muzzleTip=new T.Object3D();rig.muzzleTip.position.copy(data.muzzle);rig.add(rig.muzzleTip);
  var flashGeo=cache.flashGeo||(cache.flashGeo=shared(new T.SphereGeometry(.09,8,6)));
  var flashMat=cache.flashMat||(cache.flashMat=shared(new T.MeshBasicMaterial({color:0xffdc96,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending})));
  rig.flash=new T.Mesh(flashGeo,flashMat);rig.flash.position.copy(data.muzzle);rig.flash.position.z+=.10;rig.flash.scale.set(.6,.6,2);rig.flash.visible=false;rig.add(rig.flash);
  return rig;
}
function equip(e){
  var color=palette[e.team],team=material('team:'+e.team,color),dark=material('pack',0x283842);
  // 背包和肩侧识别条增加厚度，脸部与服饰主体保持原样。
  e.equipment=[block(e.mesh,-.53,-.55,-.14,.25,.36,.22,dark),block(e.mesh,.53,-.55,-.14,.25,.36,.22,dark),
    block(e.mesh,-.77,-.05,.03,.13,.42,.20,team),block(e.mesh,.77,-.05,.03,.13,.42,.20,team)];
  e.gunMesh=weapon('rifle');e.gunMesh.position.set(.61,-.18,.23);e.gunMesh.scale.setScalar(1.25);e.mesh.add(e.gunMesh);
  var g=cache.ring||(cache.ring=shared(new T.RingGeometry(.56,.66,24)));
  var mat=cache['ring:'+e.team]||(cache['ring:'+e.team]=shared(new T.MeshBasicMaterial({color:color,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide})));
  e.teamRing=new T.Mesh(g,mat);e.teamRing.rotation.x=-Math.PI/2;e.mesh.add(e.teamRing);
}
function bases(scene){
  var root=new T.Group();root.name='FPS/红蓝部署区';
  ['red','blue'].forEach(function(team){var flip=team==='red'?1:-1,z=40*flip,c=palette[team],mat=material('team:'+team,c);
    // 标线高于地面，避免与沙地共面闪烁；基地保持通行，不新增隐形碰撞。
    [-14,14].forEach(function(x){block(root,x,.035,z,.16,.025,6,mat);});
    block(root,0,.035,43*flip,28,.025,.16,mat);
    for(var i=0;i<8;i++)block(root,-10.5+i*3,.04,38*flip,1.6,.02,.16,mat);
    var cv=document.createElement('canvas');cv.width=512;cv.height=96;var ctx=cv.getContext('2d');
    if(ctx){ctx.fillStyle=team==='red'?'#422a2b':'#223b52';ctx.fillRect(0,0,512,96);ctx.fillStyle=team==='red'?'#ffa297':'#9dd6ff';ctx.font='bold 37px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(team==='red'?'RED  /  红队部署区':'BLUE  /  蓝队部署区',256,61);
      var tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;var sign=new T.Mesh(new T.PlaneGeometry(10,1.875),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));sign.position.set(0,3.0,44.8*flip);sign.rotation.y=team==='red'?Math.PI:0;root.add(sign);}
  });scene.add(root);return root;
}
window.FishPvpArt={equip:equip,weapon:weapon,bases:bases};
})();
