/* OpenAI Codex · Three.js r159 shader library. Linear scene input, one final
 * tone-map / sRGB conversion. No network shader loading; works with file://. */
(function(){
'use strict';
var fullscreenVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
var celPars=`
uniform float fishCelStrength;
uniform float fishRimStrength;
uniform float fishAmbientStrength;
uniform float fishWestern;
uniform vec3 fishShadowTint;
float fishLightBand(float n){
  float anime=.04+.43*smoothstep(.25,.31,n)+.53*smoothstep(.64,.70,n);
  float western=.12+.88*smoothstep(.45,.50,n);
  return mix(anime,western,fishWestern);
}
`;
var celDiffuse=`
  vec3 fishIrradiance=mix(irradiance,fishLightBand(dotNL)*directLight.color,fishCelStrength);
  reflectedLight.directDiffuse += fishIrradiance * BRDF_Lambert( material.diffuseColor );
`;
var celAmbient=`
reflectedLight.indirectDiffuse *= mix(vec3(1.),fishShadowTint,fishCelStrength)*fishAmbientStrength;
reflectedLight.directSpecular *= 1.-fishCelStrength*.20;
`;
var celRim=`
float fishRim=pow(1.-clamp(dot(normal,geometryViewDir),0.,1.),4.);
outgoingLight += diffuseColor.rgb*mix(vec3(.64,.82,1.),vec3(1.,.85,.65),fishWestern)*fishRim*fishRimStrength;
`;
var radiation=`
float stripeHash(float v){return fract(sin(v)*43758.5);}
vec2 fishTearUV(vec2 uv,float time,float strength){
  float frame=floor(time*18.),row=floor(uv.y*27.);
  float band=step(.74,stripeHash(row*31.7+frame*13.9));
  float shift=(sin(frame*4.1+row)*band*.019+sin(uv.y*96.+time*27.)*.0015)*strength;
  return clamp(uv+vec2(shift,0.),vec2(.002),vec2(.998));
}
vec3 fishTearColor(vec3 color,vec2 uv,vec2 shifted,float time,float strength){
  float frame=floor(time*18.),row=floor(uv.y*27.),seed=stripeHash(row*31.7+frame*13.9);
  float band=step(.74,seed),shade=stripeHash(row*17.3+frame*2.1+9.7);
  float opacity=stripeHash(row*8.9+frame*5.7+3.4),rowY=fract(uv.y*27.);
  float feather=smoothstep(0.,.09,rowY)*(1.-smoothstep(.91,1.,rowY));
  float opacityPatch=.62+.38*stripeHash(floor(shifted.x*5.+seed*9.)+row*4.7+frame*.7);
  vec3 green=mix(vec3(.006,.06,.012),vec3(.09,.58,.065),shade);
  float alpha=band*feather*(.22+.48*opacity)*opacityPatch*strength;
  float seam=band*smoothstep(.91,.95,rowY)*(1.-smoothstep(.98,1.,rowY));
  color=mix(color,green,alpha);
  return color+vec3(.025,.13,.018)*seam*(.4+.6*shade)*strength;
}
`;
var composite=`
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tVolume;
uniform vec2 uVolumeSize;
uniform float uVolumeEnabled;
uniform vec2 uResolution;
uniform vec2 uNearFar;
uniform float uOutline;
uniform float uLineWidth;
uniform vec3 uInk;
uniform float uGrade;
uniform float uTime;
uniform float uRadiation;
varying vec2 vUv;
#include <packing>
`+radiation+`
float eyeDepth(vec2 uv){
  return -perspectiveDepthToViewZ(texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x,uNearFar.x,uNearFar.y);
}
vec4 fogAt(vec2 uv){
 if(uVolumeEnabled<.5)return vec4(0.);
 float z=eyeDepth(uv);if(z<2.8)return vec4(0.);
 vec2 p=uv*uVolumeSize-.5,base=floor(p),f=fract(p);vec4 sum=vec4(0.);float weight=0.;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  vec2 offset=vec2(float(x),float(y)),q=(base+offset+.5)/uVolumeSize;
  vec2 bilinear=mix(vec2(1.)-f,f,offset);
  float w=bilinear.x*bilinear.y/(1.+abs(eyeDepth(q)-z)*2.);
  sum+=texture2D(tVolume,q)*w;weight+=w;
 }
 return sum/max(weight,.00001);
}
float inkEdge(vec2 uv){
  if(uOutline<.001)return 0.;
  vec2 px=vec2(uLineWidth)/uResolution;
  float z=eyeDepth(uv);
  if(z>uNearFar.y*.995)return 0.;
  float l=eyeDepth(uv-vec2(px.x,0.)),r=eyeDepth(uv+vec2(px.x,0.));
  float b=eyeDepth(uv-vec2(0.,px.y)),t=eyeDepth(uv+vec2(0.,px.y));
  // Second differences reject smooth perspective slopes on the ground, while
  // preserving silhouettes, steps, weapon edges and architectural creases.
  float curvature=max(abs(l+r-2.*z),abs(b+t-2.*z));
  float tolerance=.012+z*.0045;
  // Transparent FX do not write depth. Require a visible color boundary too,
  // so a wall behind an opaque smoke lobe cannot be inked over the smoke.
  vec3 dx=abs(texture2D(tScene,uv-vec2(px.x,0.)).rgb-texture2D(tScene,uv+vec2(px.x,0.)).rgb);
  vec3 dy=abs(texture2D(tScene,uv-vec2(0.,px.y)).rgb-texture2D(tScene,uv+vec2(0.,px.y)).rgb);
  vec3 contrast=max(dx,dy),center=texture2D(tScene,uv).rgb;
  float visible=smoothstep(.008,.055,max(contrast.r,max(contrast.g,contrast.b))/(1.+max(center.r,max(center.g,center.b))));
  return smoothstep(tolerance,tolerance*2.5,curvature)*visible*(1.-smoothstep(75.,145.,z))*uOutline;
}
void main(){
  vec2 uv=fishTearUV(vUv,uTime,uRadiation);
  vec3 c=texture2D(tScene,uv).rgb;
  if(uRadiation>.001){
    float band=step(.74,stripeHash(floor(vUv.y*27.)*31.7+floor(uTime*18.)*13.9));
    float shift=.003*uRadiation*(.3+band);
    c.r=texture2D(tScene,clamp(uv+vec2(shift,0.),vec2(.002),vec2(.998))).r;
    c.b=texture2D(tScene,clamp(uv-vec2(shift,0.),vec2(.002),vec2(.998))).b;
    c*=1.-smoothstep(.2,.72,length(vUv-.5))*.12*uRadiation;
    c+=sin(vUv.y*1500.+uTime*31.)*.025*uRadiation;
  }
  c=mix(max(c,vec3(0.)),uInk,inkEdge(uv)*.78);
  vec4 fog=fogAt(uv);c=c*(1.-fog.a)+fog.rgb;
  gl_FragColor=vec4(c,1.);
}
`;
var finish=`
uniform sampler2D tScene;uniform vec2 uResolution;
uniform float uGrade;uniform float uTime;uniform float uRadiation;uniform float uWestern;
varying vec2 vUv;
`+radiation+`
vec3 sceneColor(vec2 uv){
 vec3 c=texture2D(tScene,clamp(uv,vec2(0.),vec2(1.))).rgb;
 #ifdef TONE_MAPPING
 c=toneMapping(c);
 #endif
 return c;
}
void main(){
 vec2 px=1./uResolution;vec3 weights=vec3(.299,.587,.114);
 vec3 c=sceneColor(vUv);
 float nw=dot(sceneColor(vUv+vec2(-1.,1.)*px),weights),ne=dot(sceneColor(vUv+px),weights);
 float sw=dot(sceneColor(vUv-px),weights),se=dot(sceneColor(vUv+vec2(1.,-1.)*px),weights),mid=dot(c,weights);
 float lo=min(mid,min(min(nw,ne),min(sw,se))),hi=max(mid,max(max(nw,ne),max(sw,se)));
 if(hi-lo>max(.025,hi*.10)){
   vec2 direction=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
   float reduce=max((nw+ne+sw+se)*.03125,.0078125);
   direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),vec2(-6.),vec2(6.))*px;
   vec3 a=.5*(sceneColor(vUv-direction/6.)+sceneColor(vUv+direction/6.));
   vec3 b=a*.5+.25*(sceneColor(vUv-direction*.5)+sceneColor(vUv+direction*.5));
   float lum=dot(b,weights);c=lum<lo||lum>hi?a:b;
 }
 float luminance=dot(c,vec3(.2126,.7152,.0722));
 vec3 graded=mix(vec3(luminance),c,mix(1.07,1.16,uWestern));graded=(graded-.18)*mix(1.025,1.065,uWestern)+.18;
 graded+=vec3(.012,.005,-.004)*smoothstep(.4,.85,luminance);
 c=mix(c,max(graded,vec3(0.)),uGrade);
 c=fishTearColor(c,vUv,fishTearUV(vUv,uTime,uRadiation),uTime,uRadiation);
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`;
var burstFragment=`
varying vec3 vColor;varying float vAlpha;uniform float uWestern;
void main(){
  vec2 p=gl_PointCoord*2.-1.;float shape=abs(p.x)+abs(p.y);
  if(shape>=1.||vAlpha<=.001)discard;
  vec3 color=shape>mix(.76,.63,uWestern)?mix(vColor,vec3(.035,.045,.09),.72):shape<.30?mix(vColor,vec3(1.),.65):vColor;
  gl_FragColor=vec4(color,vAlpha*(1.-smoothstep(.90,1.,shape)));
  #include <colorspace_fragment>
}`;
var fxVertex='varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
var fxFragment=`
uniform vec3 uColor;uniform float uAlpha;uniform float uShape;uniform float uWestern;
varying vec2 vUv;varying vec3 vNormal;
void main(){
 vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);vec3 c=uColor;float opacity=uAlpha;
 vec3 ink=vec3(.035,.045,.075);
 if(uShape<.5){
   float boundary=.79+.09*cos(a*5.)+.035*cos(a*9.+.7);
   if(r>boundary)discard;
   float lit=clamp(.55-p.x*.25+p.y*.37,0.,1.);
   float band=mix(.56+.27*smoothstep(.35,.38,lit)+.28*smoothstep(.69,.72,lit),.56+.55*smoothstep(.48,.51,lit),uWestern);
   c=uColor*band;c=mix(c,mix(uColor*.35,ink,mix(.35,.7,uWestern)),smoothstep(boundary-mix(.055,.09,uWestern),boundary-.025,r));
   opacity*=1.-smoothstep(boundary-.018,boundary,r);
 }else if(uShape<1.5){
   float boundary=.47+.39*pow(abs(cos(a*4.)),9.);
   if(r>boundary)discard;
   c=r<boundary*.38?mix(uColor,vec3(1.),.8):uColor;
   c=mix(c,mix(ink,uColor,.2),smoothstep(boundary-mix(.06,.10,uWestern),boundary-.025,r));
   opacity*=1.-smoothstep(boundary-.015,boundary,r);
 }else if(uShape<2.5){
   float light=dot(normalize(vNormal),normalize(vec3(-.5,.75,1.)));
   c*=.7+.32*step(.3,light)+.22*step(.72,light);
 }
 gl_FragColor=vec4(c,opacity);
 #include <colorspace_fragment>
}`;
var mushroomFragment=`
uniform float uAge;uniform float uFade;uniform float uWestern;
varying vec2 vUv;varying vec3 vRight;varying vec3 vUp;varying vec3 vFront;varying float vHeight;varying float vSeed;
void main(){
 vec2 q=vUv*2.-1.;float r=length(q),angle=atan(q.y,q.x);
 float boundary=.93+.04*sin(angle*6.+vSeed)+.025*sin(angle*11.-uAge*.25);
 if(r>boundary)discard;
 float z=sqrt(max(0.,1.-r*r));vec3 p=vec3(q,z);
 float n=noise3(p*4.+vec3(vSeed,uAge*.18,0.));
 vec3 normal=normalize(vRight*q.x+vUp*q.y+vFront*z);
 float light=clamp(dot(normal,normalize(vec3(-.6,.85,.4)))*.55+.45+(n-.5)*.12,0.,1.);
 float band=mix(.10+.43*smoothstep(.31,.35,light)+.47*smoothstep(.68,.72,light),.16+.84*smoothstep(.48,.52,light),uWestern);
 vec3 ash=mix(vec3(.075,.09,.15),vec3(.54,.58,.66),band);
 float heat=(1.-smoothstep(.3,3.,uAge))*(.6+.4*(1.-smoothstep(3.,16.,vHeight)));
 if(vSeed>165.)heat*=.25;
 vec3 flame=mix(vec3(.65,.055,.009),vec3(2.2,1.05,.20),band);
 vec3 c=mix(ash,flame,heat);
 c=mix(c,vec3(.07,.075,.13),smoothstep(boundary-.055,boundary-.025,r)*.46);
 float edge=1.-smoothstep(boundary-.035,boundary,r);
 gl_FragColor=vec4(c,uFade*edge*.88);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
window.FishShaders={version:'r159-anime-1',fullscreenVertex:fullscreenVertex,celPars:celPars,celDiffuse:celDiffuse,celAmbient:celAmbient,celRim:celRim,radiation:radiation,composite:composite,finish:finish,burstFragment:burstFragment,fxVertex:fxVertex,fxFragment:fxFragment,mushroomFragment:mushroomFragment};
})();
