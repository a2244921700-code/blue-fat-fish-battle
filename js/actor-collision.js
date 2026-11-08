/* OpenAI Codex · Solid living-character cylinders, swept movement and map-safe separation. */
(function(root){
'use strict';
function solve(actors,options){
 var wallMove=options.move,steps=1,i,j,eps=1e-5,contacts=0;
 actors.forEach(function(a){var from=a.previous||a.pos;a.start={x:from.x,y:from.y,z:from.z};a.goal={x:a.pos.x,y:a.pos.y,z:a.pos.z};
  steps=Math.max(steps,Math.ceil(Math.hypot(a.goal.x-from.x,a.goal.y-from.y,a.goal.z-from.z)/Math.max(.1,a.radius*.45)));
  a.pos.x=from.x;a.pos.y=from.y;a.pos.z=from.z;a.blocked=false;
 });steps=Math.min(48,steps);
 for(var step=0;step<steps;step++){
  actors.forEach(function(a){a.before={x:a.pos.x,y:a.pos.y,z:a.pos.z};wallMove(a,(a.goal.x-a.start.x)/steps,(a.goal.z-a.start.z)/steps);a.pos.y+=(a.goal.y-a.start.y)/steps;});
  for(var pass=0;pass<6;pass++)for(i=0;i<actors.length;i++)for(j=i+1;j<actors.length;j++){
   var a=actors[i],b=actors[j],dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz),r=a.radius+b.radius;
   if(d>=r-eps)continue;
   // Land on a character, or stop below one, only when crossing its top/bottom.
   // Existing side overlaps are never resolved by teleporting someone upward.
   if(a.before.y+a.height<=b.before.y+eps&&a.goal.y>a.start.y&&a.pos.y+a.height>=b.pos.y){a.pos.y=b.pos.y-a.height;a.ceiling=true;contacts++;continue;}
   if(b.before.y+b.height<=a.before.y+eps&&b.goal.y>b.start.y&&b.pos.y+b.height>=a.pos.y){b.pos.y=a.pos.y-b.height;b.ceiling=true;contacts++;continue;}
   if(a.before.y>=b.before.y+b.height-eps&&a.pos.y<=b.pos.y+b.height&&a.goal.y<=a.start.y){a.pos.y=b.pos.y+b.height;a.land=true;contacts++;continue;}
   if(b.before.y>=a.before.y+a.height-eps&&b.pos.y<=a.pos.y+a.height&&b.goal.y<=b.start.y){b.pos.y=a.pos.y+a.height;b.land=true;contacts++;continue;}
   if(a.pos.y+a.height<=b.pos.y+eps||b.pos.y+b.height<=a.pos.y+eps)continue;
   if(d<eps){dx=b.before.x-a.before.x;dz=b.before.z-a.before.z;d=Math.hypot(dx,dz);if(d<eps){dx=(i+j)%2?1:0;dz=dx?0:1;d=1;}}
   var nx=dx/d,nz=dz/d,depth=r-Math.hypot(b.pos.x-a.pos.x,b.pos.z-a.pos.z)+eps;
   // First share the correction. If a wall blocks one body, the other takes the remainder.
   var ax=a.pos.x,az=a.pos.z;wallMove(a,-nx*depth*.5,-nz*depth*.5);
   var movedA=(ax-a.pos.x)*nx+(az-a.pos.z)*nz,bx=b.pos.x,bz=b.pos.z;wallMove(b,nx*(depth-movedA),nz*(depth-movedA));
   var movedB=(b.pos.x-bx)*nx+(b.pos.z-bz)*nz;if(movedA+movedB<depth-eps)wallMove(a,-nx*(depth-movedA-movedB),-nz*(depth-movedA-movedB));
   a.blocked=b.blocked=true;contacts++;
  }
 }
 return contacts;
}
var api={solve:solve};root.FishActorCollision=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
