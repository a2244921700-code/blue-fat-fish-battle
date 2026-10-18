/* =========================================================================
 * perf-probe.js —— 《蓝色肥鱼大作战》源码体检探针
 *
 * 作用：复用官方 smoke-test 的「假 DOM / 假 WebGL」思路，在 Node 里把游戏跑起来，
 *      用真实数值回答三个问题：
 *        1) 静态场景到底有多少个障碍物 / 网格 / 材质？（决定 blocksAt、射线检测的成本）
 *        2) 波次推进时，场景对象、几何体、材质是否线性增长？（决定长时间游玩会不会越玩越卡）
 *        3) 每帧纯逻辑（不含渲染）耗时多少？（用 wall-clock 粗测 update 的开销）
 *
 * 运行：node review/perf-probe.js
 * 说明：不修改游戏源码，仅在加载 THREE 后对构造函数做计数包装。
 * ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const GAME_DIR = ROOT;

// ---------------------------------------------------------------- 环境 stub
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
globalThis.devicePixelRatio = 2;          // 模拟高分屏：pixelRatio 会被 clamp 到 2
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

// ---------------------------------------------------------------- 加载 THREE 并埋计数器
const THREE = require(path.join(GAME_DIR, 'lib', 'three.min.js'));
globalThis.THREE = THREE;

const counters = { geometry: 0, material: 0, mesh: 0 };
(function hookTHREE() {
  const wrap = (name, key) => {
    const Orig = THREE[name];
    if (!Orig) return;
    function Patched(...args) { counters[key] += 1; return new Orig(...args); }
    Patched.prototype = Orig.prototype;
    Object.setPrototypeOf(Patched, Orig);
    THREE[name] = Patched;
  };
  ['BufferGeometry', 'BoxGeometry', 'PlaneGeometry', 'SphereGeometry', 'CylinderGeometry',
   'ConeGeometry', 'DodecahedronGeometry', 'TorusGeometry', 'CircleGeometry'].forEach(n => wrap(n, 'geometry'));
  ['Material', 'MeshBasicMaterial', 'MeshStandardMaterial', 'MeshDepthMaterial',
   'PointsMaterial', 'SpriteMaterial'].forEach(n => wrap(n, 'material'));
  wrap('Mesh', 'mesh');
})();

(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'assets', 'fish-texture.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(GAME_DIR, 'js', 'game.js'), 'utf8'));
const dbg = window.FishGame.__debug;

// ---------------------------------------------------------------- 工具
function advance(seconds) {
  const frames = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < frames; i++) {
    performanceNow += 1000 / 60;
    const q = rafQ.splice(0);
    for (const cb of q) cb(performanceNow);
  }
}
const tick = () => new Promise(r => setTimeout(r, 0));
const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

function snapshot() {
  const st = dbg.getSceneStats();
  return {
    children: st.children, meshes: st.meshes,
    obstacles: st.obstacles, wallMeshes: st.wallMeshes,
    aliveEnemies: st.enemies, allEnemies: dbg.getEnemies().length,
    geometry: counters.geometry, material: counters.material, mesh: counters.mesh,
  };
}

// ---------------------------------------------------------------- 主流程
(async function main() {
  await tick();
  dbg.enterGameWorld();
  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advance(0.3);

  const base = snapshot();

  console.log('\n================ A. 静态场景规模（进图后，0 波敌人）================');
  console.log('  场景直接子节点 children        : ' + base.children);
  console.log('  网格总数（含子网格）meshes     : ' + base.meshes);
  console.log('  碰撞体 obstacles               : ' + base.obstacles + '   ← blocksAt / segmentHitsObstacle 每次都要全表扫');
  console.log('  可被射线命中的 wallMeshes      : ' + base.wallMeshes + '   ← 每次开枪 intersectObjects 全表扫');
  console.log('  已创建几何体 geometry          : ' + base.geometry);
  console.log('  已创建材质 material            : ' + base.material);

  // ---- 每帧纯逻辑耗时（无真实 GL，测的是 update 侧 CPU）----
  const t0 = process.hrtime.bigint();
  advance(3);
  const t1 = process.hrtime.bigint();
  const frames = Math.round(3 * 60);
  console.log('  update 纯逻辑耗时（' + frames + ' 帧）: ' + (Number(t1 - t0) / 1e6).toFixed(1) + ' ms  →  '
    + (Number(t1 - t0) / 1e6 / frames).toFixed(3) + ' ms/帧');

  // ---- 波次推进：观察是否线性膨胀 ----
  console.log('\n================ B. 连续 15 波的资源增长 ================');
  console.log('  ' + pad('波次', 6) + num('场上敌人', 9) + num('enemies[]', 11) + num('场景网格', 10)
    + num('几何体', 9) + num('材质', 8) + num('ms/帧', 9));
  const rows = [];
  for (let w = 1; w <= 15; w++) {
    dbg.startWave(w);
    advance(0.4);
    // 在「本波敌人全部存活」的状态下测一帧成本（1 秒 = 60 帧）
    const f0 = process.hrtime.bigint();
    advance(1);
    const f1 = process.hrtime.bigint();
    const msPerFrame = Number(f1 - f0) / 1e6 / 60;
    dbg.killAllEnemies();
    advance(0.5);
    const s = snapshot();
    s.msPerFrame = msPerFrame;
    rows.push(s);
    console.log('  ' + pad(w, 6) + num(s.aliveEnemies, 9) + num(s.allEnemies, 11) + num(s.meshes, 10)
      + num(s.geometry, 9) + num(s.material, 8) + num(msPerFrame.toFixed(3), 9));
  }
  const last = rows[rows.length - 1];
  console.log('  ---- 15 波累计增长 ----');
  console.log('  enemies[] 数组      : ' + base.allEnemies + ' → ' + last.allEnemies
    + '   (+' + (last.allEnemies - base.allEnemies) + ')');
  console.log('  场景网格 meshes     : ' + base.meshes + ' → ' + last.meshes
    + '   (+' + (last.meshes - base.meshes) + ')');
  console.log('  几何体 geometry     : ' + base.geometry + ' → ' + last.geometry
    + '   (+' + (last.geometry - base.geometry) + ')');
  console.log('  材质 material       : ' + base.material + ' → ' + last.material
    + '   (+' + (last.material - base.material) + ')');

  // ---- 重开一局，看是否回收 ----
  console.log('\n================ C. 重开一局后是否释放 ================');
  const beforeRestart = snapshot();
  try { dbg.restart(true); } catch (e) { console.log('  restart 调用异常: ' + e.message); }
  advance(0.5);
  const afterRestart = snapshot();
  console.log('  重开前 几何体/材质 : ' + beforeRestart.geometry + ' / ' + beforeRestart.material);
  console.log('  重开后 几何体/材质 : ' + afterRestart.geometry + ' / ' + afterRestart.material
    + '   （新增 ' + (afterRestart.geometry - beforeRestart.geometry) + ' / ' + (afterRestart.material - beforeRestart.material) + '）');
  console.log('  重开后 enemies[]   : ' + afterRestart.allEnemies + '（应回到 0）');
  console.log('  重开后 meshes      : ' + afterRestart.meshes + '（基线 ' + base.meshes + '）');

  console.log('\n（注：本探针只统计 JS 侧对象与 update 耗时；GPU 侧渲染成本需在浏览器 Performance 面板实测）\n');
})();
