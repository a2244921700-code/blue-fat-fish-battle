/* OpenAI Codex · 大型蘑菇云、地面污染标记与受辐射时的画面撕裂。
 * 云团独立限额合批，战斗粒子池不能抢占其寿命；辐射规则位于 radiation.js。
 */
(function(){
'use strict';
var T=THREE,CLOUD_LIFE=12,MAX_CLOUDS=6;
function smooth(a,b,x){var k=Math.max(0,Math.min(1,(x-a)/(b-a)));return k*k*(3-2*k);}
var noiseGLSL=[
  'float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
  'float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}'
].join('\n');
function world(scene){
  var pool=[],active=[],fields=new Map(),clock=0,geometry=null,groundGeo=null,groundMat=null,shockGeo=null;
  var transform=new T.Object3D(),parts=[];
  function part(kind,x,y,z,sx,sy,sz){parts.push({kind:kind,x:x,y:y,z:z,sx:sx,sy:sy,sz:sz,seed:parts.length*2.39996});}
  for(var row=0;row<6;row++)for(var j=0;j<5;j++){var a=j*Math.PI*2/5+row*.55,r=.5+row*.12;part('stem',Math.cos(a)*r,1+row*1.8,Math.sin(a)*r,1.25+row*.08,1.65,1.25+row*.08);}
  part('cap',0,14.1,0,4.2,2.7,4.2);
  [[12,4.4,13.3,2.65,2.6],[12,5.5,11.9,2.15,1.85],[7,2.7,15.6,2.45,2.0],[8,4.8,14.5,1.65,1.7]].forEach(function(band,bi){
    for(var i=0;i<band[0];i++){var a=i*Math.PI*2/band[0]+bi*.33;part('cap',Math.cos(a)*band[1],band[2]+Math.sin(i*7.3)*.35,Math.sin(a)*band[1],band[3],band[4],band[3]);}
  });
  for(var d=0;d<14;d++){var a=d*Math.PI*2/14;part('dust',Math.cos(a)*7.6,.5,Math.sin(a)*7.6,1.8,.7,1.8);}
  function allocate(){
    if(!geometry){
      // 立体分布的软烟团：在片元中重建球面光照，边缘以噪声消散，避免石球轮廓。
      geometry=new T.PlaneGeometry(2,2);
      geometry.setAttribute('aSeed',new T.InstancedBufferAttribute(new Float32Array(parts.map(function(p){return p.seed;})),1));
      shockGeo=new T.RingGeometry(.965,1,64);
    }
    var material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uAge:{value:0},uFade:{value:1},uWestern:window.FishRenderStyle?FishRenderStyle.fxUniforms.western:{value:0}},
      vertexShader:'attribute float aSeed;varying vec2 vUv;varying vec3 vRight;varying vec3 vUp;varying vec3 vFront;varying float vHeight;varying float vSeed;\nvoid main(){vec4 local=instanceMatrix*vec4(0.,0.,0.,1.);vec4 mv=modelViewMatrix*local;mv.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));vUv=uv;vHeight=local.y;vSeed=aSeed;vRight=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);vUp=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);vFront=vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);gl_Position=projectionMatrix*mv;}',
      fragmentShader:noiseGLSL+FishShaders.mushroomFragment
    });
    var mesh=new T.InstancedMesh(geometry,material,parts.length);mesh.name='自爆蘑菇云';mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // 云的实例范围随演出变化，不能沿用第一帧小火球的包围球。
    mesh.frustumCulled=false;
    var ring=new T.Mesh(shockGeo,new T.MeshBasicMaterial({color:0xffc784,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));ring.rotation.x=-Math.PI/2;ring.name='自爆冲击波';
    return {mesh:mesh,ring:ring,age:0};
  }
  function release(c){scene.remove(c.mesh);scene.remove(c.ring);pool.push(c);}
  function pose(c){
    var t=c.age,lift=smooth(0,3.7,t),spread=.16+.84*smooth(0,3.3,t),drift=Math.max(0,t-4)*.16;
    for(var i=0;i<parts.length;i++){
      var p=parts[i],s=spread*(1+Math.max(0,t-4)*.022),x=p.x*s,z=p.z*s,y=1+(p.y-1)*lift+drift,scale=s;
      if(p.kind==='stem'){scale=.25+.75*lift;y=p.y*lift+.5;}
      if(p.kind==='cap'){x*=1.12;z*=1.12;}
      if(p.kind==='dust'){var out=smooth(0,1.3,t);x=p.x*out;z=p.z*out;y=p.y+Math.min(t,3)*.12;scale=(.2+.8*out)*(1-smooth(1.5,3.5,t));}
      x+=Math.sin(t*.55+p.seed)*.12*lift;z+=Math.cos(t*.48+p.seed)*.12*lift;
      transform.position.set(x,y,z);transform.rotation.set(p.seed*.08,t*.035+p.seed,0);transform.scale.set(Math.max(.001,p.sx*scale),Math.max(.001,p.sy*scale),Math.max(.001,p.sz*scale));transform.updateMatrix();c.mesh.setMatrixAt(i,transform.matrix);
    }
    c.mesh.instanceMatrix.needsUpdate=true;c.mesh.material.uniforms.uAge.value=t;c.mesh.material.uniforms.uFade.value=1-smooth(8,CLOUD_LIFE,t);
    c.ring.visible=t<1.4;c.ring.scale.setScalar(.2+10*smooth(0,1.35,t));c.ring.material.opacity=.75*(1-smooth(.15,1.4,t));
  }
  function ground(z){
    if(!groundGeo){
      var diameter=FishRadiation.rules.radius*2;
      groundGeo=new T.PlaneGeometry(diameter,diameter);
      groundMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:{value:0}},
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:noiseGLSL+'\nuniform float uTime;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float r=length(p);if(r>1.)discard;float rim=smoothstep(.967,.98,r)*(1.-smoothstep(.994,1.,r));float dash=step(.22,fract(atan(p.y,p.x)*5.73));float n=noise3(vec3(p*9.,uTime*.12));float haze=smoothstep(.42,.9,n)*(1.-r)*.11;float pulse=.82+.18*sin(uTime*1.8);gl_FragColor=vec4(mix(vec3(.20,.30,.055),vec3(.56,.73,.16),rim),haze+.028+rim*(.18+.28*dash)*pulse);\n#include <colorspace_fragment>\n}'
      });
    }
    var mesh=new T.Mesh(groundGeo,groundMat);mesh.name='辐射残留/10米';mesh.rotation.x=-Math.PI/2;mesh.position.set(z.x,.065,z.z);scene.add(mesh);return mesh;
  }
  return {
    burst:function(pos){var c=pool.pop();if(!c&&active.length>=MAX_CLOUDS){c=active.shift();scene.remove(c.mesh);scene.remove(c.ring);}if(!c)c=allocate();c.age=0;c.mesh.position.set(pos.x,0,pos.z);c.ring.position.set(pos.x,.085,pos.z);pose(c);scene.add(c.mesh);scene.add(c.ring);active.push(c);},
    update:function(dt,zones,detailed){
      clock+=dt;
      for(var i=active.length-1;i>=0;i--){var c=active[i];c.age+=dt;if(c.age>=CLOUD_LIFE||!detailed){active.splice(i,1);release(c);}else pose(c);}
      var ids=new Set();zones.forEach(function(z){ids.add(z.id);if(!fields.has(z.id))fields.set(z.id,ground(z));});
      fields.forEach(function(m,id){if(!ids.has(id)){scene.remove(m);fields.delete(id);}});
      if(groundMat)groundMat.uniforms.uTime.value=clock;
    },
    clear:function(){while(active.length)release(active.pop());fields.forEach(function(m){scene.remove(m);});fields.clear();clock=0;},
    dispose:function(){this.clear();pool.forEach(function(c){c.mesh.dispose();c.mesh.material.dispose();c.ring.material.dispose();});pool.length=0;if(geometry)geometry.dispose();if(shockGeo)shockGeo.dispose();if(groundGeo)groundGeo.dispose();if(groundMat)groundMat.dispose();},
    stats:function(){return {clouds:active.length,allocated:active.length+pool.length,capacity:MAX_CLOUDS,partsPerCloud:parts.length,fields:fields.size,cloudLife:CLOUD_LIFE,ages:active.map(function(c){return c.age;})};}
  };
}
function screen(renderer){
  // The shared render pipeline owns the framebuffer and final color conversion.
  // This controller owns only the damage pulse and its battle-time clock.
  var remaining=0,time=0,shared=null,fallback=null;
  return {
    pulse:function(){remaining=.34;},
    update:function(dt,playing){if(!playing){remaining=0;return;}time+=dt;remaining=Math.max(0,remaining-dt);},
    frame:function(){return {time:time,strength:Math.min(1,remaining/.12)};},
    rendered:function(stats){shared=stats;},
    render:function(worldScene,worldCamera){
      if(!fallback)fallback=FishRenderPipeline.create(renderer);
      fallback.render(worldScene,worldCamera,this.frame());shared=fallback.stats();
    },
    clear:function(){remaining=0;time=0;},
    dispose:function(){this.clear();if(fallback)fallback.dispose();fallback=null;shared=null;},
    stats:function(){return {remaining:remaining,allocated:!!(shared&&shared.allocated),width:shared?shared.width:0,height:shared?shared.height:0,sharedPipeline:true};}
  };
}
window.FishBomberFX={world:world,screen:screen};
})();
