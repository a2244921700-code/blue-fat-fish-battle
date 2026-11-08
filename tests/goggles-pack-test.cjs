'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../assets/equipment/tactical-goggles'),ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(dir,'manifest.js'),'utf8'),ctx);
const source='D:/DSH/素材库/游戏专用素材/蓝色肥鱼大作战专用/模型&动画/装备模型/战术护目镜·识别到违规IP';
const profiles=JSON.parse(fs.readFileSync(path.join(source,'fit_profiles.json'),'utf8')),names={deepseek:'WhaleMaid',claude_fake:'PseudoClaude',claude_true:'TrueClaude'};
for(const [id,fit]of Object.entries(ctx.window.FISH_GOGGLES_MANIFEST.variants)){
 vm.runInContext(fs.readFileSync(path.join(dir,fit.file),'utf8'),ctx);const buffer=Buffer.from(ctx.window.FISH_GOGGLES_DATA[id],'base64');
 assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),fit.sha256);assert(buffer.equals(fs.readFileSync(path.join(source,profiles[names[id]].file))));
 const json=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
 assert.equal(json.animations?.length||0,0);assert.equal(json.images?.length||0,0);assert.equal(json.materials.length,6);
 const lens=json.materials.find(m=>m.name==='Goggles_Smoke_Blue_Transparent_Lens');assert.equal(lens.alphaMode,'BLEND');assert.equal(lens.doubleSided,true);
 assert.deepEqual(Array.from(fit.mount.position),profiles[names[id]].mount.position);assert.deepEqual(Array.from(fit.mount.scale),profiles[names[id]].mount.scale);assert.equal(fit.parentBone,'Head');
 console.log('PASS | '+id+': GLB逐字节一致、挂点一致、无重复角色纹理或动作');
}
assert.deepEqual(fs.readdirSync(dir).sort(),['claude_fake.js','claude_true.js','deepseek.js','manifest.js']);console.log('4 goggles asset checks passed.');
