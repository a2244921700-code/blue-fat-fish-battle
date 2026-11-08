/* OpenAI Codex · Material and lighting art direction, independent of combat.
 * Preserve skinning, textures, alpha cutouts, instancing and PBR metal response. */
(function(){
'use strict';
// The playable game uses western only. The retired anime preset is preserved
// outside the game in D:/CodexWork/Gamemodules/ThreeJS_AnimeToon_Reference.
// classic remains a developer-only unstyled comparison, with no settings UI.
var T=THREE,records=new Map(),shadowDefaults=new WeakMap(),shadowProxies=new WeakMap(),preset='western';
var presets={western:{outline:1,lineWidth:1.9,grade:1,ink:0x172332,western:1},classic:{outline:0,lineWidth:1,grade:0,ink:0x28324d,western:0}};
var fxUniforms={western:{value:1}};
var roles={western:{world:{cel:.94,rim:.015,ambient:.76,bump:.16,tint:[.70,.84,1.06]},character:{cel:1,rim:.07,ambient:.52,bump:.4,tint:[.73,.85,1.04]},metal:{cel:.48,rim:.045,ambient:.83,bump:.5,tint:[.82,.91,1.06]}}};
function update(rec){
 var active=preset!=='classic',group=roles[preset]||roles.western,p=group[rec.role]||group.world;
 rec.uniforms.fishCelStrength.value=active?p.cel:0;rec.uniforms.fishRimStrength.value=active?p.rim:0;
 rec.uniforms.fishAmbientStrength.value=active?p.ambient:1;
 rec.uniforms.fishShadowTint.value.fromArray(p.tint);
 rec.uniforms.fishWestern.value=preset==='western'?1:0;
 if(rec.bump!==undefined)rec.material.bumpScale=rec.bump*(active?p.bump:1);
}
function material(m,role){
 if(!m||!m.isMeshStandardMaterial||m.userData.skipRenderStyle)return m;
 role=role||((m.metalness||0)>.4?'metal':'world');
 if(records.has(m)){var prior=records.get(m);if(role==='character'&&prior.role!=='character'){prior.role=role;update(prior);}return m;}
 var previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey.bind(m);
 var key=previousKey(),rec={material:m,role:role,bump:m.bumpScale,uniforms:{fishCelStrength:{value:0},fishRimStrength:{value:0},fishAmbientStrength:{value:1},fishWestern:{value:0},fishShadowTint:{value:new T.Color()}}};
 records.set(m,rec);m.userData.fishCelRole=role;update(rec);
 m.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);Object.assign(shader.uniforms,rec.uniforms);
  var chunk=T.ShaderChunk.lights_physical_pars_fragment;
  var original='reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
  if(chunk.indexOf(original)<0)throw new Error('FishRenderStyle: Three.js lighting chunk changed; update the r159 shader adapter.');
  shader.fragmentShader=FishShaders.celPars+shader.fragmentShader
   .replace('#include <lights_physical_pars_fragment>',chunk.replace(original,FishShaders.celDiffuse))
   .replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n'+FishShaders.celAmbient)
   .replace('#include <opaque_fragment>',FishShaders.celRim+'\n#include <opaque_fragment>');
 };
 m.customProgramCacheKey=function(){return key+'|fish-cel-r159-v3';};m.needsUpdate=true;
 function disposed(){records.delete(m);m.removeEventListener('dispose',disposed);}m.addEventListener('dispose',disposed);return m;
}
function applyTree(root,role){root.traverse(function(o){if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){material(m,role);});});return root;}
function shadowProxy(source){
 var proxy=shadowProxies.get(source);
 if(!proxy){
  // A per-source proxy avoids changing materials shared by other characters.
  // It stays visible to Three's shadow pass, but writes neither beauty color
  // nor camera depth. Skinning and the source alpha silhouette still apply.
  proxy=new T.MeshBasicMaterial({name:'Anime/BodyShadowOnly',colorWrite:false,depthWrite:false,depthTest:false,transparent:true});
  shadowProxies.set(source,proxy);
  function dispose(){proxy.dispose();shadowProxies.delete(source);source.removeEventListener('dispose',dispose);}source.addEventListener('dispose',dispose);
 }
 ['map','alphaMap','alphaTest','alphaHash','opacity','side','shadowSide','visible','clippingPlanes','clipIntersection','clipShadows','displacementMap','displacementScale','displacementBias'].forEach(function(k){proxy[k]=source[k];});
 return proxy;
}
function shadowOnly(root){
 var materials=[],hidden=[];
 if(root&&root.visible)root.traverse(function(o){
  if(o.isMesh&&o.material){materials.push([o,o.material]);o.material=Array.isArray(o.material)?o.material.map(shadowProxy):shadowProxy(o.material);}
  else if(o.isSprite){hidden.push([o,o.visible]);o.visible=false;}
 });
 return function(){materials.forEach(function(p){p[0].material=p[1];});hidden.forEach(function(p){p[0].visible=p[1];});};
}
function setPreset(name){if(!presets[name])throw new Error('Unknown render style: '+name);preset=name;fxUniforms.western.value=name==='western'?1:0;records.forEach(update);return name;}
function light(hemi,sun,renderer,isFps,theme){
 if(!hemi||!sun)return;
 if(!shadowDefaults.has(sun))shadowDefaults.set(sun,{bias:sun.shadow.bias,normalBias:sun.shadow.normalBias});
 var original=shadowDefaults.get(sun);
 sun.shadow.bias=preset!=='classic'?(isFps?-.000035:-.00007):original.bias;
 sun.shadow.normalBias=preset!=='classic'?.018:original.normalBias;
 if(preset==='classic')return;
 // Bias is in shadow-camera depth units: the old values separated small
 // character parts by several centimetres, erasing hair/face self-shadows.
 if(isFps){hemi.color.setHex(0xb2c9ff);hemi.groundColor.setHex(0x9294ae);hemi.intensity=.88;sun.color.setHex(0xffe2c4);sun.intensity=2.55;renderer.toneMappingExposure=1.06;}
 else if(theme===0){hemi.color.setHex(0xb3caff);hemi.groundColor.setHex(0x9290a7);hemi.intensity=.82;sun.color.setHex(0xffe1c0);sun.intensity=2.45;renderer.toneMappingExposure=1.10;}
 if(preset==='western'&&(isFps||theme===0)){hemi.color.setHex(0x9bc9e8);hemi.groundColor.setHex(0xa993b2);hemi.intensity=.91;sun.color.setHex(0xffd99d);sun.intensity=2.75;renderer.toneMappingExposure=1.03;}
}
window.FishRenderStyle={material:material,applyTree:applyTree,shadowOnly:shadowOnly,setPreset:setPreset,fxUniforms:fxUniforms,getPreset:function(){return preset;},settings:function(){return Object.assign({},presets[preset]);},light:light,stats:function(){var counts={};records.forEach(function(r){counts[r.role]=(counts[r.role]||0)+1;});return {preset:preset,materials:records.size,roles:counts};}};
})();
