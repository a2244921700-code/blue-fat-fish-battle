/* Local recon overlay: render enemy silhouettes into a separate mask, then
 * draw its contour. World depth and gameplay visibility are never modified. */
(function(root){'use strict';
function create(renderer){
 var T=THREE,maskScene=new T.Scene(),screen=new T.Scene(),screenCamera=new T.Camera(),proxies=new Map(),size=new T.Vector2();
 var target=null,maskMaterial=new T.MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 var material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
  uniforms:{mask:{value:null},pixel:{value:new T.Vector2()}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:'uniform sampler2D mask;uniform vec2 pixel;varying vec2 vUv;void main(){float c=texture2D(mask,vUv).r;float edge=0.0;for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){edge=max(edge,texture2D(mask,vUv+vec2(float(x),float(y))*pixel).r);}}float line=max(0.0,edge-c);float a=max(line*.98,c*.10);if(a<.01)discard;gl_FragColor=vec4(1.0,.72,.22,a);}'
 });
 var quad=new T.Mesh(new T.PlaneGeometry(2,2),material);quad.frustumCulled=false;screen.add(quad);
 function clear(){proxies.forEach(function(p){maskScene.remove(p);});proxies.clear();}
 function render(rigs,camera){
  renderer.getDrawingBufferSize(size);var width=Math.max(1,Math.round(size.x)),height=Math.max(1,Math.round(size.y));
  if(!target){target=new T.WebGLRenderTarget(width,height,{depthBuffer:false,stencilBuffer:false});material.uniforms.mask.value=target.texture;}
  if(target.width!==width||target.height!==height)target.setSize(width,height);
  material.uniforms.pixel.value.set(1/width,1/height);
  var live=new Set();
  rigs.forEach(function(rig){if(!rig)return;rig.root.updateWorldMatrix(true,true);rig.meshes.forEach(function(source){
   if(!source.visible)return;live.add(source);var p=proxies.get(source);
   if(!p){p=source.isSkinnedMesh?new T.SkinnedMesh(source.geometry,maskMaterial):new T.Mesh(source.geometry,maskMaterial);p.matrixAutoUpdate=false;p.frustumCulled=false;
    if(source.isSkinnedMesh){p.bindMode=source.bindMode;p.skeleton=source.skeleton;p.bindMatrix.copy(source.bindMatrix);p.bindMatrixInverse.copy(source.bindMatrixInverse);}
    maskScene.add(p);proxies.set(source,p);
   }
   p.matrix.copy(source.matrixWorld);p.matrixWorldNeedsUpdate=true;
  });});
  proxies.forEach(function(p,source){if(!live.has(source)){maskScene.remove(p);proxies.delete(source);}});
  var oldTarget=renderer.getRenderTarget(),auto=renderer.autoClear,alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new T.Color()),xr=renderer.xr.enabled;
  try{renderer.xr.enabled=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(maskScene,camera);
   renderer.setRenderTarget(oldTarget);renderer.autoClear=false;renderer.render(screen,screenCamera);
  }finally{renderer.setRenderTarget(oldTarget);renderer.autoClear=auto;renderer.setClearColor(color,alpha);renderer.xr.enabled=xr;}
 }
 function dispose(){clear();if(target)target.dispose();target=null;maskMaterial.dispose();material.dispose();quad.geometry.dispose();}
 return {render:render,clear:clear,dispose:dispose,stats:function(){return {meshes:proxies.size,width:target?target.width:0,height:target?target.height:0};}};
}
root.FishReconFX={create:create};
})(window);
