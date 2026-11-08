/* Shared cartridge identities and loot decisions. Names describe this game's
 * chamberings; a weapon's slot/model alone never makes ammunition compatible. */
(function(root){
'use strict';
var ammoTypes={
 '762x39':{name:'7.62×39 mm',family:'步枪弹'},'9x19':{name:'9×19 mm',family:'手枪弹'},
 '45acp':{name:'.45 ACP',family:'手枪弹'},'556x45':{name:'5.56×45 mm',family:'步枪弹'},
 '762x51':{name:'7.62×51 mm',family:'步枪弹'},'12g':{name:'12 号霰弹',family:'霰弹'},
 '338lapua':{name:'.338 Lapua Magnum',family:'狙击弹'}
};
var weapons={rifle:{name:'突击步枪',slot:'primary',ammo:'762x39',quality:1.4},
 sniper:{name:'狙击步枪',slot:'primary',ammo:'338lapua',quality:1.6},
 pistol:{name:'手枪',slot:'secondary',ammo:'45acp',quality:1},
 fishpistol:{name:'鱼人手枪',slot:'secondary',ammo:'9x19',quality:1.1}};
function firearm(id){return weapons[id]||null;}
function ammoName(id){var w=firearm(id);return w&&ammoTypes[w.ammo]?ammoTypes[w.ammo].name:'';}
function compatible(a,b){return !!weapons[a]&&!!weapons[b]&&weapons[a].ammo===weapons[b].ammo;}
function amount(a){return Math.max(0,a.mag||0)+Math.max(0,a.reserve||0);}
function decide(slots,stock,drop,cap,options){
 options=options||{};var w=firearm(drop.id);if(!w)return {action:'none',reason:'不可拾取'};
 // Non-sniper AI cannot turn collected enemy/player rifles into an unlimited
 // sniper team. A sniper role persists through death and normal respawns.
 if(options.ai&&options.sniperRole===false&&drop.id==='sniper')return {action:'none',reason:'非狙击手配额'};
 var owned=slots[w.slot];if(!owned)return {action:'pickup',slot:w.slot,score:2};
 var total=amount(drop),other=firearm(owned);
 if(options.ai&&owned!==drop.id&&total>0){
  var value=function(id){return weapons[id].quality+(options.favorite===id ? .3 : 0);};
  if(value(drop.id)>value(owned)+.05)return {action:'swap',slot:w.slot,old:owned,score:1.2+(value(drop.id)-value(owned))};
 }
 // Cartridge matching, rather than model or slot equality, permits future guns
 // that share ammunition. Prefer the corresponding slot if both guns match.
 var candidates=[owned,slots.primary,slots.secondary].filter(function(id,i,a){return id&&a.indexOf(id)===i&&compatible(id,drop.id);});
 for(var i=0;i<candidates.length;i++){
  var id=candidates[i],a=stock[id]||{mag:0,reserve:0},room=Math.max(0,cap(id)-a.reserve);
  if(room>0&&total>0)return {action:'ammo',id:id,amount:Math.min(total,room),score:1-a.reserve/Math.max(1,cap(id))};
 }
 return {action:'none',reason:candidates.length?(total>0?'备弹已满':'弹药已空'):(other?'弹药型号不同 · G 丢弃后可换枪':'武器槽已占用')};
}
var api={ammoTypes:ammoTypes,weapons:weapons,firearm:firearm,ammoName:ammoName,compatible:compatible,amount:amount,decide:decide};
if(typeof module==='object'&&module.exports)module.exports=api;root.FishWeapons=api;
})(typeof window==='undefined'?globalThis:window);
