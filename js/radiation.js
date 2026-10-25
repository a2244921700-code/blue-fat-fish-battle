/* OpenAI Codex · 无尽辐射区规则，与渲染/护甲/普通受击冷却独立。 */
(function(root){
'use strict';
var rules=Object.freeze({radius:10,duration:15,damage:2,interval:1,speedMultiplier:.5});
function create(){
  var zones=[],exposure=0,nextId=1;
  function contains(z,p){var dx=p.x-z.x,dz=p.z-z.z;return z.remaining>0&&dx*dx+dz*dz<=rules.radius*rules.radius;}
  return {
    zones:zones,
    add:function(p){var z={id:nextId++,x:p.x,z:p.z,remaining:rules.duration};zones.push(z);return z;},
    speedAt:function(p){return zones.some(function(z){return contains(z,p);})?rules.speedMultiplier:1;},
    step:function(dt,p){
      if(!(dt>0))return {damage:0,ticks:0};
      // 重叠区域取最长有效覆盖时间，不叠加伤害或减速。
      var contact=0;
      zones.forEach(function(z){if(contains(z,p))contact=Math.max(contact,Math.min(dt,z.remaining));});
      if(contact>0)exposure+=contact;else exposure=0;
      var ticks=Math.floor((exposure+1e-8)/rules.interval);
      exposure=Math.max(0,exposure-ticks*rules.interval);
      for(var i=zones.length-1;i>=0;i--){zones[i].remaining-=dt;if(zones[i].remaining<1e-8)zones.splice(i,1);}
      if(!zones.length||contact<dt-1e-8)exposure=0;
      return {damage:ticks*rules.damage,ticks:ticks};
    },
    clear:function(){zones.length=0;exposure=0;},
    snapshot:function(){return {exposure:exposure,zones:zones.map(function(z){return {id:z.id,x:z.x,z:z.z,remaining:z.remaining};})};}
  };
}
var api={rules:rules,create:create};
if(typeof module==='object'&&module.exports)module.exports=api;root.FishRadiation=api;
})(typeof window!=='undefined'?window:globalThis);
