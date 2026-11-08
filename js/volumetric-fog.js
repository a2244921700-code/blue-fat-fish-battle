/* OpenAI Codex · Depth-bounded, shadowed atmospheric scattering for the FPS map.
 * One half-resolution ray march, 16 samples, no extra world/shadow render. */
(function(){
'use strict';
var T=THREE;
// Both visual presets share a pale golden sand haze. These are linear RGB:
// occluded fog stays a dimmer ochre, rather than turning blue or solid yellow.
var parameters={density:.0068,shadowStrength:1,shadeColor:[.40,.35,.23],lightColor:[.96,.80,.44]};
var fragment=`
uniform sampler2D tDepth;
uniform sampler2D tShadow;
uniform mat4 uProjectionInverse;
uniform mat4 uCameraWorld;
uniform mat4 uShadowMatrix;
uniform vec2 uNearFar;
uniform vec2 uSize;
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;
uniform vec3 uShadeColor;
uniform vec3 uLightColor;
uniform float uShadowEnabled;
uniform float uTime;
uniform float uDensity;
uniform float uShadowStrength;
varying vec2 vUv;
#include <packing>
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float sunlight(vec3 position){
 if(uShadowEnabled<.5)return .55;
 vec4 q=uShadowMatrix*vec4(position,1.);q.xyz/=q.w;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z<0.||q.z>1.)return 1.;
 return mix(1.,step(q.z-.00004,unpackRGBAToDepth(texture2D(tShadow,q.xy))),uShadowStrength);
}
void main(){
 float depth=texture2D(tDepth,vUv).r;
 vec4 endView=uProjectionInverse*vec4(vUv*2.-1.,depth*2.-1.,1.);endView/=endView.w;
 vec3 endWorld=(uCameraWorld*vec4(endView.xyz,1.)).xyz;
 vec3 delta=endWorld-uCameraPosition;float distanceToSurface=length(delta);
 vec3 ray=delta/max(distanceToSurface,.0001);
 float end=min(distanceToSurface,120.),start=3.5;
 if(end<=start){gl_FragColor=vec4(0.);return;}
 float stepLength=(end-start)/16.;
 // Fixed interleaved samples avoid temporal flicker; density itself is anchored
 // in world coordinates and drifts slowly with the simulation clock.
 float jitter=fract(52.9829189*fract(dot(floor(vUv*uSize),vec2(.06711056,.00583715))));
 float phase=.72+.72*pow(max(dot(ray,uSunDirection),0.),3.);
 vec3 scattering=vec3(0.);float transmission=1.;
 for(int i=0;i<16;i++){
  float along=start+(float(i)+.2+jitter*.6)*stepLength;
  vec3 p=uCameraPosition+ray*along;
  float height=exp(-max(p.y-.5,0.)*.16);
  float drift=noise3(p*.085+vec3(uTime*.025,0.,uTime*.012));
  float density=uDensity*height*(.48+.9*drift)*smoothstep(3.5,12.,along);
  float opacity=1.-exp(-density*stepLength);
  vec3 color=mix(uShadeColor,uLightColor*phase,sunlight(p));
  scattering+=transmission*opacity*color;transmission*=1.-opacity;
 }
 gl_FragColor=vec4(scattering,1.-transmission);
}`;
function create(renderer,hdr){
 var target=null,active=false,shadowed=false;
 var uniforms={tDepth:{value:null},tShadow:{value:null},uProjectionInverse:{value:new T.Matrix4()},uCameraWorld:{value:new T.Matrix4()},uShadowMatrix:{value:new T.Matrix4()},uNearFar:{value:new T.Vector2()},uSize:{value:new T.Vector2()},uCameraPosition:{value:new T.Vector3()},uSunDirection:{value:new T.Vector3()},uShadeColor:{value:new T.Color().fromArray(parameters.shadeColor)},uLightColor:{value:new T.Color().fromArray(parameters.lightColor)},uShadowEnabled:{value:0},uTime:{value:0},uDensity:{value:.0068},uShadowStrength:{value:1}};
 var material=new T.ShaderMaterial({name:'Atmosphere/Volume',depthTest:false,depthWrite:false,toneMapped:false,uniforms:uniforms,vertexShader:FishShaders.fullscreenVertex,fragmentShader:fragment});
 var sunPosition=new T.Vector3(),sunTarget=new T.Vector3();
 return {
  prepare:function(sceneTarget,camera,sun,time){
   var width=Math.max(1,Math.ceil(sceneTarget.width*.5)),height=Math.max(1,Math.ceil(sceneTarget.height*.5));
   if(!target){target=new T.WebGLRenderTarget(width,height,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false,stencilBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});target.texture.name='Atmosphere/Scattering';}
   if(target.width!==width||target.height!==height)target.setSize(width,height);
   active=true;uniforms.tDepth.value=sceneTarget.depthTexture;uniforms.uSize.value.set(width,height);
   uniforms.uProjectionInverse.value.copy(camera.projectionMatrixInverse);uniforms.uCameraWorld.value.copy(camera.matrixWorld);camera.getWorldPosition(uniforms.uCameraPosition.value);
   uniforms.uNearFar.value.set(camera.near,camera.far);uniforms.uTime.value=time||0;
   uniforms.uDensity.value=Math.max(0,parameters.density);
   uniforms.uShadowStrength.value=Math.max(0,Math.min(1,parameters.shadowStrength));
   uniforms.uShadeColor.value.fromArray(parameters.shadeColor);uniforms.uLightColor.value.fromArray(parameters.lightColor);
   shadowed=!!(sun&&sun.castShadow&&sun.shadow.map&&renderer.shadowMap.enabled);
   uniforms.uShadowEnabled.value=shadowed?1:0;uniforms.tShadow.value=shadowed?sun.shadow.map.texture:sceneTarget.texture;
   if(sun){sun.getWorldPosition(sunPosition);sun.target.getWorldPosition(sunTarget);uniforms.uSunDirection.value.subVectors(sunPosition,sunTarget).normalize();if(shadowed)uniforms.uShadowMatrix.value.copy(sun.shadow.matrix);}
   return {target:target,material:material};
  },
  release:function(){if(target)target.dispose();target=null;active=false;shadowed=false;uniforms.tDepth.value=uniforms.tShadow.value=null;},
  dispose:function(){this.release();material.dispose();},
  stats:function(){return {active:active,allocated:!!target,width:target?target.width:0,height:target?target.height:0,steps:16,shadowed:shadowed,density:uniforms.uDensity.value};}
 };
}
window.FishVolumeFog={create:create,parameters:parameters};
})();
