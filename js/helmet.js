/* OpenAI Codex · Authored iron bowl, mounted in the source asset's Head space. */
(function(){
'use strict';
var asset=null,pending=null,base='assets/equipment/iron-rice-bowl/';
function parse(buffer){return new Promise(function(resolve,reject){new FishGLTF.GLTFLoader().parse(buffer,'',function(gltf){
 asset=gltf;asset.scene.traverse(function(o){if(o.geometry)o.geometry.userData.artShared=true;if(o.material)o.material.userData.artShared=true;});if(window.FishRenderStyle)FishRenderStyle.applyTree(asset.scene,'metal');resolve(asset);
},reject);});}
function load(){
 if(asset)return Promise.resolve(asset);if(pending)return pending;
 pending=(async function(){var buffer;
  if(location.protocol==='file:'){
   await new Promise(function(resolve,reject){var s=document.createElement('script');s.src=base+'asset-file.js';s.onload=function(){s.remove();resolve();};s.onerror=function(){s.remove();reject(new Error('头盔模型读取失败'));};document.head.appendChild(s);});
   var raw=atob(window.IRON_BOWL_GLB_BASE64),bytes=new Uint8Array(raw.length);delete window.IRON_BOWL_GLB_BASE64;
   for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);buffer=bytes.buffer;
  }else{var response=await fetch(base+IRON_BOWL_MANIFEST.file);if(!response.ok)throw new Error('头盔模型读取失败 '+response.status);buffer=await response.arrayBuffer();}
  return await parse(buffer);
 })().catch(function(err){pending=null;throw err;});return pending;
}
function create(){
 if(!asset)throw new Error('头盔尚未载入');var object=asset.scene.clone(true);object.name='equipment/iron-rice-bowl';
 object.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return object;
}
function attach(rig){
 var helmet=create(),head=rig.bones[IRON_BOWL_MANIFEST.mount.parent_bone];
 var rim=rig.characterId==='claude_fake'?new THREE.Box3().setFromObject(helmet).min.y:0;
 helmet.matrix.fromArray(IRON_BOWL_MANIFEST.mount.matrix_column_major).decompose(helmet.position,helmet.quaternion,helmet.scale);
 // PseudoClaude's front hair curl needs a wider shell while retaining the rim height.
 if(rig.characterId==='claude_fake'){helmet.scale.x*=1.12;helmet.scale.z*=1.18;helmet.position.y-=rim*helmet.scale.y*.14;helmet.scale.y*=1.14;}
 head.add(helmet);return helmet;
}
window.FishHelmet={load:load,parse:parse,create:create,attach:attach,ready:function(){return !!asset;}};
})();
