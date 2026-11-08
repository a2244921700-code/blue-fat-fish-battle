/* Lossless runtime extraction: one model per character; byte-identical motion
 * channels and timestamps stored once. Source GLBs are never modified. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/characters/runtime');
const sources=process.argv[2]||'D:/DSH/素材库/游戏专用素材/蓝色肥鱼大作战专用/模型&动画/人物模型&动画';
const inputs={deepseek:path.join(sources,'鲸鱼娘/Project model&Animation/WhaleMaid_FPS_Rig_v005/delivery'),claude_fake:path.join(sources,'伪·claude娘/Project model&Animation/PseudoClaude_FPS_Rig_v001/delivery'),claude_true:path.join(sources,'真·claude娘/Project model&Animation/TrueClaude_FPS_Rig_v001/delivery')};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(dir){const name=fs.readdirSync(dir).find(n=>n.endsWith('.glb')),b=fs.readFileSync(path.join(dir,name));const n=b.readUInt32LE(12);return {dir,name,bytes:b.length,hash:hash(b),json:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n),meta:JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'))};}
function staticModel(src){
 const j=structuredClone(src.json),used=new Set();delete j.animations;
 for(const mesh of j.meshes)for(const p of mesh.primitives){for(const v of Object.values(p.attributes))used.add(v);if(p.indices!==undefined)used.add(p.indices);for(const t of p.targets||[])for(const v of Object.values(t))used.add(v);}
 for(const s of j.skins||[])if(s.inverseBindMatrices!==undefined)used.add(s.inverseBindMatrices);
 const accMap=new Map(),viewMap=new Map(),accessors=[],views=[],chunks=[];let offset=0;
 function view(i){if(viewMap.has(i))return viewMap.get(i);const v=structuredClone(j.bufferViews[i]),bytes=src.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}v.buffer=0;v.byteOffset=offset;chunks.push(bytes);offset+=bytes.length;const next=views.length;views.push(v);viewMap.set(i,next);return next;}
 function acc(i){if(accMap.has(i))return accMap.get(i);const a=structuredClone(j.accessors[i]);if(a.bufferView!==undefined)a.bufferView=view(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=view(a.sparse.indices.bufferView);a.sparse.values.bufferView=view(a.sparse.values.bufferView);}const n=accessors.length;accessors.push(a);accMap.set(i,n);return n;}
 for(const mesh of j.meshes)for(const p of mesh.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=acc(p.attributes[k]);if(p.indices!==undefined)p.indices=acc(p.indices);for(const t of p.targets||[])for(const k of Object.keys(t))t[k]=acc(t[k]);}
 for(const s of j.skins||[])if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices=acc(s.inverseBindMatrices);
 for(const im of j.images||[])if(im.bufferView!==undefined)im.bufferView=view(im.bufferView);
 j.accessors=accessors;j.bufferViews=views;j.buffers=[{byteLength:offset}];
 let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 const h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,json,bh,bin]);
}
const pool=[],poolIndex=new Map(),dataChunks=[],characters={},motions={};let dataBytes=0,unsharedBytes=0;
function accessor(src,i){const a=src.json.accessors[i],v=src.json.bufferViews[a.bufferView],components={SCALAR:1,VEC3:3,VEC4:4}[a.type];if(a.componentType!==5126||a.sparse||!components)throw Error('Unsupported motion accessor');const count=a.count*components,size=components*4,buf=Buffer.alloc(count*4),stride=v.byteStride||size,start=(v.byteOffset||0)+(a.byteOffset||0);for(let n=0;n<a.count;n++)src.bin.copy(buf,n*size,start+n*stride,start+n*stride+size);unsharedBytes+=buf.length;const key=hash(buf);if(poolIndex.has(key))return poolIndex.get(key);const index=pool.length;poolIndex.set(key,index);pool.push([dataBytes,count]);dataChunks.push(buf);dataBytes+=buf.length;return index;}
fs.mkdirSync(out,{recursive:true});let common;
for(const [id,dir] of Object.entries(inputs)){
 const src=read(dir),model=staticModel(src);if(!common)common=src.meta;
 motions[id]=src.json.animations.map(a=>({name:a.name,tracks:a.channels.map(c=>{const s=a.samplers[c.sampler];if(s.interpolation&&s.interpolation!=='LINEAR'&&s.interpolation!=='STEP')throw Error('Unsupported interpolation');return {name:src.json.nodes[c.target.node].name+'.'+({translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path]),type:c.target.path==='rotation'?'quaternion':'vector',times:accessor(src,s.input),values:accessor(src,s.output),step:s.interpolation==='STEP'};})}));
 const triangles=src.json.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+src.json.accessors[p.indices===undefined?p.attributes.POSITION:p.indices].count/3,0),0);
 characters[id]={file:id+'-model.js',source:src.name,sourceSha256:src.hash,sourceBytes:src.bytes,modelBytes:model.length,modelSha256:hash(model),bones:src.meta.rig.deform_bones.length,triangles,meshes:src.meta.first_person,scale:2};
 const commonMeta=new Map(common.animations.map(a=>[a.name,JSON.stringify(a)]));
 characters[id].animationOverrides=src.meta.animations.filter(a=>JSON.stringify(a)!==commonMeta.get(a.name));
 fs.writeFileSync(path.join(out,id+'-model.js'),'window.FISH_MODEL_DATA=window.FISH_MODEL_DATA||{};window.FISH_MODEL_DATA['+JSON.stringify(id)+']='+JSON.stringify(model.toString('base64'))+';\n');
}
fs.writeFileSync(path.join(out,'motion-data.js'),'window.FISH_MOTION_DATA='+JSON.stringify({pool,characters:motions,data:Buffer.concat(dataChunks).toString('base64')})+';\n');
const manifest={version:1,characters,animations:common.animations,upperBody:common.rig.upper_body_bones,grenade:common.grenade,animationPacking:{uniqueBytes:dataBytes,unsharedBytes,savedBytes:unsharedBytes-dataBytes,uniqueArrays:pool.length}};
fs.writeFileSync(path.join(out,'manifest.js'),'window.FISH_CHARACTER_MANIFEST='+JSON.stringify(manifest)+';\n');
console.log(JSON.stringify({characters,packing:manifest.animationPacking,runtimeFiles:fs.readdirSync(out).filter(f=>f.endsWith('.js')).map(f=>({file:f,bytes:fs.statSync(path.join(out,f)).size}))},null,2));
