/* One lossless MP3 payload per line, shared across characters and both launch modes. */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/sfx/voice-bank.js');
const source=process.argv[2]||'D:/DSH/素材库/游戏专用素材/蓝色肥鱼大作战专用/音效';
let bank={};if(fs.existsSync(out))bank=JSON.parse(fs.readFileSync(out,'utf8').split('window.FISH_VOICE_BANK=')[1].trim().replace(/;$/,''));
for(const name of ['sfx_boss_detect_1.mp3','sfx_boss_detect_2.mp3','sfx_fish_shoot.mp3','sfx_melee_near.mp3','sfx_shield_near.mp3','sfx_bomber_alert.mp3','sfx_heal.mp3','sfx_split.mp3']){
 const file=path.join(root,'assets/sfx',name);if(fs.existsSync(file))bank[name]=fs.readFileSync(file).toString('base64');
 if(!bank[name])throw Error('Missing original recording: '+name);
}
for(let i=1;i<=2;i++)bank['sfx_throw_voice_'+i+'.mp3']=fs.readFileSync(path.join(source,'deepseek娘、伪·Claude娘扔手雷'+i+'.mp3')).toString('base64');
fs.writeFileSync(out,'/* Shared MP3 voice bytes for local-file WebAudio. Original recordings are unchanged. */\nwindow.FISH_VOICE_BANK='+JSON.stringify(bank)+';\n');
console.log(Object.keys(bank).length+' recordings, '+fs.statSync(out).size+' bytes.');
