'use strict';
// Native Three.js renders of the delivered asset; character-selection art is untouched.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame);
 const images=await page.evaluate(async()=>{
  await FishCharacters.load(null,['deepseek','claude_fake','claude_true']);
  const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(768,768);r.setClearColor(0,0);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;
  const s=new THREE.Scene();s.add(new THREE.HemisphereLight(0xd8edff,0xa88764,2.1));const light=new THREE.DirectionalLight(0xffe3be,3);light.position.set(-3,5,4);s.add(light);const rim=new THREE.DirectionalLight(0xabcaff,1.8);rim.position.set(3,3,-2);s.add(rim);
  const camera=new THREE.PerspectiveCamera(31,1,.01,50),images={};
  for(const id of ['deepseek','claude_fake','claude_true']){
   const rig=FishCharacters.create({character:id,weapon:'unarmed'});rig.update(.25,{speed:0,grounded:true});s.add(rig.root);FishGoggles.attach(rig);
   camera.position.set(1.8,1.65,4.5);camera.lookAt(0,1.02,0);r.render(s,camera);images[id]=r.domElement.toDataURL('image/png');
   camera.position.set(.5,1.7,2.5);camera.lookAt(0,1.56,0);r.render(s,camera);images[id+'-face']=r.domElement.toDataURL('image/png');
   s.remove(rig.root);rig.dispose();
  }
  const gear=FishGoggles.create('claude_true');s.add(gear);r.setSize(768,432);camera.aspect=768/432;camera.updateProjectionMatrix();camera.position.set(.17,.16,.48);camera.lookAt(0,0,-.15);r.render(s,camera);images.item=r.domElement.toDataURL('image/png');r.dispose();return images;
 });
 const out=path.join(__dirname,'../tests/goggles-armory-results');fs.mkdirSync(out,{recursive:true});
 for(const [key,data] of Object.entries(images)){const dest=key==='item'?path.join(__dirname,'../assets/ui-art/equipment/tactical-goggles.png'):path.join(out,key+'.png');fs.writeFileSync(dest,Buffer.from(data.split(',')[1],'base64'));console.log(dest);}
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
