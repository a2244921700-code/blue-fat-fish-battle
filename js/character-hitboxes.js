/* OpenAI Codex · Bone capsules and swept blade contact. No renderer dependency. */
(function(root){
'use strict';
var EPS=1e-9;
var multipliers=Object.freeze({head:1.75,chest:1,abdomen:1,pelvis:.9,upperArm:.7,forearm:.65,hand:.5,thigh:.8,shin:.7,foot:.5});
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function add(a,b,t){return {x:a.x+b.x*t,y:a.y+b.y*t,z:a.z+b.z*t};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function mix(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function length(a){return Math.sqrt(dot(a,a));}
function pointSegment(p,a,b){var v=sub(b,a),t=clamp(dot(sub(p,a),v)/(dot(v,v)||1),0,1);return add(a,v,t);}
function segmentPair(p,q,a,b){
 var u=sub(q,p),v=sub(b,a),w=sub(p,a),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w),s,t;
 if(aa<EPS&&cc<EPS){s=t=0;}else if(aa<EPS){s=0;t=clamp(ee/cc,0,1);}else if(cc<EPS){t=0;s=clamp(-dd/aa,0,1);}else{
  var den=aa*cc-bb*bb;s=den>EPS?clamp((bb*ee-cc*dd)/den,0,1):0;t=(bb*s+ee)/cc;
  if(t<0){t=0;s=clamp(-dd/aa,0,1);}else if(t>1){t=1;s=clamp((bb-dd)/aa,0,1);}
 }
 var x=add(p,u,s),y=add(a,v,t),d=sub(x,y);return {distance:Math.sqrt(dot(d,d)),blade:x,body:y};
}
function raySphere(o,d,c,r){
 var oc=sub(o,c),b=dot(oc,d),cc=dot(oc,oc)-r*r;if(cc<=0)return 0;
 var h=b*b-cc;if(h<0)return Infinity;var t=-b-Math.sqrt(h);return t>=0?t:Infinity;
}
// d must be normalized. Return the first surface, including an origin already inside.
function rayCapsule(o,d,c,maxDistance,padding){
 var r=c.radius+(padding||0),near=pointSegment(o,c.a,c.b),delta=sub(o,near);
 if(dot(delta,delta)<=r*r)return 0;
 var ba=sub(c.b,c.a),oa=sub(o,c.a),baba=dot(ba,ba),bard=dot(ba,d),baoa=dot(ba,oa);
 var qa=baba-bard*bard,qb=baba*dot(oa,d)-baoa*bard,qc=baba*dot(oa,oa)-baoa*baoa-r*r*baba;
 var t=Infinity,h=qb*qb-qa*qc;
 if(Math.abs(qa)>EPS&&h>=0){var cylinder=(-qb-Math.sqrt(h))/qa,y=baoa+cylinder*bard;if(cylinder>=0&&y>=0&&y<=baba)t=cylinder;}
 t=Math.min(t,raySphere(o,d,c.a,r),raySphere(o,d,c.b,r));return t<=(maxDistance===undefined?Infinity:maxDistance)?t:Infinity;
}
function raycast(o,d,caps,maxDistance,padding){
 var best=null,near=maxDistance===undefined?Infinity:maxDistance;
 for(var i=0;i<caps.length;i++){var c=caps[i],t=rayCapsule(o,d,c,near,padding);if(Number.isFinite(t)&&(!best||t<near-1e-6)){near=t;best={distance:t,part:c.part,multiplier:c.multiplier,point:add(o,d,t),capsule:c};}}
 return best;
}
function wallDistance(o,d,boxes,max,padding){
 var near=max===undefined?Infinity:max,p=padding||0;
 for(var i=0;i<boxes.length;i++){
  var b=boxes[i],lo=0,hi=near,axes=['x','y','z'];
  for(var j=0;j<3&&lo<=hi;j++){var k=axes[j];if(Math.abs(d[k])<EPS){if(o[k]<b.min[k]-p||o[k]>b.max[k]+p){lo=Infinity;break;}}else{var a=(b.min[k]-p-o[k])/d[k],z=(b.max[k]+p-o[k])/d[k];lo=Math.max(lo,Math.min(a,z));hi=Math.min(hi,Math.max(a,z));}}
  if(lo<=hi&&hi>=0)near=Math.min(near,lo);
 }return near;
}
function blocked(a,b,boxes,pad){var d=sub(b,a),len=length(d);if(len<EPS)return false;d.x/=len;d.y/=len;d.z/=len;return wallDistance(a,d,boxes,len,pad)<len-.003;}
// Both blade and victim move between frames. Sample relative motion, not just the tip.
function sweep(prev,next,caps,oldCaps,boxes,origin){
 var travel=Math.max(length(sub(next.a,prev.a)),length(sub(next.b,prev.b))),radius=Math.max(.008,next.radius);
 for(var ci=0;ci<caps.length;ci++){var old=oldCaps&&oldCaps[ci];if(old)travel=Math.max(travel,length(sub(caps[ci].a,old.a)),length(sub(caps[ci].b,old.b)));}
 var steps=Math.min(128,Math.max(1,Math.ceil(travel/(radius*.5)))),best=null;
 for(var step=0;step<=steps;step++){
  var t=step/steps,a=mix(prev.a,next.a,t),b=mix(prev.b,next.b,t);
  for(var i=0;i<caps.length;i++){
   var c=caps[i],before=oldCaps&&oldCaps[i]||c,ca=mix(before.a,c.a,t),cb=mix(before.b,c.b,t),pair=segmentPair(a,b,ca,cb);
   if(pair.distance>radius+c.radius)continue;
   if(boxes&&(blocked(a,pair.blade,boxes,radius*.4)||(origin&&blocked(origin,pair.body,boxes,0))))continue;
   if(!best||t<best.time-1e-6||(t===best.time&&c.multiplier>best.multiplier))best={time:t,point:pair.blade,part:c.part,multiplier:c.multiplier};
  }
  if(best)return best;
 }return null;
}
function copyCapsules(caps){return caps.map(function(c){return {a:mix(c.a,c.a,0),b:mix(c.b,c.b,0),radius:c.radius,part:c.part,multiplier:c.multiplier};});}
// Damage and reach derive from the actual blade in world metres. No magic attack sphere.
function meleeDamage(lengthMeters,heavy,mode,bonus){
 var perMeter=mode==='pvp'?68:mode==='enemy'?28:4.1;
 return Math.max(.1,lengthMeters)*perMeter*(heavy?1.85:1)+(bonus||0);
}
var api={multipliers:multipliers,rayCapsule:rayCapsule,raycast:raycast,sweep:sweep,segmentPair:segmentPair,wallDistance:wallDistance,blocked:blocked,copyCapsules:copyCapsules,meleeDamage:meleeDamage};
root.FishHitboxes=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
