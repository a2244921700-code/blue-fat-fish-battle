/* Refresh static armory previews from the actual in-game Three.js weapon models. */
'use strict';
const fs=require('node:fs'),path=require('node:path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage();await page.goto(process.env.FISH_TEST_URL||'http://127.0.0.1:8123/');await page.waitForFunction(()=>window.FishGame&&FishGame.__debug.isFishReady());
 const images=await page.evaluate(()=>{
  const T=THREE,r=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(640,320);r.setClearColor(0,0);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.5;
  const scene=new T.Scene();scene.add(new T.HemisphereLight(0xe5f3ff,0x53656d,2));
  const key=new T.DirectionalLight(0xffffff,3);key.position.set(-2,3,4);scene.add(key);const rim=new T.DirectionalLight(0xffd393,1.8);rim.position.set(2,1,-3);scene.add(rim);
  const cam=new T.OrthographicCamera(-1,1,.5,-.5,.01,30);cam.position.set(0,0,8);cam.lookAt(0,0,0);
  const out={};for(const id of ['rifle','pistol','fishpistol','knife']){
   const rig=FishPvpArt.weapon(id);rig.rotation.set(.12,Math.PI/2-.2,-.12);rig.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(rig),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
   const scale=Math.min(1.75/size.x,.79/size.y);rig.scale.setScalar(scale);rig.position.copy(center).multiplyScalar(-scale);scene.add(rig);
   r.render(scene,cam);out[id]=r.domElement.toDataURL('image/png').split(',')[1];scene.remove(rig);
  }
  r.dispose();r.forceContextLoss();return out;
 });
 const dir=path.join(__dirname,'../assets/ui-art/weapons');fs.mkdirSync(dir,{recursive:true});for(const [id,data] of Object.entries(images)){fs.writeFileSync(path.join(dir,id+'.png'),Buffer.from(data,'base64'));console.log(id);}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
