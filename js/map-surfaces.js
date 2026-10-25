/* Axis-aligned architectural shells. Clip hidden faces before batching rather
 * than offsetting overlapping walls. Pure data so joins can be regression-tested. */
(function(root){
  'use strict';
  var EPS=1e-6,axes=['x','y','z'];
  function subtract(r,c){
    var l=Math.max(r[0],c[0]),b=Math.max(r[1],c[1]),rr=Math.min(r[2],c[2]),t=Math.min(r[3],c[3]);
    if(rr-l<EPS||t-b<EPS)return [r];
    var out=[];
    if(l-r[0]>EPS)out.push([r[0],r[1],l,r[3]]);
    if(r[2]-rr>EPS)out.push([rr,r[1],r[2],r[3]]);
    if(b-r[1]>EPS)out.push([l,r[1],rr,b]);
    if(r[3]-t>EPS)out.push([l,t,rr,r[3]]);
    return out;
  }
  function exposedFaces(boxes){
    var out=[];
    boxes.forEach(function(s,index){
      axes.forEach(function(axis,ai){
        var u=axes[(ai+1)%3],v=axes[(ai+2)%3];
        [-1,1].forEach(function(side){
          var plane=side<0?s.min[axis]:s.max[axis];
          // The ground owns the surface under buildings.
          if(axis==='y'&&side===-1&&Math.abs(plane)<EPS)return;
          var pieces=[[s.min[u],s.min[v],s.max[u],s.max[v]]];
          boxes.forEach(function(o,oi){
            if(oi===index||!pieces.length||plane<o.min[axis]-EPS||plane>o.max[axis]+EPS)return;
            var outer=side<0?o.min[axis]:o.max[axis];
            // Coincident exterior surfaces have one owner; touching inward
            // surfaces and faces embedded in another volume are both removed.
            if(Math.abs(plane-outer)<EPS&&oi>index)return;
            var cut=[o.min[u],o.min[v],o.max[u],o.max[v]],next=[];
            pieces.forEach(function(r){Array.prototype.push.apply(next,subtract(r,cut));});pieces=next;
          });
          pieces.forEach(function(rect){out.push({source:index,axis:axis,u:u,v:v,side:side,plane:plane,rect:rect});});
        });
      });
    });
    return out;
  }
  // One top face per point, also used for intersecting paving ribbons.
  function unionRectangles(rects){
    var out=[];
    rects.forEach(function(r,i){var parts=[r];for(var j=0;j<i&&parts.length;j++){var next=[];parts.forEach(function(p){Array.prototype.push.apply(next,subtract(p,rects[j]));});parts=next;}Array.prototype.push.apply(out,parts);});return out;
  }
  var api={subtract:subtract,exposedFaces:exposedFaces,unionRectangles:unionRectangles};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FishMapSurfaces=api;
})(typeof window!=='undefined'?window:globalThis);
