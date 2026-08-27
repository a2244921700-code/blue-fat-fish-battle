/* 无头冒烟测试：在 Node 中模拟浏览器环境（假 DOM / 假 WebGL），
 * 验证游戏核心逻辑：初始化、射击命中、敌人AI、重生、碰撞、结算、重开。
 * 运行：node tests/smoke-test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAME_DIR = path.join(__dirname, '..');

// ---------------- 环境 stub ----------------
let performanceNow = 0;
const rafQ = [];
const listeners = {};

const ctx2dProxy = new Proxy(function () {}, {
  get(t, p) {
    if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (p === Symbol.toPrimitive) return () => 0;
    return ctx2dProxy;
  },
  apply() { return ctx2dProxy; },
  set() { return true; },
});
const glProxy = new Proxy(function () {}, {
  get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    // 字符串方法：让 THREE 内部的版本号解析安全失败
    if (p === 'indexOf') return () => -1;
    if (p === 'includes') return () => false;
    if (p === 'match' || p === 'exec' || p === 'test') return () => null;
    if (p === 'split') return () => [];
    if (p === 'toLowerCase' || p === 'toUpperCase' || p === 'trim') return () => '';
    if (p === 'toString') return () => '[fake-gl]';
    if (p === 'valueOf') return () => 0;
    if (p === 'length') return 0;
    if (typeof p === 'string' && /^[A-Z0-9_]+$/.test(p)) return 4096; // GL 常量
    return glProxy;
  },
  apply() { return glProxy; },
  construct() { return glProxy; },
  set() { return true; },
});

function baseEl() {
  const el = {
    style: {}, children: [], parentNode: null, id: '', tagName: 'DIV',
    textContent: '', innerHTML: '',
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, force) {
        if (force === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }
        else { force ? this._s.add(c) : this._s.delete(c); }
      },
      contains(c) { return this._s.has(c); },
    },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; },
    setAttribute() {}, getAttribute() { return null; },
    requestPointerLock() {},
    getContext(type) { return String(type).indexOf('2d') === 0 ? ctx2dProxy : glProxy; },
  };
  // className 与 classList 双向同步（贴近真实浏览器语义）
  Object.defineProperty(el, 'className', {
    get() { return Array.from(el.classList._s).join(' '); },
    set(v) { el.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  return el;
}

const els = {};
const canvasEl = baseEl(); canvasEl.id = 'game-canvas'; canvasEl.tagName = 'CANVAS';
els['game-canvas'] = canvasEl;
const fakeDocument = {
  pointerLockElement: null,
  getElementById(id) {
    if (!els[id]) { els[id] = baseEl(); els[id].id = id; }
    return els[id];
  },
  createElement(tag) { const el = baseEl(); el.tagName = String(tag).toUpperCase(); return el; },
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener() {},
  exitPointerLock() { this.pointerLockElement = null; },
  fire(type, ev) { (listeners[type] || []).forEach(fn => fn(ev || {})); },
};

globalThis.window = globalThis;
globalThis.document = fakeDocument;
globalThis.performance = { now: () => performanceNow };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
globalThis.cancelAnimationFrame = () => {};
globalThis.addEventListener = () => {};
globalThis.AudioContext = undefined; globalThis.webkitAudioContext = undefined;
// node 24 自带只读 navigator，无需 stub
globalThis.Image = class Image {
  set src(v) {
    if (typeof v === 'string' && v.indexOf('data:') === 0) {
      const self = this;
      setTimeout(() => {
        self.naturalWidth = 1080; self.naturalHeight = 1080;
        if (self.onload) self.onload();
      }, 0);
    }
  }
};

// ---------------- 加载游戏 ----------------
const THREE = require(path.join(GAME_DIR, 'lib', 'three.min.js'));
globalThis.THREE = THREE;
(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'assets', 'fish-texture.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'js', 'game.js'), 'utf8'));
const dbg = window.FishGame.__debug;

// ---------------- 工具 ----------------
function advance(seconds) {
  const frames = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < frames; i++) {
    performanceNow += 1000 / 60;
    const q = rafQ.splice(0);
    for (const cb of q) cb(performanceNow);
  }
}
const tick = () => new Promise(r => setTimeout(r, 0));
let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('PASS | ' + name);
  else { failures++; console.log('FAIL | ' + name + (extra ? ' :: ' + extra : '')); }
}

// ---------------- 测试 ----------------
(async function main() {
// game.js 已自动执行 init，此处仅等待贴图回调
await tick(); // 让 Image onload(setTimeout) 执行，生成肥鱼
check('初始状态为菜单', dbg.getState() === 'menu', dbg.getState());
advance(0.3);
check('肥鱼贴图已加载', dbg.isFishReady() === true);
check('开始界面播放来去曼波', dbg.getBgmInfo().menuOn === true && dbg.getBgmInfo().menuVol === 0.18,
  'on=' + dbg.getBgmInfo().menuOn + ' vol=' + dbg.getBgmInfo().menuVol);
check('生成 6 条肥鱼(>=3)', dbg.getEnemies().length === 6, String(dbg.getEnemies().length));
check('场景障碍物已建立', dbg.getObstacles().length >= 10, String(dbg.getObstacles().length));

// 模拟 pointer lock 开始游戏
fakeDocument.pointerLockElement = canvasEl;
fakeDocument.fire('pointerlockchange');
check('锁定鼠标后进入游戏', dbg.getState() === 'playing', dbg.getState());
advance(0.7);
check('进入游戏0.5秒后菜单曲淡出关闭', dbg.getBgmInfo().menuOn === false && dbg.getBgmInfo().menuVol === 0,
  'on=' + dbg.getBgmInfo().menuOn + ' vol=' + dbg.getBgmInfo().menuVol);
dbg.setBossTimer(99999); // 冻结随机 Boss 生成，保证测试确定性

// 射击命中
const fishes = dbg.getEnemies();
const target = fishes[0];
// 其余鱼挪到远角（防射线偶然串杀别的鱼）
for (const fOther of dbg.getEnemies()) {
  if (fOther !== target && fOther.alive) {
    fOther.mesh.position.set(-43, fOther.baseY, -43);
    fOther.waypoint.set(-43, 0, -43);
    fOther.state = 'patrol'; fOther.waitTimer = 999;
  }
}
target.mesh.position.set(0, target.baseY + 0.2, -5);
target.waypoint.set(0, 0, -5);   // 钉死原地（防巡逻移动导致随机射偏）
target.waitTimer = 999;
advance(0.05);
dbg.shootOnce();
if (target.alive) { advance(0.2); dbg.shootOnce(); }  // 保险：静止目标极少情况补射
check('命中肥鱼得分 +10', dbg.getScore() === 10, String(dbg.getScore()));
check('肥鱼被击中后消失', target.alive === false && target.mesh.visible === false);
dbg.shootOnce(); // 冷却中
check('射速冷却生效(不重复击杀)', dbg.getKills() === 1, String(dbg.getKills()));

// ---- 弹药与换弹 ----
const ammoA = dbg.getAmmo();
check('射击后弹药(弹夹<30/备用180)', ammoA.mag < 30 && ammoA.reserve === 180, ammoA.mag + '/' + ammoA.reserve);
const magBeforeReload = ammoA.mag;
fakeDocument.fire('keydown', { code: 'KeyR' });
check('R 键触发换弹', dbg.getAmmo().reloading === true);
advance(0.1);
check('HUD 换弹进度条显示', els['reload-wrap'].style.display === 'block',
  'display=' + els['reload-wrap'].style.display);
dbg.shootOnce();
check('换弹期间不能射击(弹药不变)', dbg.getAmmo().mag === magBeforeReload,
  'before=' + magBeforeReload + ' after=' + dbg.getAmmo().mag + ' reloading=' + dbg.getAmmo().reloading);
advance(1.7);
check('换弹完成(满弹夹+扣足备弹)',
  dbg.getAmmo().mag === 30 && dbg.getAmmo().reserve === 180 - (30 - magBeforeReload),
  dbg.getAmmo().mag + '/' + dbg.getAmmo().reserve + ' expect-reserve=' + (180 - (30 - magBeforeReload)));
dbg.setAmmo(5, 10);
fakeDocument.fire('keydown', { code: 'KeyR' });
advance(1.7);
check('备用不足时全部入夹 15/0', dbg.getAmmo().mag === 15 && dbg.getAmmo().reserve === 0,
  dbg.getAmmo().mag + '/' + dbg.getAmmo().reserve);
dbg.setAmmo(5, 0);
fakeDocument.fire('keydown', { code: 'KeyR' });
check('备用为0不触发换弹', dbg.getAmmo().reloading === false);
check('弹出"弹药耗尽"提示', els['notice-pop'].textContent === '弹药耗尽',
  els['notice-pop'].textContent);
dbg.setAmmo(0, 30);
dbg.shootOnce();
check('弹夹打空自动换弹', dbg.getAmmo().reloading === true && dbg.getAmmo().mag === 0);
advance(1.7);
check('自动换弹完成 30/0', dbg.getAmmo().mag === 30 && dbg.getAmmo().reserve === 0,
  dbg.getAmmo().mag + '/' + dbg.getAmmo().reserve);
dbg.setAmmo(12, 77);
check('弹药 HUD 更新', els['ammo-mag'].textContent === '12');

// ---- 补给物品 ----
for (const f of dbg.getEnemies()) {
  if (f.alive) { f.mesh.position.set(26, f.baseY, 26); f.state = 'patrol'; f.lostTimer = 0; }
}
dbg.setHp(100);
advance(9);
check('场上随机生成补给物品', dbg.getItems().length > 0, 'count=' + dbg.getItems().length);
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
const plPos = dbg.getPlayer().pos;
const rBefore = dbg.getAmmo().reserve;
dbg.spawnTestItem('ammo', plPos.x, plPos.z);
advance(0.2);
check('走近拾取子弹包 +15', dbg.getAmmo().reserve === rBefore + 15,
  rBefore + ' -> ' + dbg.getAmmo().reserve);
// 钉住鱼：位置与巡逻点相同的角落，避免干扰
for (const fp of dbg.getEnemies()) {
  if (fp.alive) { fp.mesh.position.set(-43, fp.baseY, -43); fp.waypoint.set(-43, 0, -43); fp.state = 'patrol'; fp.waitTimer = 999; }
}
dbg.clearProjectiles();   // 清除在途弹幕（防残余子弹击中）
advance(0.05);
dbg.getPlayer().pos.set(0, 0, 40);   // 复位出生区，保证拾取位置稳定
dbg.setHp(50);
const hBefore = dbg.getPlayer().hp;
dbg.spawnTestItem('health', plPos.x, plPos.z);
advance(0.2);
if (dbg.getPlayer().hp === hBefore) advance(0.3);   // 保险：再次推进确保拾取
check('走近拾取血包 +10 生命', dbg.getPlayer().hp === hBefore + 10, String(dbg.getPlayer().hp));
check('血量 HUD 同步', els['health-text'].textContent === String(hBefore + 10));
// 护甲道具：生成提示 + 拾取生效（直接生成在玩家脚边）
dbg.setArmor(0);
dbg.spawnArmorItem();
check('护甲生成后弹出提示', els['notice-pop'].textContent.indexOf('护甲') >= 0, els['notice-pop'].textContent);
const armorItem = dbg.getItems().find(it => it.type === 'armor');
check('护甲道具已进场(青色盾牌)', !!armorItem, String(!!armorItem));
if (armorItem) {
  armorItem.mesh.position.set(dbg.getPlayer().pos.x, 0.55, dbg.getPlayer().pos.z);
  advance(0.2);
  check('拾取护甲+1层', dbg.getArmor() === 1, 'armor=' + dbg.getArmor());
  // 每层护甲减免 2 点伤害：1 层时承 10 伤只掉 8 血
  const hpArmor = dbg.getPlayer().hp;
  dbg.resetHurt();
  dbg.damagePlayer(10);
  check('每层护甲减免2点伤害', dbg.getPlayer().hp === hpArmor - 8, hpArmor + '->' + dbg.getPlayer().hp);
  dbg.resetHurt();
}
const armorBefore15 = dbg.getItems().filter(it => it.type === 'armor').length;
dbg.setArmor(15);
dbg.spawnArmorItem();
const armorAfter15 = dbg.getItems().filter(it => it.type === 'armor').length;
check('护甲满15层后不再生成', armorAfter15 === armorBefore15, armorBefore15 + '->' + armorAfter15);
dbg.setArmor(0);   // 复位，避免护甲减免干扰后续伤害类断言
// 物品段推进了较长时间，鱼可能已把玩家咬死——恢复状态保证后续用例独立
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// ---- 手榴弹系统 ----
dbg.setAmmo(30, 150);
const nadeBefore = dbg.getNadeCount();
fakeDocument.fire('keydown', { code: 'KeyG' });
check('G 键扔出手雷(数量-1)', dbg.getGrenades().length === 1 && dbg.getNadeCount() === nadeBefore - 1,
  'nade=' + dbg.getNadeCount());
check('手雷 HUD 更新', els['nade-count'].textContent === String(nadeBefore - 1));
// 瞬移手雷到鱼群上方落地 → 2 秒后爆炸击杀（期间每帧钉住鱼与手雷位置，防止巡逻走散）
const killsBeforeNade = dbg.getKills();
const grObj = dbg.getGrenades()[0];
grObj.pos.set(0, 1.5, 34);
grObj.vel.set(0, 0, 0);
for (let nk = 0; nk < 30; nk++) {
  if (dbg.getGrenades().length === 0) break; // 已爆炸
  const grNow = dbg.getGrenades()[0];
  grNow.pos.x = 0; grNow.pos.z = 34; // 只钉水平位置，y 让重力自然落地
  grNow.vel.set(0, 0, 0);
  for (const fg of dbg.getEnemies()) {
    if (fg.alive) { fg.mesh.position.set(0, fg.baseY, 34); fg.waypoint.set(0, 0, 34); fg.state = 'patrol'; fg.waitTimer = 999; }
  }
  advance(0.15);
}
check('手雷爆炸击杀范围内肥鱼', dbg.getKills() > killsBeforeNade,
  killsBeforeNade + ' -> ' + dbg.getKills());
check('手雷爆炸后消失', dbg.getGrenades().length === 0);
// 自伤测试：补枪手雷后放在自己脚下
dbg.setAmmo(30, 150);
dbg.setNadeCount(3);
for (const fq of dbg.getEnemies()) {
  if (fq.alive) { fq.mesh.position.set(-43, fq.baseY, 43); fq.waypoint.set(-43, 0, 43); fq.state = 'patrol'; fq.waitTimer = 999; }
}
if (dbg.getState() !== 'playing') dbg.setState('playing');
dbg.clearProjectiles();   // 清除在途弹幕
advance(0.05);
dbg.setHp(100);
fakeDocument.fire('keydown', { code: 'KeyG' });
const grSelf = dbg.getGrenades()[0];
grSelf.pos.set(dbg.getPlayer().pos.x, 0.5, dbg.getPlayer().pos.z);
grSelf.vel.set(0, 0, 0);
for (let nk2 = 0; nk2 < 30; nk2++) {
  if (dbg.getGrenades().length === 0) break;
  dbg.resetHurt();   // 防前段残留无敌帧挡住爆炸伤害
  const grS = dbg.getGrenades()[0];
  grS.pos.x = dbg.getPlayer().pos.x; grS.pos.z = dbg.getPlayer().pos.z; // 只钉水平，y 自然落地
  grS.vel.set(0, 0, 0);
  advance(0.15);
}
const lost = 100 - dbg.getPlayer().hp;
check('手雷会伤到自己(5~10伤害)', lost >= 5 && lost <= 10, 'lost=' + lost);

// ---- Boss 系统 ----
for (const fb of dbg.getEnemies()) {
  if (fb.alive) { fb.mesh.position.set(26, fb.baseY, 26); fb.state = 'patrol'; fb.lostTimer = 0; }
}
dbg.setHp(100);
dbg.setAmmo(30, 100);
const scBefore = dbg.getScore();
const nadeBBefore = dbg.getNadeCount();
dbg.spawnBoss();
check('Boss 生成(15发血量)', dbg.getBoss() !== null && dbg.getBoss().hp === 15,
  dbg.getBoss() ? String(dbg.getBoss().hp) : 'null');
check('Boss 血条显示', els['boss-bar-wrap'].style.display === 'block');
check('Boss 名称显示', els['boss-name'].textContent === '超级蓝色大肥鱼');
check('Boss 生成后战斗曲淡入启动', dbg.getBgmInfo().bossTempo === 1, 'tempo=' + dbg.getBgmInfo().bossTempo);
check('Boss 血条显示数值(15/15)', els['boss-hp-cur'].textContent === '15' && els['boss-hp-max'].textContent === '15',
  els['boss-hp-cur'].textContent + '/' + els['boss-hp-max'].textContent);
// 射线命中测试：Boss 放正前方（玩家出生于 (0,40)，Boss 置于前方空中 25 米）
dbg.getBoss().mesh.position.set(0, 3, 15);
let hitConfirm = 0;
for (let bi = 0; bi < 15; bi++) {
  const bhp = dbg.getBoss() ? dbg.getBoss().hp : 0;
  dbg.shootOnce();
  advance(0.2);
  if (dbg.getBoss()) { if (dbg.getBoss().hp < bhp) hitConfirm++; }
  else break;
}
check('命中15发后击败 Boss', dbg.getBoss() === null, 'hits=' + hitConfirm);
check('击败 Boss 生命回满', dbg.getPlayer().hp === 100, 'hp=' + dbg.getPlayer().hp);
check('击败 Boss 奖励 +60 子弹', dbg.getAmmo().reserve === 160, String(dbg.getAmmo().reserve));
check('击败 Boss 奖励 +50 分', dbg.getScore() === scBefore + 50, String(dbg.getScore()));
check('Boss 血条隐藏', els['boss-bar-wrap'].style.display === 'none');
check('击败 Boss 奖励 1~3 颗手雷',
  (function () { var d = dbg.getNadeCount() - nadeBBefore; return d >= 1 && d <= 3; })(),
  'gain=' + (dbg.getNadeCount() - nadeBBefore));
// ---- 奖励选择窗口（击败 Boss 3 选 1，选择前暂停） ----
check('击败Boss弹出奖励窗口(暂停)', dbg.isRewardOpen() === true, 'state=' + dbg.getState());
check('Boss 击杀后战斗曲进入淡出', dbg.getBgmInfo().bossTempo === -1, 'tempo=' + dbg.getBgmInfo().bossTempo);
const rwOps = dbg.getRewardOptions();
check('奖励窗口提供3个技能选项', rwOps && rwOps.length === 3, rwOps ? String(rwOps.length) : 'null');
const rwId = rwOps[0].id;
dbg.chooseReward(0);
check('选择奖励后恢复游戏', dbg.getState() === 'playing');
check('所选技能升级+1级', dbg.getUpgrades()[rwId] === 1, rwId + '=' + dbg.getUpgrades()[rwId]);
const gr1 = dbg.getGrowth();
check('首次击杀成长：小怪血量+1(2)', gr1.enemyHpNow === 2, JSON.stringify(gr1));
check('首次击杀成长：下一Boss血20', gr1.bossHpNext === 20, String(gr1.bossHpNext));
check('首次击杀成长：Boss炮弹27', gr1.bossBallDmgNow === 27, String(gr1.bossBallDmgNow));
check('首次击杀成长：生成速率6', gr1.fishCapNow === 6, String(gr1.fishCapNow));
dbg.setUpgradeLevel(rwId, 0);   // 恢复 0 级：相关概率收益不会干扰后续断言
dbg.enterFallback();            // 清除 pointerlock 兜底计时器副作用
dbg.resetProgression();         // 恢复敌人成长基线（本段已真实成长过一次）
// ---- Boss 保底生成机制 ----
// 首刷必出：解除冻结后首个判定必然刷出 Boss
dbg.removeBoss();
dbg.setBossTimer(0.12);
advance(0.4);
check('首个30秒 Boss 必定刷出', dbg.getBoss() !== null, String(dbg.getBoss() !== null));
dbg.removeBoss();
// 连续 3 次未刷出 → 保底必定刷出
dbg.setBossMisses(3);
dbg.setBossTimer(0.12);
advance(0.4);
check('连续3次未刷出后保底必定刷出', dbg.getBoss() !== null, String(dbg.getBoss() !== null));
dbg.removeBoss();
dbg.setBossTimer(99999);
dbg.setBossMisses(0);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// Boss 黄色小球攻击
dbg.spawnBoss();
dbg.getBoss().mesh.position.set(0, 3, 18);
// 首开火在 2.2s；炮弹从炮口到玩家全程约 0.57s（2.77s 即命中消失）。
// 若推进 3s 会让炮弹先命中玩家而消失（count=0、hp 先扣 25），故取 2.5s 确保断言时炮弹仍在途。
advance(2.5);
const shots = dbg.getBossShots();
check('Boss 发射炮弹', shots.length > 0, 'count=' + shots.length);
if (shots.length > 0) {
  const bv = shots[0].vel.length();
  check('Boss 炮弹速度 7m/s', Math.abs(bv - 7) < 0.01, 'v=' + bv.toFixed(2));
}
const hpBeforeBall = dbg.getPlayer().hp;
if (shots.length) {
  shots[0].mesh.position.set(dbg.getPlayer().pos.x, dbg.getPlayer().pos.y + 1.0, dbg.getPlayer().pos.z);
  advance(0.1);
}
check('小球命中造成 25 伤害', dbg.getPlayer().hp === Math.max(0, hpBeforeBall - 25),
  hpBeforeBall + ' -> ' + dbg.getPlayer().hp);
dbg.removeBoss();
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// 重生
advance(5.0);
check('肥鱼 4.5 秒后重生', fishes.filter(f => f.alive).length === 6,
  String(fishes.filter(f => f.alive).length));

// ---- 连杀评级系统 ----
dbg.comboReset();
for (const fc4 of dbg.getEnemies()) {
  if (fc4.alive) { fc4.mesh.position.set(-43, fc4.baseY, -43); fc4.waypoint.set(-43, 0, -43); fc4.state = 'patrol'; fc4.waitTimer = 999; }
}
dbg.clearProjectiles();
dbg.getPlayer().pos.set(0, 0, 40);
dbg.setAmmo(30, 100);
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
advance(0.05);
const comboFishA = dbg.getEnemies().find(e => e.alive);
comboFishA.mesh.position.set(0, comboFishA.baseY + 0.2, 35);
comboFishA.waypoint.set(0, 0, 35); comboFishA.waitTimer = 999;
dbg.shootOnce();
advance(0.2);
check('连杀：单杀评级 D(1点)', dbg.comboGet().rank === 0 && dbg.comboGet().rankName === 'D', JSON.stringify(dbg.comboGet()));
check('连杀字母 D 简单弹出(常驻)', els['combo-pop'].textContent === 'D' && els['combo-pop'].classList.contains('anim-d') && els['combo-pop'].classList.contains('show'),
  'text=' + els['combo-pop'].textContent + ' class=' + els['combo-pop'].className);
const comboFishB = dbg.getEnemies().find(e => e.alive);
comboFishB.mesh.position.set(0, comboFishB.baseY + 0.2, 35);
comboFishB.waypoint.set(0, 0, 35); comboFishB.waitTimer = 999;
dbg.shootOnce();
advance(0.2);
check('连杀：2秒内双杀升级 C(2点)', dbg.comboGet().rank === 1 && dbg.comboGet().score === 2, JSON.stringify(dbg.comboGet()));
check('连杀字母 C 抖动弹出(升阶)', els['combo-pop'].textContent === 'C' && els['combo-pop'].classList.contains('anim-up') && els['combo-pop'].className.indexOf('rank-1') >= 0,
  'text=' + els['combo-pop'].textContent + ' class=' + els['combo-pop'].className);
check('评级字母升级后常驻不消失', els['combo-pop'].classList.contains('show') && els['combo-pop'].textContent === 'C',
  'text=' + els['combo-pop'].textContent);
dbg.comboAdd(5);   // 模拟击败 Boss：连杀 +5 点
check('击败Boss连杀+5直达SSS', dbg.comboGet().rank === 6 && dbg.comboGet().rankName === 'SSS' && dbg.comboGet().score === 7, JSON.stringify(dbg.comboGet()));
check('连杀字母 SSS 弹出(最大字号档)', els['combo-pop'].textContent === 'SSS' && els['combo-pop'].className.indexOf('rank-6') >= 0,
  'text=' + els['combo-pop'].textContent + ' class=' + els['combo-pop'].className);
// SSS 后继续击杀：满级不再升级，但字母应脉冲刷新保持反馈
dbg.comboAdd(1);
check('SSS后继续击杀字母保持(脉冲)', dbg.comboGet().rank === 6 && dbg.comboGet().score === 8 && els['combo-pop'].textContent === 'SSS' && els['combo-pop'].classList.contains('anim-keep'),
  JSON.stringify(dbg.comboGet()) + ' class=' + els['combo-pop'].className);
// 2 秒无击杀 → 降一级（8→7 仍 SSS，再 7→6 降为 SS）
for (let cw = 0; cw < 2; cw++) {
  for (const fz2 of dbg.getEnemies()) {
    if (fz2.alive) { fz2.mesh.position.set(-43, fz2.baseY, -43); fz2.waypoint.set(-43, 0, -43); fz2.state = 'patrol'; fz2.waitTimer = 999; }
  }
  advance(2.2);
}
check('2秒无击杀降级(SSS→SS)', dbg.comboGet().rank === 5 && dbg.comboGet().rankName === 'SS' && dbg.comboGet().score === 6, JSON.stringify(dbg.comboGet()));
check('降级后字母切换为低一级', els['combo-pop'].textContent === 'SS' && els['combo-pop'].className.indexOf('rank-5') >= 0 && els['combo-pop'].classList.contains('anim-down'),
  'text=' + els['combo-pop'].textContent + ' class=' + els['combo-pop'].className);
// 继续每 2 秒降一级至 D，再 2 秒无击杀 → 字母消失
for (let cd = 0; cd < 6; cd++) {
  for (const fz3 of dbg.getEnemies()) {
    if (fz3.alive) { fz3.mesh.position.set(-43, fz3.baseY, -43); fz3.waypoint.set(-43, 0, -43); fz3.state = 'patrol'; fz3.waitTimer = 999; }
  }
  advance(2.2);
}
check('降至D级再2秒无击杀字母消失', dbg.comboGet().rank === -1 && dbg.comboGet().score === 0 && !els['combo-pop'].classList.contains('show'),
  JSON.stringify(dbg.comboGet()) + ' class=' + els['combo-pop'].className);
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// ---- Boss 炮弹强化 ----
// A) 弱跟踪：炮弹从 (0,3,0) 朝 +z 直飞，玩家在侧面 (12,30)，轨迹应偏转
dbg.clearProjectiles();
if (dbg.getBoss()) { /* 可能已存在 boss 测试后遗留 */ }
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
const shellT = dbg.spawnTestShell(0, 3, 0, 0, 0, 7);
dbg.getPlayer().pos.set(12, 0, 30);
dbg.setHp(100);
dbg.resetHurt();
advance(1.2);   // 飞行约 7m，跟踪转向 0.72rad
const shellX = dbg.getBossShots()[0] ? dbg.getBossShots()[0].mesh.position.x : 99;
check('炮弹弱跟踪(轨迹偏转)', shellX > 0.6, 'x=' + shellX.toFixed(2));
// B) 落地爆炸：仅玩家，2m 内 23 伤（-10%），不伤敌人
dbg.clearProjectiles();
const shellG = dbg.spawnTestShell(dbg.getPlayer().pos.x + 1.5, 0.1, dbg.getPlayer().pos.z, 0, 0, 0);
dbg.setHp(100);
dbg.resetHurt();
advance(0.2);
const lostGround = 100 - dbg.getPlayer().hp;
check('炮弹落地爆炸玩家-23(降10%)', lostGround >= 22 && lostGround <= 24, 'lost=' + lostGround);
check('落地炮弹消失', !dbg.getBossShots().includes(shellG));
// C) 玩家 3 发击毁空爆：对玩家半径2m伤害 + 波及敌人
dbg.clearProjectiles();
// 鱼放在炮弹旁侧（射线外 1m、空爆半径 2m 内），并冻结发现检测防止它们追过来挡子弹
for (const fn of dbg.getEnemies()) {
  if (fn.alive) { fn.mesh.position.set(1.0, fn.baseY, 33.4); }
}
dbg.inertEnemies();
dbg.getPlayer().pos.set(0, 0, 40);
dbg.setAmmo(30, 100);
dbg.setHp(100);
dbg.resetHurt();
advance(0.05);   // 同步相机到新位置（否则射线从旧位置发出）
// 静止炮弹（在玩家正前方 8 米），无挡路的鱼
const shellS = dbg.spawnTestShell(0, 1.7, 32, 0, 0, 0);
const killsBeforeShell = dbg.getKills();
let shellDestroyed = false;
for (let hs = 0; hs < 4 && !shellDestroyed; hs++) {
  dbg.shootOnce();
  advance(0.2);
  if (!dbg.getBossShots().includes(shellS)) shellDestroyed = true;
}
check('炮弹被3发子弹击毁空爆', shellDestroyed, 'destroyed=' + shellDestroyed);
check('空爆波及敌人(击杀)', dbg.getKills() > killsBeforeShell,
  killsBeforeShell + ' -> ' + dbg.getKills());
dbg.setHp(100);
dbg.resetHurt();
if (dbg.getState() !== 'playing') dbg.setState('playing');

// ---- 远程射手鱼 ----
const shooter = dbg.spawnShooter(0, 20);     // 玩家 (0,40) 前方 20 米（子弹飞行 2.2s）
shooter.state = 'chase'; shooter.lostTimer = 0;
for (const fz of dbg.getEnemies()) {
  if (fz !== shooter && fz.alive) {
    fz.mesh.position.set(-43, fz.baseY, -43);
    fz.waypoint.set(-43, 0, -43);
    fz.state = 'patrol'; fz.waitTimer = 999;
  }
}
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
advance(1.2);
check('射手鱼每秒发射2发子弹', dbg.getFishBullets().length >= 2,
  'bullets=' + dbg.getFishBullets().length);
advance(1.0);   // 推进 1 米需 0.23s
const zFirst = shooter.mesh.position.z;
advance(1.0);
const zSecond = shooter.mesh.position.z;
check('射手鱼只向玩家推进1米后站桩', zFirst > 20.5 && zFirst < 22 && Math.abs(zSecond - zFirst) < 0.1,
  'z1=' + zFirst.toFixed(2) + ' z2=' + zSecond.toFixed(2));
// 子弹验证：远距站桩弹幕，子弹飞行 ~2s 后命中，每发 7~12 点
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
advance(3.0);
const lostShot = 100 - dbg.getPlayer().hp;
check('射手子弹持续命中(每发7~12)', lostShot >= 14 && lostShot <= 72, 'lost=' + lostShot);
// 近战怪速度 1.5 倍：10 米距离 1 秒内应追进到 4.5 米内（原速只能到 5.6 米）
for (const fm of dbg.getEnemies()) {
  if (fm.alive && fm !== shooter) {
    fm.mesh.position.set(0, fm.baseY, 30);
    fm.waypoint.set(0, 0, 30);
    fm.state = 'patrol'; fm.waitTimer = 999;
  }
}
const melee = dbg.getEnemies().find(e => e.alive && !e.ranged);
if (melee) {
  melee.mesh.position.set(0, melee.baseY, 30);
  melee.state = 'chase';
  melee.lostTimer = 0;
  dbg.getPlayer().pos.set(0, 0, 40);
  dbg.setHp(100);
  advance(1.0);
  const dM = Math.sqrt(
    Math.pow(melee.mesh.position.x - 0, 2) +
    Math.pow(melee.mesh.position.z - 40, 2));
  check('近战怪速度提升1.5倍(1秒追进>5.5m)', dM <= 4.5, 'dist=' + dM.toFixed(2));
}
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// 敌人 AI：追击 + 攻击（其余鱼挪到远角，确保测试只受单条鱼影响）
const chaser = fishes.find(f => f.alive);
chaser.ranged = false;                       // 强制近战（射手不近战，会干扰本断言）
if (chaser.gunMesh) chaser.gunMesh.visible = false;
chaser.seeCheckTimer = 0.01;                 // 立即触发发现检测（可能被 inertEnemies 冻结过）
for (const fc of fishes) {
  if (fc !== chaser && fc.alive) { fc.mesh.position.set(26, fc.baseY, 26); fc.state = 'patrol'; fc.lostTimer = 0; }
}
dbg.setHp(100);
chaser.mesh.position.set(0, chaser.baseY, 30); // 玩家出生 (0,40)，距离 10 米可发现
advance(1.0);
check('肥鱼发现玩家后追击', chaser.state === 'chase' || chaser.state === 'attack', chaser.state);
const hpBefore = dbg.getPlayer().hp;
advance(3.5);
check('肥鱼近身后攻击扣血', dbg.getPlayer().hp < hpBefore, 'hp=' + dbg.getPlayer().hp);

// ---- 近战攻击使用三维距离：玩家站在高处（顶棚）时不会被隔空咬 ----
for (const fv of dbg.getEnemies()) {
  if (fv.alive) { fv.mesh.position.set(-43, fv.baseY, -43); fv.waypoint.set(-43, 0, -43); fv.state = 'patrol'; fv.waitTimer = 999; }
}
dbg.clearProjectiles();
dbg.setHp(100);
dbg.getPlayer().pos.set(17, 3.8, -13);   // 站上 B 洞顶棚（顶面 y=3.8）
if (dbg.getState() !== 'playing') dbg.setState('playing');
advance(0.05);
const climbFish = dbg.getEnemies().find(e => e.alive);
climbFish.ranged = false;                        // 强制近战（射手会开枪干扰本断言）
if (climbFish.gunMesh) climbFish.gunMesh.visible = false;
climbFish.mesh.position.set(17, climbFish.baseY, -11);  // 顶棚下方，水平距离 2m（<原攻击半径 2.1）
climbFish.state = 'chase'; climbFish.lostTimer = 0;
climbFish.seeCheckTimer = 9999;                  // 锁定追击不重置
advance(2.5);
check('近战攻击判定含高度(高处不被隔空咬)', dbg.getPlayer().hp === 100, 'hp=' + dbg.getPlayer().hp);
dbg.getPlayer().pos.set(0, 0, 30);               // 复位玩家，避免影响后续用例
if (dbg.getPlayer().pos.y > 0) dbg.getPlayer().pos.y = 0;
dbg.setHp(100);

// 无敌帧：两次 damage 至多生效一次（期间肥鱼可能也在攻击）
const hpBefore2 = dbg.getPlayer().hp;
dbg.damagePlayer(10);
const hpAfter1 = dbg.getPlayer().hp;
dbg.damagePlayer(10);
const hpAfter2 = dbg.getPlayer().hp;
check('受击无敌帧生效(至多扣一次)', hpBefore2 - hpAfter2 <= 10 && hpAfter2 <= hpAfter1,
  hpBefore2 + '->' + hpAfter1 + '->' + hpAfter2);

// ---- 敌人碰撞：不会直接穿过墙体 ----
const fw = dbg.getEnemies().find(e => e.alive);
if (fw) {
  for (const fo of dbg.getEnemies()) {
    if (fo !== fw && fo.alive) {
      fo.mesh.position.set(-43, fo.baseY, -43);
      fo.waypoint.set(-43, 0, -43);
      fo.state = 'patrol'; fo.waitTimer = 999;
    }
  }
  fw.mesh.position.set(5, fw.baseY, 0);   // 建筑内部
  fw.state = 'chase'; fw.lostTimer = 0;
  dbg.getPlayer().pos.set(5, 0, 40);      // 玩家在建筑南侧（中间隔实体墙 x=5 非门洞）
  dbg.setHp(100);
  if (dbg.getState() !== 'playing') dbg.setState('playing');
  let everInWall = false;
  for (let nw = 0; nw < 40; nw++) {
    advance(0.1);
    const fx = fw.mesh.position.x, fz = fw.mesh.position.z;
    // 建筑南墙实体段（x ±2.2~±10.9，z 8~9）：鱼出现在这里即视为穿墙
    if (((fx > 2.2 && fx < 10.9) || (fx < -2.2 && fx > -10.9)) && fz > 7.9 && fz < 9.1) {
      everInWall = true;
    }
  }
  check('敌人不会穿过墙体', everInWall === false, 'x=' + fw.mesh.position.x.toFixed(1) + ',z=' + fw.mesh.position.z.toFixed(1));
}
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// 防干扰：把肥鱼全部挪到角落巡逻，玩家回满血，确保控制测试不受围攻影响
for (const f of dbg.getEnemies()) {
  if (f.alive) { f.mesh.position.set(26, f.baseY, 26); f.state = 'patrol'; f.lostTimer = 0; }
}
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');

// 移动
dbg.releaseKeys();
dbg.pressKey('KeyW', true);
const p0 = dbg.getPlayer().pos.clone();
advance(0.5);
check('W 键向前移动', dbg.getPlayer().pos.z < p0.z, 'dz=' + (dbg.getPlayer().pos.z - p0.z).toFixed(2));
dbg.releaseKeys();

// 跳跃（通过 keydown 事件；确保竞技状态）
dbg.setState('playing');
fakeDocument.fire('keydown', { code: 'Space' });
advance(0.06);
check('空格跳跃', dbg.getPlayer().pos.y > 0.05, 'y=' + dbg.getPlayer().pos.y.toFixed(2));
advance(0.8);

// 平台交互：跳上木箱并站立（矮箱 0.95m 顶，位于 (18,34)，AABB x17~19/z33~35）
dbg.getPlayer().pos.set(18, 0, 35.6);
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
dbg.pressKey('KeyW', true);
fakeDocument.fire('keydown', { code: 'Space' });
advance(0.32);
dbg.releaseKeys();
advance(0.9);
check('可跳上箱子并站立顶面', Math.abs(dbg.getPlayer().pos.y - 0.95) < 0.06,
  'y=' + dbg.getPlayer().pos.y.toFixed(2) + ' z=' + dbg.getPlayer().pos.z.toFixed(1));

// 平台交互：跳上石头并站立（石头 (28,14) 顶面 ≈0.945m）
dbg.getPlayer().pos.set(28, 0, 16.2);
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
dbg.pressKey('KeyW', true);
fakeDocument.fire('keydown', { code: 'Space' });
advance(0.32);
dbg.releaseKeys();
advance(0.9);
check('可跳上石头并站立顶面', Math.abs(dbg.getPlayer().pos.y - 0.945) < 0.06,
  'y=' + dbg.getPlayer().pos.y.toFixed(2) + ' z=' + dbg.getPlayer().pos.z.toFixed(1));

// 平台交互：B 洞顶棚（y 3.4~3.8）下方走廊可正常通行
dbg.getPlayer().pos.set(17, 0, 14);
dbg.pressKey('KeyW', true);
advance(3.6);
dbg.releaseKeys();
const zzRoof = dbg.getPlayer().pos.z;
check('可穿过顶部遮蔽的通道（顶棚下不挡人）', zzRoof <= -6.2 && zzRoof >= -17,
  'z=' + zzRoof.toFixed(1));
dbg.getPlayer().pos.set(0, 0, 44);
if (dbg.getPlayer().pos.y > 0) dbg.getPlayer().pos.y = 0;

// 碰撞：撞南边界墙（玩家在出生区，S 后退朝 +z 撞 z≈45.7 的城墙）
dbg.getPlayer().pos.set(0, 0, 44);
dbg.pressKey('KeyS', true);
advance(1.2);
const zz = dbg.getPlayer().pos.z;
check('边界墙碰撞阻止穿墙', zz >= 44 && zz <= 45.3, 'z=' + zz.toFixed(2));
dbg.releaseKeys();

// 死亡结算（从满血开始，避免测试间随机扣血干扰）
// 清场：所有敌人（含射手）挪到远角静默，防止弹雨/围咬干扰结算断言
for (const fc3 of dbg.getEnemies()) {
  if (fc3.alive) {
    fc3.mesh.position.set(-43, fc3.baseY, 43);
    fc3.waypoint.set(-43, 0, 43);
    fc3.state = 'patrol'; fc3.waitTimer = 999;
  }
}
dbg.clearProjectiles();   // 清除在途弹幕（含 19m 远距子弹）
advance(0.05);
dbg.resetHurt();
dbg.setHp(100);
if (dbg.getState() !== 'playing') dbg.setState('playing');
const need = 10;
for (let i = 0; i < need; i++) {
  dbg.damagePlayer(10);
  advance(0.6);
}
check('生命归零后游戏结束', dbg.getState() === 'gameover', dbg.getState());
check('结算界面记录得分', els['final-score'].textContent === String(dbg.getScore()),
  els['final-score'].textContent + ' vs ' + dbg.getScore());
check('BGM调试信息含战败曲字段', typeof dbg.getBgmInfo().overExists === 'boolean' && typeof dbg.getBgmInfo().overPaused === 'boolean',
  JSON.stringify(dbg.getBgmInfo()));

// 重开：清场并立刻刷新一轮怪（不继承上一局成长）
for (const oldFish of dbg.getEnemies()) {
  if (oldFish.alive) oldFish.hp = 5;   // 模拟上一局升级过的高血量怪
}
dbg.restart();
fakeDocument.pointerLockElement = canvasEl;
fakeDocument.fire('pointerlockchange');
check('重开后状态复位', dbg.getState() === 'playing' && dbg.getScore() === 0 && dbg.getPlayer().hp === 100,
  dbg.getState() + '/' + dbg.getScore() + '/' + dbg.getPlayer().hp);
check('重开后战斗曲复位', dbg.getBgmInfo().bossTempo === 0 && dbg.getBgmInfo().bossVol === 0,
  'tempo=' + dbg.getBgmInfo().bossTempo + ' vol=' + dbg.getBgmInfo().bossVol);
const newFishes = dbg.getEnemies();
check('重开后清场刷新6条新怪', newFishes.length === 6 && newFishes.every(e => e.alive && e.hp === 1),
  'count=' + newFishes.length + ' hps=' + newFishes.map(e => e.hp).join(','));
check('重开后怪分布在场地(非角落残留)', newFishes.every(e => Math.abs(e.mesh.position.x) < 44 && Math.abs(e.mesh.position.z) < 44),
  'bad-pos=' + newFishes.filter(e => !(Math.abs(e.mesh.position.x) < 44 && Math.abs(e.mesh.position.z) < 44)).length);

// ---- 降级模式（指针锁定不可用）测试 ----
dbg.enterFallback();
check('降级模式直接进入游戏', dbg.getState() === 'playing' && dbg.getLockMode() === 'fallback',
  dbg.getState() + '/' + dbg.getLockMode());
const yawBeforeFb = dbg.getPlayer().yaw;
fakeDocument.fire('mousemove', { clientX: 100, clientY: 100 });
fakeDocument.fire('mousemove', { clientX: 170, clientY: 120 });
check('降级模式拖动转向', dbg.getPlayer().yaw !== yawBeforeFb, 'yaw 变化');
const fishFb = dbg.getEnemies().find(x => x.alive);
fishFb.mesh.position.set(0, fishFb.baseY + 0.2, -5);
const killsBeforeFb = dbg.getKills();
dbg.shootOnce();
check('降级模式下仍可射击击杀', dbg.getKills() > killsBeforeFb);
fakeDocument.fire('keydown', { code: 'Escape' });
check('降级模式下 Esc 暂停', dbg.getState() === 'paused', dbg.getState());
advance(2);

// ---- 技能等级查看面板（I 键） ----
dbg.enterFallback();
dbg.getPlayer().yaw = 0; dbg.getPlayer().pitch = 0;
dbg.setHp(100);
advance(0.05);
fakeDocument.fire('keydown', { code: 'KeyI' });
check('按 I 打开技能面板(暂停)', dbg.isSkillsOpen() === true && dbg.getState() === 'skills', dbg.getState());
check('技能面板显示5个技能', els['skills-list'].innerHTML.indexOf('skill-row') >= 0 && (els['skills-list'].innerHTML.match(/skill-row/g) || []).length === 5,
  'rows=' + ((els['skills-list'].innerHTML.match(/skill-row/g) || []).length));
check('技能面板打开时进步曲开启', dbg.getBgmInfo().progressOn === true);
fakeDocument.fire('keydown', { code: 'KeyI' });
check('再按 I 关闭面板恢复游戏', dbg.isSkillsOpen() === false && dbg.getState() === 'playing', dbg.getState());
check('关闭后进步曲关闭', dbg.getBgmInfo().progressOn === false);
dbg.enterFallback();
fakeDocument.fire('keydown', { code: 'KeyI' });
fakeDocument.fire('keydown', { code: 'Escape' });
check('Esc 也可关闭技能面板', dbg.isSkillsOpen() === false && dbg.getState() === 'playing', dbg.getState());
// 技能等级内容渲染：先把某技能升 3 级，再打开检查显示
dbg.setUpgradeLevel('dmg', 3);
dbg.enterFallback();
fakeDocument.fire('keydown', { code: 'KeyI' });
check('技能面板显示当前等级(Lv.3)', els['skills-list'].innerHTML.indexOf('Lv.3') >= 0, 'dmg lv3 shown');
fakeDocument.fire('keydown', { code: 'Escape' });
dbg.setUpgradeLevel('dmg', 0);
dbg.enterFallback();
dbg.setHp(100);

// ---- 敌人成长与无尽模式通关 ----
for (const fg2 of dbg.getEnemies()) {
  if (fg2.alive) { fg2.mesh.position.set(-43, fg2.baseY, -43); fg2.waypoint.set(-43, 0, -43); fg2.state = 'patrol'; fg2.waitTimer = 999; }
}
dbg.clearProjectiles();
dbg.enterFallback();            // 游戏进行中（点击射击模式）
dbg.setBossTimer(99999);
dbg.setHp(100);
dbg.setAmmo(30, 100);
dbg.getPlayer().pos.set(0, 0, 40);
dbg.getPlayer().yaw = 0;        // 重置朝向（降级模式拖动转向测试改变了 yaw）
dbg.getPlayer().pitch = 0;
dbg.clearProjectiles();
advance(0.05);
// 模拟已击杀过 1 只 Boss（成长前置），验证奖励窗口 + 第二轮成长
dbg.simulateGrowth();
dbg.spawnBoss();
dbg.getBoss().mesh.position.set(0, 3, 15);
advance(0.05);
check('Boss血条数值随成长变化(20/20)', els['boss-hp-cur'].textContent === '20' && els['boss-hp-max'].textContent === '20',
  els['boss-hp-cur'].textContent + '/' + els['boss-hp-max'].textContent);
dbg.setBossHp(1);
dbg.shootOnce();
advance(0.2);
check('击杀Boss弹出奖励窗口', dbg.isRewardOpen() === true, 'state=' + dbg.getState());
const growth = dbg.getGrowth();
check('成长：小怪血量+1(3)', growth.enemyHpNow === 3, JSON.stringify(growth));
check('成长：下一个Boss血量+5(25)', growth.bossHpNext === 25, String(growth.bossHpNext));
check('成长：Boss炮弹伤害+2(29)', growth.bossBallDmgNow === 29, String(growth.bossBallDmgNow));
check('成长：小怪生成速率+5%(7只)', growth.fishCapNow === 7, String(growth.fishCapNow));
const gRow = dbg.getRewardOptions();
check('成长后奖励窗口仍3选项', gRow && gRow.length === 3, gRow ? String(gRow.length) : 'null');
dbg.chooseReward(0);
dbg.enterFallback();
dbg.resetProgression();
dbg.setState('playing');
dbg.setHp(100);
// 全部技能 10 级：再击杀 Boss 应触发通关
for (const uid of ['dmg', 'refund', 'heal', 'nade', 'speed']) dbg.setUpgradeLevel(uid, 10);
check('五个技能全满级标记通关', dbg.isMaxAll() === true);
dbg.removeBoss();
dbg.clearProjectiles();
dbg.getPlayer().pos.set(0, 0, 40);
dbg.getPlayer().yaw = 0;
dbg.getPlayer().pitch = 0;
advance(0.05);
dbg.spawnBoss();
dbg.getBoss().mesh.position.set(0, 3, 15);
advance(0.05);
dbg.setBossHp(1);
dbg.shootOnce();
advance(0.2);
check('满级后击杀Boss触发通关', dbg.getState() === 'victory', 'state=' + dbg.getState());
console.log('  (通关触发于击杀 ' + dbg.getGrowth().bossKillCount + ' 只 Boss 后)');
dbg.restart();                  // 恢复可玩状态并重置成长
fakeDocument.pointerLockElement = canvasEl;
fakeDocument.fire('pointerlockchange');
check('通关后重开正常', dbg.getState() === 'playing' && dbg.getGrowth().bossKillCount === 0,
  dbg.getState() + '/bossKills=' + dbg.getGrowth().bossKillCount);

// ---- 开发者模式（秘技：5 秒内按 WWSSAADDBABA 切换） ----
const cheatSeq = ['KeyW', 'KeyW', 'KeyS', 'KeyS', 'KeyA', 'KeyA', 'KeyD', 'KeyD', 'KeyB', 'KeyA', 'KeyB', 'KeyA'];
for (const dc of cheatSeq) fakeDocument.fire('keydown', { code: dc });
check('秘技开启开发者模式(生命99999)', dbg.isDebugMode() === true && dbg.getPlayer().hp === 99999,
  'hp=' + dbg.getPlayer().hp);
dbg.setHp(99999);
dbg.resetHurt();
dbg.damagePlayer(10, { name: '近战肥鱼', atk: '撕咬' });
check('开发者模式仍受到伤害', dbg.getPlayer().hp === 99989, 'hp=' + dbg.getPlayer().hp);
const dlNow = dbg.getDebugLogs();
check('受击日志已记录(含护盾减免)', dlNow.length > 0 && dlNow[dlNow.length - 1].indexOf('受到') >= 0 && dlNow[dlNow.length - 1].indexOf('护盾') >= 0,
  JSON.stringify(dlNow.slice(-2)));
dbg.resetHurt();
advance(0.6);
dbg.resetHurt();
dbg.damagePlayer(85, { name: '射手肥鱼', atk: '子弹' });
const hpBeforeHeal = dbg.getPlayer().hp;
check('伤害累计(99904)', hpBeforeHeal === 99904, 'hp=' + hpBeforeHeal);
// 5 秒回血（期间钉住鱼防干扰）
for (let dh = 0; dh < 6; dh++) {
  for (const fz of dbg.getEnemies()) {
    if (fz.alive) { fz.mesh.position.set(-43, fz.baseY, -43); fz.waypoint.set(-43, 0, -43); fz.state = 'patrol'; fz.waitTimer = 999; }
  }
  advance(1.0);
}
check('开发者模式每5秒恢复100生命', dbg.getPlayer().hp === 99999, 'hp=' + dbg.getPlayer().hp);
// 再次秘技关闭
for (const dc2 of cheatSeq) fakeDocument.fire('keydown', { code: dc2 });
check('再次秘技关闭开发者模式', dbg.isDebugMode() === false && dbg.getPlayer().hp <= 100 && dbg.getPlayer().hp > 0,
  'hp=' + dbg.getPlayer().hp);
dbg.setHp(100);

// ---- KILL 自毁秘技（仅开发者模式生效）----
// 非开发者模式：输入 KILL 不触发（I 键按游戏正常功能只打开技能面板）
dbg.enterFallback();
fakeDocument.fire('keydown', { code: 'KeyK' });
fakeDocument.fire('keydown', { code: 'KeyI' });
fakeDocument.fire('keydown', { code: 'KeyL' });
fakeDocument.fire('keydown', { code: 'KeyL' });
check('非开发者模式下KILL不生效(未自杀未开debug)', dbg.isDebugMode() === false && dbg.getState() !== 'gameover',
  dbg.getState() + '/debug=' + dbg.isDebugMode());
fakeDocument.fire('keydown', { code: 'Escape' });   // 关掉 I 键正常打开的技能面板
check('关闭技能面板恢复游戏', dbg.getState() === 'playing', dbg.getState());
dbg.enterFallback();
// 开启开发者模式 → KILL 自杀
for (const dc3 of cheatSeq) fakeDocument.fire('keydown', { code: dc3 });
check('再次开启开发者模式', dbg.isDebugMode() === true && dbg.getPlayer().hp === 99999, 'hp=' + dbg.getPlayer().hp);
fakeDocument.fire('keydown', { code: 'KeyK' });
fakeDocument.fire('keydown', { code: 'KeyI' });
fakeDocument.fire('keydown', { code: 'KeyL' });
fakeDocument.fire('keydown', { code: 'KeyL' });
check('KILL秘技退出开发者模式并自杀', dbg.isDebugMode() === false && dbg.getState() === 'gameover',
  dbg.getState() + '/debug=' + dbg.isDebugMode());
check('自杀结算文案', els['gameover-title'].textContent === '你选择了自我了断…', els['gameover-title'].textContent);
dbg.restart();
fakeDocument.pointerLockElement = canvasEl;
fakeDocument.fire('pointerlockchange');
check('KILL自杀后可重开', dbg.getState() === 'playing' && dbg.getPlayer().hp <= 100 && dbg.getPlayer().hp > 0,
  dbg.getState() + '/hp=' + dbg.getPlayer().hp);
dbg.enterFallback();

// 长时间稳定性
advance(12);
check('长跑 12 秒无异常', true);

console.log(failures === 0 ? '===== ALL SMOKE TESTS PASSED =====' : '===== ' + failures + ' TESTS FAILED =====');
process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) { console.error('SMOKE CRASH:', e); process.exit(1); });
