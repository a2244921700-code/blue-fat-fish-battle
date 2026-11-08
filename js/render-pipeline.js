/* OpenAI Codex · One beauty/depth render + optional FPS volume + ink + output.
 * Effects share the same linear scene; no second scene render for outlines or
 * radiation. CSS HUD is composited by the browser and is never outlined. */
(function(){
'use strict';
var T=THREE;
function create(renderer){
 var target=null,styled=null,size=new T.Vector2(),rendered=0,passes=0;
 var depthSupported=renderer.capabilities.isWebGL2||renderer.extensions.has('WEBGL_depth_texture');
 var hdr=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
 var volume=window.FishVolumeFog?FishVolumeFog.create(renderer,hdr):null;
 var uniforms={tScene:{value:null},tDepth:{value:null},tVolume:{value:null},uVolumeSize:{value:new T.Vector2(1,1)},uVolumeEnabled:{value:0},uResolution:{value:new T.Vector2(1,1)},uNearFar:{value:new T.Vector2(.1,300)},uOutline:{value:0},uLineWidth:{value:1},uInk:{value:new T.Color()},uGrade:{value:0},uTime:{value:0},uRadiation:{value:0}};
 var material=new T.ShaderMaterial({name:'Anime/Composite',depthTest:false,depthWrite:false,toneMapped:false,uniforms:uniforms,vertexShader:FishShaders.fullscreenVertex,fragmentShader:FishShaders.composite});
 var finalUniforms={tScene:{value:null},uWestern:{value:0},uResolution:uniforms.uResolution,uGrade:uniforms.uGrade,uTime:uniforms.uTime,uRadiation:uniforms.uRadiation};
 var finalMaterial=new T.ShaderMaterial({name:'Anime/FXAA-Output',depthTest:false,depthWrite:false,uniforms:finalUniforms,vertexShader:FishShaders.fullscreenVertex,fragmentShader:FishShaders.finish});
 var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
 var scene=new T.Scene(),camera=new T.Camera(),quad=new T.Mesh(geometry,material);quad.frustumCulled=false;scene.add(quad);
 function resize(){
  renderer.getDrawingBufferSize(size);
  if(!target){
   target=new T.WebGLRenderTarget(size.x,size.y,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
   target.texture.name='Anime/SceneLinear';
   if(depthSupported){target.depthTexture=new T.DepthTexture(size.x,size.y,T.UnsignedIntType);target.depthTexture.name='Anime/SceneDepth';}
   target.samples=renderer.capabilities.isWebGL2?2:0;
   styled=new T.WebGLRenderTarget(size.x,size.y,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false,stencilBuffer:false});styled.texture.name='Anime/OutlinedLinear';
  }
  if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
  if(styled.width!==size.x||styled.height!==size.y)styled.setSize(size.x,size.y);
  uniforms.tScene.value=target.texture;uniforms.tDepth.value=target.depthTexture||target.texture;uniforms.uResolution.value.copy(size);
  finalUniforms.tScene.value=styled.texture;
 }
 return {
  render:function(world,view,radiation,atmosphere){
   var style=FishRenderStyle.settings(),strength=radiation?radiation.strength:0;
   rendered++;
   if(FishRenderStyle.getPreset()==='classic'&&strength<=0){if(volume)volume.release();renderer.render(world,view);passes=1;return;}
   resize();uniforms.uNearFar.value.set(view.near||.1,view.far||300);
   uniforms.uOutline.value=depthSupported?style.outline:0;uniforms.uLineWidth.value=style.lineWidth*renderer.getPixelRatio();uniforms.uInk.value.setHex(style.ink);
   uniforms.uGrade.value=style.grade;uniforms.uTime.value=radiation?radiation.time:0;uniforms.uRadiation.value=strength;
   finalUniforms.uWestern.value=style.western||0;
   var previous=renderer.getRenderTarget(),autoReset=renderer.info.autoReset;
   // Keep the game's existing draw-call convention (beauty, excluding shadow
   // map draws), then add both screen passes rather than reporting only a quad.
   renderer.info.autoReset=true;
   try{
    renderer.setRenderTarget(target);renderer.render(world,view);
    renderer.info.autoReset=false;
    var useVolume=volume&&depthSupported&&atmosphere&&atmosphere.mode==='pvp'&&atmosphere.enabled;
    uniforms.uVolumeEnabled.value=useVolume?1:0;
    if(useVolume){
     var fog=volume.prepare(target,view,atmosphere.sun,atmosphere.time);
     quad.material=fog.material;renderer.setRenderTarget(fog.target);renderer.render(scene,camera);
     uniforms.tVolume.value=fog.target.texture;uniforms.uVolumeSize.value.set(fog.target.width,fog.target.height);
    }else{if(volume)volume.release();uniforms.tVolume.value=target.texture;}
    quad.material=material;renderer.setRenderTarget(styled);renderer.render(scene,camera);
    quad.material=finalMaterial;renderer.setRenderTarget(previous);renderer.render(scene,camera);passes=useVolume?4:3;
   }finally{quad.material=material;renderer.setRenderTarget(previous);renderer.info.autoReset=autoReset;}
  },
  release:function(){if(target){target.dispose();styled.dispose();target=styled=null;}if(volume)volume.release();uniforms.tScene.value=uniforms.tDepth.value=uniforms.tVolume.value=finalUniforms.tScene.value=null;passes=0;},
  dispose:function(){this.release();if(volume)volume.dispose();geometry.dispose();material.dispose();finalMaterial.dispose();},
  stats:function(){var fog=volume?volume.stats():null;return {style:FishRenderStyle.getPreset(),allocated:!!target,width:target?target.width:0,height:target?target.height:0,depth:depthSupported,hdr:!!hdr,passes:passes,frames:rendered,targets:(target?2:0)+(fog&&fog.allocated?1:0),antialias:'FXAA',fog:fog};}
 };
}
window.FishRenderPipeline={create:create};
})();
