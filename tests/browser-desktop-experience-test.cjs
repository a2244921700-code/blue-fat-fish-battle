'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.FISH_TEST_URL||pathToFileURL(path.resolve(__dirname,'..','index.html')).href;
const out=process.env.FISH_TEST_OUTPUT;
if(out)fs.mkdirSync(out,{recursive:true});

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
  const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS | '+name);};
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader/i.test(m.text()))errors.push(m.text());});
    page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url()+' '+r.failure()?.errorText);});
    // Drive gameplay at a deterministic fixed step after normal loading has finished.
    await page.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{if(!window.freezeSimulation)cb(t);});});
    async function lobby(){await page.goto(url);await page.click('#btn-start');}
    async function play(){
      await page.waitForFunction(()=>document.getElementById('loading-overlay').classList.contains('hidden')&&FishGame.__debug.getCharacters().local,null,{timeout:120000});
      await page.evaluate(()=>{window.freezeSimulation=true;window.d=FishGame.__debug;d.enterFallback();d.setState('playing');window.step=n=>{for(let i=0;i<n;i++)d.update(1/60);};step(8);d.renderFrame();});
    }
    async function shot(name){if(out)await page.screenshot({path:path.join(out,name+'.png')});}
    await lobby();await page.selectOption('#lobby-deploy-team','red');await page.click('#lobby-edit-head');
    check('大厅直接打开红方头部槽位',await page.locator('#inv-slot-dialog[open][data-team=red]').count()===1);
    await page.click('.inv-choice[data-item="iron-rice-bowl"]');
    check('装配反馈包含阵营和物品',/红方.*铁饭碗/.test(await page.textContent('#inv-save-status')));
    await page.click('#btn-inv-back');
    check('大厅即时显示新配装',/铁饭碗/.test(await page.textContent('#lobby-head')));
    await page.selectOption('#lobby-deploy-team','blue');
    check('红蓝阵营的头部配装独立',(await page.textContent('#lobby-head'))==='未佩戴');
    await page.click('#lobby-edit-primary');
    check('候选武器并列显示三项枪械数据',await page.locator('#inv-slot-choices .inv-choice-specs').count()===2);
    await page.keyboard.press('Escape');await page.click('#inv-filter-all');
    for(const [width,height] of [[1440,900],[1280,720]]){
      await page.setViewportSize({width,height});
      const layout=await page.evaluate(()=>{
        const grid=document.getElementById('inv-grid'),items=[...grid.querySelectorAll('button')].map(el=>el.getBoundingClientRect()),inspector=document.getElementById('inv-detail').getBoundingClientRect();
        return {overlap:items.some((r,i)=>items.slice(i+1).some(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1)),scroll:grid.scrollHeight>grid.clientHeight,visible:inspector.bottom<=innerHeight&&inspector.top>0};
      });
      check(width+'×'+height+' 仓库卡片互不遮挡、可滚动、详情可见',!layout.overlap&&layout.scroll&&layout.visible);
      await page.click('#inv-item-tactical-goggles');
      check(width+'×'+height+' 可选中列表下方装备',/战术护目镜/.test(await page.textContent('#inv-detail .id-name')));
      await page.click('#inv-filter-helmet');await page.click('#inv-filter-all');
    }
    await shot('warehouse-1280');await page.click('#btn-inv-back');await page.click('#btn-mode-campaign');await page.keyboard.press('Escape');
    check('章节选择可用 Esc 返回大厅',await page.locator('#level-overlay').isVisible());
    await lobby();await page.selectOption('#lobby-deploy-team','red');
    check('刷新后恢复阵营配装',/铁饭碗/.test(await page.textContent('#lobby-head')));
    await page.setViewportSize({width:1440,height:900});await page.click('#btn-pvp-mode');await play();await page.keyboard.down('m');
    check('对战部署期间可展开北向图并显示所在区',await page.locator('#field-map').isVisible()&&/南区/.test(await page.textContent('#field-location')));
    check('玩家双脚落在部署地面并朝向开阔出口',await page.evaluate(()=>{
      const p=d.getPlayer(),eye=p.pos.clone();eye.y+=1.25;
      function distance(yaw){return FishHitboxes.wallDistance(eye,new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),d.getObstacles(),23,.32);}
      return Math.abs(p.pos.y)<.001&&Math.abs(p.yaw)<1&&distance(p.yaw)>distance(0)+1;
    }));
    const reports=await page.evaluate(()=>{
      const t=d.getPvpTactics(),actor=d.getEnemies().find(e=>e.isBot&&e.team==='blue'),contacts=t.contacts.red,old=contacts[actor.pvpId],origin=actor.mesh.position.clone();
      const cv=document.getElementById('field-map-canvas'),ctx=cv.getContext('2d'),extent=d.getMap().half+3;
      function redraw(){for(const type of ['keyup','keydown'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyM',bubbles:true}));}
      function patch(x,z){const s=cv.width/(2*extent);return Array.from(ctx.getImageData(Math.round((x+extent)*s)-9,Math.round((z+extent)*s)-9,19,19).data).join(',');}
      try{
        const remembered=origin.clone().set(20,0,40);actor.mesh.position.set(-18,0,32);delete contacts[actor.pvpId];redraw();
        const base=patch(20,40),actual=patch(-18,32);
        contacts[actor.pvpId]={position:remembered,time:t.clock};redraw();
        const marked=patch(20,40)!==base,concealed=patch(-18,32)===actual;
        contacts[actor.pvpId].time=t.clock-3.1;redraw();
        return marked&&concealed&&patch(20,40)===base;
      }finally{actor.mesh.position.copy(origin);if(old)contacts[actor.pvpId]=old;else delete contacts[actor.pvpId];redraw();}
    });
    check('全图绘制目击位置，敌人实际位置保持隐蔽，三秒后标记清除',reports);
    await shot('field-map');await page.keyboard.up('m');check('松开 M 立即收图',await page.locator('#field-map').isHidden());
    await page.keyboard.down('m');await page.keyboard.down('Tab');check('计分板与全图区分显示',await page.locator('#field-map').isHidden()&&await page.locator('#scoreboard').isVisible());
    await page.keyboard.up('Tab');await page.keyboard.up('m');await page.keyboard.down('m');await page.keyboard.press('Escape');await page.keyboard.up('m');
    check('暂停时释放全图并开放指南',await page.locator('#field-map').isHidden()&&await page.locator('#btn-pause-guide').isVisible());
    await page.click('#btn-pause-guide');check('暂停指南包含三个模式的新操作',/切换左肩/.test(await page.textContent('#controls-dialog'))&&await page.locator('#controls-dialog').isVisible());
    await page.keyboard.press('Escape');await page.evaluate(()=>{window.freezeSimulation=false;});await page.click('#btn-pause-menu');await page.click('#btn-mode-endless');await page.click('#btn-map-desert');await play();
    check('无尽开局波次与准备操作可见',await page.locator('#endless-wave-action').isVisible());
    check('无尽实机隐藏两个调试路牌',await page.evaluate(()=>{const signs=[];d.getCamera().parent.traverse(o=>{if(o.userData.debugMapSign)signs.push(o);});return signs.length===2&&signs.every(s=>!s.visible);}));
    await page.keyboard.press('n');await page.evaluate(()=>step(9));const live=await page.evaluate(()=>({wave:d.getWave().number,label:document.getElementById('endless-wave-title').textContent,phase:d.getWave().state}));
    check('N 提前开始第一波且提示切换为剩余敌人数',live.wave===1&&live.phase==='fighting'&&live.label==='第 1 波'&&await page.locator('#endless-wave-action').isHidden());
    await page.keyboard.press('n');check('交战期间不能重复召唤',await page.evaluate(()=>d.getWave().number===1));
    await page.evaluate(()=>{d.killAllEnemies();step(10);});await page.keyboard.press('n');
    check('清波休整时可以直接进入下一波',await page.evaluate(()=>d.getWave().number===2));
    await page.evaluate(()=>{d.killAllEnemies();d.startWave(5);d.killAllEnemies();step(10);});
    await page.keyboard.press('n');check('首领预告受保护，N 不能跳过首领',await page.evaluate(()=>d.getWave().number===5&&d.getWave().state==='cleared'&&document.getElementById('endless-wave').dataset.signal==='boss'));
    await page.evaluate(()=>{step(280);d.renderFrame();});check('首领实际出现且场内航标同步',await page.evaluate(()=>!!d.getBossVariant()&&d.getWave().state==='boss'&&document.getElementById('endless-wave-title').textContent==='首领战'));
    await shot('endless-boss');
    await lobby();await page.click('#btn-mode-campaign');await page.click('#btn-story-1');await play();
    const shoulder=await page.evaluate(()=>{const r=d.getStory().runtime;for(let i=0;i<7;i++)r.advance();const p=d.getPlayer();p.pos.set(-5.2,0,1.5);p.yaw=-Math.PI/2;step(8);return d.getCamera().position.z-p.pos.z;});
    await page.keyboard.press('q');await page.evaluate(()=>step(45));
    check('Q 平滑换肩，摄像机位于角色另一侧',await page.evaluate(first=>first*(d.getCamera().position.z-d.getPlayer().pos.z)<0,shoulder));
    check('剧情隐藏战斗地图与波次 HUD',await page.locator('#endless-wave').isHidden()&&await page.locator('#field-map').isHidden());
    check('浏览器无脚本、着色器或资源加载错误',errors.length===0);
    if(out)fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
