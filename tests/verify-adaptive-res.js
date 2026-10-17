/* =========================================================================
 * verify-dpr.js —— 验证自适应分辨率的行为
 *
 * 这个改动没法用「跑几秒看看」来验证，必须精确控制每帧耗时。脚本里把
 * performance.now 的推进步长改成可配置，从而模拟「弱 GPU 掉帧」和
 * 「高刷屏 / GPU 过剩」两种场景。
 *
 * 断言：
 *   1. 初始像素比 = 设备 DPR（上限 2），渲染器与画布尺寸一致
 *   2. 持续 40ms/帧（≈25fps）→ 逐步降档，最终停在 1.0（下限）
 *   3. 降档过程中渲染器 pixelRatio 与内部状态同步、画布绘制缓冲同步缩小
 *   4. 转成 8ms/帧（≈125fps）→ 逐步升档，能回到 2.0
 *   5. 稳定 16.7ms/帧（60Hz 垂直同步）→ 不升不降，无震荡
 *   6. 主菜单（UI-only 状态）下即使帧时长异常也不调整
 *   7. 设置里关掉 autoRes → 立刻恢复满分辨率，且此后不再自动调整
 *
 * 运行：node review/verify-dpr.js
 * ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const GAME_DIR = path.join(__dirname, '..');

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
globalThis.devicePixelRatio = 2;             // 模拟 4K / Retina：DPR 2
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

/** 按指定帧时长推进 seconds 秒 */
function advanceWith(seconds, msPerFrame) {
  const frames = Math.max(1, Math.round((seconds * 1000) / msPerFrame));
  for (let i = 0; i < frames; i++) {
    performanceNow += msPerFrame;
    const q = rafQ.splice(0);
    for (const cb of q) cb(performanceNow);
  }
  return frames;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('  PASS | ' + name);
  else { fails++; console.log('  FAIL | ' + name + (extra ? '  :: ' + extra : '')); }
}

(async function main() {
  await sleep(5);
  dbg.enterGameWorld();
  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advanceWith(0.2, 16.7);

  console.log('\n================ 1. 初始状态 ================');
  let info = dbg.getDprInfo();
  check('设备 DPR 2 → base = 2', info.base === 2, String(info.base));
  check('初始像素比 = base', info.now === 2, String(info.now));
  check('渲染器 pixelRatio 与内部状态一致', info.rendererRatio === info.now,
    'renderer=' + info.rendererRatio + ' now=' + info.now);
  check('画布绘制缓冲 = 1920×2 = 3840', canvasEl.width === 3840 && canvasEl.height === 2160,
    canvasEl.width + '×' + canvasEl.height);

  console.log('\n================ 2. 掉帧 → 逐步降档 ================');
  // 40ms/帧 ≈ 25fps：远超 21ms 阈值
  advanceWith(3, 40);
  const mid = dbg.getDprInfo();
  check('3 秒后仍在热身期内或刚开始降档（EMA 已升高）', mid.ema > 25, 'ema=' + mid.ema);

  advanceWith(12, 40);   // 热身 2.5s + 4 次降档（每次 2s 观察期）
  const low = dbg.getDprInfo();
  check('持续掉帧后像素比降到下限 1.0', low.now === 1, String(low.now));
  check('渲染器同步到 1.0', low.rendererRatio === 1, String(low.rendererRatio));
  check('画布绘制缓冲同步缩小到 1920×1080', canvasEl.width === 1920 && canvasEl.height === 1080,
    canvasEl.width + '×' + canvasEl.height);
  check('不会降到下限以下', low.now >= low.min, 'now=' + low.now + ' min=' + low.min);

  console.log('\n================ 3. 恢复流畅 → 逐步升档 ================');
  // 8ms/帧 ≈ 125fps：低于 11ms 阈值
  advanceWith(20, 8);
  const up = dbg.getDprInfo();
  check('帧率恢复后像素比回升', up.now > 1, String(up.now));
  check('最终回到设备上限 2.0', up.now === 2, String(up.now));
  check('渲染器同步回 2.0', up.rendererRatio === 2, String(up.rendererRatio));
  check('画布绘制缓冲恢复 3840×2160', canvasEl.width === 3840 && canvasEl.height === 2160,
    canvasEl.width + '×' + canvasEl.height);
  check('不会超过设备上限', up.now <= up.base, 'now=' + up.now + ' base=' + up.base);

  console.log('\n================ 4. 60Hz 垂直同步下不震荡 ================');
  // 手动降到 1.5，再以标准 16.7ms 跑一段，应该保持不变
  dbg.resetAdaptiveResolution();
  advanceWith(1, 16.7);
  const before60 = dbg.getDprInfo();
  advanceWith(20, 16.7);
  const after60 = dbg.getDprInfo();
  check('16.7ms 稳定帧下像素比不变（EMA≈16.7 落在 11~21 死区）',
    after60.now === before60.now, before60.now + ' → ' + after60.now + ' (ema=' + after60.ema + ')');
  check('EMA 稳定在 60Hz 附近', after60.ema > 15 && after60.ema < 19, 'ema=' + after60.ema);

  console.log('\n================ 5. 主菜单不参与判定 ================');
  const dprBeforeMenu = dbg.getDprInfo().now;
  // 切回菜单（UI-only 状态），用极慢帧跑
  dbg.restart(true);
  advanceWith(5, 60);
  const inMenu = dbg.getDprInfo();
  check('主菜单下像素比保持不变', inMenu.now === dprBeforeMenu, dprBeforeMenu + ' → ' + inMenu.now);
  check('主菜单下状态为 menu', dbg.getState() === 'menu', dbg.getState());

  console.log('\n================ 6. 设置开关 ================');
  dbg.enterGameWorld();
  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advanceWith(0.2, 16.7);
  // 先制造降档
  advanceWith(12, 40);
  const degraded = dbg.getDprInfo();
  check('已降档（准备验证关闭开关）', degraded.now < 2, String(degraded.now));

  // 关掉自适应 → 应立刻恢复到设备满分辨率
  dbg.setSetting('autoRes', false);
  const offNow = dbg.getDprInfo();
  check('关闭自适应后立刻恢复满分辨率', offNow.now === 2, String(offNow.now));
  check('渲染器同步恢复', offNow.rendererRatio === 2, String(offNow.rendererRatio));

  // 关掉之后即使持续掉帧也不该再降
  advanceWith(12, 40);
  const offAfter = dbg.getDprInfo();
  check('关闭后持续掉帧也不再降档', offAfter.now === 2, String(offAfter.now));

  // 重新打开 → 会再次开始判定
  dbg.setSetting('autoRes', true);
  advanceWith(14, 40);
  const onAgain = dbg.getDprInfo();
  check('重新打开后恢复自动降档', onAgain.now < 2, String(onAgain.now));

  console.log('\n' + (fails === 0 ? '===== 自适应分辨率验证通过 =====' : '===== 有 ' + fails + ' 项未通过 =====') + '\n');
  process.exit(fails === 0 ? 0 : 1);
})();
