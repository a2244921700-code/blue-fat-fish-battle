'use strict';
// One portable payload per authored fit; no duplicate GLB or character data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=process.argv[2]||'D:/DSH/素材库/游戏专用素材/蓝色肥鱼大作战专用/模型&动画/装备模型/战术护目镜·识别到违规IP';
const out=path.join(__dirname,'../assets/equipment/tactical-goggles');
const profiles=JSON.parse(fs.readFileSync(path.join(source,'fit_profiles.json'),'utf8'));
const original=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
const ids={WhaleMaid:'deepseek',PseudoClaude:'claude_fake',TrueClaude:'claude_true'};
const manifest={version:1,lens:original.lens,variants:{}};
fs.mkdirSync(out,{recursive:true});
for(const variant of original.variants){
 const id=ids[variant.character],data=fs.readFileSync(path.join(source,variant.file));
 const hash=crypto.createHash('sha256').update(data).digest('hex');
 if(hash!==variant.sha256)throw new Error('Source checksum differs: '+variant.file);
 const fit=profiles[variant.character],file=id+'.js';
 manifest.variants[id]={file,sha256:hash,bytes:data.length,triangles:variant.triangles,parentBone:fit.parent_bone,mount:{position:fit.mount.position,quaternion:fit.mount.quaternion_xyzw,scale:fit.mount.scale}};
 fs.writeFileSync(path.join(out,file),'/* Authored tactical goggles: '+id+' */\n(window.FISH_GOGGLES_DATA=window.FISH_GOGGLES_DATA||{})['+JSON.stringify(id)+']='+JSON.stringify(data.toString('base64'))+';\n');
}
fs.writeFileSync(path.join(out,'manifest.js'),'/* OpenAI Codex · Authored Head-local fits, shared by HTTP and file://. */\nwindow.FISH_GOGGLES_MANIFEST='+JSON.stringify(manifest)+';\n');
console.log('3 verified fit variants; '+fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0)+' runtime bytes');
