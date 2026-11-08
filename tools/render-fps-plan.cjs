'use strict';
const fs=require('fs'),path=require('path'),{createLayout}=require('../js/fps-map.js'),Nav=require('../js/fps-height-nav.js'),{height}=require('../js/fps-layout.js');
const m=createLayout(),nav=new Nav(m.solids,m.limit,1,.46,{},m.surfaces,m.jumpAnchors),X=x=>480+x*4.8,Z=z=>520+z*4.8,colors=['#f0ba68','#8cd2ba','#a59ee7','#72c9e9','#ed9e9e'];
const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1060" viewBox="0 0 960 1060"><defs><pattern id="roof" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v7" stroke="#a1b9b5" stroke-width="1.5"/></pattern></defs><rect width="960" height="1060" fill="#122630"/><g font-family="Microsoft YaHei, sans-serif"><text x="65" y="60" font-size="30" font-weight="bold" fill="#f5e3bd">沙海双城 · 立体战术图</text><text x="65" y="94" font-size="15" fill="#a4bcc1">152 × 152 米　/　长 A · 小道 · 中门 · B 洞上下层　/　红蓝共享复活额度</text><rect x="113" y="153" width="734" height="734" fill="#393f3c" stroke="#7d9699"/>`];
function rect(x0,z0,x1,z1,fill,other=''){svg.push(`<rect x="${X(x0)}" y="${Z(z0)}" width="${(x1-x0)*4.8}" height="${(z1-z0)*4.8}" fill="${fill}" ${other}/>`);}
const floor=y=>y>4?'#c9b58b':y>2?'#a6a181':y>.1?'#838e78':'#586f6b';
for(const s of m.surfaces.slice().sort((a,b)=>(a.kind==='ramp'?Math.max(a.a,a.b):a.y)-(b.kind==='ramp'?Math.max(b.a,b.b):b.y))){
 if(s.kind==='ramp')for(let i=0;i<s.steps;i++){let x0=s.x0,x1=s.x1,z0=s.z0,z1=s.z1;if(s.axis==='x'){x0=s.x0+(s.x1-s.x0)*i/s.steps;x1=s.x0+(s.x1-s.x0)*(i+1)/s.steps;}else{z0=s.z0+(s.z1-s.z0)*i/s.steps;z1=s.z0+(s.z1-s.z0)*(i+1)/s.steps;}rect(x0,z0,x1,z1,floor(height(s,(x0+x1)/2,(z0+z1)/2)),'stroke="#cad3ba" stroke-opacity=".24" stroke-width=".4"');}
 else rect(s.x0,s.z0,s.x1,s.z1,floor(s.y));
}
for(const o of m.solids){if(o.kind==='terrain')continue;const overhead=o.kind==='roof'||o.kind==='arch',fill=overhead?'url(#roof)':o.kind==='crate'||o.kind==='prop'?'#9b7655':o.kind==='gate'?'#b08a5e':'#293f43';rect(o.min.x,o.min.z,o.max.x,o.max.z,fill,overhead?'opacity=".55"':'stroke="#667d7a" stroke-width=".6"');}
for(const [i,r] of m.routes.red.entries()){
 let from={x:0,y:0,z:69},points=[from];for(const q of r){const target={x:q[0],y:q[2],z:q[1]},h=nav.heightAt(target.x,target.z,target.y);if(h!==undefined)target.y=h;const part=nav.route(from,target);points.push(...part);from=points.at(-1);}
 svg.push(`<polyline points="${points.map(p=>`${X(p.x)},${Z(p.z)}`).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="2.2" stroke-linejoin="round" opacity=".82"/>`);
}
for(const j of m.jumpAnchors.filter((_,i)=>i%2===0))svg.push(`<path d="M${X(j.from.x)} ${Z(j.from.z)}L${X(j.to.x)} ${Z(j.to.z)}" stroke="#fff1b2" stroke-width="4" stroke-dasharray="3 2"/>`);
for(const f of [-1,1]){const z=m.baseZ*f,col=f>0?'#e99f89':'#9dbfff';rect(-14,z-3,14,z+3,col,'rx="4"');svg.push(`<text x="480" y="${Z(z)+5}" font-size="14" fill="#10252f" text-anchor="middle">${f>0?'红方基地':'蓝方基地'}</text>`);}
const labels=[['A · 高台 5.4m',46,-39],['B · 城堡 2.8m',-51,-39],['中门 0m',-5,-4],['小道 3.2m',9,8],['长 A 1.8m',60,9],['低坑 0m',70,33],['上洞 3.2m',-54,17],['下洞 0m',-29,5]];
for(const [name,x,z] of labels){const w=name.length*11.5;svg.push(`<rect x="${X(x)-w/2}" y="${Z(z)-12}" width="${w}" height="24" rx="4" fill="#122630" opacity=".92"/><text x="${X(x)}" y="${Z(z)+5}" text-anchor="middle" font-size="12" fill="#f3dfb2">${name}</text>`);}
svg.push('<text x="867" y="164" fill="#bdd0d0" font-size="16">北 ↑</text>');
['长 A / 高台','中路 / 小道','B 上洞 / 城堡','中门推进','B 上下层转点'].forEach((name,i)=>svg.push(`<path d="M${50+i*180} 929h20" stroke="${colors[i]}" stroke-width="4"/><text x="${77+i*180}" y="934" font-size="13" fill="#d6e1dc">${name}</text>`));
svg.push('<text x="65" y="981" fill="#a6bdbf" font-size="14">地面越浅表示越高；斜线为顶棚，黄虚线为可验证的跳跃连接。</text><text x="65" y="1007" fill="#a6bdbf" font-size="14">小道桥下与 B 下洞有独立通路。路线取自实际导航；A / B 是区域名称，当前没有爆破规则。</text><text x="65" y="1035" fill="#728f98" font-size="12">OpenAI Codex · 2026-11-01 · 原创尺寸与程序化美术，参考经典沙漠地图的连接方式</text></g></svg>');
const out=path.join(__dirname,'../tests/elevation-map-results/tactical-layout.svg');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,svg.join('\n'));console.log(out);
