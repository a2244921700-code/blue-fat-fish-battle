'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/characters/runtime/motion-data.js'),'utf8'),ctx);
const packed=ctx.window.FISH_MOTION_DATA,pool=Buffer.from(packed.data,'base64');let tracks=0,meshAccessors=0;
const src='D:/DSH/素材库/游戏专用素材/蓝色肥鱼大作战专用/模型&动画/人物模型&动画/';
const paths={deepseek:src+'鲸鱼娘/Project model&Animation/WhaleMaid_FPS_Rig_v005/delivery/WhaleMaid_FPS_v005.glb',claude_fake:src+'伪·claude娘/Project model&Animation/PseudoClaude_FPS_Rig_v001/delivery/PseudoClaude_FPS_v001.glb',claude_true:src+'真·claude娘/Project model&Animation/TrueClaude_FPS_Rig_v001/delivery/TrueClaude_FPS_v001.glb'};
function read(b){const n=b.readUInt32LE(12);return {j:JSON.parse(b.subarray(20,20+n)),b:b.subarray(28+n)};}
function values(g,i){const a=g.j.accessors[i],v=g.j.bufferViews[a.bufferView],bytes=({5121:1,5123:2,5125:4,5126:4})[a.componentType],n=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16})[a.type]*bytes,stride=v.byteStride||n,start=(v.byteOffset||0)+(a.byteOffset||0),result=Buffer.alloc(a.count*n);for(let k=0;k<a.count;k++)g.b.copy(result,k*n,start+k*stride,start+k*stride+n);return result;}
for(const [id,file] of Object.entries(paths)){
 const source=read(fs.readFileSync(file));vm.runInNewContext(fs.readFileSync(path.join(root,'assets/characters/runtime/'+id+'-model.js'),'utf8'),ctx);const model=read(Buffer.from(ctx.window.FISH_MODEL_DATA[id],'base64'));
 assert(!model.j.animations,'Model must not contain a second animation copy');
 assert.equal(model.j.nodes.length,source.j.nodes.length);assert.deepEqual(model.j.nodes,source.j.nodes,'Authored bones, sockets and transforms must be lossless');
 for(let mi=0;mi<source.j.meshes.length;mi++)for(let pi=0;pi<source.j.meshes[mi].primitives.length;pi++){
  const a=source.j.meshes[mi].primitives[pi],b=model.j.meshes[mi].primitives[pi];for(const key of Object.keys(a.attributes)){assert(values(source,a.attributes[key]).equals(values(model,b.attributes[key])));meshAccessors++;}assert(values(source,a.indices).equals(values(model,b.indices)));
 }
 for(let n=0;n<source.j.skins.length;n++)assert(values(source,source.j.skins[n].inverseBindMatrices).equals(values(model,model.j.skins[n].inverseBindMatrices)));
 assert.equal(packed.characters[id].length,91);
 for(const clip of source.j.animations){const actual=packed.characters[id].find(c=>c.name===clip.name);assert(actual);assert.equal(actual.tracks.length,clip.channels.length);for(let n=0;n<clip.channels.length;n++){
  const c=clip.channels[n],s=clip.samplers[c.sampler],t=actual.tracks[n];assert.equal(t.name,source.j.nodes[c.target.node].name+'.'+({rotation:'quaternion',translation:'position',scale:'scale'})[c.target.path]);
  for(const [accessor,poolId] of [[s.input,t.times],[s.output,t.values]]){const off=packed.pool[poolId];assert(values(source,accessor).equals(pool.subarray(off[0],off[0]+off[1]*4)));}tracks++;
 }}
 console.log('PASS | '+id+' model/skin transforms and all 91 authored clips preserved');
}
console.log(JSON.stringify({tracksCompared:tracks,meshAccessors,uniqueMotionBytes:pool.length}));
