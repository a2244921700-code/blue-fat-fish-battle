/* Player AABB sweeps. Pure logic shared by both maps; no renderer or DOM. */
(function(root){
  'use strict';
  var EPS=1e-5;
  function overlapsXZ(p,o,r){return p.x>o.min.x-r+EPS&&p.x<o.max.x+r-EPS&&p.z>o.min.z-r+EPS&&p.z<o.max.z+r-EPS;}
  function heightLimit(p,obstacles,r,wanted){
    var height=wanted;
    for(var i=0;i<obstacles.length;i++){
      var o=obstacles[i];
      if(overlapsXZ(p,o,r)&&o.min.y>=p.y-EPS&&o.max.y>p.y+EPS)height=Math.min(height,Math.max(0,o.min.y-p.y));
    }
    return height;
  }
  function axis(p,amount,key,other,obstacles,r,height,limit){
    if(!amount)return;
    var start=p[key],end=start+amount;
    for(var i=0;i<obstacles.length;i++){
      var o=obstacles[i];
      if(p.y+height<=o.min.y+EPS||p.y>=o.max.y-EPS||p[other]<=o.min[other]-r+EPS||p[other]>=o.max[other]+r-EPS)continue;
      var lo=o.min[key]-r,hi=o.max[key]+r;
      if(amount>0&&start<=lo+EPS&&end>lo)end=Math.min(end,lo);
      else if(amount<0&&start>=hi-EPS&&end<hi)end=Math.max(end,hi);
      // Existing overlaps (e.g. an externally repositioned actor) may leave the
      // volume, but must never be projected to a distant box edge.
      else if(start>lo+EPS&&start<hi-EPS){
        var oldDepth=Math.min(start-lo,hi-start),newDepth=Math.min(end-lo,hi-end);
        if(newDepth>=oldDepth)end=start;
      }
    }
    p[key]=Math.max(-limit,Math.min(limit,end));
  }
  function step(body,dx,dz,dt,opts){
    var p=body.pos,obs=opts.obstacles,r=opts.radius,height=opts.height;
    // Small substeps preserve diagonal jumps around lips; each axis still uses
    // a sweep so thin ceilings and fast falls cannot be crossed between frames.
    var steps=Math.max(1,Math.ceil(dt/(1/60)-1e-8)),h=dt/steps,landSpeed=0,ceiling=false;
    for(var n=0;n<steps;n++){
      axis(p,dx/steps,'x','z',obs,r,height,opts.limit);
      axis(p,dz/steps,'z','x',obs,r,height,opts.limit);
      var prev=p.y;body.velY+=opts.gravity*h;var next=prev+body.velY*h;
      if(body.velY>0){
        var top=next+height;
        for(var i=0;i<obs.length;i++){
          var o=obs[i];if(!overlapsXZ(p,o,r))continue;
          if(prev+height<=o.min.y+EPS&&top>=o.min.y){top=Math.min(top,o.min.y);ceiling=true;}
        }
        next=top-height;if(ceiling)body.velY=0;body.onGround=false;
      }else{
        var floor=0;
        for(var j=0;j<obs.length;j++){
          var b=obs[j];if(overlapsXZ(p,b,r)&&b.max.y<=prev+EPS&&b.max.y>=next-EPS)floor=Math.max(floor,b.max.y);
        }
        if(next<=floor+EPS){
          if(!body.onGround)landSpeed=Math.max(landSpeed,-body.velY);
          next=floor;body.velY=0;body.onGround=true;
        }else body.onGround=false;
      }
      p.y=next;
    }
    return {landSpeed:landSpeed,ceiling:ceiling};
  }
  var api={step:step,heightLimit:heightLimit};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.FishPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
