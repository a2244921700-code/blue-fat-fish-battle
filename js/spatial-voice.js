/* Shared decoded voice buffers; HRTF positioning works on both file:// and HTTP.
 * No MediaElementSource: Chromium silences local-file media routed through it. */
(function(root){
'use strict';
function create(options){
 var ctx=null,master=null,cache={},voices=[],sequence=0,played=0,paused=false;
 function ensure(){
  if(ctx)return true;ctx=options.context();if(!ctx)return false;
  master=ctx.createGain();master.connect(ctx.destination);return true;
 }
 function buffer(file){
  if(!cache[file]){
   var encoded=(root.FISH_VOICE_BANK||{})[file];
   if(!encoded)return Promise.reject(new Error('Missing voice: '+file));
   var raw=atob(encoded),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   cache[file]=ctx.decodeAudioData(bytes.buffer);
  }return cache[file];
 }
 function smooth(param,value){param.setTargetAtTime(value,ctx.currentTime,.045);}
 function position(node,p){
  if(node.positionX){smooth(node.positionX,p.x);smooth(node.positionY,p.y);smooth(node.positionZ,p.z);}
  else node.setPosition(p.x,p.y,p.z);
 }
 function disconnect(v){[v.high,v.low,v.gain,v.panner,v.echoFilter].concat(v.echoes||[]).forEach(function(n){if(n)try{n.disconnect();}catch(e){}});}
 function stop(v){if(v.stopped)return;v.stopped=true;if(v.source)try{v.source.stop();}catch(e){}disconnect(v);voices=voices.filter(function(x){return x!==v;});}
 function start(v){
  if(v.stopped||paused||!v.buffer)return;
  if(v.offset>=v.buffer.duration){stop(v);return;}
  var src=ctx.createBufferSource();v.source=src;src.buffer=v.buffer;src.connect(v.high);v.started=ctx.currentTime;
  src.onended=function(){src.disconnect();if(v.source===src&&!paused)stop(v);};src.start(0,v.offset);
 }
 function setPaused(value){
  if(paused===value)return;paused=value;
  voices.slice().forEach(function(v){if(value){if(v.source){v.offset+=ctx.currentTime-v.started;var src=v.source;v.source=null;src.stop();}}else start(v);});
 }
 function update(){
  if(!ctx)return;
  if(options.active&&!options.active()){clear();return;}
  setPaused(!!options.paused());smooth(master.gain,options.volume());
  var view=options.listener();if(!view)return;
  var listener=ctx.listener;position(listener,view.position);
  if(listener.forwardX){['x','y','z'].forEach(function(a){smooth(listener['forward'+a.toUpperCase()],view.forward[a]);smooth(listener['up'+a.toUpperCase()],view.up[a]);});}
  else listener.setOrientation(view.forward.x,view.forward.y,view.forward.z,view.up.x,view.up.y,view.up.z);
  voices.slice().forEach(function(v){
   var p=v.getPosition();if(!p){stop(v);return;}
   var distance=Math.hypot(p.x-view.position.x,p.y-view.position.y,p.z-view.position.z);
   if(!v.local&&distance>52){stop(v);return;}
   if(ctx.currentTime>=v.checkAt){v.blocked=!v.local&&!!options.occluded(view.position,p);v.checkAt=ctx.currentTime+.14;}
   var gain=v.volume*(v.local?.46:1)*(v.blocked?.38:1),cutoff=v.local?6200:v.blocked?1100:Math.max(2400,8500-distance*140);
   position(v.panner,p);smooth(v.gain.gain,gain);smooth(v.low.frequency,cutoff);
   v.distance=distance;v.level=gain/(1+1.35*Math.max(0,distance-4)/4);v.cutoff=cutoff;
  });
 }
 function play(files,getPosition,volume,local){
  if(!ensure()||options.volume()<=0)return null;
  var list=Array.isArray(files)?files:[files],index=Math.floor(Math.random()*list.length),file=list[index];
  if(voices.length>=8){var quiet=voices.filter(function(v){return !v.local;}).sort(function(a,b){return a.level-b.level;})[0];if(quiet)stop(quiet);else return null;}
  var v={id:++sequence,file:file,variant:index,getPosition:getPosition,volume:volume===undefined?.6:volume,local:!!local,offset:0,stopped:false,checkAt:0};
  v.high=ctx.createBiquadFilter();v.high.type='highpass';v.high.frequency.value=110;
  v.low=ctx.createBiquadFilter();v.low.type='lowpass';v.gain=ctx.createGain();v.gain.gain.value=0;
  v.panner=ctx.createPanner();v.panner.panningModel='HRTF';v.panner.distanceModel='inverse';v.panner.refDistance=4;v.panner.maxDistance=52;v.panner.rolloffFactor=1.35;
  v.high.connect(v.low);v.low.connect(v.gain);v.gain.connect(v.panner);v.panner.connect(master);
  // Quiet, filtered early reflections add air without a large indoor reverb tail.
  v.echoFilter=ctx.createBiquadFilter();v.echoFilter.type='lowpass';v.echoFilter.frequency.value=1800;v.panner.connect(v.echoFilter);v.echoes=[];
  [.047,.093].forEach(function(delay,i){var d=ctx.createDelay(.2),g=ctx.createGain();d.delayTime.value=delay;g.gain.value=(local?.06:.09)/(i+1);v.echoFilter.connect(d);d.connect(g);g.connect(master);v.echoes.push(d,g);});
  v.pause=function(){stop(v);};v.stop=v.pause;voices.push(v);played++;update();
  if(ctx.state==='suspended')ctx.resume().catch(function(){});
  buffer(file).then(function(b){if(v.stopped)return;v.buffer=b;start(v);}).catch(function(){stop(v);});return v;
 }
 function clear(){voices.slice().forEach(stop);}
 return {play:play,update:update,clear:clear,setPaused:setPaused,stats:function(){return {played:played,paused:paused,decoded:Object.keys(cache).length,voices:voices.map(function(v){return {id:v.id,file:v.file,variant:v.variant,local:v.local,distance:v.distance,level:v.level,blocked:v.blocked,cutoff:v.cutoff,playing:!!v.source,offset:v.offset,panning:v.panner.panningModel};})};}};
}
root.FishVoice={create:create};
})(typeof window==='undefined'?globalThis:window);
