/* Local menu presentation. No game simulation or networking lives in this file. */
(function(root){
  'use strict';
  var art = [
    {id:'crossfire',src:'assets/ui-art/loading-crossfire.webp',title:'拱门交火'},
    {id:'rooftops',src:'assets/ui-art/loading-rooftops.webp',title:'屋顶侧翼'},
    {id:'courtyard',src:'assets/ui-art/loading-courtyard.webp',title:'庭院推进'}
  ];
  var tips = {
    pvp:['你属于红队。与 AI 队友一起推进，留意交叉火力。','双方在地图两端部署。阵亡消耗本队 1 次额度，4 秒后返回基地。','墙体会遮挡视线与子弹。绕到侧翼，寻找新的射击角度。','切换武器需要完成收枪、举枪动作；利用掩体掩护这个空隙。','先赢 4 回合即可取胜。共享复活额度归零时，本回合立即结束。','按住 Tab 查看对战计分板；短点射有助于控制步枪散布。'],
    endless:['保持移动，利用拱门和掩体拉开距离。','击败 Boss 后选择强化。按 I 查看本局的技能等级。','步枪适合持续压制；匕首右键可以发动重击。','注意补给位置，换弹和切枪时先寻找掩护。']
  };
  var bag=[],last=-1,activeArt=null,artEpoch=0,cache=Object.create(null),rotateTimer=null,navEpoch=0,focusMemory=Object.create(null);
  function nextArt(){
    if(!bag.length){
      bag=art.map(function(_,i){return i;});
      for(var i=bag.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=bag[i];bag[i]=bag[j];bag[j]=t;}
      if(bag.length>1&&bag[bag.length-1]===last){var swap=bag[0];bag[0]=bag[bag.length-1];bag[bag.length-1]=swap;}
    }
    last=bag.pop();return art[last];
  }
  // An image failure or stalled request must never block a match. One decoded copy per URL.
  function preload(src){
    if(cache[src])return cache[src];
    cache[src]=new Promise(function(resolve){
      var img=new Image(),done=false;
      var timer=setTimeout(function(){finish(false);},2200);
      function finish(ok){if(done)return;done=true;clearTimeout(timer);resolve(ok?img:null);}
      img.onload=function(){if(img.decode)img.decode().then(function(){finish(true);},function(){finish(true);});else finish(true);};
      img.onerror=function(){finish(false);};img.src=src;
    });
    return cache[src];
  }
  function text(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  function chooseArt(mode){
    var selected=nextArt(),epoch=++artEpoch,host=document.getElementById('loading-art');
    activeArt=selected.id;
    if(host){host.classList.remove('ready');host.style.backgroundImage='none';}
    text('loading-scene','沙漠城 / '+selected.title);
    text('loading-art-count',String(art.indexOf(selected)+1).padStart(2,'0')+' / 03');
    var pool=tips[mode]||tips.endless;
    text('loading-tip',pool[Math.floor(Math.random()*pool.length)]);
    return preload(selected.src).then(function(img){
      if(img&&epoch===artEpoch&&host){host.style.backgroundImage='url("'+selected.src+'")';host.classList.add('ready');}
      return !!img;
    });
  }
  function beginLoading(mode){
    clearTimeout(rotateTimer);document.body.removeAttribute('data-ui');
    text('loading-mode',mode==='pvp'?'红蓝歼灭战 / TEAM BATTLE':'无尽生存 / ENDLESS');
    var ready=chooseArt(mode);
    function rotate(){
      var overlay=document.getElementById('loading-overlay');
      if(!overlay||overlay.classList.contains('hidden'))return;
      chooseArt(mode);rotateTimer=setTimeout(rotate,9000);
    }
    rotateTimer=setTimeout(rotate,9000);
    return ready;
  }
  function endLoading(){clearTimeout(rotateTimer);rotateTimer=null;artEpoch++;}
  function warmLoading(){
    // Stagger tiny local WebPs; keep menu opening independent from network/image latency.
    var run=function(){art.forEach(function(a){preload(a.src);});};
    if(root.requestIdleCallback)root.requestIdleCallback(run,{timeout:1500});else setTimeout(run,300);
  }
  function visibleOverlay(){
    return document.querySelector('.overlay:not(.hidden)');
  }
  function focusables(host){
    return Array.prototype.filter.call(host.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]'),function(el){return el.getClientRects().length>0;});
  }
  function show(which){
    var prev=document.body.getAttribute('data-ui'),el=document.activeElement;
    if(prev&&el&&el.id&&el.closest&&el.closest('.overlay'))focusMemory[prev]=el.id;
    document.body.setAttribute('data-ui',which);
    var epoch=++navEpoch;
    if(which==='level')warmLoading();
    requestAnimationFrame(function(){
      if(epoch!==navEpoch)return;
      var host=visibleOverlay();if(!host)return;
      host.setAttribute('aria-modal','true');host.setAttribute('role','dialog');
      var previous=focusMemory[which]&&document.getElementById(focusMemory[which]);
      var defaults={menu:'btn-start',level:'btn-pvp-mode',createroom:'cr-name',room:'btn-room-start',roomlist:'room-search'};
      var preferred=previous&&host.contains(previous)&&!previous.disabled?previous:document.getElementById(defaults[which]);
      var candidates=focusables(host);if(!preferred||!host.contains(preferred)||preferred.disabled)preferred=candidates[0];
      if(preferred)preferred.focus({preventScroll:true});
    });
  }
  function dismiss(){
    var prev=document.body.getAttribute('data-ui'),el=document.activeElement;
    if(prev&&el&&el.id&&el.closest&&el.closest('.overlay'))focusMemory[prev]=el.id;
    navEpoch++;document.body.removeAttribute('data-ui');
  }
  var backIds={level:'btn-level-back',pvp:'btn-pvp-back',map:'btn-map-back',inventory:'btn-inv-back',roomlist:'btn-roomlist-back',createroom:'btn-cr-back',room:'btn-room-leave',achievements:'btn-ach-close',settings:'btn-settings-close'};
  function bind(){
    var help=document.getElementById('controls-dialog');
    document.querySelectorAll('[data-open-help]').forEach(function(button){button.addEventListener('click',function(){if(help&&!help.open)help.showModal();});});
    var close=document.getElementById('btn-help-close');if(close)close.addEventListener('click',function(){help.close();});
    if(help)help.addEventListener('click',function(e){if(e.target===help){var r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
    document.addEventListener('keydown',function(e){
      if(help&&help.open){e.stopPropagation();return;}
      var host=visibleOverlay();if(!host)return;
      if(e.code==='Escape'){
        var which=host.id.replace('-overlay',''),button=document.getElementById(backIds[which]);
        if(button){e.preventDefault();e.stopImmediatePropagation();button.click();return;}
      }
      if(e.code==='Tab'){
        var list=focusables(host);if(!list.length)return;
        var first=list[0],end=list[list.length-1],current=document.activeElement;
        if(!host.contains(current)||(e.shiftKey&&current===first)||(!e.shiftKey&&current===end)){
          e.preventDefault();(e.shiftKey?end:first).focus();
        }
      }
      if(host.id==='createroom-overlay'&&e.code==='Enter'&&e.target.id==='cr-name'&&!e.isComposing){
        e.preventDefault();document.getElementById('btn-cr-create').click();
      }
    },true);
    show('menu');
  }
  root.FishUI={show:show,dismiss:dismiss,beginLoading:beginLoading,endLoading:endLoading,warmLoading:warmLoading,
    getArtState:function(){return {id:activeArt,last:last,remaining:bag.slice(),count:art.length};}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})(window);
