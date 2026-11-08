/* One fired round, one bolt cycle. This module never changes ammunition. */
(function(root){'use strict';
var duration=1.15,ejectAt=.42,lockAt=.90;
function ramp(t,a,b){var k=Math.max(0,Math.min(1,(t-a)/(b-a)));return k*k*(3-2*k);}
function pose(t){
 if(t===undefined||t===null||t<0||t>=duration)return {active:false,hand:0,lift:0,pull:0,caseAge:-1};
 return {active:true,hand:ramp(t,.06,.22)*(1-ramp(t,.93,duration)),lift:ramp(t,.16,.30)*(1-ramp(t,.79,lockAt)),pull:ramp(t,.30,.48)*(1-ramp(t,.58,.79)),caseAge:t>=ejectAt?t-ejectAt:-1};
}
function animate(weapon,t){
 var p=pose(t);if(!weapon||!weapon.bolt)return p;
 weapon.bolt.position.z=weapon.bolt.userData.homeZ+p.pull*.13;weapon.bolt.rotation.z=p.lift*.95;
 var shell=weapon.spentCase,age=p.caseAge;if(shell){shell.visible=age>=0&&age<.58;if(shell.visible){shell.position.set(.075+age*1.35,.065+age*.95-age*age*3.8,-.025+age*.3);shell.rotation.set(age*14,age*9,Math.PI/2+age*11);}}
 return p;
}
var api={duration:duration,ejectAt:ejectAt,lockAt:lockAt,pose:pose,animate:animate};
if(typeof module==='object'&&module.exports)module.exports=api;root.FishSniperCycle=api;
})(typeof window==='undefined'?globalThis:window);
