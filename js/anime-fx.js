/* OpenAI Codex · Shared GPU-drawn cel smoke / impact / flame shapes.
 * Existing capped pools own meshes, timing and movement; this module is visual. */
(function(){
'use strict';
var T=THREE;
function shape(kind){return kind==='puff'?0:kind==='burst'?1:kind==='flare'?2:3;}
function material(kind,color){
 var uniforms={uColor:{value:new T.Color(color===undefined?0xffffff:color)},uAlpha:{value:1},uShape:{value:shape(kind)},uWestern:window.FishRenderStyle?FishRenderStyle.fxUniforms.western:{value:0}};
 var m=new T.ShaderMaterial({name:'Anime/CombatFX',transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false,uniforms:uniforms,vertexShader:FishShaders.fxVertex,fragmentShader:FishShaders.fxFragment});
 m.color=uniforms.uColor.value;
 Object.defineProperty(m,'opacity',{get:function(){return uniforms.uAlpha.value;},set:function(v){uniforms.uAlpha.value=v;},configurable:true});
 return m;
}
function setKind(material,kind){material.uniforms.uShape.value=shape(kind);}
window.FishAnimeFX={material:material,setKind:setKind};
})();
