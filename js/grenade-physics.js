/* Timed, swept-sphere grenades; metres / seconds. No renderer dependency. */
(function(root){
  'use strict';
  var RADIUS=.14,FUSE=3.0,GRAVITY=-15,EPS=.0001;
  function launchVelocity(aim,motion){
    // Full actual horizontal movement and most vertical momentum are inherited.
    // A blocked player contributes zero horizontal velocity, not key intent.
    return {x:aim.x*15.5+motion.x,y:aim.y*15.5+3.3+motion.y*.85,z:aim.z*15.5+motion.z};
  }
  function sweepBox(p,d,o,r){
    var entry=0,exit=1,normal={x:0,y:0,z:0},inside=true;
    for(var i=0;i<3;i++){
      var a=['x','y','z'][i],lo=o.min[a]-r,hi=o.max[a]+r;
      if(p[a]<lo-EPS||p[a]>hi+EPS)inside=false;
      if(Math.abs(d[a])<1e-10){if(p[a]<lo||p[a]>hi)return null;continue;}
      var t0=(lo-p[a])/d[a],t1=(hi-p[a])/d[a],sign=-1;
      if(t0>t1){var t=t0;t0=t1;t1=t;sign=1;}
      if(t0>=entry){entry=t0;normal={x:0,y:0,z:0};normal[a]=sign;}
      exit=Math.min(exit,t1);if(entry>exit)return null;
    }
    if(inside){
      // Numerical contact/embedded spawn: only stop travel into the nearest
      // boundary. Never snap a grenade up to a roof or across a wall.
      var distance=Infinity;
      ['x','y','z'].forEach(function(a){[-1,1].forEach(function(s){var gap=s<0?p[a]-(o.min[a]-r):(o.max[a]+r)-p[a];if(gap<distance){distance=gap;normal={x:0,y:0,z:0};normal[a]=s;}});});
      if(d.x*normal.x+d.y*normal.y+d.z*normal.z>=0)return null;
      return {t:0,normal:normal};
    }
    if(entry<0||entry>1||exit<0||!(normal.x||normal.y||normal.z))return null;
    return {t:entry,normal:normal};
  }
  function sweep(p,d,obstacles,r){
    r=r===undefined?RADIUS:r;var best=null;
    if(d.y<0&&p.y+d.y<=r)best={t:Math.max(0,(r-p.y)/d.y),normal:{x:0,y:1,z:0}};
    for(var i=0;i<obstacles.length;i++){
      var o=obstacles[i];
      if(Math.max(p.x,p.x+d.x)+r<o.min.x||Math.min(p.x,p.x+d.x)-r>o.max.x||Math.max(p.y,p.y+d.y)+r<o.min.y||Math.min(p.y,p.y+d.y)-r>o.max.y||Math.max(p.z,p.z+d.z)+r<o.min.z||Math.min(p.z,p.z+d.z)-r>o.max.z)continue;
      var h=sweepBox(p,d,o,r);if(h&&(!best||h.t<best.t))best=h;
    }
    return best;
  }
  function step(g,dt,obstacles){
    var result={expired:g.fuse<=0,bounces:0,impact:0};
    if(result.expired||dt<=0)return result;
    // Integrate only until the exact fuse expiry, including airborne explosions.
    var duration=Math.min(dt,g.fuse),count=Math.max(1,Math.ceil(duration/(1/120)-1e-8)),h=duration/count;
    g.fuse=Math.max(0,g.fuse-duration);g.age=(g.age||0)+duration;
    for(var k=0;k<count;k++){
      if(g.sleeping)continue;
      g.vel.y+=GRAVITY*h;
      var left=h;
      for(var hitCount=0;hitCount<5&&left>1e-7;hitCount++){
        var delta={x:g.vel.x*left,y:g.vel.y*left,z:g.vel.z*left},hit=sweep(g.pos,delta,obstacles);
        var t=hit?Math.max(0,Math.min(1,hit.t)):1;
        g.pos.x+=delta.x*t;g.pos.y+=delta.y*t;g.pos.z+=delta.z*t;
        if(!hit)break;
        var n=hit.normal,vn=g.vel.x*n.x+g.vel.y*n.y+g.vel.z*n.z;
        g.pos.x+=n.x*EPS;g.pos.y+=n.y*EPS;g.pos.z+=n.z*EPS;
        if(vn<0){
          var ground=n.y>.5,restitution=ground?.38:.52,friction=ground?.76:.88;
          if(ground&&-vn<1.2)restitution=0;
          g.vel.x=(g.vel.x-vn*n.x)*friction-vn*n.x*restitution;
          g.vel.y=(g.vel.y-vn*n.y)*friction-vn*n.y*restitution;
          g.vel.z=(g.vel.z-vn*n.z)*friction-vn*n.z*restitution;
          if(-vn>1.2){result.bounces++;result.impact=Math.max(result.impact,-vn);g.bounces=(g.bounces||0)+1;}
          if(ground&&Math.hypot(g.vel.x,g.vel.y,g.vel.z)<.4){g.vel.x=g.vel.y=g.vel.z=0;g.sleeping=true;break;}
        }
        left*=1-t;
      }
    }
    result.expired=g.fuse<=1e-8;return result;
  }
  var api={radius:RADIUS,fuse:FUSE,gravity:GRAVITY,launchVelocity:launchVelocity,sweep:sweep,step:step};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishGrenadePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
