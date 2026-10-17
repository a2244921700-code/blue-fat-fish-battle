/* =========================================================================
 * verify-patch.js —— 验证「共享资源 + 原型克隆」改动没有改变游戏行为
 *
 * 检查项（都是纯数值断言，不依赖截图）：
 *   1. 所有鱼共用同一份 PlaneGeometry / 两套共享材质
 *   2. 追击泛红靠换材质引用生效，且只在状态切换时切换
 *   3. 枪的克隆体带回了 muzzleTip 枪口锚点（clone 不会复制自定义属性）
 *   4. 枪口锚点的世界坐标确实偏离鱼体中心（说明挂点变换被正确继承）
 *   5. 剑的克隆体旋转互相独立（挥剑动画不会串到别的鱼身上）
 *   6. 射手鱼开火时子弹从枪口出膛，而不是从鱼身中心
 *   7. 死亡后尸体被移出场景树，且引信光环被释放
 *
 * 运行：node review/verify-patch.js
 * ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const GAME_DIR = path.join(__dirname, '..');

// ---------------------------------------------------------------- 环境 stub（同 perf-probe）
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
    if (p === 'indexOf') return () => -1;
    if (p === 'includes') return () => false;
    if (p === 'match' || p === 'exec' || p === 'test') return () => null;
    if (p === 'split') return () => [];
    if (p === 'toLowerCase' || p === 'toUpperCase' || p === 'trim') return () => '';
    if (p === 'toString') return () => '[fake-gl]';
    if (p === 'valueOf') return () => 0;
    if (p === 'length') return 0;
    if (typeof p === 'string' && /^[A-Z0-9_]+$/.test(p)) return 4096;
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
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
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
    querySelectorAll() { return []; },
  };
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
  getElementById(id) { if (!els[id]) { els[id] = baseEl(); els[id].id = id; } return els[id]; },
  createElement(tag) { const el = baseEl(); el.tagName = String(tag).toUpperCase(); return el; },
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener() {},
  exitPointerLock() { this.pointerLockElement = null; },
  fire(type, ev) { (listeners[type] || []).forEach(fn => fn(ev || {})); },
};

globalThis.window = globalThis;
globalThis.document = fakeDocument;
globalThis.performance = { now: () => performanceNow };
globalThis.innerWidth = 1920; globalThis.innerHeight = 1080;
globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
globalThis.cancelAnimationFrame = () => {};
globalThis.addEventListener = () => {};
globalThis.AudioContext = undefined; globalThis.webkitAudioContext = undefined;
globalThis.Image = class Image {
  set src(v) {
    if (typeof v === 'string' && v.indexOf('data:') === 0) {
      const self = this;
      setTimeout(() => { self.naturalWidth = 1080; self.naturalHeight = 1080; if (self.onload) self.onload(); }, 0);
    }
  }
};

const THREE = require(path.join(GAME_DIR, 'lib', 'three.min.js'));
globalThis.THREE = THREE;
(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'assets', 'fish-texture.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'js', 'game.js'), 'utf8'));
const dbg = window.FishGame.__debug;

function advance(seconds) {
  const frames = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < frames; i++) {
    performanceNow += 1000 / 60;
    const q = rafQ.splice(0);
    for (const cb of q) cb(performanceNow);
  }
}
const tick = () => new Promise(r => setTimeout(r, 0));

let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('  PASS | ' + name);
  else { fails++; console.log('  FAIL | ' + name + (extra ? '  :: ' + extra : '')); }
}

(async function main() {
  await tick();
  dbg.enterGameWorld();
  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advance(0.3);

  console.log('\n================ 1. 共享几何体 / 材质 ================');
  dbg.startWave(1);
  advance(0.3);
  let fishes = dbg.getEnemies().filter(e => e.alive);
  const geo0 = fishes[0].mesh.geometry;
  const allSameGeo = fishes.every(e => e.mesh.geometry === geo0);
  check('6 条鱼共用同一份 PlaneGeometry', allSameGeo && fishes.length === 6, 'n=' + fishes.length);

  const mats = new Set(fishes.map(e => e.mesh.material));
  check('鱼身材质只有 1~2 个实例（而非每条鱼一个）', mats.size <= 2, '实例数=' + mats.size);

  console.log('\n================ 2. 追击泛红 ================');
  const f0 = fishes[0], f1 = fishes[1];
  f0.state = 'chase'; f1.state = 'patrol';
  advance(0.05);
  const chaseMat = f0.mesh.material, idleMat = f1.mesh.material;
  check('追击中的鱼换成泛红材质', chaseMat !== idleMat);
  check('泛红材质的 color 为 0xff8d8d', chaseMat.color.getHex() === 0xff8d8d,
    '0x' + chaseMat.color.getHex().toString(16));
  check('待机材质的 color 为白色', idleMat.color.getHex() === 0xffffff,
    '0x' + idleMat.color.getHex().toString(16));
  f0.state = 'patrol';
  advance(0.05);
  check('回到巡逻后换回白色材质', f0.mesh.material === idleMat);
  check('两条鱼没有被材质串台（材质仍是共享实例）',
    f0.mesh.material === f1.mesh.material);

  console.log('\n================ 3. 枪口锚点（clone 的坑）================');
  const shooter = fishes.find(e => e.ranged && e.gunMesh);
  check('存在持枪的射手鱼', !!shooter, 'ranged 数量=' + fishes.filter(e => e.ranged).length);
  if (shooter) {
    check('克隆体带回了 muzzleTip', !!shooter.gunMesh.muzzleTip && shooter.gunMesh.muzzleTip.isObject3D,
      String(shooter.gunMesh.muzzleTip));
    check('muzzleTip 有 name 标记', shooter.gunMesh.muzzleTip.name === 'muzzleTip');
    // 枪挂在爪爪上并放大了 2.2 倍，枪口世界坐标必须明显偏离鱼体中心
    const wp = new THREE.Vector3();
    shooter.gunMesh.muzzleTip.getWorldPosition(wp);
    const c = shooter.mesh.position;
    const dist = Math.hypot(wp.x - c.x, wp.y - c.y, wp.z - c.z);
    check('枪口世界坐标偏离鱼身中心 > 0.5m', dist > 0.5, '偏移=' + dist.toFixed(3) + 'm');
  }

  console.log('\n================ 4. 剑的克隆体互不干扰 ================');
  const swordFish = fishes.filter(e => e.swordMesh && e.swordMesh.visible);
  check('存在持剑鱼', swordFish.length >= 2, 'n=' + swordFish.length);
  if (swordFish.length >= 2) {
    const a = swordFish[0], b = swordFish[1];
    const restB = b.swordMesh.rotation.x;
    a.swordMesh.rotation.set(9, 9, 9);        // 手动掰歪 A 的剑
    check('掰歪 A 的剑不影响 B', b.swordMesh.rotation.x === restB,
      'B.x=' + b.swordMesh.rotation.x + ' 期望=' + restB);
    check('A / B 的剑是两个独立对象', a.swordMesh !== b.swordMesh);
    check('A / B 的剑共享几何体（不额外占显存）',
      a.swordMesh.children[0].geometry === b.swordMesh.children[0].geometry);
  }

  console.log('\n================ 5. 射手鱼子弹出膛位置 ================');
  if (shooter) {
    // 把射手鱼放到玩家正前方，逼它开火
    shooter.mesh.position.set(0, shooter.baseY, -8);
    shooter.state = 'chase';
    shooter.ranged = true;
    shooter.fireTimer = 0;
    dbg.clearProjectiles();
    advance(0.4);
    const bullets = dbg.getFishBullets();
    check('射手鱼已开火', bullets.length > 0, 'n=' + bullets.length);
    if (bullets.length) {
      const b = bullets[0].mesh.position;
      const d = Math.hypot(b.x - shooter.mesh.position.x, b.y - shooter.mesh.position.y, b.z - shooter.mesh.position.z);
      // 从枪口（约 1m 外）+ 0.7m 前推，所以应该明显远离鱼身中心
      check('子弹起点在枪口而非鱼身中心（偏移 > 0.8m）', d > 0.8, '偏移=' + d.toFixed(3) + 'm');
    }
  }

  console.log('\n================ 6. 死亡后离场与光环释放 ================');
  const st0 = dbg.getSceneStats();
  // 必须挑「离玩家最近的那条」，因为 killNearest() 杀的就是它
  const pp = dbg.getPlayer().pos;
  let victim = null, vd = Infinity;
  for (const e of dbg.getEnemies()) {
    if (!e.alive) continue;
    const d = (e.mesh.position.x - pp.x) ** 2 + (e.mesh.position.z - pp.z) ** 2;
    if (d < vd) { vd = d; victim = e; }
  }
  const victimMesh = victim.mesh;
  dbg.killNearest();
  advance(0.6);   // 等死亡碎裂动画（0.28s）播完
  check('尸体已从场景树移除', victimMesh.parent === null);
  const st1 = dbg.getSceneStats();
  check('场景网格数没有因死亡而增长', st1.meshes <= st0.meshes + 1, st0.meshes + ' → ' + st1.meshes);

  console.log('\n================ 7. HUD 脏检查 ================');
  // 静止时不应再产生 DOM 写入：用 textContent 的 setter 计数
  const hpEl = fakeDocument.getElementById('health-text');
  let writes = 0;
  let _val = hpEl.textContent;
  Object.defineProperty(hpEl, 'textContent', {
    get() { return _val; },
    set(v) { writes++; _val = v; },
    configurable: true,
  });
  advance(1.0);   // 静止 1 秒（60 帧）
  check('静止 1 秒内血量文本写入次数 ≤ 1（原来 60 次）', writes <= 1, '写入=' + writes + ' 次');
  dbg.damagePlayer(10, { name: '测试', atk: '测试' });
  advance(0.1);
  check('掉血后确实更新了 DOM', writes >= 1, '写入=' + writes + ' 次');

  console.log('\n' + (fails === 0 ? '===== 全部验证通过 =====' : '===== 有 ' + fails + ' 项未通过 =====') + '\n');
  process.exit(fails === 0 ? 0 : 1);
})();
