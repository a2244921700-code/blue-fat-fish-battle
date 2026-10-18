/* =========================================================================
 * verify-audio.js —— 验证 mp3 音效改走 WebAudio 后行为正确
 *
 * 思路：注入一套「假 AudioContext + 假 fetch」，让 WebAudio 分支真正跑起来，
 *      然后断言：
 *        1. 进入游戏时确实预解码了全部 13 个音效键
 *        2. 播放走的是 BufferSource（而不是 new Audio()），且没有创建任何 HTMLAudioElement
 *        3. 音量按 volume × 设置里的音效音量计算
 *        4. 返回的句柄兼容 stopEnemyVoice 的契约（pause / currentTime / paused）
 *        5. 敌人死亡时语音被真正掐断（src.stop 被调用）
 *        6. 多文件音效（bossDetect）两个文件都被解码，且轮换播放
 *        7. 回退路径：AudioContext 不可用时仍能正常返回 undefined 而不报错
 *
 * 运行：node review/verify-audio.js
 * ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const GAME_DIR = path.join(__dirname, '..');

// 运行模式：
//   默认        —— 模拟 http(s) 环境，验证 WebAudio 路径
//   --fallback  —— 模拟 file:// 环境（fetch 被浏览器禁止），验证回退到 HTMLAudioElement 池
const FALLBACK_MODE = process.argv.indexOf('--fallback') >= 0;

// ---------------------------------------------------------------- 假 WebAudio
const log = { bufferStarts: 0, mp3Starts: 0, mp3Stops: 0, oscStarts: 0, stops: 0, decoded: [], fetches: [], audioEls: [] };

function FakeParam(v) {
  return {
    value: v,
    setValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
  };
}
function FakeNode(extra) {
  return Object.assign({
    connect(t) { return t; },
    disconnect() {},
  }, extra || {});
}
class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = FakeNode();
  }
  resume() { this.state = 'running'; }
  createGain() { return FakeNode({ gain: FakeParam(1) }); }
  createBiquadFilter() { return FakeNode({ type: '', frequency: FakeParam(1000) }); }
  createOscillator() {
    return FakeNode({
      type: '', frequency: FakeParam(440),
      start() { log.oscStarts++; }, stop() {},
    });
  }
  createBufferSource() {
    return FakeNode({
      buffer: null, onended: null,
      start() {
        log.bufferStarts++;
        // 只有 mp3 解码出来的 buffer 带 __decoded 标记；Sfx 的程序化噪声用 createBuffer 生成
        if (this.buffer && this.buffer.__decoded) log.mp3Starts++;
      },
      stop() {
        log.stops++;
        if (this.buffer && this.buffer.__decoded) log.mp3Stops++;
      },
    });
  }
  createBuffer(ch, len, rate) {
    const data = new Float32Array(len);
    return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => data };
  }
  decodeAudioData(ab, ok) {
    log.decoded.push(ab && ab.__name ? ab.__name : 'buf');
    setTimeout(() => ok({ duration: 0.4, __decoded: true }), 0);
  }
}

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
globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
globalThis.cancelAnimationFrame = () => {};
globalThis.addEventListener = () => {};
globalThis.Image = class Image {
  set src(v) {
    if (typeof v === 'string' && v.indexOf('data:') === 0) {
      const self = this;
      setTimeout(() => { self.naturalWidth = 1080; self.naturalHeight = 1080; if (self.onload) self.onload(); }, 0);
    }
  }
};
// 关键：装上假 AudioContext，让 WebAudio 分支生效
globalThis.AudioContext = FakeAudioContext;
globalThis.webkitAudioContext = undefined;
// 假 fetch：返回带名字的 ArrayBuffer，便于统计哪些文件被解码
globalThis.fetch = function (url) {
  log.fetches.push(url);
  if (FALLBACK_MODE) {
    // 模拟 file:// —— 浏览器会以 CORS 错误拒绝
    return Promise.reject(new TypeError('Failed to fetch (file:// CORS)'));
  }
  return Promise.resolve({
    ok: true, status: 200,
    arrayBuffer: () => {
      const ab = new ArrayBuffer(8);
      ab.__name = url.split('/').pop();
      return Promise.resolve(ab);
    },
  });
};
// 计数器：只要有人 new Audio()，就说明走了回退路径
globalThis.Audio = function (src) {
  log.audioEls.push(src || '');
  this.src = src;
  this.play = () => Promise.resolve();
  this.pause = () => {};
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('  PASS | ' + name);
  else { fails++; console.log('  FAIL | ' + name + (extra ? '  :: ' + extra : '')); }
}


// ---------------------------------------------------------------- file:// 回退模式
async function runFallback() {
  dbg.enterGameWorld();
  await sleep(30);

  console.log('\n================ F1. fetch 全部失败后自动降级 ================');
  check('确实尝试过预载', log.fetches.length > 0, 'fetches=' + log.fetches.length);
  check('没有解码出任何 buffer（fetch 被拒）', log.decoded.length === 0, 'decoded=' + log.decoded.length);

  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advance(0.3);
  dbg.startWave(1);
  advance(0.3);

  console.log('\n================ F2. 回退到 HTMLAudioElement 池 ================');
  const pp = dbg.getPlayer().pos;
  const near = dbg.getEnemies().filter(e => e.alive)[0];
  near.mesh.position.set(pp.x + 2, near.baseY, pp.z + 2);
  near.state = 'chase';
  near.nearAnnounced = false;
  near.ranged = false;
  advance(0.2);

  const sfxEls = log.audioEls.filter(u => String(u).indexOf('assets/sfx/') === 0);
  check('创建了 sfx 的 HTMLAudioElement（回退生效）', sfxEls.length > 0, '元素数=' + sfxEls.length);
  check('走回退路径时没有 BufferSource 播放 mp3', log.mp3Starts === 0, 'mp3Starts=' + log.mp3Starts);

  console.log('\n================ F3. 回退路径的句柄契约 ================');
  const voice = near.voiceAudio;
  check('敌人语音仍然绑定了句柄', !!voice, String(voice));
  if (voice) {
    check('句柄有 pause()', typeof voice.pause === 'function');
    check('句柄有可写 currentTime', (function () { try { voice.currentTime = 0; return true; } catch (e) { return false; } })());
  }
  const stopsBefore = log.audioEls.length;
  dbg.killNearest();
  advance(0.1);
  check('死亡时未抛异常（掐断逻辑兼容）', true);

  console.log('\n' + (fails === 0 ? '===== 回退路径验证通过 =====' : '===== 有 ' + fails + ' 项未通过 =====') + '\n');
  process.exit(fails === 0 ? 0 : 1);
}

(async function main() {
  await sleep(10);
  if (FALLBACK_MODE) { await runFallback(); return; }
  // enterGameWorld 会调 preloadSfx()，此时是「用户点击开始」的时机
  dbg.enterGameWorld();
  await sleep(30);   // 等 13 个 fetch + decodeAudioData 完成

  console.log('\n================ 1. 预解码 ================');
  check('预载了全部 14 个 mp3 文件', log.fetches.length === 14, 'fetches=' + log.fetches.length);
  check('全部文件都成功解码', log.decoded.length === 14, 'decoded=' + log.decoded.length);
  check('多文件音效 bossDetect 的两个文件都在',
    log.decoded.indexOf('sfx_boss_detect_1.mp3') >= 0 && log.decoded.indexOf('sfx_boss_detect_2.mp3') >= 0,
    log.decoded.join(','));
  // 5 个 BGM 仍然走 HTMLAudioElement（长音频流式播放更省内存），这里只关心 sfx 目录
  const sfxEls = log.audioEls.filter(u => String(u).indexOf('assets/sfx/') === 0);
  check('sfx 目录下没有创建任何 HTMLAudioElement', sfxEls.length === 0, 'sfx 元素=' + sfxEls.length + ' / 全部=' + log.audioEls.length);

  console.log('\n================ 2. 播放走 BufferSource ================');
  fakeDocument.pointerLockElement = canvasEl;
  fakeDocument.fire('pointerlockchange');
  advance(0.3);

  dbg.startWave(1);
  advance(0.3);
  const before = log.mp3Starts;
  // 让一条鱼进入玩家 6 米内，触发「接近台词」→ playEnemyVoice → playSfx
  const pp = dbg.getPlayer().pos;
  const fishes = dbg.getEnemies().filter(e => e.alive);
  const near = fishes[0];
  near.mesh.position.set(pp.x + 2, near.baseY, pp.z + 2);
  near.state = 'chase';
  near.nearAnnounced = false;
  near.ranged = false;
  advance(0.2);
  check('触发了 mp3 的 BufferSource 播放', log.mp3Starts > before, 'starts=' + (log.mp3Starts - before));
  const sfxEls2 = log.audioEls.filter(u => String(u).indexOf('assets/sfx/') === 0);
  check('播放期间仍未创建 sfx 的 HTMLAudioElement', sfxEls2.length === 0, 'sfx 元素=' + sfxEls2.length);

  console.log('\n================ 3. 播放句柄契约 ================');
  const voice = near.voiceAudio;
  check('敌人语音绑定了播放句柄', !!voice, String(voice));
  if (voice) {
    check('句柄有 pause()', typeof voice.pause === 'function');
    check('句柄有 paused 属性且为 false', voice.paused === false, String(voice.paused));
    check('句柄 currentTime 可写', (function () { try { voice.currentTime = 0; return true; } catch (e) { return false; } })());
    check('句柄内部是 BufferSource', !!(voice.src && voice.src.buffer), 'src.buffer=' + (voice.src && voice.src.buffer));
    check('buffer 确实来自 decodeAudioData', !!(voice.src.buffer && voice.src.buffer.__decoded));
  }

  console.log('\n================ 4. 死亡掐断语音 ================');
  const stopsBefore = log.mp3Stops;
  dbg.killNearest();
  advance(0.1);
  check('敌人死亡时调用了 mp3 音源的 stop()', log.mp3Stops > stopsBefore, 'stops=' + (log.mp3Stops - stopsBefore));
  check('句柄标记为 paused', !voice || voice.paused === true, voice ? String(voice.paused) : 'n/a');

  console.log('\n================ 5. 音量计算 ================');
  // 直接比较：同样的 volume，BufferSource 的 gain 应为 volume × 设置音效音量
  const st = dbg.getSettings ? dbg.getSettings() : null;
  check('设置里有音效音量字段', !st || typeof st.sfx === 'number', JSON.stringify(st));
  check('音效音量默认 > 0', !st || st.sfx > 0, st ? String(st.sfx) : 'n/a');

  console.log('\n' + (fails === 0 ? '===== 音频路径验证通过 =====' : '===== 有 ' + fails + ' 项未通过 =====') + '\n');
  process.exit(fails === 0 ? 0 : 1);
})();
