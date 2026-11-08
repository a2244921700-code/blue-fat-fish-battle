'use strict';
const assert=require('node:assert/strict'),g=require('../js/tactical-grenades.js'),{Tactics}=require('../js/fps-ai.js');
const actor={id:'bot',team:'red',alive:true,position:{x:0,y:1.4,z:0},baseY:1.4,eyeY:1.65,brain:{yaw:0}};
const tactics=new Tactics({obstacles:[],limit:30,weapons:{rifle:{magSize:30},pistol:{magSize:12}},routes:[[[0,0],[0,10]]]}),bomb=(x,z,team='blue')=>({pos:{x,y:.16,z},vel:{x:0,y:0,z:0},fuse:2,team});
let count=0;function check(n,f){f();console.log('PASS | '+n);count++;}
check('Only visible hostile grenades enter memory',()=>{const memory=g.observe(actor,[bomb(0,3),bomb(0,-3),bomb(3,0),bomb(0,3,'red')],tactics,[],0);assert.equal(memory.length,1);});
check('A solid wall blocks grenade detection',()=>{tactics.obstacles.push({min:{x:-2,y:0,z:1},max:{x:2,y:4,z:2}});assert.equal(g.observe(actor,[bomb(0,3)],tactics,[],0).length,0);tactics.obstacles.length=0;});
check('Previously seen grenade uses last prediction after leaving sight',()=>{const b=bomb(0,3),mem=g.observe(actor,[b],tactics,[],0),old={...mem[0].point};b.pos.z=-5;const hidden=g.observe(actor,[b],tactics,mem,.3);assert.deepEqual(hidden[0].point,old);assert.equal(hidden[0].firstSeen,0);assert.equal(g.observe(actor,[],tactics,hidden,2.1).length,0);});
check('Reachable escape reduces blast risk; outside the radius has no detour',()=>{const memory=g.observe(actor,[bomb(0,3)],tactics,[],0),exit=g.escape(actor,memory,tactics,.2);assert(exit);assert(g.risk({...exit,y:1},memory,tactics)<g.risk({x:0,y:1,z:0},memory,tactics));assert.equal(g.escape({...actor,position:{x:20,y:1.4,z:0}},memory,tactics,.2),null);});
check('No reachable escape returns null instead of teleporting',()=>{const memory=g.observe(actor,[bomb(0,3)],tactics,[],0),nav=tactics.nav;tactics.nav={clear:()=>false};assert.equal(g.escape(actor,memory,tactics,.2),null);tactics.nav=nav;});
check('Awareness includes predicted bouncing trajectory of an airborne grenade',()=>{const b=bomb(0,9);b.pos.y=3;b.vel={x:0,y:1,z:-4};const m=g.observe(actor,[b],tactics,[],0);assert.equal(m.length,1);assert(m[0].point.z<9&&m[0].point.y<1);});
console.log(count+' grenade awareness checks passed');
