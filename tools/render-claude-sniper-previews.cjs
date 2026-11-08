'use strict';
// Render actual runtime assets; no helmet is included in the character portrait.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));
 await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame);
 const images=await page.evaluate(async()=>{
  await FishCharacters.load(null,['claude_true']);
  const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(768,768);r.setClearColor(0,0);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  const s=new THREE.Scene();s.add(new THREE.HemisphereLight(0xd8edff,0xa88764,2.1));const light=new THREE.DirectionalLight(0xffe3be,3);light.position.set(-3,5,4);s.add(light);const rim=new THREE.DirectionalLight(0xabcaff,1.8);rim.position.set(3,3,-2);s.add(rim);
  const c=new THREE.PerspectiveCamera(31,1,.01,50),rig=FishCharacters.create({character:'claude_true',weapon:'unarmed'});rig.update(.25,{speed:0,grounded:true});s.add(rig.root);
  c.position.set(2.3,1.65,4.5);c.lookAt(0,1.02,0);r.render(s,c);const character=r.domElement.toDataURL('image/png');
  const bowl=FishHelmet.attach(rig);r.render(s,c);const helmet=r.domElement.toDataURL('image/png');FishArt.disposeTree(bowl);
  rig.equip('sniper');rig.update(.3,{speed:0,grounded:true});r.render(s,c);const held=r.domElement.toDataURL('image/png');s.remove(rig.root);rig.dispose();
  const gun=FishCombat.playerWeapon('sniper');const hands=[];gun.traverse(o=>{if(o.name==='procedural-hand')hands.push(o);});hands.forEach(o=>o.removeFromParent());gun.rotation.y=-Math.PI/2;s.add(gun);
  c.position.set(1.4,.8,4.1);c.lookAt(.3,.02,0);r.render(s,c);const sniper=r.domElement.toDataURL('image/png');r.dispose();return {character,sniper,helmet,held};
 });
 for(const [key,file]of [['character','equipment/claude_true.png'],['sniper','weapons/sniper.png']]){const dest=path.join(__dirname,'../assets/ui-art',file);fs.writeFileSync(dest,Buffer.from(images[key].split(',')[1],'base64'));console.log(dest);}
 for(const key of ['helmet','held'])fs.writeFileSync(path.join(__dirname,'../tests/claude-sniper-results/true-claude-'+key+'.png'),Buffer.from(images[key].split(',')[1],'base64'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
