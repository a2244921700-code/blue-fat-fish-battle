/* OpenAI Codex · Three authored fits, cached once and mounted in Head space. */
(function(){
'use strict';
var assets={},pending={},base='assets/equipment/tactical-goggles/';
function loadOne(id){
 if(assets[id])return Promise.resolve(assets[id]);if(pending[id])return pending[id];
 var profile=FISH_GOGGLES_MANIFEST.variants[id];if(!profile)return Promise.reject(new Error('未找到角色护目镜适配：'+id));
 pending[id]=(async function(){
  await new Promise(function(resolve,reject){var script=document.createElement('script');script.src=base+profile.file;script.onload=function(){script.remove();resolve();};script.onerror=function(){script.remove();reject(new Error('护目镜载入失败：'+id));};document.head.appendChild(script);});
  var raw=atob(window.FISH_GOGGLES_DATA[id]),bytes=new Uint8Array(raw.length);delete window.FISH_GOGGLES_DATA[id];
  for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  var gltf=await new Promise(function(resolve,reject){new FishGLTF.GLTFLoader().parse(bytes.buffer,'',resolve,reject);});
  gltf.scene.traverse(function(o){
   if(!o.isMesh)return;o.geometry.userData.artShared=true;
   var lens=o.material.name===FISH_GOGGLES_MANIFEST.lens.material;
   o.castShadow=!lens;o.receiveShadow=!lens;o.material.userData.artShared=true;
   // The transparent single-surface lens must retain its authored alpha and
   // must not write depth or cast a solid shadow across the character's eyes.
   if(lens){o.material.transparent=true;o.material.opacity=.32;o.material.depthWrite=false;o.material.side=THREE.DoubleSide;o.renderOrder=2;}
   else if(window.FishRenderStyle)FishRenderStyle.applyTree(o,'metal');
  });
  assets[id]=gltf.scene;return gltf.scene;
 })().catch(function(error){delete pending[id];throw error;});return pending[id];
}
function load(ids){return Promise.all(Array.from(new Set(ids||['deepseek'])).map(loadOne));}
function create(id){if(!assets[id])throw new Error('护目镜尚未载入：'+id);var object=assets[id].clone(true);object.name='equipment/tactical-goggles';object.userData.characterId=id;return object;}
function attach(rig){
 var id=rig.characterId,fit=FISH_GOGGLES_MANIFEST.variants[id],head=rig.bones[fit.parentBone],object=create(id);
 object.position.fromArray(fit.mount.position);object.quaternion.fromArray(fit.mount.quaternion);object.scale.fromArray(fit.mount.scale);head.add(object);return object;
}
window.FishGoggles={load:load,create:create,attach:attach,ready:function(id){return !!assets[id];}};
})();
