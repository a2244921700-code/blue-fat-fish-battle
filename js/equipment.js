/* OpenAI Codex · Shared armory catalog and deterministic equipment rules. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FishEquipment=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
var HELMET='iron-rice-bowl',GOGGLES='tactical-goggles';
var categories=[['all','总览'],['primary','主武器'],['secondary','副武器'],['melee','近战'],['grenade','手雷'],['helmet','头部装备'],['shield','能量护盾']];
var characters=[{id:'deepseek',name:'deepseek娘',available:true,slot:'skin',desc:'红方角色 · 完整骨骼与动作。佩戴铁饭碗时，免疫前三次子弹爆头伤害。'}];
[['claude_fake','伪·Claude娘'],['claude_true','真·Claude娘'],['gpt','GPT娘'],['kimi','kimi娘'],['grok','Grok娘'],['gemini','Gemini娘'],['qwen','Qwen娘']].forEach(function(s){characters.push({id:s[0],name:s[1],available:false,slot:'skin',desc:'敬请期待'});});
// Character availability is validated separately from faction membership.
var characterPreviewGroups=[
 {id:'red',name:'红方角色',characters:['deepseek','claude_fake','kimi','qwen']},
 {id:'blue',name:'蓝方角色',characters:['claude_true','grok','gpt','gemini']}
];
characterPreviewGroups.forEach(function(group){group.characters.forEach(function(id){var c=characters.find(function(c){return c.id===id;});c.team=group.id;if(id==='claude_fake'){c.available=true;c.desc='红方角色 · deepseek娘的伪装身份。佩戴铁饭碗时，免疫前三次子弹爆头伤害。';}if(id==='claude_true'){c.available=true;c.desc='蓝方角色 · 独立骨骼模型与 91 个动作。佩戴战术护目镜并用狙击枪开镜时，按 V 侦察敌人 3 秒，冷却 60 秒。';}});});
var items=[
 {id:'rifle',name:'突击步枪',slot:'primary',desc:'主武器 · 中距离短点射'},
 {id:'sniper',name:'狙击步枪',slot:'primary',desc:'.338 Lapua Magnum · 5 发弹匣 · 右键按住开镜，松开退出；每发射后退镜拉栓，动作结束时仍按右键才自动回镜。高伤害、低射速，适合远距离精确射击。'},
 {id:'pistol',name:'手枪',slot:'secondary',desc:'对战副武器 · 稳定点射'},
 {id:'fishpistol',name:'鱼人手枪',slot:'secondary',desc:'对战副武器 · 快速点射'},
 {id:'knife',name:'匕首',slot:'melee',desc:'刀刃接触判定 · 刃长影响伤害与触及距离 · 左键轻击 / 右键重击'},
 {id:'grenade',name:'破片手雷',slot:'grenade',readOnly:true,label:'对战默认配发',desc:'对战每次部署配发 1 枚。按 4 手持手雷，左键按住预热、松开立即投掷；3 秒引信，碰撞反弹，继承移动与跳跃速度。'},
 {id:HELMET,name:'战术头盔·铁饭碗',slot:'helmet',desc:'抵挡 3 次子弹爆头：通常减伤 85%；deepseek娘 / 伪·Claude娘改为免疫。第三次仍受保护，随后脱落；死亡时也会掉落。身体命中、近战与爆炸不消耗次数。'},
 {id:GOGGLES,name:'战术护目镜',slot:'goggles',desc:'识别到违规IP · 头部伤害减少 20%，耐久 4 次。与头盔共用头部装备位，不能同时佩戴。真·Claude娘在对战中持狙击枪右键开镜时，按 V 获得 3 秒穿墙敌方描边；冷却 60 秒，死亡复活不刷新。'},
 {id:'energy-shield',name:'能量护盾',slot:'shield',readOnly:true,label:'无尽局内拾取',desc:'无尽模式拾取后叠加，每层减少 2 点常规伤害；辐射真实伤害不受影响。此处供查看，不能从仓库带入对战。'}
];
function skinAllowed(id,team){return characters.some(function(c){return c.id===id&&c.team===team&&c.available;});}
function validSkin(id,team){return skinAllowed(id,team)?id:team==='red'?'deepseek':'claude_true';}
function normalizeKit(o){
 o=o&&typeof o==='object'?o:{};
 return {primary:o.primary==='sniper'?'sniper':'rifle',secondary:o.secondary==='fishpistol'?'fishpistol':'pistol',melee:'knife',grenade:'grenade',helmet:o.helmet===HELMET&&o.goggles!==GOGGLES?HELMET:null,goggles:o.goggles===GOGGLES?GOGGLES:null,shield:null};
}
function normalize(o){
 o=o&&typeof o==='object'?o:{};var old=o.skins||{},skins={};
 // Keep valid current slots first; migrate old opposite-team slots by character
 // membership, not by blindly swapping them again on every read.
 ['red','blue'].forEach(function(team){var candidates=[old[team],old[team==='red'?'blue':'red'],o.skin];skins[team]=validSkin(candidates.find(function(id){return skinAllowed(id,team);}),team);});
 // Copy the old common kit into BOTH factions once. Subsequent reads use the
 // canonical per-team records; legacy aliases cannot overwrite the other team.
 var team=o.team==='red'?'red':'blue',saved=o.loadouts||{},loadouts={red:normalizeKit(saved.red||o),blue:normalizeKit(saved.blue||o)};
 return Object.assign({version:2,skin:skins.red,skins:skins,team:team,loadouts:loadouts},loadouts[team]);
}
function forTeam(o,team){var n=normalize(o);team=team==='red'?'red':'blue';return Object.assign({skin:n.skins[team]},n.loadouts[team]);}
var slots=[{id:'skin',name:'角色'},{id:'primary',name:'主武器',key:'1'},{id:'secondary',name:'副武器',key:'2'},{id:'melee',name:'近战',key:'3'},{id:'head',name:'头部装备'},{id:'grenade',name:'手雷',key:'4',readOnly:true},{id:'shield',name:'能量护盾',readOnly:true}];
function choices(slot,team){return slot==='skin'?characters.filter(function(c){return c.available&&c.team===team;}):items.filter(function(it){return !it.readOnly&&(slot==='head'?(it.slot==='helmet'||it.slot==='goggles'):it.slot===slot);});}
function equip(o,team,slot,id){
 var n=normalize(o);if(team!=='red'&&team!=='blue')return n;
 if(slot==='head'&&id===null){n.loadouts[team].helmet=null;n.loadouts[team].goggles=null;return normalize(n);}
 var item=choices(slot,team).find(function(it){return it.id===id;});if(!item)return n;
 if(slot==='skin')n.skins[team]=id;
 else if(slot==='head'){n.loadouts[team].helmet=item.slot==='helmet'?id:null;n.loadouts[team].goggles=item.slot==='goggles'?id:null;}
 else n.loadouts[team][slot]=id;
 return normalize(n);
}
function list(category){var order={};categories.forEach(function(c,i){order[c[0]]=i;});order.goggles=order.helmet;return items.filter(function(it){return !category||category==='all'||it.slot===category||category==='helmet'&&it.slot==='goggles';}).sort(function(a,b){return order[a.slot]-order[b.slot]||a.name.localeCompare(b.name,'zh-CN');});}
function createHelmet(id,character){return {id:id===HELMET?HELMET:null,character:character,charges:id===HELMET?3:0,object:null};}
function protect(state,damage,source){
 var result={damage:Math.max(0,damage),protected:false,broken:false};
 if(!state||state.id!==HELMET||state.charges<=0||!source||source.damageType!=='bullet'||!source.hit||source.hit.part!=='head'||damage<=0)return result;
 state.charges--;result.protected=true;result.broken=state.charges===0;
 result.damage=(state.character==='deepseek'||state.character==='claude_fake')?0:damage*.15;
 return result;
}
// Balance deployment assignments, including the human's choice. Never replenish
// broken helmets during combat just to keep the live counts equal.
function createGoggles(id){return {id:id===GOGGLES?GOGGLES:null,charges:id===GOGGLES?4:0,object:null};}
function protectGoggles(state,damage,source){
 var result={damage:Math.max(0,damage),protected:false,broken:false};
 if(!state||state.id!==GOGGLES||state.charges<=0||damage<=0||!source||!source.hit||source.hit.part!=='head'||source.trueDamage)return result;
 state.charges--;result.damage=damage*.8;result.protected=true;result.broken=state.charges===0;return result;
}
function canRecon(s){return !!(s&&s.alive&&s.pvp&&s.character==='claude_true'&&s.weapon==='sniper'&&s.scoped&&s.goggles&&s.goggles.id===GOGGLES&&s.goggles.charges>0);}
// Headgear keeps the character preference; sniper roles have a separate,
// symmetric team budget. Human weapon choices never consume an AI role.
function botSniperLimit(n){return Math.max(1,Math.floor(n/6));}
function roster(n,playerTeam,playerKit,random){
 random=random||Math.random;playerKit=playerKit||{};var teams={red:[],blue:[]},helmets={red:[],blue:[]};
 ['red','blue'].forEach(function(team){
  var pool=characters.filter(function(c){return c.available&&c.team===team;}),slots=[];
  for(var i=0;i<n;i++)if(!(team===playerTeam&&i===0))slots.push(i);
  for(var j=slots.length-1;j>0;j--){var at=Math.min(j,Math.floor(random()*(j+1))),swap=slots[j];slots[j]=slots[at];slots[at]=swap;}
  var preferred=new Set(slots.slice(0,Math.floor(slots.length/2)+1));
  for(var k=0;k<n;k++){
   if(team===playerTeam&&k===0){teams[team][k]=Object.assign({},normalizeKit(playerKit),{skin:playerKit.skin});continue;}
   var c=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))],suited=preferred.has(k),scout=c.id==='claude_true';
   var secondary=random()<.5?'pistol':'fishpistol',head=suited?(scout?GOGGLES:HELMET):(scout?HELMET:null);
   if(!suited&&!scout){var roll=random();head=team==='red'?(roll<.70?HELMET:roll<.80?GOGGLES:null):(roll<.5?GOGGLES:null);}
   teams[team][k]={skin:c.id,preferred:suited,primary:'rifle',secondary:secondary,helmet:head===HELMET?HELMET:null,goggles:head===GOGGLES?GOGGLES:null};
  }
  // Slots are already shuffled. Give the few sniper roles to Claude with
  // goggles first; otherwise retain the recommended rifle/helmet majority.
  function priority(slot){var k=teams[team][slot];return k.skin==='claude_true'&&k.goggles===GOGGLES?0:k.preferred?2:1;}
  slots.slice().sort(function(a,b){return priority(a)-priority(b);}).slice(0,botSniperLimit(n)).forEach(function(slot){teams[team][slot].primary='sniper';});
 });
 // Retain the <=2 helmet gap without stripping the red team's new preference.
 // First equip blue non-snipers; neither the human kit nor recon snipers change.
 function helmetCount(team){return teams[team].filter(function(k){return k.helmet===HELMET;}).length;}
 function botSlots(team,predicate){return teams[team].filter(function(k,i){return !(team===playerTeam&&i===0)&&predicate(k);});}
 while(helmetCount('red')-helmetCount('blue')>2){
  var choices=botSlots('blue',function(k){return k.primary!=='sniper'&&k.helmet!==HELMET;}),kit;
  if(choices.length){kit=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];kit.helmet=HELMET;kit.goggles=null;}
  else{
   // At 12/16 players, preserving both blue sniper kits can exhaust capacity.
   // Remove only an extra red helmet, never the preferred group or human kit.
   choices=botSlots('red',function(k){return !k.preferred&&k.helmet===HELMET;});if(!choices.length)break;
   kit=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];kit.helmet=null;
  }
 }
 ['red','blue'].forEach(function(team){helmets[team]=teams[team].map(function(k){return k.helmet===HELMET;});});
 helmets.counts={red:helmets.red.filter(Boolean).length,blue:helmets.blue.filter(Boolean).length};
 return {teams:teams,helmets:helmets};
}
function allocate(n,playerEquipped,random,playerTeam){
 random=random||Math.random;playerTeam=playerTeam==='blue'?'blue':'red';var plan={red:[],blue:[]};
 ['red','blue'].forEach(function(team){for(var i=0;i<n;i++)plan[team][i]=team===playerTeam&&i===0?!!playerEquipped:random()<.5;});
 function count(a){return a.filter(Boolean).length;}
 while(Math.abs(count(plan.red)-count(plan.blue))>2){
  var team=count(plan.red)>count(plan.blue)?'red':'blue',slots=[];
  plan[team].forEach(function(on,i){if(on&&!(team===playerTeam&&i===0))slots.push(i);});
  plan[team][slots[Math.min(slots.length-1,Math.floor(random()*slots.length))]]=false;
 }
 plan.counts={red:count(plan.red),blue:count(plan.blue)};return plan;
}
return {helmetId:HELMET,gogglesId:GOGGLES,categories:categories,characters:characters,characterPreviewGroups:characterPreviewGroups,validSkin:validSkin,items:items,normalize:normalize,normalizeKit:normalizeKit,forTeam:forTeam,slots:slots,choices:choices,equip:equip,list:list,createHelmet:createHelmet,protect:protect,createGoggles:createGoggles,protectGoggles:protectGoggles,canRecon:canRecon,reconDuration:3,reconCooldown:60,allocate:allocate,roster:roster,botSniperLimit:botSniperLimit};
});
