/* =========================================================================
 * 3D 射击 · 蓝色肥鱼大作战
 * 单文件游戏逻辑（Three.js r159，UMD 本地化，classic script）
 * 依赖：lib/three.min.js（window.THREE）、assets/fish-texture.js（window.FISH_TEXTURE_DATA）
 * ========================================================================= */
(function () {
'use strict';

// ---------------------------------------------------------------- 配置
var CFG = {
  walkSpeed: 6.0,          // 玩家移动速度 m/s
  jumpSpeed: 9.2,          // 跳跃初速（可跳上 1.65 米的双叠箱）
  gravity: -21,            // 重力
  eyeHeight: 1.7,          // 眼睛高度
  playerRadius: 0.45,      // 玩家碰撞半径
  shootInterval: 0.16,     // 射击间隔（射速）
  shootRange: 200,         // 最大射程
  fishCount: 6,            // 场上肥鱼数量（>=3）
  fishSize: 2.0,           // 肥鱼贴图平面宽度（米）
  fishHitRadius: 0.85,     // 命中判定球半径
  fishBaseY: 1.4,          // 肥鱼悬浮基准高度
  fishPatrolSpeed: 2.2,    // 巡逻速度
  fishChaseSpeed: 4.4,     // 追击基础速度
  fishChaseBonus: 2.0,     // 随击杀数增加的速度上限
  fishSpeedMul: 1.5,       // 近战怪速度倍率（远程射手鱼 = 1.0 保持原速）
  fishRangedChance: 0.5,   // 敌人生成时成为远程射手鱼的概率
  rangedFireInterval: 0.5, // 射手鱼射击间隔（每秒 2 发）
  rangedDamageMin: 7,      // 射手子弹伤害随机下限
  rangedDamageMax: 12,     // 射手子弹伤害随机上限
  rangedBulletSpeed: 9,    // 射手子弹飞行速度（m/s）
  rangedAdvanceDistance: 1.0, // 射手鱼发现玩家后向前推进的距离（米），走完即站桩射击
  fishDetectRange: 18,     // 发现玩家距离
  fishLoseRange: 30,       // 丢失玩家距离
  fishAttackRange: 2.1,    // 攻击距离
  fishDamageMin: 15,       // 每次攻击伤害随机下限
  fishDamageMax: 25,       // 每次攻击伤害随机上限
  fishAttackInterval: 1.15,// 攻击间隔
  fishRespawnTime: 4.5,    // 死亡后重生时间
  graceTime: 3.0,          // 开局热身时间（秒），期间肥鱼不会主动发现玩家
  // 弹药
  magSize: 30,             // 弹夹容量
  startReserve: 180,       // 初始备用子弹（不含弹夹内）
  reloadTime: 1.5,         // 换弹耗时（秒）
  // 补给物品
  ammoPack: 15,            // 子弹补给量
  healthPack: 10,          // 血量补给量
  itemIntervalMin: 8,      // 物品生成间隔下限（秒）
  itemIntervalMax: 12,     // 物品生成间隔上限（秒）
  itemMax: 4,              // 场上物品数量上限
  itemAmmoChance: 0.6,     // 物品类型：弹药箱概率（其余为急救包）
  // Boss（超级蓝色大肥鱼）
  bossInterval: 30,        // Boss 生成判定间隔（秒）
  bossChance: 0.5,         // 每次判定的生成概率
  bossMissGuarantee: 3,    // 连续 N 次未刷出后保底必定刷出
  bossHp: 15,              // Boss 需要被命中的子弹数
  bossSizeMul: 3,          // Boss 体型倍率
  bossSpeedMul: 1.2,       // Boss 速度倍率
  bossBallSpeed: 7.0,      // 火箭筒炮弹飞行速度（m/s）
  bossBallTurn: 0.6,       // 炮弹弱跟踪转向速率（rad/s，玩家移动可轻微偏转轨迹）
  bossBallGroundFalloff: 0.9, // 落地/撞墙爆炸威力系数（降低 10%）
  bossShellDestroyHits: 3, // 玩家击毁炮弹所需命中的子弹数
  bossShellRadius: 2.0,    // 炮弹爆炸半径（落地爆 / 空爆）
  bossShootInterval: 2.2,  // Boss 射击间隔（秒）
  bossBallDamage: 25,      // 小球命中伤害
  bossShootInterval: 2.2,  // Boss 射击间隔（秒）
  bossScore: 50,           // 击败 Boss 得分
  bossAmmoReward: 60,      // 击败 Boss 奖励备用子弹
  // 手榴弹
  nadeStartCount: 1,       // 开局手雷数量
  nadeRadius: 4.0,         // 爆炸伤害半径（米）
  nadeDamageMin: 5,        // 爆炸伤害随机下限
  nadeDamageMax: 10,       // 爆炸伤害随机上限
  nadeDrop: -13,           // 手雷重力
  nadeBossBonusMax: 3,     // 击败 Boss 奖励手雷上限（1~N 个）
  // 连杀评级
  comboDecayTime: 2.0,     // 无击杀的衰减时长（秒）：每过 2 秒连杀降一级，D 级再降即消失
  comboRanks: ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'], // 评级从低到高（索引 0~6）
  comboRankPoints: [1, 2, 3, 4, 5, 6, 7], // 各评级所需累计连杀点数（普通鱼 +1 / Boss +5）
  comboFishPoints: 1,      // 击杀普通鱼/射手鱼的连杀点数
  comboBossPoints: 5,      // 击败 Boss 的连杀点数（更快提升评级）
  // ===== 局内强化（无尽模式专属：击杀 Boss 后 3 选 1，独立不继承） =====
  upgradeMaxLevel: 10,        // 每种奖励技能最高等级
  upgradeDmgPerLevel: 1,      // （1）子弹伤害：每级 +L 点
  upgradeRefundChance: 0.10,  // （2）击杀后 10% 概率恢复子弹
  upgradeRefundPerLevel: 2,   // （2）每级恢复量 +2 颗（L 级回 2L 颗）
  upgradeHealChanceBase: 0.05,// （3）击杀后 5% 概率恢复 10 生命（每级 +1%）
  upgradeHealChanceInc: 0.01,
  upgradeHealAmount: 10,
  upgradeNadeChanceBase: 0.01,// （4）击杀后 1% 概率获得手雷（每级 +1%）
  upgradeNadeChanceInc: 0.01,
  upgradeSpeedPerLevel: 0.05, // （5）速度每级 +5%（L 级 +5L%）
  // ===== 敌人成长（每击杀一次 Boss 后增强） =====
  enemyHpMax: 10,             // 小怪血量上限（初始 1，每 Boss +1）
  enemyAtkGrowAtHp: 10,       // 小怪血量达到 10 后，每 Boss 攻击力 +1
  meleeDmgMax: 50,            // 近战小怪攻击力上限（基础 15~25）
  rangedDmgMax: 30,           // 射手小怪子弹攻击力上限（基础 7~12）
  bossHpPerBoss: 5,           // 下个 Boss 血量 +5（上限 100）
  bossHpMax: 100,
  bossBallDmgPerBoss: 2,      // Boss 炮弹伤害 +2（上限 60）
  bossBallDmgMax: 60,
  fishCapGrowRate: 0.05,      // 小怪生成速率每 Boss +5%（场上数量上限）
  // ===== 护甲道具（防御） =====
  armorInterval: 10,          // 每 10 秒判定一次生成
  armorChance: 0.25,          // 25% 概率生成护甲道具
  armorPerPick: 2,            // 每层护甲防御力（每拾取一次护甲 = 1 层，每层减免 2 点伤害）
  armorMaxStacks: 15,         // 护甲层数上限（15 层 = 30 点减免，满层后不再生成）
  bgmVolume: 0.18,         // 背景音乐音量（小音量，避免盖过射击音效）
  bossMusicVolume: 0.12,   // Boss 战斗曲峰值音量（明显低于射击音效，不抢戏）
  bossMusicFadeIn: 1.2,    // Boss 战曲淡入时长（秒）：声音从小到大
  bossMusicFadeOut: 0.5,   // Boss 击杀后淡出时长（秒）：声音匀速降为 0
  menuMusicVolume: 0.18,   // 开始界面/选关界面音乐音量
  menuMusicFadeOut: 0.5,   // 进入游戏后菜单曲淡出时长（秒）
  pickupRadius: 1.4,       // 拾取距离（米）
  arena: 45,               // 活动区域半边长（沙漠城，约 90x90 米）
  spawnPoint: [0, 40],     // 玩家出生点（地图南侧）
  // Boss 固定出生点（四个空旷区域：A点广场 / B点广场 / 中央北空地 / 东南空地）
  bossSpawnPoints: [[-38, -30], [38, -30], [0, -22], [30, 30]],
  maxHp: 100,
};

// ---------------------------------------------------------------- 小工具
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

// ---------------------------------------------------------------- 全局状态
var scene, camera, renderer, clock;
var state = 'menu';            // menu | playing | paused | gameover
var time = 0;                  // 游戏累计时间（秒）
var score = 0, kills = 0;
var player = {
  pos: new THREE.Vector3(CFG.spawnPoint[0], 0, CFG.spawnPoint[1]),
  velY: 0, onGround: true,
  yaw: 0, pitch: 0,
  hp: CFG.maxHp,
};
var keys = Object.create(null);
var fireHeld = false;
var shootCd = 0, hurtCd = 0, stepTimer = 0;
var playingTime = 0;              // 本局游戏进行时长（秒）
var ammo = { mag: 0, reserve: 0, magSize: CFG.magSize, reloading: false, reloadTimer: 0 };
var items = [];                    // 补给物品 { mesh, type: 'ammo'|'health', phase }
var itemTimer = 0;
var boss = null;                   // Boss { mesh, hp, maxHp, baseY, phase, fireTimer, hurt }
var bossShots = [];                // Boss 黄色小球 { mesh, vel, life }
var bossTimer = CFG.bossInterval;
var bossMisses = 0;                // 连续未刷出计数（保底机制）
var firstBossPending = true;       // 首个 30 秒判定必定刷出
var grenades = [];                 // 飞行/待爆手雷 { mesh, pos, vel, landed, fuse }
var fishBullets = [];              // 射手鱼子弹 { mesh, vel, life }
var combo = { score: 0, rank: -1, timer: 0 };  // 连杀评级：score=连杀点数, rank=评级索引(-1 无), timer=衰减剩余秒
// ===== 局内强化与成长（无尽模式专属） =====
var upgrades = { dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0 }; // 技能等级 0~10（dmg=子弹伤害, refund=回弹, heal=回血, nade=掉雷, speed=速度）
var bossKillCount = 0;         // 本局已击杀 Boss 数（驱动敌人成长）
var rewardOptions = null;      // 当前奖励窗口可选项 [{id, name, ico, lv, desc, next}]
var rewardAllMax = false;      // 全部技能满级标记（再杀 Boss 即通关）
var enemyHpNow = 1;            // 当前小怪血量（随 Boss 击杀增长，≤10）
var meleeAtkBonus = 0;         // 近战小怪攻击加成（血量到 10 后增长）
var rangedAtkBonus = 0;        // 射手小怪子弹攻击加成
var bossHpNext = 15;           // 下一只 Boss 血量（15 起每 Boss +5）
var bossBallDmgNow = 25;       // Boss 炮弹伤害（25 起每 Boss +2）
var fishCapNow = 6;            // 小怪生成速率对应场上数量上限（6 起 ×1.05^Boss）
var armorStacks = 0;           // 护甲层数（每层减 2 所受伤，上限 15）
var armorTimer = CFG.armorInterval; // 护甲生成判定倒计时
// ===== 开发者模式 =====
var debugMode = false;           // 开发者模式开关（秘技 WWSSAADDBABA 切换）
var saveMaxHp = 100;             // 进入开发者模式前的生命上限备份
var debugHealTimer = 0;          // 每 5 秒回血计时
var debugLogs = [];              // Debug 消息 { el, born }
var DEBUG_SEQ = ['KeyW', 'KeyW', 'KeyS', 'KeyS', 'KeyA', 'KeyA', 'KeyD', 'KeyD', 'KeyB', 'KeyA', 'KeyB', 'KeyA'];
var debugKeyBuf = [];            // 秘技按键缓冲
var debugKeyFirst = 0;           // 秘技首键时间（真实时间）
var killSeq = ['KeyK', 'KeyI', 'KeyL', 'KeyL'];  // 开发者模式自毁秘技（4 秒内按完）
var killBuf = [];                // KILL 按键缓冲
var killFirst = 0;               // KILL 首键时间
var dbgFireCount = 0;              // 调试：射手发射计数
var nadeCount = CFG.nadeStartCount;
var noticeTimer = null;
var bgmEl = null;                  // 背景音乐 Audio 元素（游戏中循环）
var overEl = null;                 // 战败曲 Audio 元素（GAME OVER 界面循环播放）
var bossEl = null;                 // Boss 战斗曲 Audio 元素（Boss 出场时播放）
var bossMusicTempo = 0;            // 战斗曲状态：0=off, 1=淡入中, 2=正常播放, -1=淡出中
var bossMusicVol = 0;              // 战斗曲当前音量（淡入/淡出平滑控制）
var progressEl = null;             // "进步的小曲" Audio 元素（奖励窗口 / 技能查看界面）
var progressMusicOn = false;       // 进步的小曲播放标记（true=播放, false=完全关闭）
var menuEl = null;                 // "来去曼波" Audio 元素（开始界面/选关界面）
var menuMusicVol = 0;              // 菜单曲当前音量（进入游戏时 0.5s 淡出）
var menuMusicOn = false;           // 菜单曲播放标记
var lockMode = 'locked';          // 'locked' | 'fallback'（浏览器不支持指针锁定时自动降级）
var pendingLockTimer = null;
var hintTimer = null;
var fbLastX = 0, fbLastY = 0, fbHasLast = false;
var fishTex = null, fishTexReady = false, fishSpawned = false;
var enemies = [];              // 肥鱼列表
var obstacles = [];            // 碰撞体 {mesh, min, max}（含墙）
var wallMeshes = [];           // 子弹遮挡检测用 mesh 列表
var particles = null;          // 粒子系统 {parts, posAttr, colAttr, cursor}
var gun = { group: null, recoil: 0, flashT: 0, light: null, flashMesh: null };
var crosshairTimer = null;
var dom = Object.create(null);

// ---------------------------------------------------------------- 音效（WebAudio 程序合成，无音频文件）
var Sfx = (function () {
  var ctx = null, master = null, noiseBuf = null;
  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      var len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  }
  function tone(type, f0, f1, dur, vol) {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseHit(dur, filterType, f0, f1, vol) {
    if (!ensure()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  return {
    init: ensure,
    shoot:    function () { noiseHit(0.13, 'bandpass', 900, 220, 0.5); tone('sine', 160, 55, 0.11, 0.35); },
    hitFish:  function () { noiseHit(0.07, 'highpass', 1800, 1200, 0.32); tone('sine', 950, 420, 0.08, 0.2); },
    fishDie:  function () { tone('sine', 520, 140, 0.28, 0.45); noiseHit(0.22, 'lowpass', 700, 300, 0.3); },
    hurt:     function () { tone('triangle', 170, 90, 0.22, 0.45); noiseHit(0.12, 'lowpass', 400, 200, 0.25); },
    jump:     function () { tone('sine', 280, 560, 0.14, 0.16); },
    step:     function () { noiseHit(0.05, 'lowpass', 500, 300, 0.07); },
    gameover: function () { tone('sawtooth', 400, 70, 0.9, 0.3); },
    reloadStart: function () {
      noiseHit(0.05, 'highpass', 2600, 2000, 0.22);
      setTimeout(function () { noiseHit(0.05, 'highpass', 3300, 2500, 0.25); }, 130);
    },
    reloadDone: function () { noiseHit(0.06, 'bandpass', 1400, 800, 0.3); tone('square', 700, 350, 0.07, 0.12); },
    empty: function () { tone('square', 190, 120, 0.14, 0.2); },
    pickupAmmo: function () { tone('sine', 680, 1300, 0.13, 0.22); setTimeout(function () { tone('sine', 1040, 1500, 0.1, 0.18); }, 90); },
    bossAlarm: function () {
      tone('sawtooth', 90, 45, 0.7, 0.4);
      setTimeout(function () { tone('sawtooth', 90, 45, 0.7, 0.4); }, 750);
    },
    bossHit: function () { tone('sine', 260, 90, 0.16, 0.4); noiseHit(0.08, 'lowpass', 500, 200, 0.3); },
    bossShoot: function () { tone('triangle', 380, 240, 0.12, 0.2); },
    throwNade: function () { noiseHit(0.12, 'highpass', 800, 2400, 0.15); },
    nadeLand: function () { tone('square', 300, 180, 0.06, 0.12); },
    fishShoot: function () { noiseHit(0.07, 'highpass', 1800, 900, 0.22); tone('square', 520, 220, 0.06, 0.12); },
    shellPing: function () { tone('square', 1250, 700, 0.05, 0.18); noiseHit(0.05, 'highpass', 3000, 2000, 0.15); },
    nadeBoom: function () {
      noiseHit(0.45, 'lowpass', 600, 80, 0.55);
      tone('sine', 110, 35, 0.5, 0.5);
      setTimeout(function () { tone('sine', 60, 30, 0.3, 0.3); }, 120);
    },
    bossDie: function () {
      tone('sawtooth', 200, 40, 1.0, 0.5);
      noiseHit(0.5, 'lowpass', 800, 150, 0.4);
      setTimeout(function () { tone('sine', 500, 900, 0.3, 0.3); }, 500);
    },
    pickupHealth: function () {
      tone('sine', 500, 760, 0.1, 0.2);
      setTimeout(function () { tone('sine', 760, 1080, 0.1, 0.2); }, 100);
      setTimeout(function () { tone('sine', 1080, 1400, 0.1, 0.2); }, 200);
    },
  };
})();

// ---------------------------------------------------------------- 背景音乐（游戏中循环 / 战败曲，低音量）
function initBgm() {
  try {
    if (typeof Audio === 'undefined') return;
    bgmEl = new Audio();
    bgmEl.src = 'assets/bgm.mp3';
    bgmEl.loop = true;
    bgmEl.volume = CFG.bgmVolume;
    bgmEl.preload = 'auto';
    overEl = new Audio();
    overEl.src = 'assets/gameover.mp3';
    overEl.loop = true;
    overEl.volume = 0.22;
    overEl.preload = 'auto';
    bossEl = new Audio();
    bossEl.src = 'assets/boss.mp3';
    bossEl.loop = true;
    bossEl.volume = 0;
    bossEl.preload = 'auto';
    progressEl = new Audio();
    progressEl.src = 'assets/progress.mp3';
    progressEl.loop = true;
    progressEl.volume = 0.16;
    progressEl.preload = 'auto';
    menuEl = new Audio();
    menuEl.src = 'assets/menu.mp3';
    menuEl.loop = true;
    menuEl.volume = CFG.menuMusicVolume;
    menuEl.preload = 'auto';
  } catch (e) { bgmEl = null; overEl = null; bossEl = null; progressEl = null; menuEl = null; }
}

function safePlay(el) {
  if (!el) return;
  try {
    var pr = el.play();
    if (pr && pr.catch) pr.catch(function () {});
  } catch (e) {}
}

// 每帧同步音乐：主 BGM / Boss 战斗曲 / 战败曲 三态切换
// Boss 战曲：生成后淡入（从小到大声）；Boss 死亡后 0.5s 匀速淡出，随后主 BGM 从暂停进度续播
function updateBgm(dt) {
  try {
    // ---- 战斗曲音量包络 ----
    if (bossMusicTempo === 1) {                     // 淡入
      bossMusicVol = Math.min(CFG.bossMusicVolume, bossMusicVol + (CFG.bossMusicVolume / CFG.bossMusicFadeIn) * dt);
      if (bossMusicVol >= CFG.bossMusicVolume) bossMusicTempo = 2;
    } else if (bossMusicTempo === -1) {             // 淡出（匀速 0.5s → 0）
      bossMusicVol = Math.max(0, bossMusicVol - (CFG.bossMusicVolume / CFG.bossMusicFadeOut) * dt);
      if (bossMusicVol <= 0) {
        bossMusicTempo = 0;
        if (bossEl) {
          bossEl.pause();
          bossEl.currentTime = 0;                   // 完全关闭：进度归零，下次 Boss 生成从头播放（非暂停续播）
        }
      }
    }
    if (bossEl) bossEl.volume = bossMusicVol;
    var bossActive = bossMusicTempo !== 0;          // 淡入/播放/淡出期间战斗曲接管

    // ---- 菜单曲：开始/选关界面播放；进入游戏后 0.5 秒匀速淡出 ----
    if (state === 'menu' || state === 'levelSelect') {
      menuMusicOn = true;
      menuMusicVol = CFG.menuMusicVolume;
      if (menuEl) {
        menuEl.volume = CFG.menuMusicVolume;
        if (menuEl.paused) safePlay(menuEl);
      }
      if (bgmEl && !bgmEl.paused) bgmEl.pause();
      if (bossEl && !bossEl.paused) bossEl.pause();
      if (progressEl && !progressEl.paused) progressEl.pause();
      if (overEl && !overEl.paused) overEl.pause();
    } else if (state === 'playing' || state === 'reward' || state === 'skills') {
      // 从菜单进入游戏：来去曼波淡出收尾（音量包络独立于音频元素，元素存在时同步音量与停止）
      if (menuMusicOn) {
        menuMusicVol = Math.max(0, menuMusicVol - (CFG.menuMusicVolume / CFG.menuMusicFadeOut) * dt);
        if (menuEl) menuEl.volume = menuMusicVol;
        if (menuMusicVol <= 0.001) {
          menuMusicVol = 0;
          menuMusicOn = false;
          if (menuEl) { menuEl.pause(); menuEl.currentTime = 0; }
        }
      }
      // Boss 战：主 BGM 暂停（进度保留），战斗曲播放
      if (bossActive) {
        if (bgmEl && !bgmEl.paused) bgmEl.pause();
        if (bossEl && bossEl.paused) safePlay(bossEl);
        if (progressEl && !progressEl.paused) progressEl.pause();
      } else if (state === 'reward' || state === 'skills') {
        // 奖励窗口 / 技能查看界面：主 BGM 暂停，播放"进步的小曲"
        if (bgmEl && !bgmEl.paused) bgmEl.pause();
        if (progressEl) {
          if (progressMusicOn && progressEl.paused) safePlay(progressEl);
          else if (!progressMusicOn && !progressEl.paused) progressEl.pause();
        }
        if (bossEl && !bossEl.paused) bossEl.pause();
      } else {
        if (bgmEl && bgmEl.paused) safePlay(bgmEl);
        if (bossEl && !bossEl.paused) bossEl.pause();
        if (progressEl && !progressEl.paused) progressEl.pause();
      }
      if (overEl && !overEl.paused) overEl.pause();
    } else if (state === 'gameover') {
      if (bgmEl && !bgmEl.paused) bgmEl.pause();      // 战败：默认 BGM 停止
      if (bossEl && !bossEl.paused) bossEl.pause();   // 战斗曲停止
      if (progressEl && !progressEl.paused) progressEl.pause();
      if (menuEl && !menuEl.paused) menuEl.pause();
      if (overEl && overEl.paused) safePlay(overEl);  // 战败页循环播放"燃尽的小曲"
    } else {
      if (bgmEl && !bgmEl.paused) bgmEl.pause();
      if (bossEl && !bossEl.paused) bossEl.pause();
      if (progressEl && !progressEl.paused) progressEl.pause();
      if (overEl && !overEl.paused) overEl.pause();
      if (menuEl && !menuEl.paused) menuEl.pause();
    }
  } catch (e) {}
}

// ---------------------------------------------------------------- 程序化贴图（canvas 生成）
function makeCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function toTex(c, repeatX, repeatY) {
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); }
  return t;
}
function makeGrassTexture() {
  var c = makeCanvas(256, 256);
  var x = c.getContext('2d');
  x.fillStyle = '#4d8a3b'; x.fillRect(0, 0, 256, 256);
  for (var i = 0; i < 2600; i++) {
    var g = Math.random();
    var col = g < 0.5 ? 'rgba(60,115,45,' + rand(0.25, 0.6) + ')'
            : g < 0.85 ? 'rgba(90,150,62,' + rand(0.2, 0.5) + ')'
            : 'rgba(160,190,80,' + rand(0.15, 0.35) + ')';
    x.fillStyle = col;
    x.fillRect(rand(0, 256), rand(0, 256), rand(1, 2.6), rand(1, 2.6));
  }
  return c;
}
function makeWoodTexture() {
  var c = makeCanvas(256, 256);
  var x = c.getContext('2d');
  x.fillStyle = '#8a5a2e'; x.fillRect(0, 0, 256, 256);
  for (var i = 0; i < 14; i++) {
    x.fillStyle = 'rgba(60,35,15,' + rand(0.08, 0.2) + ')';
    x.fillRect(0, i * 19 + rand(0, 8), 256, rand(2, 5));
  }
  x.strokeStyle = '#5a3a1c'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 246);
  x.fillStyle = '#3c2a16';
  [[14, 14], [242, 14], [14, 242], [242, 242], [128, 128]].forEach(function (p) {
    x.beginPath(); x.arc(p[0], p[1], 4, 0, 6.283); x.fill();
  });
  return c;
}
function makeSkyTexture() {
  var c = makeCanvas(4, 512);
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#2a63c8');
  g.addColorStop(0.45, '#6ea9e8');
  g.addColorStop(0.78, '#cfe6f5');
  g.addColorStop(1.0, '#dceef2');
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return c;
}
function makeCloudTexture() {
  var c = makeCanvas(128, 64);
  var x = c.getContext('2d');
  var g = x.createRadialGradient(32, 36, 4, 32, 36, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  [[32, 34, 28], [64, 26, 26], [48, 40, 24], [82, 38, 18]].forEach(function (p) {
    x.beginPath(); x.arc(p[0], p[1], p[2], 0, 6.283); x.fill();
  });
  return c;
}
// 兜底：万一 base64 贴图加载失败，画一条卡通肥鱼
function makeFallbackFishTexture() {
  var c = makeCanvas(256, 256);
  var x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  x.fillStyle = '#2f7fd6';
  x.beginPath(); x.ellipse(128, 118, 78, 58, -0.12, 0, 6.283); x.fill();
  x.fillStyle = '#3f96ec';
  x.beginPath(); x.ellipse(112, 104, 46, 34, -0.12, 0, 6.283); x.fill();
  // 尾巴
  x.fillStyle = '#2568bd';
  x.beginPath(); x.moveTo(196, 118); x.lineTo(244, 92); x.lineTo(244, 144); x.closePath(); x.fill();
  // 背鳍
  x.beginPath(); x.moveTo(92, 62); x.lineTo(118, 34); x.lineTo(142, 62); x.closePath(); x.fill();
  // 眼睛
  x.fillStyle = '#fff'; x.beginPath(); x.arc(84, 100, 13, 0, 6.283); x.fill();
  x.fillStyle = '#123'; x.beginPath(); x.arc(80, 100, 6, 0, 6.283); x.fill();
  // 嘴
  x.strokeStyle = '#1c4d86'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(50, 122); x.quadraticCurveTo(58, 138, 74, 128); x.stroke();
  return c;
}
// 处理肥鱼贴图：若无透明通道则按四角颜色做色键抠图
function processFishImage(img) {
  try {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width || 1080;
    c.height = img.naturalHeight || img.height || 1080;
    var x = c.getContext('2d');
    if (!x) return null;
    x.drawImage(img, 0, 0);
    var idata = x.getImageData(0, 0, c.width, c.height);
    var d = idata.data;
    var w = c.width;
    function px(xx, yy) { return (yy * w + xx) * 4; }
    var corners = [px(0, 0), px(w - 1, 0), px(0, c.height - 1), px(w - 1, c.height - 1)];
    var allOpaque = corners.every(function (i) { return d[i + 3] === 255; });
    if (allOpaque) {
      var br = 0, bg = 0, bb = 0;
      corners.forEach(function (i) { br += d[i]; bg += d[i + 1]; bb += d[i + 2]; });
      br /= 4; bg /= 4; bb /= 4;
      var tol = 46, tol2 = tol * tol * 3;
      var feather = tol * 2.2, feather2 = feather * feather * 3;
      for (var i = 0; i < d.length; i += 4) {
        var dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
        var dist2 = dr * dr + dg * dg + db * db;
        if (dist2 <= tol2) d[i + 3] = 0;
        else if (dist2 < feather2) d[i + 3] = Math.round(d[i + 3] * (dist2 - tol2) / (feather2 - tol2));
      }
      x.putImageData(idata, 0, 0);
    }
    return c;
  } catch (e) { return null; }
}
function loadFishTexture() {
  if (fishTexReady) return;
  if (!window.FISH_TEXTURE_DATA) {
    fishTex = new THREE.CanvasTexture(makeFallbackFishTexture());
    fishTex.colorSpace = THREE.SRGBColorSpace;
    fishTexReady = true;
    ensureFishSpawned();
    return;
  }
  var img = new Image();
  img.onload = function () {
    var canvas = processFishImage(img) || makeFallbackFishTexture();
    fishTex = new THREE.CanvasTexture(canvas);
    fishTex.colorSpace = THREE.SRGBColorSpace;
    fishTexReady = true;
    ensureFishSpawned();
  };
  img.onerror = function () {
    fishTex = new THREE.CanvasTexture(makeFallbackFishTexture());
    fishTex.colorSpace = THREE.SRGBColorSpace;
    fishTexReady = true;
    ensureFishSpawned();
  };
  img.src = window.FISH_TEXTURE_DATA || '';
}

// ---------------------------------------------------------------- 场景搭建（沙漠城）
function makeSandTexture() {
  var c = makeCanvas(256, 256);
  var x = c.getContext('2d');
  x.fillStyle = '#d9b97c'; x.fillRect(0, 0, 256, 256);
  for (var i = 0; i < 2600; i++) {
    var sh = Math.random();
    x.fillStyle = sh < 0.45 ? 'rgba(190,155,95,' + rand(0.2, 0.5) + ')'
                : sh < 0.8 ? 'rgba(238,214,156,' + rand(0.2, 0.45) + ')'
                : 'rgba(160,130,80,' + rand(0.15, 0.35) + ')';
    x.fillRect(rand(0, 256), rand(0, 256), rand(1, 3), rand(1, 2.4));
  }
  for (var j = 0; j < 26; j++) {
    x.fillStyle = 'rgba(120,100,70,' + rand(0.2, 0.4) + ')';
    x.beginPath(); x.arc(rand(0, 256), rand(0, 256), rand(1, 2.6), 0, 6.283); x.fill();
  }
  return c;
}
function makeBrickTexture() {
  var c = makeCanvas(256, 256);
  var x = c.getContext('2d');
  x.fillStyle = '#c8a563'; x.fillRect(0, 0, 256, 256);
  for (var by = 0; by < 8; by++) {
    for (var bx = 0; bx < 4; bx++) {
      var off = (by % 2) * 32;
      x.fillStyle = 'rgba(' + Math.round(200 + rand(-14, 14)) + ',' + Math.round(165 + rand(-12, 12)) + ',' + Math.round(99 + rand(-10, 10)) + ',0.55)';
      x.fillRect(bx * 64 + off - 32, by * 32, 64, 32);
    }
  }
  x.strokeStyle = 'rgba(120,92,54,0.85)'; x.lineWidth = 2;
  for (var yy = 0; yy <= 8; yy++) { x.beginPath(); x.moveTo(0, yy * 32); x.lineTo(256, yy * 32); x.stroke(); }
  for (var yy2 = 0; yy2 < 8; yy2++) {
    var off2 = (yy2 % 2) * 32;
    for (var xx = 0; xx <= 5; xx++) {
      var px = xx * 64 + off2 - 32;
      x.beginPath(); x.moveTo(px, yy2 * 32); x.lineTo(px, yy2 * 32 + 32); x.stroke();
    }
  }
  for (var k = 0; k < 400; k++) {
    x.fillStyle = 'rgba(210,180,120,' + rand(0.05, 0.2) + ')';
    x.fillRect(rand(0, 256), rand(0, 256), rand(1, 3), rand(1, 3));
  }
  return c;
}

var _wallMat = null;
function addWallBox(cx, cz, sx, sz, h, noCollide) {
  if (!_wallMat) _wallMat = new THREE.MeshStandardMaterial({ map: toTex(makeBrickTexture()), roughness: 0.9 });
  var m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), _wallMat);
  m.position.set(cx, h / 2, cz);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (!noCollide) {
    obstacles.push({ mesh: m, min: new THREE.Vector3(cx - sx / 2, 0, cz - sz / 2), max: new THREE.Vector3(cx + sx / 2, h, cz + sz / 2) });
    wallMeshes.push(m);
  }
  return m;
}
// 分段墙：沿 X 方向的墙，gaps = 开口区间 [[g0,g1],...]
function hWall(z, x0, x1, h, gaps) {
  var cur = Math.min(x0, x1), end = Math.max(x0, x1);
  var gl = (gaps || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  gl.forEach(function (gp) {
    if (gp[0] > cur) addWallBox((cur + gp[0]) / 2, z, gp[0] - cur, 1, h);
    cur = Math.max(cur, gp[1]);
  });
  if (cur < end) addWallBox((cur + end) / 2, z, end - cur, 1, h);
}
// 沿 Z 方向的墙，gaps 同上
function vWall(x, z0, z1, h, gaps) {
  var cur = Math.min(z0, z1), end = Math.max(z0, z1);
  var gl = (gaps || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  gl.forEach(function (gp) {
    if (gp[0] > cur) addWallBox(x, (cur + gp[0]) / 2, 1, gp[0] - cur, h);
    cur = Math.max(cur, gp[1]);
  });
  if (cur < end) addWallBox(x, (cur + end) / 2, 1, end - cur, h);
}

function buildEnvironment() {
  scene.background = toTex(makeSkyTexture());
  scene.fog = new THREE.Fog(0xd8c9a8, 45, 165);

  var hemi = new THREE.HemisphereLight(0xfff2dc, 0x8a7a55, 0.9);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff0d0, 1.7);
  sun.position.set(40, 55, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 4; sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // 沙地
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshStandardMaterial({ map: toTex(makeSandTexture(), 30, 30), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ===== 四面边界城墙 =====
  addWallBox(0, -45.7, 92, 0.8, 5);
  addWallBox(0, 45.7, 92, 0.8, 5);
  addWallBox(-45.7, 0, 0.8, 92, 5);
  addWallBox(45.7, 0, 0.8, 92, 5);

  // ===== 中央建筑（四面墙 + 四门洞）=====
  hWall(-8.5, -11, 11, 3.4, [[-1.75, 1.75]]);
  hWall(8.5, -11, 11, 3.4, [[-1.75, 1.75]]);
  vWall(-10.5, -9, 9, 3.4, [[-1.75, 1.75]]);
  vWall(10.5, -9, 9, 3.4, [[-1.75, 1.75]]);

  // ===== 西走廊（A 长通道，x -22~-12, z -16~12）=====
  vWall(-22, -16, 12, 3.0);
  vWall(-12, -16, 12, 3.0);

  // ===== A 点围场（x -44~-33, z -42~-18）=====
  hWall(-42, -44, -33, 3.2);
  vWall(-44, -42, -18, 3.2);
  hWall(-18, -44, -33, 3.2, [[-35, -30]]);

  // ===== B 点围场（x 33~44, z -42~-18）=====
  hWall(-42, 33, 44, 3.2);
  vWall(44, -42, -18, 3.2);
  hWall(-18, 33, 44, 3.2, [[35, 40]]);

  // ===== 东走廊（B 洞，x 12~22, z -16~12）+ 顶棚与支柱 =====
  vWall(12, -16, 12, 3.0);
  vWall(22, -16, 12, 3.0);
  var roofM = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.4, 10), _wallMat);
  roofM.position.set(17, 3.6, -11);
  roofM.castShadow = true; roofM.receiveShadow = true;
  scene.add(roofM);
  obstacles.push({ mesh: roofM, min: new THREE.Vector3(11.8, 3.4, -16), max: new THREE.Vector3(22.2, 3.8, -6) });
  wallMeshes.push(roofM);
  [[12.6, -14.8], [21.4, -14.8], [12.6, -7.2], [21.4, -7.2]].forEach(function (pp) {
    addWallBox(pp[0], pp[1], 0.6, 0.6, 3.4);
  });

  // ===== 南墙（玩家出生区分界，中央留 68m 大开口）+ 西南/东南延伸 =====
  hWall(20, -44, -34, 3.2);
  hWall(20, 34, 44, 3.2);
  vWall(-34, 20, 28, 3.0);
  vWall(34, 20, 28, 3.0);

  // ===== 木箱（沿用木箱纹理）=====
  var crateMat = new THREE.MeshStandardMaterial({ map: toTex(makeWoodTexture()), roughness: 0.85 });
  function crate(cx, cz, stack) {
    var h = stack ? 1.65 : 0.95;
    var b = new THREE.Mesh(new THREE.BoxGeometry(1.9, h, 1.9), crateMat);
    b.position.set(cx, h / 2, cz);
    b.castShadow = true; b.receiveShadow = true;
    scene.add(b);
    obstacles.push({ mesh: b, min: new THREE.Vector3(cx - 1.0, 0, cz - 1.0), max: new THREE.Vector3(cx + 1.0, h, cz + 1.0) });
    wallMeshes.push(b);
    return b;
  }
  crate(-38.5, -21, true);  crate(-40, -36, false); crate(-35, -38, true);   // A 点
  crate(38.5, -21, true);   crate(40, -36, false); crate(35, -38, true);     // B 点
  crate(-17, -6, true);                                                       // 西走廊
  crate(5, 3, false);       crate(-5, -4, true);                              // 中央建筑
  crate(-12, 30, true);     crate(18, 34, false); crate(-25, 33, true);       // 南广场
  crate(27, 38, false);                                                        // 东南角

  // ===== 石头 =====
  var rockMat = new THREE.MeshStandardMaterial({ color: 0xa89478, roughness: 0.95 });
  [[-30, 12, 1.0], [28, 14, 0.9], [-8, -28, 1.1], [-38, 26, 0.85], [0, -16, 0.7]].forEach(function (pp) {
    var r = new THREE.Mesh(new THREE.DodecahedronGeometry(pp[2], 0), rockMat);
    r.position.set(pp[0], pp[2] * 0.5, pp[1]);
    r.scale.y = 0.55;
    r.castShadow = true; r.receiveShadow = true;
    scene.add(r);
    var rad = pp[2] + 0.5;
    obstacles.push({ mesh: r, min: new THREE.Vector3(pp[0] - rad, 0, pp[1] - rad), max: new THREE.Vector3(pp[0] + rad, pp[2] * 1.05, pp[1] + rad) });
    wallMeshes.push(r);
  });

  // ===== 干树（沙漠枯树 + 绿洲树）=====
  function tree(cx, cz, dry) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: dry ? 0x6d5a42 : 0x6d4c33, roughness: 0.95 }));
    trunk.position.y = 1.1; trunk.castShadow = true;
    var c1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: dry ? 0x9a8a50 : 0x2f7d38, roughness: 0.9 }));
    c1.position.y = 2.6; c1.castShadow = true;
    var c2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8),
      new THREE.MeshStandardMaterial({ color: dry ? 0x8a7a46 : 0x3a8f3f, roughness: 0.9 }));
    c2.position.set(0.4, 3.4, 0.2); c2.castShadow = true;
    g.add(trunk, c1, c2);
    g.position.set(cx, 0, cz);
    scene.add(g);
    obstacles.push({ mesh: trunk, min: new THREE.Vector3(cx - 1.3, 0, cz - 1.3), max: new THREE.Vector3(cx + 1.3, 4.2, cz + 1.3) });
    wallMeshes.push(trunk, c1, c2);
  }
  tree(-42, 22, true);   tree(-24, 37, true);  tree(42, 24, true);  tree(-30, -6, true);
  tree(8, -29, true);    tree(-24, 26, false); tree(-32, 31, false);

  // ===== 绿洲水池（西南）=====
  var poolX = -28, poolZ = 28, poolR = 4;
  var poolWater = new THREE.Mesh(
    new THREE.CircleGeometry(poolR, 36),
    new THREE.MeshStandardMaterial({ color: 0x39a28f, roughness: 0.15, metalness: 0.1 })
  );
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.position.set(poolX, 0.04, poolZ);
  poolWater.receiveShadow = true;
  scene.add(poolWater);
  var poolRim = new THREE.Mesh(
    new THREE.TorusGeometry(poolR + 0.3, 0.26, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.9 })
  );
  poolRim.rotation.x = -Math.PI / 2;
  poolRim.position.set(poolX, 0.16, poolZ);
  poolRim.castShadow = true; poolRim.receiveShadow = true;
  scene.add(poolRim);
  obstacles.push({ mesh: poolRim, min: new THREE.Vector3(poolX - poolR - 0.4, 0, poolZ - poolR - 0.4), max: new THREE.Vector3(poolX + poolR + 0.4, 0.5, poolZ + poolR + 0.4) });
  wallMeshes.push(poolWater, poolRim);

  // ===== 油桶 =====
  var barrelMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.7, metalness: 0.3 });
  [[-16, 22], [20, 24], [-6, -14]].forEach(function (bp) {
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 12), barrelMat);
    bar.position.set(bp[0], 0.48, bp[1]);
    bar.castShadow = true; bar.receiveShadow = true;
    scene.add(bar);
    obstacles.push({ mesh: bar, min: new THREE.Vector3(bp[0] - 0.5, 0, bp[1] - 0.5), max: new THREE.Vector3(bp[0] + 0.5, 1, bp[1] + 0.5) });
    wallMeshes.push(bar);
  });

  // ===== 干草丛（纯装饰）=====
  var grassMat1 = new THREE.MeshStandardMaterial({ color: 0xb9a05f, roughness: 1 });
  var grassMat2 = new THREE.MeshStandardMaterial({ color: 0xc9ae6e, roughness: 1 });
  for (var i = 0; i < 42; i++) {
    var gx = rand(-43, 43), gz = rand(-43, 43);
    if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue;
    if ((gx - poolX) * (gx - poolX) + (gz - poolZ) * (gz - poolZ) < 30) continue;
    if (pointInObstacle(gx, gz, 0.8)) continue;
    var grass = new THREE.Mesh(new THREE.ConeGeometry(rand(0.16, 0.3), rand(0.5, 1.0), 5), i % 2 ? grassMat1 : grassMat2);
    grass.position.set(gx, rand(0.25, 0.5), gz);
    grass.rotation.y = rand(0, 6.28);
    scene.add(grass);
  }

  // ===== 云朵 =====
  var cloudTex = new THREE.CanvasTexture(makeCloudTexture());
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  for (var k = 0; k < 5; k++) {
    var cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false }));
    cloud.position.set(rand(-80, 80), rand(30, 48), rand(-80, 80));
    cloud.scale.set(rand(26, 42), rand(10, 16), 1);
    scene.add(cloud);
  }
}

// ---------------------------------------------------------------- 小地图（左下角圆形、随视角旋转）
var minimap = { off: null, ready: false };

function buildMiniMap() {
  var pxPerM = 8, HALF = 384;
  var off = document.createElement('canvas');
  off.width = HALF * 2; off.height = HALF * 2;
  var x = off.getContext('2d');
  if (!x) return;
  x.fillStyle = '#8a744f'; x.fillRect(0, 0, HALF * 2, HALF * 2);
  // 绿洲水池
  x.fillStyle = '#3f9ad6';
  x.beginPath(); x.arc((-28 + 48) * pxPerM, (28 + 48) * pxPerM, 4 * pxPerM, 0, 6.283); x.fill();
  // 静态建筑/障碍
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    var x0 = (o.min.x + 48) * pxPerM, z0 = (o.min.z + 48) * pxPerM;
    var w = (o.max.x - o.min.x) * pxPerM, h = (o.max.z - o.min.z) * pxPerM;
    var col = '#b89a68';
    if (o.min.y > 2) col = 'rgba(96,104,122,0.95)';
    else if (o.mesh && o.mesh.geometry && o.mesh.geometry.type === 'DodecahedronGeometry') col = '#9a8a70';
    else if (o.mesh && o.mesh.geometry && o.mesh.geometry.type === 'CylinderGeometry') col = '#7a6a48';
    x.fillStyle = col;
    x.fillRect(x0, z0, w, h);
  }
  minimap.off = off;
  minimap.ready = true;
}

function drawMiniMap() {
  if (!minimap.ready) return;
  var cv = dom.minimapCanvas;
  var x = cv && cv.getContext && cv.getContext('2d');
  if (!x) return;
  var W = 210, C = 105, R = 101;
  var scale = R / 48;
  var yaw = player.yaw, cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  var px = player.pos.x, pz = player.pos.z;
  x.clearRect(0, 0, W, W);
  x.fillStyle = 'rgba(14,20,30,0.82)';
  x.fillRect(0, 0, W, W);
  x.save();
  x.beginPath(); x.arc(C, C, R, 0, 6.283); x.clip();
  // 旋转的静态底图（小地图随玩家视角转动）
  x.save();
  x.translate(C, C);
  x.rotate(yaw);
  x.scale(scale / 8, scale / 8);
  x.translate(-(px + 48) * 8, -(pz + 48) * 8);
  x.drawImage(minimap.off, 0, 0);
  x.restore();
  function toScreen(wx, wz) {
    var dx = wx - px, dz = wz - pz;
    return [C + (dx * cosY - dz * sinY) * scale, C + (dx * sinY + dz * cosY) * scale];
  }
  // 普通敌人：红色小圆点
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    var sp = toScreen(e.mesh.position.x, e.mesh.position.z);
    x.beginPath(); x.arc(sp[0], sp[1], 3.2, 0, 6.283);
    x.fillStyle = '#ff3b3b'; x.fill();
  }
  // Boss：橙色描边的红色大圆点
  if (boss) {
    var bp = toScreen(boss.mesh.position.x, boss.mesh.position.z);
    x.beginPath(); x.arc(bp[0], bp[1], 5.6, 0, 6.283);
    x.fillStyle = '#ff3030'; x.fill();
    x.strokeStyle = '#ff8a00'; x.lineWidth = 2; x.stroke();
  }
  // 补给物品（弹药=黄方块、血=红十字、护甲=青色圆帽+淡蓝描边）
  for (var it = 0; it < items.length; it++) {
    var itm = items[it];
    var ip = toScreen(itm.mesh.position.x, itm.mesh.position.z);
    var s = 3.4;
    if (itm.type === 'armor') {
      x.beginPath(); x.arc(ip[0], ip[1], s + 1.2, 0, 6.283);   // 圆帽顶
      x.fillStyle = '#5fc8ff';
      x.fill();
      x.beginPath(); x.arc(ip[0], ip[1], s + 1.2, 0, 6.283);   // 淡蓝描边
      x.strokeStyle = '#b5ecff'; x.lineWidth = 2;
      x.stroke();
      x.beginPath(); x.arc(ip[0] - s * 0.32, ip[1] - s * 0.32, s * 0.3, 0, 6.283); // 高光点缀
      x.fillStyle = '#d8f6ff';
      x.fill();
    } else {
      x.fillStyle = itm.type === 'ammo' ? '#ffd54a' : '#ff5d5d';
      x.fillRect(ip[0] - s, ip[1] - s, s * 2, s * 2);
      if (itm.type === 'ammo') {
        x.strokeStyle = '#ffffff'; x.lineWidth = 1.6;
        x.strokeRect(ip[0] - s, ip[1] - s, s * 2, s * 2);
      } else {
        x.strokeStyle = '#ffffff'; x.lineWidth = 1.8;
        x.beginPath();
        x.moveTo(ip[0] - s * 0.6, ip[1]); x.lineTo(ip[0] + s * 0.6, ip[1]);
        x.moveTo(ip[0], ip[1] - s * 0.6); x.lineTo(ip[0], ip[1] + s * 0.6);
        x.stroke();
      }
    }
  }
  x.restore();
  // 玩家：绿色带白色描边的 V 箭头（始终居中、指向视野正前方）
  x.beginPath();
  x.moveTo(C, C - 9);
  x.lineTo(C - 7, C + 6);
  x.lineTo(C, C + 3);
  x.lineTo(C + 7, C + 6);
  x.closePath();
  x.lineJoin = 'round';
  x.strokeStyle = '#ffffff'; x.lineWidth = 3;
  x.stroke();
  x.fillStyle = '#2eff6a'; x.fill();
}

// ---------------------------------------------------------------- 玩家
function buildPlayer() {
  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  syncCamera();
}

function syncCamera() {
  camera.position.set(player.pos.x, player.pos.y + CFG.eyeHeight, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

// ---------------------------------------------------------------- 枪
function buildGun() {
  gun.group = new THREE.Group();
  camera.add(gun.group);
  gun.group.position.set(0.3, -0.28, -0.6);
  var dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.65 });
  var darker = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.35, metalness: 0.7 });
  var grip = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8 });

  var body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.5), dark);
  var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.44), darker);
  barrel.position.set(0, 0.045, -0.42);
  var muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.07), darker);
  muzzle.position.set(0, 0.045, -0.66);
  var gripMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), grip);
  gripMesh.position.set(0, -0.15, 0.16);
  gripMesh.rotation.x = 0.35;
  var sight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.055, 0.2), darker);
  sight.position.set(0, 0.13, -0.08);
  gun.group.add(body, barrel, muzzle, gripMesh, sight);

  // 枪口闪光
  gun.light = new THREE.PointLight(0xffc46e, 0, 7);
  gun.light.position.set(0, 0.05, -0.75);
  gun.group.add(gun.light);
  gun.flashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  gun.flashMesh.position.set(0, 0.05, -0.72);
  gun.flashMesh.visible = false;
  gun.group.add(gun.flashMesh);
}

// ---------------------------------------------------------------- 粒子
function buildParticles() {
  var MAX = 240;
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(MAX * 3);
  var col = new Float32Array(MAX * 3);
  for (var i = 0; i < MAX; i++) pos[i * 3 + 1] = -1000;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  var mat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  particles = {
    mesh: new THREE.Points(geo, mat),
    pos: pos, col: col,
    data: [],
    cursor: 0,
  };
  particles.mesh.frustumCulled = false;
  scene.add(particles.mesh);
}

function spawnBurst(pos, hex, count, power) {
  if (!particles) return;
  var c = new THREE.Color(hex);
  for (var i = 0; i < count; i++) {
    var idx = particles.cursor;
    particles.cursor = (particles.cursor + 1) % 240;
    var p = particles.data[idx] || (particles.data[idx] = { life: 0 });
    var a = rand(0, Math.PI * 2), b = rand(0.15, Math.PI * 0.85);
    var sp = rand(power * 0.35, power);
    p.x = pos.x; p.y = pos.y; p.z = pos.z;
    p.vx = Math.cos(a) * Math.sin(b) * sp;
    p.vy = Math.cos(b) * sp + 1.2;
    p.vz = Math.sin(a) * Math.sin(b) * sp;
    p.life = p.maxLife = rand(0.45, 0.95);
    var shade = rand(0.75, 1.25);
    particles.pos[idx * 3] = p.x; particles.pos[idx * 3 + 1] = p.y; particles.pos[idx * 3 + 2] = p.z;
    particles.col[idx * 3] = c.r * shade; particles.col[idx * 3 + 1] = c.g * shade; particles.col[idx * 3 + 2] = c.b * shade;
  }
  particles.mesh.geometry.attributes.position.needsUpdate = true;
  particles.mesh.geometry.attributes.color.needsUpdate = true;
}

function updateParticles(dt) {
  if (!particles) return;
  for (var i = 0; i < 240; i++) {
    var p = particles.data[i];
    if (!p || p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) {
      particles.pos[i * 3 + 1] = -1000;
      continue;
    }
    p.vy += CFG.gravity * 0.35 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < 0.02) { p.y = 0.02; p.vy = Math.abs(p.vy) * 0.35; }
    particles.pos[i * 3] = p.x; particles.pos[i * 3 + 1] = p.y; particles.pos[i * 3 + 2] = p.z;
  }
  particles.mesh.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- 敌人（蓝色大肥鱼）
function makeFishMaterial() {
  var mat = new THREE.MeshBasicMaterial({
    map: fishTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide,
  });
  mat.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking, map: fishTex, alphaTest: 0.4,
  });
  return mat;
}

function pointInObstacle(x, z, pad) {
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (x > o.min.x - pad && x < o.max.x + pad && z > o.min.z - pad && z < o.max.z + pad) return true;
  }
  return false;
}

function pickSpawnPos(minDistFromPlayer) {
  // 玩家身边 5 米内禁止生成敌人（Boss 使用固定区域，不经过这里）
  if (minDistFromPlayer < 5) minDistFromPlayer = 5;
  for (var i = 0; i < 14; i++) {
    var x = rand(-CFG.arena + 2, CFG.arena - 2);
    var z = rand(-CFG.arena + 2, CFG.arena - 2);
    var dx = x - player.pos.x, dz = z - player.pos.z;
    if (dx * dx + dz * dz < minDistFromPlayer * minDistFromPlayer) continue;
    if (pointInObstacle(x, z, 1.4)) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(rand(-20, 20), 0, rand(-20, 20));
}

function spawnFish(pos) {
  var ranged = Math.random() < CFG.fishRangedChance;   // 50% 成为远程射手
  var e = {
    mesh: new THREE.Mesh(new THREE.PlaneGeometry(CFG.fishSize, CFG.fishSize), makeFishMaterial()),
    alive: true,
    state: 'patrol',
    ranged: ranged,
    speedMul: ranged ? 1.0 : CFG.fishSpeedMul,   // 近战 1.5 倍速，射手保持原速
    fireTimer: rand(0.2, 0.6),
    baseY: CFG.fishBaseY,
    phase: rand(0, Math.PI * 2),
    waypoint: new THREE.Vector3(rand(-43, 43), 0, rand(-43, 43)),
    waitTimer: 0,
    attackTimer: 0,
    seeCheckTimer: rand(0, 0.2),
    lostTimer: 0,
    respawnTimer: 0,
    pulse: 0,
    hitColor: new THREE.Color(0xffffff),
  };
  e.mesh.castShadow = true;
  e.hp = enemyHpNow;              // 小怪血量（随 Boss 击杀成长，≤10）
  e.mesh.position.copy(pos);
  e.mesh.position.y = e.baseY;
  e.gunMesh = makeFishGun();
  e.gunMesh.visible = ranged;
  e.mesh.add(e.gunMesh);
  scene.add(e.mesh);
  enemies.push(e);
  return e;
}

function ensureFishSpawned() {
  if (fishSpawned || !fishTexReady) return;
  fishSpawned = true;
  for (var i = 0; i < fishCapNow; i++) spawnFish(pickSpawnPos(16));
}

// 场上小怪数量随 Boss 击杀成长（生成速率 +5%）：存活+待重生少于上限时补生
function ensureFishPool() {
  if (!fishSpawned || state !== 'playing') return;
  var active = 0;
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive || enemies[i].respawnTimer > 0) active += 1;
  }
  if (active < fishCapNow) spawnFish(pickSpawnPos(24));
}

// 线段-AABB 相交（用于肥鱼视线遮挡检测）
var _soMin = new THREE.Vector3(), _soMax = new THREE.Vector3(), _soDir = new THREE.Vector3(), _soOrg = new THREE.Vector3();
function segmentHitsObstacle(ax, ay, az, bx, by, bz) {
  _soOrg.set(ax, ay, az);
  _soDir.set(bx - ax, by - ay, bz - az);
  var len = _soDir.length();
  if (len < 1e-6) return false;
  _soDir.multiplyScalar(1 / len);
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    var tmin = 0, tmax = len;
    var ok = true;
    for (var axis = 0; axis < 3; axis++) {
      var oMin = axis === 0 ? o.min.x : axis === 1 ? o.min.y : o.min.z;
      var oMax = axis === 0 ? o.max.x : axis === 1 ? o.max.y : o.max.z;
      var org = axis === 0 ? ax : axis === 1 ? ay : az;
      var dir = axis === 0 ? _soDir.x : axis === 1 ? _soDir.y : _soDir.z;
      if (Math.abs(dir) < 1e-8) {
        if (org < oMin || org > oMax) { ok = false; break; }
      } else {
        var t1 = (oMin - org) / dir, t2 = (oMax - org) / dir;
        var tNear = Math.min(t1, t2), tFar = Math.max(t1, t2);
        tmin = Math.max(tmin, tNear);
        tmax = Math.min(tmax, tFar);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok) return true;
  }
  return false;
}

function hasLineOfSight(fx, fy, fz) {
  var eyeY = player.pos.y + CFG.eyeHeight;
  return !segmentHitsObstacle(fx, fy, fz, player.pos.x, eyeY, player.pos.z);
}

var _fishDir = new THREE.Vector3();
// 障碍物阻挡检测：按目标飞行高度带判定（矮箱可飞越，墙体/建筑/顶棚挡路）
function blocksAt(x, z, yLow, yHigh, pad) {
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (o.max.y <= yLow || o.min.y >= yHigh) continue;
    if (x > o.min.x - pad && x < o.max.x + pad && z > o.min.z - pad && z < o.max.z + pad) return true;
  }
  return false;
}

// 敌人寻路移动：直线优先，遇障沿墙滑动，正面堵死则左右偏转绕行
function moveFishAvoiding(e, tx, tz, speed, dt, yLow, yHigh, pad) {
  var px = e.mesh.position.x, pz = e.mesh.position.z;
  var dx = tx - px, dz = tz - pz;
  var dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1e-4) return;
  var nx = dx / dist, nz = dz / dist;
  var sx = nx * speed * dt, sz = nz * speed * dt;
  if (!blocksAt(px + sx, pz + sz, yLow, yHigh, pad)) {
    e.mesh.position.x = px + sx; e.mesh.position.z = pz + sz; return;
  }
  if (!blocksAt(px + sx, pz, yLow, yHigh, pad)) { e.mesh.position.x = px + sx; return; }
  if (!blocksAt(px, pz + sz, yLow, yHigh, pad)) { e.mesh.position.z = pz + sz; return; }
  // 正对障碍：向左右各尝试偏转角度找通路（绕行）
  for (var a = 0.8; a <= 2.4; a += 0.4) {
    for (var k = 1; k >= -1; k -= 2) {
      var ang = a * k;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var rx = nx * ca - nz * sa, rz = nx * sa + nz * ca;
      var qx = px + rx * speed * dt, qz = pz + rz * speed * dt;
      if (!blocksAt(qx, qz, yLow, yHigh, pad)) {
        e.mesh.position.x = qx; e.mesh.position.z = qz; return;
      }
    }
  }
}

function updateEnemies(dt) {
  var baseChase = CFG.fishChaseSpeed + Math.min(CFG.fishChaseBonus, kills * 0.15);
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];

    // 死亡重生
    if (!e.alive) {
      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0) {
        var sp = pickSpawnPos(24);
        e.mesh.position.set(sp.x, e.baseY, sp.z);
        e.alive = true;
        e.hp = enemyHpNow;         // 按当前成长血量重生
        e.state = 'patrol';
        e.ranged = Math.random() < CFG.fishRangedChance;
        e.speedMul = e.ranged ? 1.0 : CFG.fishSpeedMul;
        e.fireTimer = rand(0.2, 0.6);
        if (e.gunMesh) e.gunMesh.visible = e.ranged;
        e.waypoint.set(rand(-43, 43), 0, rand(-43, 43));
        e.waitTimer = 0; e.attackTimer = 0; e.lostTimer = 0;
        e.mesh.visible = true;
      }
      continue;
    }

    var dx = player.pos.x - e.mesh.position.x;
    var dz = player.pos.z - e.mesh.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    // 三维距离：近战攻击判定包含高度差（玩家站上箱子/顶棚/墙时，处于高处的鱼咬不到）
    var dy3 = (player.pos.y + 1.0) - e.mesh.position.y;
    var dist3 = Math.sqrt(dist * dist + dy3 * dy3);
    var eyeY = e.baseY + 0.4;

    e.seeCheckTimer -= dt;

    if (e.state === 'patrol') {
      if (e.seeCheckTimer <= 0) {
        e.seeCheckTimer = 0.2;
        if (playingTime > CFG.graceTime && dist < CFG.fishDetectRange && hasLineOfSight(e.mesh.position.x, eyeY, e.mesh.position.z)) {
          e.state = 'chase';
          e.lostTimer = 0;
          e.chaseRemaining = CFG.rangedAdvanceDistance;   // 射手：只向前推进 1 米
        }
      }
      var wdx = e.waypoint.x - e.mesh.position.x;
      var wdz = e.waypoint.z - e.mesh.position.z;
      var wdist = Math.sqrt(wdx * wdx + wdz * wdz);
      if (wdist < 0.7) {
        e.waitTimer -= dt;
        if (e.waitTimer <= 0) {
          e.waypoint.set(rand(-43, 43), 0, rand(-43, 43));
          e.waitTimer = rand(0.6, 2.2);
        }
      } else {
        moveFishAvoiding(e, e.waypoint.x, e.waypoint.z, CFG.fishPatrolSpeed * e.speedMul, dt, 1.05, 1.75, 0.7);
        clampFish(e);
      }
    } else if (e.state === 'chase') {
      if (e.seeCheckTimer <= 0) {
        e.seeCheckTimer = 0.25;
        if (dist < CFG.fishLoseRange && hasLineOfSight(e.mesh.position.x, eyeY, e.mesh.position.z)) e.lostTimer = 0;
        else e.lostTimer += 0.25;
        if (e.lostTimer > 1.2) {
          e.state = 'patrol';
          e.waypoint.set(rand(-43, 43), 0, rand(-43, 43));
          e.waitTimer = rand(0.5, 1.5);
        }
      }
      if (e.state === 'chase') {
        var chaseSpeed = baseChase * e.speedMul;
        if (e.ranged) {
          // 远程射手：发现玩家后只向前推进 1 米（不管距离多远），走完立即站桩射击
          if (e.chaseRemaining === undefined) e.chaseRemaining = CFG.rangedAdvanceDistance;
          if (e.chaseRemaining > 0) {
            var oldX = e.mesh.position.x, oldZ = e.mesh.position.z;
            moveFishAvoiding(e, player.pos.x, player.pos.z, chaseSpeed, dt, 1.05, 1.75, 0.7);
            clampFish(e);
            var moved = Math.sqrt(
              Math.pow(e.mesh.position.x - oldX, 2) + Math.pow(e.mesh.position.z - oldZ, 2));
            e.chaseRemaining -= moved;
          }
          e.fireTimer -= dt;
          if (e.fireTimer <= 0) {
            e.fireTimer = CFG.rangedFireInterval;
            fireFishBullet(e);
          }
        } else if (dist3 < CFG.fishAttackRange) {
          e.state = 'attack'; e.attackTimer = 0;
        } else {
          moveFishAvoiding(e, player.pos.x, player.pos.z, chaseSpeed, dt, 1.05, 1.75, 0.7);
          clampFish(e);
        }
      }
    } else if (e.state === 'attack') {
      e.attackTimer -= dt;
      if (dist3 > CFG.fishAttackRange + 1.4) {
        e.state = 'chase';
      } else if (e.attackTimer <= 0) {
        e.attackTimer = CFG.fishAttackInterval;
        e.pulse = 0.25;
        damagePlayer(Math.min(CFG.meleeDmgMax, Math.round(rand(CFG.fishDamageMin, CFG.fishDamageMax)) + meleeAtkBonus),
          { name: enemyName(e), atk: '撕咬' });
      }
    }
  }
}

function clampFish(e) {
  e.mesh.position.x = clamp(e.mesh.position.x, -CFG.arena, CFG.arena);
  e.mesh.position.z = clamp(e.mesh.position.z, -CFG.arena, CFG.arena);
}

var _fishQ = new THREE.Quaternion();
var _zAxis = new THREE.Vector3(0, 0, 1);
function updateFishVisuals(dt) {
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    // 悬浮上下浮动
    var floatY = Math.sin(time * 2.3 + e.phase) * 0.28;
    e.mesh.position.y = e.baseY + floatY;
    // 广告牌：始终面向玩家相机 + 自身轻微摇摆
    var wobble = Math.sin(time * 3.1 + e.phase) * 0.13;
    _fishQ.setFromAxisAngle(_zAxis, wobble);
    e.mesh.quaternion.copy(camera.quaternion).multiply(_fishQ);
    // 追击时身体发红提示
    var target = e.state === 'chase' || e.state === 'attack' ? 0xff8d8d : 0xffffff;
    e.hitColor.set(target);
    e.mesh.material.color.copy(e.hitColor);
    // 攻击脉冲（冲脸咬人）
    e.pulse = Math.max(0, e.pulse - dt);
    var s = 1 + e.pulse * 1.4;
    e.mesh.scale.set(s, s, s);
  }
}

function killFish(e, hitPoint) {
  e.alive = false;
  e.respawnTimer = CFG.fishRespawnTime;
  rollKillRewards();              // 击杀概率战利品（技能 2/3/4）
  e.mesh.visible = false;
  kills += 1;
  score += 10;
  addComboPoints(CFG.comboFishPoints);   // 连杀 +1 点
  Sfx.fishDie();
  spawnBurst(hitPoint, 0x79c8ff, 26, 5.2);
  spawnBurst(hitPoint, 0xffffff, 10, 3);
  showKillFeed();
  updateHUD();
}

// ---------------------------------------------------------------- 射手鱼（手持枪械的远程敌人）
// 枪挂在贴图右手位置（图片中伸出的爪爪：贴图 x≈28%, y≈72% → 平面坐标 (-0.44,-0.44)）
function makeFishGun() {
  var gun = new THREE.Group();
  var dark = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.38, metalness: 0.7 });
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.52), dark);
  // 亮色点缀：金色枪管 + 橙色枪口 + 棕色握把（远距离更易辨认射手）
  var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xd8a848, roughness: 0.35, metalness: 0.75 }));
  barrel.position.z = 0.16;
  var muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xff7a2a, roughness: 0.4, metalness: 0.5 }));
  muzzle.position.z = 0.38;
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x6d4c33, roughness: 0.8 }));
  grip.position.set(0, -0.08, 0.1);
  gun.add(body, barrel, muzzle, grip);
  gun.position.set(-0.44, -0.44, 0.22);  // 挂爪爪上
  gun.rotation.set(0.34, 0, 0.1);          // 枪口上翘微侧：玩家视角可见枪身（辨识射手）
  gun.scale.set(2.2, 2.2, 2.2);            // 枪放大：远距离一眼可辨
  // 枪口锚点：子弹从这里发射（枪管末端）
  var muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0.02, 0.46);
  gun.add(muzzleTip);
  gun.muzzleTip = muzzleTip;
  return gun;
}

var _fbGeo = null, _fbMat = null;
function fireFishBullet(e) {
  if (!_fbGeo) {
    _fbGeo = new THREE.SphereGeometry(0.09, 8, 6);
    _fbMat = new THREE.MeshBasicMaterial({ color: 0xffc84d });
  }
  // 从枪口发射（贴图爪爪上的枪管口；无枪时兜底平面中心）
  var from = new THREE.Vector3();
  if (e.gunMesh && e.gunMesh.muzzleTip) {
    e.gunMesh.muzzleTip.getWorldPosition(from);
  } else {
    from.copy(e.mesh.position);
  }
  var dir = new THREE.Vector3(
    player.pos.x - from.x,
    (player.pos.y + 1.0) - from.y,
    player.pos.z - from.z
  ).normalize();
  var b = new THREE.Mesh(_fbGeo, _fbMat);
  b.position.copy(from).addScaledVector(dir, 0.7);
  scene.add(b);
  fishBullets.push({ mesh: b, vel: dir.clone().multiplyScalar(CFG.rangedBulletSpeed), life: 6 });
  dbgFireCount += 1;
  Sfx.fishShoot();
}

function updateFishBullets(dt) {
  for (var i = fishBullets.length - 1; i >= 0; i--) {
    var s = fishBullets[i];
    var m = s.mesh;
    m.position.addScaledVector(s.vel, dt);
    s.life -= dt;
    var gone = s.life <= 0;
    var px = m.position.x, py = m.position.y, pz = m.position.z;
    // 撞障碍物
    if (!gone) {
      for (var j = 0; j < obstacles.length; j++) {
        var o = obstacles[j];
        if (px > o.min.x - 0.12 && px < o.max.x + 0.12 &&
            py > o.min.y - 0.12 && py < o.max.y + 0.12 &&
            pz > o.min.z - 0.12 && pz < o.max.z + 0.12) {
          gone = true;
          spawnBurst(m.position, 0xffc84d, 4, 1.8);
          break;
        }
      }
    }
    // 命中玩家（身体胶囊：胸高 1.0、半径 0.55）
    if (!gone) {
      var dx = px - player.pos.x, dy = py - (player.pos.y + 1.0), dz = pz - player.pos.z;
      if (dx * dx + dy * dy + dz * dz < 0.55 * 0.55) {
        gone = true;
        damagePlayer(Math.min(CFG.rangedDmgMax, Math.round(rand(CFG.rangedDamageMin, CFG.rangedDamageMax)) + rangedAtkBonus),
          { name: '射手肥鱼', atk: '子弹' });
        spawnBurst(m.position, 0xffc84d, 6, 2.2);
      }
    }
    if (gone) { scene.remove(m); fishBullets.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- 弹药与换弹
function updateAmmoHUD() {
  if (!dom.ammoMag) return;
  dom.ammoMag.textContent = String(ammo.mag);
  dom.ammoMag.classList.toggle('low', ammo.mag <= 5);
  dom.ammoReserve.textContent = String(ammo.reserve);
}

// 换弹请求：R 键或弹夹打空时触发；备用为 0 时提示"弹药耗尽"且不换弹
function requestReload() {
  if (state !== 'playing' || ammo.reloading) return;
  if (ammo.mag >= CFG.magSize) return;
  if (ammo.reserve <= 0) {
    showNotice('弹药耗尽');
    Sfx.empty();
    return;
  }
  ammo.reloading = true;
  ammo.reloadTimer = CFG.reloadTime;
  Sfx.reloadStart();
}

// 屏幕中央提示（弹药耗尽 / 拾取反馈等）
function showNotice(text) {
  if (!dom.noticePop) return;
  dom.noticePop.textContent = text;
  dom.noticePop.classList.remove('show');
  void dom.noticePop.offsetWidth;
  dom.noticePop.classList.add('show');
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () { dom.noticePop.classList.remove('show'); }, 1300);
}

// ---------------------------------------------------------------- 连杀评级（D → C → B → A → S → SS → SSS）
// 连杀点数：普通鱼 +1 / Boss +5，达到阈值即评级（1=D, 2=C, 3=B, 4=A, 5=S, 6=SS, 7=SSS；点数可继续累加）。
// 评级字母获得后常驻显示；升级时抖动变化；2 秒无击杀则降一级（字母柔和切换到低一级）；
// 当前为 D 时再 2 秒无击杀，字母才消失。
function comboRankForScore(score) {
  var r = -1;
  for (var i = 0; i < CFG.comboRankPoints.length; i++) {
    if (score >= CFG.comboRankPoints[i]) r = i;
  }
  return r;
}

// 显示评级字母并常驻：anim = 'anim-d'(首次小弹出) | 'anim-up'(升级抖动) | 'anim-down'(降级柔和切换) | 'anim-keep'(SSS 后同级脉冲)
function showComboRank(rank, anim) {
  var el = dom.comboPop;
  if (!el) return;
  el.textContent = CFG.comboRanks[rank];
  el.className = 'rank-' + rank;          // 清空旧类（重置动画）
  void el.offsetWidth;                    // 强制重排，重启动画
  el.classList.add('show');
  el.classList.add(anim);
}

// 隐藏评级字母（D 级衰减到底）
function hideComboPop() {
  if (dom.comboPop) dom.comboPop.className = '';
}

// 增加连杀点数（击杀时调用）；重置衰减计时，按新旧评级关系选择动画
function addComboPoints(points) {
  combo.score += points;
  combo.timer = CFG.comboDecayTime;
  var oldRank = combo.rank;
  var newRank = comboRankForScore(combo.score);
  combo.rank = newRank;
  if (oldRank < 0) {
    showComboRank(newRank, 'anim-d');            // 首次获得评级
  } else if (newRank > oldRank) {
    showComboRank(newRank, 'anim-up');           // 升级（含 Boss 跳级）：抖动登场
  } else {
    showComboRank(newRank, 'anim-keep');         // 同级（SSS 后继续击杀）：脉冲刷新，字母保持
  }
}

// 每帧：衰减倒计时；2 秒无击杀降一级，D 级再降即消失
function updateCombo(dt) {
  if (combo.rank < 0) return;
  combo.timer -= dt;
  if (combo.timer <= 0) {
    combo.score = Math.max(0, combo.score - 1);
    combo.timer = CFG.comboDecayTime;            // 继续倒计时：再 2 秒无击杀再降一级
    var newRank = comboRankForScore(combo.score);
    if (newRank >= 0) {
      combo.rank = newRank;
      showComboRank(newRank, 'anim-down');       // 降级：柔和切换到低一级
    } else {
      combo.rank = -1;
      hideComboPop();
    }
  }
}

// 重开一局时清空连杀状态
function resetCombo() {
  combo.score = 0;
  combo.rank = -1;
  combo.timer = 0;
  hideComboPop();
}

// ---------------------------------------------------------------- 局内强化（无尽模式专属：击杀 Boss 3 选 1，不持久化）
var UPGRADE_DEFS = {
  dmg:    { ico: '💥', name: '子弹强化', short: '威力 +1' },
  refund: { ico: '🔁', name: '弹药回收', short: '概率回弹' },
  heal:   { ico: '❤️', name: '吸血再生', short: '概率回血' },
  nade:   { ico: '💣', name: '手雷补给', short: '概率掉雷' },
  speed:  { ico: '💨', name: '疾风步伐', short: '速度提升' },
};
var UPGRADE_ORDER = ['dmg', 'refund', 'heal', 'nade', 'speed'];

// 下一级效果描述（lv = 即将达到的等级 1~10）
function upgradeNextDesc(id, lv) {
  switch (id) {
    case 'dmg':    return '子弹伤害 +' + lv + ' 点';
    case 'refund': return '击杀后 10% 概率恢复 ' + (CFG.upgradeRefundPerLevel * lv) + ' 颗子弹';
    case 'heal':   return '击杀后 ' + Math.round((CFG.upgradeHealChanceBase + (lv - 1) * CFG.upgradeHealChanceInc) * 100) + '% 概率恢复 ' + CFG.upgradeHealAmount + ' 生命';
    case 'nade':   return '击杀后 ' + Math.round((CFG.upgradeNadeChanceBase + (lv - 1) * CFG.upgradeNadeChanceInc) * 100) + '% 概率获得 1 颗手雷';
    case 'speed':  return '移动速度 +' + Math.round(CFG.upgradeSpeedPerLevel * lv * 100) + '%';
  }
  return '';
}

function isAllUpgradeMax() {
  for (var i = 0; i < UPGRADE_ORDER.length; i++) {
    if (upgrades[UPGRADE_ORDER[i]] < CFG.upgradeMaxLevel) return false;
  }
  return true;
}

// 从未满级技能中随机抽取（最多 3 个；不足 3 个有多少抽多少）
function pickRewardOptions() {
  var pool = [];
  for (var i = 0; i < UPGRADE_ORDER.length; i++) {
    var id = UPGRADE_ORDER[i];
    if (upgrades[id] < CFG.upgradeMaxLevel) pool.push(id);
  }
  for (var j = pool.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
  }
  var take = Math.min(3, pool.length);
  var opts = [];
  for (var m = 0; m < take; m++) {
    var pid = pool[m];
    opts.push({ id: pid, lv: upgrades[pid], def: UPGRADE_DEFS[pid] });
  }
  return opts;
}

// 渲染奖励卡片并暂停游戏（选择前世界冻结）
function showRewardWindow() {
  state = 'reward';                       // 先改状态，避免退出指针锁定时触发暂停
  rewardOptions = pickRewardOptions();
  if (dom.rewardCards) {
    var html = '';
    for (var i = 0; i < rewardOptions.length; i++) {
      var o = rewardOptions[i];
      html += '<div class="reward-card" data-idx="' + i + '">' +
        '<div class="rw-ico">' + o.def.ico + '</div>' +
        '<div class="rw-name">' + o.def.name + '</div>' +
        '<div class="rw-lv">' + (o.lv > 0 ? '当前 Lv.' + o.lv + ' / 10' : '新强化') + '</div>' +
        '<div class="rw-desc">' + upgradeNextDesc(o.id, o.lv + 1) + '</div>' +
        '<div class="rw-next">选择后立即生效 ▶</div>' +
        '</div>';
    }
    dom.rewardCards.innerHTML = html;
  }
  hideAllOverlays();
  if (dom.rewardOverlay) dom.rewardOverlay.classList.remove('hidden');
  if (document.exitPointerLock) document.exitPointerLock();
  progressMusicOn = true;                    // 奖励界面播放"进步的小曲"（Boss 战斗曲淡出结束后接管）
  if (progressEl) progressEl.currentTime = 0;
}

// 选择奖励：升级对应技能并继续游戏
function chooseReward(idx) {
  if (state !== 'reward' || !rewardOptions || !rewardOptions[idx]) return;
  var opt = rewardOptions[idx];
  upgrades[opt.id] = Math.min(CFG.upgradeMaxLevel, upgrades[opt.id] + 1);
  rewardOptions = null;
  if (isAllUpgradeMax()) rewardAllMax = true;
  progressMusicOn = false;                   // 选择奖励后关闭"进步的小曲"
  if (progressEl) { progressEl.pause(); progressEl.currentTime = 0; }
  hideAllOverlays();
  state = 'playing';
  requestLockWithFallback();
}

// ---------------------------------------------------------------- 技能等级查看（按 I 打开 / 再按 I 或 Esc 关闭）
function renderSkillsPanel() {
  if (!dom.skillsList) return;
  var html = '';
  for (var i = 0; i < UPGRADE_ORDER.length; i++) {
    var id = UPGRADE_ORDER[i];
    var def = UPGRADE_DEFS[id];
    var lv = upgrades[id];
    var maxed = lv >= CFG.upgradeMaxLevel;
    var dots = '';
    for (var d = 0; d < CFG.upgradeMaxLevel; d++) {
      dots += '<span class="' + (d < lv ? '' : 'off') + '">▮</span>';
    }
    html += '<div class="skill-row' + (maxed ? ' sk-max' : '') + '">' +
      '<div class="sk-ico">' + def.ico + '</div>' +
      '<div class="sk-body">' +
      '<div class="sk-name">' + def.name + (maxed ? '<span class="sk-lv">MAX 已满级</span>' : '<span class="sk-lv">Lv.' + lv + ' / ' + CFG.upgradeMaxLevel + '</span>') + '</div>' +
      '<div class="sk-desc">' + upgradeNextDesc(id, Math.max(1, lv + 1)) + '</div>' +
      '<div class="sk-dots">' + dots + '</div>' +
      '</div></div>';
  }
  dom.skillsList.innerHTML = html;
}

// 打开技能等级查看面板：游戏暂停、默认 BGM 暂停、播放"进步的小曲"
function openSkills() {
  if (state !== 'playing') return;
  state = 'skills';
  renderSkillsPanel();
  hideAllOverlays();
  if (dom.skillsOverlay) dom.skillsOverlay.classList.remove('hidden');
  progressMusicOn = true;                    // 播放"进步的小曲"
  if (progressEl) progressEl.currentTime = 0;
  if (document.exitPointerLock) document.exitPointerLock();
}

// 关闭技能面板：恢复游戏、主 BGM 从暂停进度续播
function closeSkills() {
  if (state !== 'skills') return;
  progressMusicOn = false;                   // 关闭"进步的小曲"
  if (progressEl) { progressEl.pause(); progressEl.currentTime = 0; }
  hideAllOverlays();
  state = 'playing';
  requestLockWithFallback();
}

// ---------------------------------------------------------------- 开发者模式（秘技：5 秒内按 WWSSAADDBABA 切换）
function enterDebugMode() {
  debugMode = true;
  saveMaxHp = CFG.maxHp;
  CFG.maxHp = 99999;                       // 生命上限 → 99999（仍会受伤害）
  player.hp = CFG.maxHp;
  debugHealTimer = 5;
  if (dom.debugLog) dom.debugLog.style.display = 'block';
  showNotice('开发者模式已开启：无限生命 + Debug 数据');
  updateHUD();
}

function exitDebugMode() {
  debugMode = false;
  CFG.maxHp = saveMaxHp;
  player.hp = Math.min(player.hp, CFG.maxHp);
  debugLogs = [];
  if (dom.debugLog) { dom.debugLog.style.display = 'none'; dom.debugLog.innerHTML = ''; }
  showNotice('开发者模式已关闭');
  updateHUD();
}

// 秘技按键缓冲：匹配 DEBUG_SEQ 前缀，5 秒窗口超时重置
function handleDebugCheat(code) {
  var now = Date.now();
  if (now - debugKeyFirst > 5000) { debugKeyBuf = []; }
  if (debugKeyBuf.length === 0) debugKeyFirst = now;
  debugKeyBuf.push(code);
  while (debugKeyBuf.length && !debugSeqPrefix(debugKeyBuf)) debugKeyBuf.shift();
  if (debugKeyBuf.length === DEBUG_SEQ.length) {
    debugKeyBuf = []; debugKeyFirst = 0;
    if (debugMode) exitDebugMode();
    else enterDebugMode();
  }
}
function debugSeqPrefix(buf) {
  for (var i = 0; i < buf.length; i++) if (buf[i] !== DEBUG_SEQ[i]) return false;
  return true;
}

// KILL 自毁秘技（仅开发者模式：4 秒内按完 K→I→L→L 即退出开发者模式并自杀）
// 返回 true = 本次按键被 KILL 序列消费（避免同时触发技能面板等）
function handleKillCheat(code) {
  if (!debugMode) { killBuf = []; killFirst = 0; return false; }
  var now = Date.now();
  if (now - killFirst > 4000) killBuf = [];
  if (killBuf.length === 0 && code !== killSeq[0]) return false;   // 序列未开始：仅 K 起头
  if (killBuf.length === 0) killFirst = now;
  killBuf.push(code);
  while (killBuf.length && !killSeqPrefix(killBuf)) killBuf.shift();
  if (killBuf.length === killSeq.length) {
    killBuf = []; killFirst = 0;
    exitDebugMode();        // 退出开发者模式
    player.hp = 0;
    gameOver('suicide');    // 自杀
  }
  return true;              // 序列进行中的按键一律消费
}
function killSeqPrefix(buf) {
  for (var i = 0; i < buf.length; i++) if (buf[i] !== killSeq[i]) return false;
  return true;
}

// Debug 消息：左侧列表从下缓慢上移，每条 5 秒后消失（仅开发者模式）
function debugLog(text, cls) {
  if (!debugMode || !dom.debugLog) return;
  var div = document.createElement('div');
  div.className = 'dbg-line' + (cls ? ' ' + cls : '');
  div.textContent = text;
  dom.debugLog.appendChild(div);
  debugLogs.push({ el: div, born: time });
  while (debugLogs.length > 14) {          // 最多保留 14 条
    var old = debugLogs.shift();
    if (old.el.parentNode) old.el.parentNode.removeChild(old.el);
  }
}

function updateDebugLog(dt) {
  for (var i = debugLogs.length - 1; i >= 0; i--) {
    var l = debugLogs[i];
    var age = time - l.born;
    if (age > 5.2) {
      if (l.el.parentNode) l.el.parentNode.removeChild(l.el);
      debugLogs.splice(i, 1);
      continue;
    }
    l.el.style.transform = 'translateY(-' + (age * 26) + 'px)';   // 缓慢上移（26px/s）
    l.el.style.opacity = age > 4 ? String(Math.max(0, 5.2 - age)) : '1';
  }
}

// 怪物显示名（Debug 消息用）
function enemyName(e) { return e.ranged ? '射手肥鱼' : '近战肥鱼'; }

// 击杀（含 Boss）后的概率收益（对应技能 1/2/3/4）
function rollKillRewards() {
  var msgs = [];
  if (upgrades.refund > 0 && Math.random() < CFG.upgradeRefundChance) {
    ammo.reserve += CFG.upgradeRefundPerLevel * upgrades.refund;
    msgs.push('+' + (CFG.upgradeRefundPerLevel * upgrades.refund) + ' 子弹');
  }
  if (upgrades.heal > 0 && Math.random() < CFG.upgradeHealChanceBase + (upgrades.heal - 1) * CFG.upgradeHealChanceInc) {
    player.hp = Math.min(CFG.maxHp, player.hp + CFG.upgradeHealAmount);
    msgs.push('+' + CFG.upgradeHealAmount + ' 生命');
  }
  if (upgrades.nade > 0 && Math.random() < CFG.upgradeNadeChanceBase + (upgrades.nade - 1) * CFG.upgradeNadeChanceInc) {
    nadeCount += 1;
    msgs.push('+1 手雷');
  }
  if (msgs.length) {
    if (msgs.length > 1) showNotice('战利品：' + msgs.join(' · '));
    else showNotice('战利品：' + msgs[0]);
    Sfx.pickupAmmo();
    updateAmmoHUD();
    updateNadeHUD();
    updateHUD();
  }
}

// 敌人成长：每次击杀 Boss 后调用（小怪血量/攻击、Boss 血量/炮弹、生成速率）
function growEnemies() {
  bossKillCount += 1;
  enemyHpNow = Math.min(CFG.enemyHpMax, 1 + bossKillCount);          // 小怪血量 +1（≤10）
  if (enemyHpNow >= CFG.enemyAtkGrowAtHp) {                          // 血量到 10 后攻击 +1/次
    var atkSteps = bossKillCount - (CFG.enemyAtkGrowAtHp - 1);
    meleeAtkBonus = Math.min(CFG.meleeDmgMax - 25, atkSteps);        // 近战基数 15~25 → 上限 50
    rangedAtkBonus = Math.min(CFG.rangedDmgMax - 12, atkSteps);      // 射手基数 7~12 → 上限 30
  }
  bossHpNext = Math.min(CFG.bossHpMax, 15 + 5 * bossKillCount);      // 下只 Boss 血量（≤100）
  bossBallDmgNow = Math.min(CFG.bossBallDmgMax, 25 + 2 * bossKillCount); // Boss 炮弹伤害（≤60）
  fishCapNow = Math.round(CFG.fishCount * Math.pow(1 + CFG.fishCapGrowRate, bossKillCount)); // 生成速率 +5%
}

// 护甲层数校验与 HUD
function updateArmorHUD() {
  if (dom.armorValue) dom.armorValue.textContent = String(armorStacks);
  if (dom.armorDots) {
    var dots = '';
    for (var i = 0; i < armorStacks; i++) dots += '▮';
    dom.armorDots.textContent = dots;
  }
}

// 无尽模式通关：全部技能满级后再次击杀 Boss
function victory() {
  state = 'victory';
  Sfx.bossDie();
  if (document.exitPointerLock) document.exitPointerLock();
  if (dom.finalScoreV) dom.finalScoreV.textContent = String(score);
  if (dom.finalKillsV) dom.finalKillsV.textContent = String(kills);
  if (dom.finalBossKillsV) dom.finalBossKillsV.textContent = String(bossKillCount);
  showOverlay('victory');
}

// ---------------------------------------------------------------- 补给物品
function buildItem(type, pos) {
  var g = new THREE.Group();
  var ringMat = new THREE.MeshBasicMaterial({
    color: type === 'ammo' ? 0xffc84d : (type === 'armor' ? 0x8fd8ff : 0xff5d5d),
    transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  });
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  if (type === 'ammo') {
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.28, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x8a6d2b, roughness: 0.6, emissive: 0x2a1f0a }));
    body.position.y = 0.0; body.castShadow = true;
    var lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.64),
      new THREE.MeshStandardMaterial({ color: 0xcfa14a, roughness: 0.5, emissive: 0x3a2c10 }));
    lid.position.y = 0.17;
    var b1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd76e, roughness: 0.3, metalness: 0.8 }));
    b1.position.set(0.1, 0.31, 0.15); b1.rotation.x = Math.PI / 2;
    var b2 = b1.clone(); b2.position.set(-0.1, 0.31, -0.15);
    g.add(body, lid, b1, b2);
  } else if (type === 'armor') {
    // 护甲道具：青色盾牌 + 立架
    var matArmor = new THREE.MeshStandardMaterial({ color: 0xb8e6ff, roughness: 0.3, metalness: 0.6, emissive: 0x14446e });
    var shield = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20), matArmor);
    shield.rotation.x = Math.PI / 2; shield.position.y = 0.42;
    shield.castShadow = true;
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x4aa8ff, roughness: 0.35, metalness: 0.7 }));
    rim.position.y = 0.42;
    var knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f7fd6, roughness: 0.4, metalness: 0.5 }));
    knob.position.y = 0.42; knob.position.z = 0.06;
    g.add(shield, rim, knob);
  } else {
    var matW = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4, emissive: 0x551010 });
    var c1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.17), matW);
    var c2 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.5), matW);
    c1.castShadow = true; c2.castShadow = true;
    g.add(c1, c2);
  }
  g.position.copy(pos);
  g.position.y = 0.55;
  return g;
}

function pickItemPos() {
  for (var i = 0; i < 20; i++) {
    var x = rand(-(CFG.arena - 2), CFG.arena - 2), z = rand(-(CFG.arena - 2), CFG.arena - 2);
    if (pointInObstacle(x, z, 1.0)) continue;
    var dx = x - player.pos.x, dz = z - player.pos.z;
    if (dx * dx + dz * dz < 36) continue;   // 距玩家至少 6 米
    return new THREE.Vector3(x, 0, z);
  }
  return null;
}

function spawnItem() {
  if (items.length >= CFG.itemMax) return;
  var pos = pickItemPos();
  if (!pos) return;
  var type = Math.random() < CFG.itemAmmoChance ? 'ammo' : 'health';
  var mesh = buildItem(type, pos);
  scene.add(mesh);
  items.push({ mesh: mesh, type: type, phase: rand(0, Math.PI * 2) });
}

function pickupItem(it, index) {
  if (it.type === 'ammo') {
    ammo.reserve += CFG.ammoPack;
    showNotice('+' + CFG.ammoPack + ' 子弹');
    Sfx.pickupAmmo();
  } else if (it.type === 'armor') {
    // 每拾取一个护甲道具 = +1 层护盾（每层防御力 = CFG.armorPerPick 点）
    armorStacks = Math.min(CFG.armorMaxStacks, armorStacks + 1);
    showNotice('护甲 +1 层（防御 +' + CFG.armorPerPick + ' · 当前 ' + armorStacks + ' 层）');
    Sfx.pickupHealth();
    updateArmorHUD();
  } else {
    var before = player.hp;
    player.hp = Math.min(CFG.maxHp, player.hp + CFG.healthPack);
    var gained = Math.round(player.hp - before);
    showNotice(gained > 0 ? '+' + gained + ' 生命' : '生命已满');
    Sfx.pickupHealth();
    updateHUD();
  }
  updateAmmoHUD();
  scene.remove(it.mesh);
  items.splice(index, 1);
}

function spawnArmorItem() {
  if (armorStacks >= CFG.armorMaxStacks) return;   // 满层后不再生成
  var pos = pickItemPos();
  if (!pos) return;
  var mesh = buildItem('armor', pos);
  scene.add(mesh);
  items.push({ mesh: mesh, type: 'armor', phase: rand(0, Math.PI * 2) });
  if (state === 'playing') {
    showNotice('场地出现护甲，快去拾取！');
    Sfx.pickupHealth();
  }
}

function updateItems(dt) {
  if (state === 'playing') {
    itemTimer -= dt;
    if (itemTimer <= 0) {
      spawnItem();
      itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax);
    }
    armorTimer -= dt;                  // 护甲生成判定：每 10 秒 25% 概率
    if (armorTimer <= 0) {
      armorTimer = CFG.armorInterval;
      if (armorStacks < CFG.armorMaxStacks && Math.random() < CFG.armorChance) spawnArmorItem();
    }
  }
  for (var i = items.length - 1; i >= 0; i--) {
    var it = items[i];
    var m = it.mesh;
    m.rotation.y += dt * 1.6;
    m.position.y = 0.55 + Math.sin(time * 2.6 + it.phase) * 0.12;
    if (state === 'playing') {
      var dx = player.pos.x - m.position.x;
      var dz = player.pos.z - m.position.z;
      if (dx * dx + dz * dz < CFG.pickupRadius * CFG.pickupRadius) pickupItem(it, i);
    }
  }
}

// ---------------------------------------------------------------- Boss（超级蓝色大肥鱼）
// Boss 火箭筒：挂在贴图爪爪位置（同射手鱼手位，3 倍比例随体型放大），炮口沿法线指向玩家
function makeBossLauncher() {
  var gun = new THREE.Group();
  var steel = new THREE.MeshStandardMaterial({ color: 0x2e3338, roughness: 0.38, metalness: 0.72 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x171a1e, roughness: 0.3, metalness: 0.8 });
  var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 1.5, 14), steel);
  tube.rotation.x = Math.PI / 2;
  tube.position.z = 0.35;
  var muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.22, 14), dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 1.13;
  var scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), dark);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.22, 0.15);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.12), steel);
  grip.position.set(0, -0.22, 0.1);
  gun.add(tube, muzzle, scope, grip);
  gun.position.set(-1.32, -1.32, 0.55);   // 贴图爪爪位置（6m 平面比例）
  // 炮口锚点：炮弹从这里发射（炮管口）
  var muzzleTip = new THREE.Object3D();
  muzzleTip.position.set(0, 0.02, 1.26);
  gun.add(muzzleTip);
  gun.muzzleTip = muzzleTip;
  return gun;
}

function spawnBoss() {
  if (boss) return;
  // 从四个固定空旷区域中随机选一个，区域内随机偏移（距离玩家至少 12 米避免贴脸）
  var pts = CFG.bossSpawnPoints;
  var pick = null;
  for (var i = 0; i < pts.length; i++) {
    var cand = pts[Math.floor(Math.random() * pts.length)];
    var bx = cand[0] + rand(-5, 5), bz = cand[1] + rand(-5, 5);
    var ddx = bx - player.pos.x, ddz = bz - player.pos.z;
    if (ddx * ddx + ddz * ddz >= 144) { pick = new THREE.Vector3(bx, 0, bz); break; }
  }
  if (!pick) pick = new THREE.Vector3(pts[0][0], 0, pts[0][1]);
  var pos = pick;
  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.fishSize * CFG.bossSizeMul, CFG.fishSize * CFG.bossSizeMul),
    makeFishMaterial()
  );
  mesh.castShadow = true;
  mesh.position.set(pos.x, 3.0, pos.z);
  var launcher = makeBossLauncher();
  launcher.scale.set(3, 3, 3);
  mesh.add(launcher);
  scene.add(mesh);
  boss = {
    launcher: launcher,
    mesh: mesh,
    hp: bossHpNext, maxHp: bossHpNext,   // BOSS 血量随成长曲线（15 起，每只 +5，≤100）
    baseY: 3.0,
    phase: rand(0, Math.PI * 2),
    fireTimer: CFG.bossShootInterval,
    hurt: 0,
  };
  showNotice('BOSS 出现！超级蓝色大肥鱼');
  Sfx.bossAlarm();
  updateBossBar();
  // Boss 战曲：从 0 音量淡入（主 BGM 由 updateBgm 暂停，进度保留）
  bossMusicVol = 0;
  bossMusicTempo = 1;
  if (bossEl) bossEl.currentTime = 0;
}

var _bossBallGeo = null, _bossBallMat = null, _bossTipGeo = null, _bossTipMat = null;
function fireBossBall() {
  if (!_bossBallGeo) {
    _bossBallGeo = new THREE.SphereGeometry(0.3, 12, 10);
    _bossBallMat = new THREE.MeshStandardMaterial({ color: 0x444a52, roughness: 0.4, metalness: 0.65 });
    _bossTipGeo = new THREE.ConeGeometry(0.13, 0.22, 10);
    _bossTipMat = new THREE.MeshStandardMaterial({ color: 0xd84028, roughness: 0.4, metalness: 0.3 });
  }
  var ball = new THREE.Group();
  var body = new THREE.Mesh(_bossBallGeo, _bossBallMat);
  body.castShadow = true;
  var tip = new THREE.Mesh(_bossTipGeo, _bossTipMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.34;
  ball.add(body, tip);
  // 从火箭筒炮口发射（爪爪上的炮管口；无炮时兜底中心）
  var from = new THREE.Vector3();
  if (boss.launcher && boss.launcher.muzzleTip) {
    boss.launcher.muzzleTip.getWorldPosition(from);
  } else {
    from.copy(boss.mesh.position);
  }
  // 炮口随 Boss 悬浮浮动可能探到地面以下（y<0.15 会被判落地自爆），钳制最低发射高度
  if (from.y < 0.5) from.y = 0.5;
  ball.position.copy(from);
  var dir = new THREE.Vector3(
    player.pos.x - from.x,
    (player.pos.y + CFG.eyeHeight) - from.y,
    player.pos.z - from.z
  ).normalize().multiplyScalar(CFG.bossBallSpeed);
  ball.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  scene.add(ball);
  bossShots.push({ mesh: ball, vel: dir, life: 12 });
  Sfx.bossShoot();
}

var _qIdentity = new THREE.Quaternion();
var _qTurn = new THREE.Quaternion();
var _vDes = new THREE.Vector3();
var _vOldDir = new THREE.Vector3();
var _vNewDir = new THREE.Vector3();

// 炮弹爆炸：落地/撞墙爆（仅玩家，伤害 -10%）或玩家击毁空爆（敌我通吃）
function explodeShell(s, index, byPlayer) {
  var center = s.mesh.position.clone();
  scene.remove(s.mesh);
  bossShots.splice(index, 1);
  spawnBurst(center, 0xffb060, 24, 5.5);
  spawnBurst(center, 0xfff2d0, 10, 3.2);
  Sfx.nadeBoom();
  var dmg = byPlayer ? bossBallDmgNow : Math.round(bossBallDmgNow * CFG.bossBallGroundFalloff);
  var R = CFG.bossShellRadius;
  // 玩家（所有爆炸类型都伤）
  var pdx = center.x - player.pos.x, pdy = center.y - (player.pos.y + 1.0), pdz = center.z - player.pos.z;
  if (pdx * pdx + pdy * pdy + pdz * pdz <= R * R) {
    damagePlayer(dmg, { name: '超级蓝色大肥鱼', atk: '火箭弹爆炸' });
  }
  // 敌人：仅玩家击毁的空爆才会波及
  if (byPlayer) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      if (e.mesh.position.distanceTo(center) <= R) {
        e.hp -= dmg;                        // 空爆伤害同样按小怪血量扣除
        if (e.hp <= 0) killFish(e, e.mesh.position.clone());
      }
    }
    if (boss && boss.mesh.position.distanceTo(center) <= R) {
      boss.hp -= dmg;
      boss.hurt = 0.2;
      updateBossBar();
      if (boss.hp <= 0) defeatBoss();
    }
  }
}

function updateBossShots(dt) {
  for (var i = bossShots.length - 1; i >= 0; i--) {
    var s = bossShots[i];
    var m = s.mesh;
    // 弱跟踪：每帧以有限转向速率朝玩家方向轻微偏转
    if (state === 'playing' && s.vel.lengthSq() > 0.01) {
      _vDes.set(player.pos.x, player.pos.y + 1.0, player.pos.z).sub(m.position);
      _vOldDir.copy(s.vel).normalize();
      var dLen = _vDes.length();
      if (dLen > 0.5) {
        _vDes.normalize();
        var dot = Math.max(-1, Math.min(1, _vOldDir.dot(_vDes)));
        var ang = Math.acos(dot);
        if (ang > 1e-4) {
          _qTurn.setFromUnitVectors(_vOldDir, _vDes);
          var frac = Math.min(1, (CFG.bossBallTurn * dt) / ang);
          _qTurn.slerp(_qIdentity, 1 - frac);   // 只转 ang*frac 的部分
          _vNewDir.copy(_vOldDir).applyQuaternion(_qTurn);
          s.vel.copy(_vNewDir.normalize().multiplyScalar(CFG.bossBallSpeed));
        }
      }
    }
    m.position.addScaledVector(s.vel, dt);
    s.life -= dt;
    var gone = s.life <= 0;
    var px = m.position.x, py = m.position.y, pz = m.position.z;
    // 落弹爆炸：落地或撞上障碍物（仅玩家、威力 -10%）
    if (!gone) {
      if (py <= 0.15) { explodeShell(s, i, false); continue; }
      for (var j = 0; j < obstacles.length; j++) {
        var o = obstacles[j];
        if (px > o.min.x - 0.3 && px < o.max.x + 0.3 &&
            py > o.min.y - 0.3 && py < o.max.y + 0.3 &&
            pz > o.min.z - 0.3 && pz < o.max.z + 0.3) {
          explodeShell(s, i, false);
          gone = true;
          break;
        }
      }
      if (gone) continue;
    }
    // 命中玩家（直击 25 伤）
    if (!gone) {
      var dx = px - player.pos.x, dy = py - (player.pos.y + 1.0), dz = pz - player.pos.z;
      if (dx * dx + dy * dy + dz * dz < 0.65 * 0.65) {
        gone = true;
        damagePlayer(bossBallDmgNow, { name: '超级蓝色大肥鱼', atk: '火箭弹' });   // 炮弹直击伤害（随成长，≤60）
        spawnBurst(m.position, 0xffd54a, 8, 2.5);
      }
    }
    if (gone) {
      scene.remove(m); bossShots.splice(i, 1);
    }
  }
}

function updateBoss(dt) {
  // 生成判定：每 bossInterval 秒掷一次骰子（场上最多一个）
  if (!boss) {
    if (state === 'playing') {
      bossTimer -= dt;
      if (bossTimer <= 0) {
        bossTimer = CFG.bossInterval;
        // 生成判定：首个 30 秒必出 → 之后 50% 概率 → 连续 N 次未出保底必出
        var willSpawn = false;
        if (firstBossPending) {
          willSpawn = true;
        } else if (bossMisses >= CFG.bossMissGuarantee) {
          willSpawn = true;
        } else if (Math.random() < CFG.bossChance) {
          willSpawn = true;
        }
        if (willSpawn) {
          spawnBoss();
          firstBossPending = false;
          bossMisses = 0;
        } else {
          bossMisses += 1;
        }
      }
    }
    return;
  }
  var m = boss.mesh;
  if (state === 'playing') {
    // 追击：距离大于 8 米时靠近，否则原地压制射击
    var dx = player.pos.x - m.position.x;
    var dz = player.pos.z - m.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 8) {
      var spd = CFG.fishChaseSpeed * CFG.bossSpeedMul;
      moveFishAvoiding({ mesh: m }, player.pos.x, player.pos.z, spd, dt, 1.8, 4.2, 1.8);
      m.position.x = clamp(m.position.x, -CFG.arena, CFG.arena);
      m.position.z = clamp(m.position.z, -CFG.arena, CFG.arena);
    }
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = CFG.bossShootInterval;
      fireBossBall();
    }
  }
  // 视觉：悬浮 + 广告牌 + 受击泛红
  m.position.y = boss.baseY + Math.sin(time * 2.0 + boss.phase) * 0.5;
  var wobble = Math.sin(time * 2.6 + boss.phase) * 0.1;
  _fishQ.setFromAxisAngle(_zAxis, wobble);
  m.quaternion.copy(camera.quaternion).multiply(_fishQ);
  boss.hurt = Math.max(0, boss.hurt - dt);
  m.material.color.set(boss.hurt > 0 ? 0xff8d8d : 0xffffff);
  // 血条（宽度 + 数值：当前/上限，直观看到成长后的上限变化）
  if (dom.bossFill) dom.bossFill.style.width = (boss.hp / boss.maxHp * 100) + '%';
  if (dom.bossHpCur) dom.bossHpCur.textContent = String(boss.hp);
  if (dom.bossHpMax) dom.bossHpMax.textContent = String(boss.maxHp);
}

function updateBossBar() {
  if (dom.bossBarWrap) dom.bossBarWrap.style.display = 'block';
  if (boss) {
    if (dom.bossHpCur) dom.bossHpCur.textContent = String(boss.hp);
    if (dom.bossHpMax) dom.bossHpMax.textContent = String(boss.maxHp);
  }
}
function hideBossBar() {
  if (dom.bossBarWrap) dom.bossBarWrap.style.display = 'none';
}

function defeatBoss() {
  var pos = boss.mesh.position.clone();
  scene.remove(boss.mesh);
  boss = null;
  spawnBurst(pos, 0xffd54a, 40, 6.5);
  spawnBurst(pos, 0xffffff, 20, 4);
  score += CFG.bossScore;
  addComboPoints(CFG.comboBossPoints); // 击败 Boss：连杀 +5 点，快速提升评级
  rollKillRewards();              // Boss 击杀同样触发概率战利品
  player.hp = CFG.maxHp;          // 击败 Boss：生命回满
  ammo.reserve += CFG.bossAmmoReward; // 奖励备用子弹
  var nadeBonus = 1 + Math.floor(Math.random() * CFG.nadeBossBonusMax); // 随机 1~3 颗手雷
  nadeCount += nadeBonus;
  showNotice('BOSS 击破！生命回满 +' + CFG.bossAmmoReward + ' 子弹 +' + nadeBonus + ' 手雷');
  Sfx.bossDie();
  hideBossBar();
  updateHUD();
  updateAmmoHUD();
  if (bossMusicTempo !== 0) bossMusicTempo = -1;   // 战斗曲开始匀速淡出（结束后主 BGM 续播）
  growEnemies();                  // 敌人成长：小怪变强、Boss 变硬、生成提速
  if (rewardAllMax) {
    victory();                    // 全部强化满级后击杀 Boss → 无尽模式通关
  } else {
    showRewardWindow();           // 弹出 3 选 1 奖励窗口（选择前游戏暂停）
  }
}

// ---------------------------------------------------------------- 手榴弹
function makeGrenadeMesh() {
  var gr = new THREE.Group();
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a5d3a, roughness: 0.55, metalness: 0.25 });
  var body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat);
  var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.4, metalness: 0.6 }));
  cap.position.y = 0.13;
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.3, metalness: 0.8 }));
  ring.position.y = 0.19;
  gr.add(body, cap, ring);
  gr.castShadow = true;
  gr.bodyMat = bodyMat;
  return gr;
}

function updateNadeHUD() {
  if (dom.nadeCount) dom.nadeCount.textContent = String(nadeCount);
}

function throwGrenade() {
  if (state !== 'playing') return;
  if (nadeCount <= 0) { showNotice('手雷不足'); return; }
  nadeCount -= 1;
  updateNadeHUD();
  camera.getWorldDirection(_rayDir);
  var origin = camera.getWorldPosition(new THREE.Vector3());
  origin.addScaledVector(_rayDir, 0.7);
  var gr = {
    mesh: makeGrenadeMesh(),
    pos: origin.clone(),
    vel: _rayDir.clone().multiplyScalar(13),
  };
  gr.vel.y += 4.6;
  gr.mesh.position.copy(gr.pos);
  scene.add(gr.mesh);
  grenades.push(gr);
  Sfx.throwNade();
}

function updateGrenades(dt) {
  for (var i = grenades.length - 1; i >= 0; i--) {
    var gr = grenades[i];
    gr.vel.y += CFG.nadeDrop * dt;
    gr.pos.addScaledVector(gr.vel, dt);
    // 落地判定（地面或障碍物顶部），落地瞬间爆炸
    var landedNow = gr.pos.y <= 0.12;
    if (!landedNow) {
      for (var j = 0; j < obstacles.length; j++) {
        var o = obstacles[j];
        if (gr.pos.x > o.min.x - 0.1 && gr.pos.x < o.max.x + 0.1 &&
            gr.pos.y > o.min.y - 0.1 && gr.pos.y < o.max.y + 0.1 &&
            gr.pos.z > o.min.z - 0.1 && gr.pos.z < o.max.z + 0.1) {
          landedNow = true;
          gr.pos.y = Math.max(0.12, o.max.y + 0.12);
          break;
        }
      }
    }
    gr.mesh.position.copy(gr.pos);
    if (landedNow) {
      explodeGrenade(gr);   // 落地即爆炸
      grenades.splice(i, 1);
    } else {
      gr.mesh.rotation.y += dt * 7;
    }
  }
}

function explodeGrenade(gr) {
  var center = gr.mesh.position.clone();
  scene.remove(gr.mesh);
  spawnBurst(center, 0xffa040, 26, 5.5);
  spawnBurst(center, 0xffe0a0, 10, 3);
  spawnBurst(new THREE.Vector3(center.x, 0.15, center.z), 0xa08a6a, 12, 2.5);
  Sfx.nadeBoom();
  // 鱼：爆炸范围内按小怪血量扣伤（初期 1 血一发击杀，后期需多颗）
  var nadeDmg = Math.round(rand(CFG.nadeDamageMin, CFG.nadeDamageMax));
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    if (e.mesh.position.distanceTo(center) <= CFG.nadeRadius) {
      e.hp -= nadeDmg;
      if (e.hp <= 0) killFish(e, e.mesh.position.clone());
    }
  }
  // Boss：按 5~10 随机伤害扣血
  if (boss && boss.mesh.position.distanceTo(center) <= CFG.nadeRadius) {
    boss.hp -= Math.round(rand(CFG.nadeDamageMin, CFG.nadeDamageMax));
    boss.hurt = 0.2;
    updateBossBar();
    if (boss.hp <= 0) defeatBoss();
  }
  // 玩家：距离中心 3 米内同样受伤
  var pdx = center.x - player.pos.x;
  var pdy = center.y - (player.pos.y + 1.0);
  var pdz = center.z - player.pos.z;
  if (pdx * pdx + pdy * pdy + pdz * pdz <= CFG.nadeRadius * CFG.nadeRadius) {
    damagePlayer(Math.round(rand(CFG.nadeDamageMin, CFG.nadeDamageMax)), { name: '自己', atk: '手雷爆炸' });
  }
}

// ---------------------------------------------------------------- 射击
var _rayOrigin = new THREE.Vector3();
var _rayDir = new THREE.Vector3();
var _raycaster = new THREE.Raycaster();
var _hitPoint = new THREE.Vector3();
var _tmpV = new THREE.Vector3();

function raySphere(o, d, c, r) {
  var ocx = o.x - c.x, ocy = o.y - c.y, ocz = o.z - c.z;
  var b = 2 * (ocx * d.x + ocy * d.y + ocz * d.z);
  var a = d.x * d.x + d.y * d.y + d.z * d.z;
  var cc = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
  var disc = b * b - 4 * a * cc;
  if (disc < 0) return -1;
  var sq = Math.sqrt(disc);
  var t1 = (-b - sq) / (2 * a);
  var t2 = (-b + sq) / (2 * a);
  return t1 > 0 ? t1 : (t2 > 0 ? t2 : -1);
}

function shootOnce() {
  if (state !== 'playing' || shootCd > 0) return;
  if (ammo.reloading) return;               // 换弹期间不能射击
  if (ammo.mag <= 0) { requestReload(); return; }          // 弹夹打空：自动换弹（或提示弹药耗尽）
  shootCd = CFG.shootInterval;
  ammo.mag -= 1;
  Sfx.shoot();
  updateAmmoHUD();
  gun.recoil = 0.13;
  gun.flashT = 0.055;
  gun.light.intensity = 6;
  gun.flashMesh.visible = true;
  gun.flashMesh.material.opacity = 0.9 + rand(0, 0.1);

  camera.getWorldPosition(_rayOrigin);
  camera.getWorldDirection(_rayDir);
  _raycaster.set(_rayOrigin, _rayDir);
  _raycaster.far = CFG.shootRange;
  var hits = _raycaster.intersectObjects(wallMeshes, false);
  var wallDist = hits.length ? hits[0].distance : Infinity;

  // 找最近的肥鱼 / Boss（射线与球相交，且不被障碍物遮挡）
  var best = null, bestT = Infinity, hitBoss = false;
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    var c = e.mesh.position;
    var t = raySphere(_rayOrigin, _rayDir, c, CFG.fishHitRadius);
    if (t > 0 && t < wallDist && t < bestT) { bestT = t; best = e; hitBoss = false; }
  }
  if (boss) {
    var bc = boss.mesh.position;
    var bt = raySphere(_rayOrigin, _rayDir, bc, CFG.fishHitRadius * CFG.bossSizeMul);
    if (bt > 0 && bt < wallDist && bt < bestT) { bestT = bt; best = null; hitBoss = true; }
  }
  // 炮弹可被射击（累计 3 发击中触发空爆）
  var hitShell = null;
  for (var sh = 0; sh < bossShots.length; sh++) {
    var st = raySphere(_rayOrigin, _rayDir, bossShots[sh].mesh.position, 0.35);
    if (st > 0 && st < wallDist && st < bestT) { bestT = st; best = null; hitBoss = false; hitShell = bossShots[sh]; }
  }

  if (hitShell) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, bestT);
    hitShell.hits = (hitShell.hits || 0) + 1;
    spawnBurst(_hitPoint, 0xffc84d, 5, 2.2);
    Sfx.shellPing();
    flashCrosshair();
    if (hitShell.hits >= CFG.bossShellDestroyHits) {
      explodeShell(hitShell, bossShots.indexOf(hitShell), true);
      showNotice('炮弹已击毁！');
    }
  } else if (hitBoss) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, bestT);
    boss.hp -= 1 + upgrades.dmg;      // 子弹伤害升级：每发多造成 L 点
    debugLog('你对 超级蓝色大肥鱼 造成了 ' + (1 + upgrades.dmg) + ' 点伤害（剩余 ' + Math.max(0, boss.hp) + '）', 'dbg-hit');
    boss.hurt = 0.15;
    spawnBurst(_hitPoint, 0xffd54a, 10, 3.5);
    Sfx.bossHit();
    flashCrosshair();
    updateBossBar();
    if (boss.hp <= 0) defeatBoss();
  } else if (best) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, bestT);
    best.hp = (best.hp || 1) - (1 + upgrades.dmg);  // 小怪扣血（可多级成长）
    debugLog('你对 ' + enemyName(best) + ' 造成了 ' + (1 + upgrades.dmg) + ' 点伤害' + (best.hp > 0 ? '（剩余 ' + best.hp + ' 血）' : '（击败！）'), 'dbg-hit');
    Sfx.hitFish();
    spawnBurst(_hitPoint, 0x9fd8ff, best.hp > 0 ? 6 : 12, best.hp > 0 ? 2.2 : 3.5);
    flashCrosshair();
    if (best.hp <= 0) killFish(best, _hitPoint);
  } else if (hits.length) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, hits[0].distance);
    spawnBurst(_hitPoint, 0xcfc4ae, 7, 2.6);
    flashCrosshair();
  }
}

// ---------------------------------------------------------------- 伤害 / 结算
// src = { name: 怪物名, atk: 攻击方式 }（Debug 日志用，可缺省）
function damagePlayer(d, src) {
  if (state !== 'playing' || hurtCd > 0) return;
  var raw = d;
  d = Math.max(0, d - armorStacks * CFG.armorPerPick);   // 护甲：每层减免 2 点伤害
  if (d <= 0) {
    if (src) debugLog('受到' + src.name + '的' + src.atk + '攻击（' + raw + '点伤害），经 ' + armorStacks + ' 层护盾完全吸收', 'dbg-dmg');
    return;                                              // 护甲完全吸收（不触发受击反馈）
  }
  if (src) debugLog('受到' + src.name + '的' + src.atk + '攻击的 ' + raw + ' 点伤害，经过 ' + armorStacks + ' 层护盾减免，最终受到 ' + d + ' 点伤害', 'dbg-dmg');
  hurtCd = 0.5;
  player.hp = Math.max(0, player.hp - d);
  Sfx.hurt();
  if (dom.damageFlash) dom.damageFlash.style.opacity = '0.85';
  updateHUD();
  if (player.hp <= 0) gameOver();
}

// 战败界面任意点击/按键（用户手势）→ 立即解锁战败曲播放（绕过自动播放策略）
function armGameoverBgm() {
  if (!overEl) return;
  var h = function () {
    if (state === 'gameover' && overEl.paused) safePlay(overEl);
    document.removeEventListener('pointerdown', h);
    document.removeEventListener('keydown', h);
  };
  document.addEventListener('pointerdown', h);
  document.addEventListener('keydown', h);
}

// reason: 缺省=被肥鱼吃掉；'suicide' = 开发者模式 KILL 秘技自杀
function gameOver(reason) {
  state = 'gameover';
  if (bgmEl && !bgmEl.paused) bgmEl.pause();   // 战败：默认 BGM 立刻停止
  if (overEl) { overEl.currentTime = 0; }       // 战败曲从头播（autoplay 限制下由首次点击触发）
  armGameoverBgm();
  Sfx.gameover();
  if (document.exitPointerLock) document.exitPointerLock();
  if (reason === 'suicide' && dom.gameoverTitle) dom.gameoverTitle.textContent = '你选择了自我了断…';
  dom.finalScore.textContent = String(score);
  dom.finalKills.textContent = String(kills);
  if (dom.finalBossKills) dom.finalBossKills.textContent = String(bossKillCount);
  showOverlay('gameover');
}

function restartGame() {
  if (overEl) { overEl.pause(); overEl.currentTime = 0; }   // 关闭战败曲
  if (bgmEl) bgmEl.currentTime = 0;                          // 默认 BGM 从头（播放在手势内由 requestLock/updateBgm 触发）
  if (bossEl) { bossEl.pause(); bossEl.currentTime = 0; }    // 战斗曲关闭
  bossMusicTempo = 0;
  bossMusicVol = 0;
  if (progressEl) { progressEl.pause(); progressEl.currentTime = 0; } // 进步曲关闭
  progressMusicOn = false;
  if (menuEl) { menuEl.pause(); menuEl.currentTime = 0; }   // 菜单曲复位
  menuMusicOn = false;
  menuMusicVol = 0;
  score = 0; kills = 0; playingTime = 0;
  ammo.mag = CFG.magSize;
  ammo.reserve = CFG.startReserve;
  ammo.reloading = false; ammo.reloadTimer = 0;
  nadeCount = CFG.nadeStartCount;
  for (var gni = 0; gni < grenades.length; gni++) scene.remove(grenades[gni].mesh);
  grenades = [];
  updateNadeHUD();
  for (var iti = 0; iti < items.length; iti++) scene.remove(items[iti].mesh);
  items = [];
  itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax);
  resetCombo();   // 新一局连杀评级清零
  // 重置局内强化与成长（无尽模式技能独立：死亡重来/退出重进均不继承）
  upgrades = { dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0 };
  bossKillCount = 0;
  rewardOptions = null;
  rewardAllMax = false;
  enemyHpNow = 1;
  meleeAtkBonus = 0;
  rangedAtkBonus = 0;
  bossHpNext = CFG.bossHp;
  bossBallDmgNow = CFG.bossBallDamage;
  fishCapNow = CFG.fishCount;
  armorStacks = 0;
  armorTimer = CFG.armorInterval;
  updateArmorHUD();
  if (boss) { scene.remove(boss.mesh); boss = null; }
  for (var bsi = 0; bsi < bossShots.length; bsi++) scene.remove(bossShots[bsi].mesh);
  bossShots = [];
  bossTimer = CFG.bossInterval;
  bossMisses = 0;
  firstBossPending = true;   // 新一局首刷必出
  hideBossBar();
  updateAmmoHUD();
  player.hp = CFG.maxHp;
  player.pos.set(CFG.spawnPoint[0], 0, CFG.spawnPoint[1]);
  player.velY = 0; player.onGround = true;
  player.yaw = 0; player.pitch = 0;
  hurtCd = 0; shootCd = 0; fireHeld = false;
  // 清空上一局全部怪（不继承成长状态），并按重置后的成长参数立刻刷新一轮
  for (var i = 0; i < enemies.length; i++) scene.remove(enemies[i].mesh);
  enemies = [];
  for (var j = 0; j < fishCapNow; j++) spawnFish(pickSpawnPos(16));
  syncCamera();
  updateHUD();
  hideAllOverlays();
  if (lockMode === 'fallback') {
    state = 'playing';
    showFallbackHint();
  } else {
    requestLockWithFallback();
  }
}

// ---------------------------------------------------------------- HUD / 覆盖层
function updateHUD() {
  if (!dom.healthFill) return;
  dom.healthFill.style.width = (player.hp / CFG.maxHp * 100) + '%';   // 按生命上限计算（开发者模式 99999 上限时不失真）
  dom.healthText.textContent = String(player.hp);
  dom.healthFill.classList.toggle('low', player.hp <= 30);
  dom.scoreValue.textContent = String(score);
  dom.killsValue.textContent = String(kills);
  updateAmmoHUD();
  updateNadeHUD();
}

function showKillFeed() {
  if (!dom.killfeed) return;
  var div = document.createElement('div');
  div.className = 'kill-pop';
  div.textContent = '+10';
  dom.killfeed.appendChild(div);
  setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 1000);
}

function flashCrosshair() {
  if (!dom.crosshair) return;
  dom.crosshair.classList.add('hit-hit');
  if (crosshairTimer) clearTimeout(crosshairTimer);
  crosshairTimer = setTimeout(function () { dom.crosshair.classList.remove('hit-hit'); }, 90);
}

function showOverlay(which) {
  dom.menuOverlay.classList.toggle('hidden', which !== 'menu');
  dom.pauseOverlay.classList.toggle('hidden', which !== 'pause');
  dom.gameoverOverlay.classList.toggle('hidden', which !== 'gameover');
  dom.levelOverlay.classList.toggle('hidden', which !== 'level');
  if (dom.rewardOverlay) dom.rewardOverlay.classList.toggle('hidden', which !== 'reward');
  if (dom.victoryOverlay) dom.victoryOverlay.classList.toggle('hidden', which !== 'victory');
  if (dom.skillsOverlay) dom.skillsOverlay.classList.toggle('hidden', which !== 'skills');
}
function hideAllOverlays() {
  dom.menuOverlay.classList.add('hidden');
  dom.pauseOverlay.classList.add('hidden');
  dom.gameoverOverlay.classList.add('hidden');
  dom.levelOverlay.classList.add('hidden');
  if (dom.rewardOverlay) dom.rewardOverlay.classList.add('hidden');
  if (dom.victoryOverlay) dom.victoryOverlay.classList.add('hidden');
  if (dom.skillsOverlay) dom.skillsOverlay.classList.add('hidden');
}

// 关卡选择界面
function showLevelSelect() {
  state = 'levelSelect';
  hideAllOverlays();
  dom.levelOverlay.classList.remove('hidden');
}

// 请求指针锁定；若浏览器不支持、拒绝或超时，自动降级为拖动瞄准模式
function requestLockWithFallback() {
  Sfx.init();
  // 用户手势内直接尝试播放 BGM（自动播放策略下成功率最高）
  if (bgmEl) {
    var pp = bgmEl.play();
    if (pp && pp.catch) pp.catch(function () {});
  }
  clearTimeout(pendingLockTimer);
  if (!dom.canvas.requestPointerLock) { enterFallbackMode(); return; }
  try {
    var p = dom.canvas.requestPointerLock();
    if (p && p.catch) p.catch(function () {
      if (state !== 'playing') enterFallbackMode();
    });
  } catch (e) {
    enterFallbackMode();
    return;
  }
  // 兜底：900ms 内仍未锁定（无 change 事件也无 reject）→ 降级
  pendingLockTimer = setTimeout(function () {
    if (state !== 'playing') enterFallbackMode();
  }, 900);
}

// 降级模式：不依赖指针锁定，移动鼠标转向、点击画面射击、Esc 暂停
function enterFallbackMode() {
  lockMode = 'fallback';
  clearTimeout(pendingLockTimer);
  fbHasLast = false;
  state = 'playing';
  hideAllOverlays();
  showFallbackHint();
}

function showFallbackHint() {
  if (!dom.fallbackHint) return;
  dom.fallbackHint.style.display = 'block';
  dom.fallbackHint.style.opacity = '1';
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function () {
    dom.fallbackHint.style.opacity = '0';
    setTimeout(function () { dom.fallbackHint.style.display = 'none'; }, 600);
  }, 6500);
}

function showFatalError(msg) {
  if (!dom.errorBar) return;
  dom.errorBar.textContent = msg;
  dom.errorBar.style.display = 'block';
}

// ---------------------------------------------------------------- 输入
function onKeyDown(ev) {
  keys[ev.code] = true;
  if (handleKillCheat(ev.code)) return;   // 开发者模式 KILL 自毁序列（消费按键）
  handleDebugCheat(ev.code);          // 开发者模式秘技检测（任意状态下）
  if (ev.code === 'KeyR' && state === 'playing') { requestReload(); }
  if (ev.code === 'KeyG' && state === 'playing') { throwGrenade(); }
  if (ev.code === 'KeyI') {
    if (state === 'playing') openSkills();        // 打开技能等级面板
    else if (state === 'skills') closeSkills();   // 再按 I 关闭
    return;
  }
  if (ev.code === 'Escape') {
    if (state === 'skills') { closeSkills(); return; }  // Esc 关闭技能面板
    // 无指针锁定模式下手动暂停；有锁定时由浏览器退出锁定触发暂停
    if (lockMode === 'fallback' && state === 'playing') {
      state = 'paused';
      showOverlay('pause');
    }
    return;
  }
  if (ev.code === 'Space' && state === 'playing') {
    if (player.onGround) {
      player.velY = CFG.jumpSpeed;
      player.onGround = false;
      Sfx.jump();
    }
  }
}
function onKeyUp(ev) { keys[ev.code] = false; }
function onMouseDown(ev) {
  if (ev.button !== 0 || state !== 'playing') return;
  if (lockMode === 'locked' && document.pointerLockElement !== dom.canvas) return;
  // 覆盖层/按钮上的点击不射击（HUD 默认 pointer-events:none）
  if (ev.target && ev.target !== dom.canvas && ev.target !== document.body) return;
  fireHeld = true;
}
function onMouseUp(ev) {
  if (ev.button === 0) fireHeld = false;
}
function onMouseMove(ev) {
  if (state !== 'playing') return;
  var dx, dy;
  if (lockMode === 'locked') {
    if (document.pointerLockElement !== dom.canvas) return;
    dx = ev.movementX; dy = ev.movementY;
  } else {
    // 拖动瞄准：用鼠标位移增量转向
    if (!fbHasLast) { fbLastX = ev.clientX; fbLastY = ev.clientY; fbHasLast = true; return; }
    dx = ev.clientX - fbLastX;
    dy = ev.clientY - fbLastY;
    fbLastX = ev.clientX; fbLastY = ev.clientY;
  }
  var sens = 0.0022;
  player.yaw -= dx * sens;
  player.pitch -= dy * sens;
  player.pitch = clamp(player.pitch, -1.55, 1.55);
}
function onPointerLockChange() {
  if (lockMode === 'fallback') return;
  var locked = document.pointerLockElement === dom.canvas;
  if (locked) {
    clearTimeout(pendingLockTimer);
    if (state === 'menu' || state === 'levelSelect' || state === 'paused' || state === 'gameover') {
      state = 'playing';
      hideAllOverlays();
    }
  } else if (state === 'playing') {
    state = 'paused';
    showOverlay('pause');
  }
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------------------------------------------------------- 玩家更新
function updatePlayer(dt) {
  if (state !== 'playing') return;

  var f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  var s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  var sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  var mx = -sin * f + cos * s;
  var mz = -cos * f - sin * s;
  var len = Math.sqrt(mx * mx + mz * mz);
  var moving = len > 0.01;
  if (moving) {
    mx /= len; mz /= len;
    var spdNow = CFG.walkSpeed * (1 + upgrades.speed * CFG.upgradeSpeedPerLevel); // 疾风步伐：速度 +5%/级
    movePlayer(mx * spdNow * dt, mz * spdNow * dt);
    stepTimer += spdNow * dt;
    if (stepTimer > 2.6) { stepTimer = 0; Sfx.step(); }
  } else {
    stepTimer = 0;
  }

  // 重力与跳跃（含障碍物顶面支撑：可站上箱子/矮墙等）
  var prevY = player.pos.y;
  player.velY += CFG.gravity * dt;
  player.pos.y += player.velY * dt;
  var supportY = 0;
  if (player.velY <= 0) {
    for (var oi = 0; oi < obstacles.length; oi++) {
      var ob = obstacles[oi];
      if (player.pos.x > ob.min.x - 0.4 && player.pos.x < ob.max.x + 0.4 &&
          player.pos.z > ob.min.z - 0.4 && player.pos.z < ob.max.z + 0.4) {
        // 跨越检测：本轮脚底从 prevY 降到 pos.y，期间穿过顶面则吸附（防高速下落穿箱）
        if (ob.max.y <= prevY + 0.02 && ob.max.y >= player.pos.y - 0.3 && ob.max.y > supportY) {
          supportY = ob.max.y;
        }
      }
    }
  }
  if (player.pos.y <= supportY) {
    player.pos.y = supportY;
    player.velY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  syncCamera();
}

// 3D 碰撞：仅当玩家身体垂直范围与障碍物重叠时才水平阻挡
// （跳起可越过矮箱；顶棚等高架物下方可通行；角色可站上障碍物顶面）
function playerBlocked(o, px, pz) {
  var feet = player.pos.y, head = feet + CFG.eyeHeight;
  if (head <= o.min.y || feet >= o.max.y - 0.001) return false;
  var r = CFG.playerRadius;
  return px > o.min.x - r && px < o.max.x + r && pz > o.min.z - r && pz < o.max.z + r;
}

function movePlayer(dx, dz) {
  var r = CFG.playerRadius;
  var nx = player.pos.x + dx;
  var nz = player.pos.z + dz;
  // X 轴
  var blockedX = false;
  for (var i = 0; i < obstacles.length; i++) {
    if (playerBlocked(obstacles[i], nx, player.pos.z)) { blockedX = true; break; }
  }
  if (!blockedX) player.pos.x = nx;
  else {
    for (var j = 0; j < obstacles.length; j++) {
      var ob = obstacles[j];
      if (playerBlocked(ob, player.pos.x, player.pos.z)) {
        if (dx > 0) player.pos.x = ob.min.x - r - 0.01;
        else if (dx < 0) player.pos.x = ob.max.x + r + 0.01;
      }
    }
  }
  // Z 轴
  var blockedZ = false;
  for (var k = 0; k < obstacles.length; k++) {
    if (playerBlocked(obstacles[k], player.pos.x, nz)) { blockedZ = true; break; }
  }
  if (!blockedZ) player.pos.z = nz;
  else {
    for (var m = 0; m < obstacles.length; m++) {
      var obz = obstacles[m];
      if (playerBlocked(obz, player.pos.x, player.pos.z)) {
        if (dz > 0) player.pos.z = obz.min.z - r - 0.01;
        else if (dz < 0) player.pos.z = obz.max.z + r + 0.01;
      }
    }
  }
  player.pos.x = clamp(player.pos.x, -CFG.arena - 0.2, CFG.arena + 0.2);
  player.pos.z = clamp(player.pos.z, -CFG.arena - 0.2, CFG.arena + 0.2);
}

function updateGun(dt) {
  gun.recoil = Math.max(0, gun.recoil - dt * 1.1);
  gun.group.position.z = -0.6 + gun.recoil * 1.15;
  var moving = (keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD) && player.onGround && state === 'playing';
  var sway = moving ? 1 : 0;
  gun.group.position.y = -0.28 + Math.sin(time * 9) * 0.012 * sway;
  gun.group.rotation.x = Math.sin(time * 9 + 1) * 0.012 * sway;
  if (gun.flashT > 0) {
    gun.flashT -= dt;
    gun.light.intensity = Math.max(0, gun.light.intensity - dt * 130);
    if (gun.flashT <= 0) { gun.flashMesh.visible = false; gun.light.intensity = 0; }
  }
}

// ---------------------------------------------------------------- 主循环
function update(dt) {
  time += dt;
  if (state === 'playing') playingTime += dt;
  shootCd = Math.max(0, shootCd - dt);
  hurtCd = Math.max(0, hurtCd - dt);
  if (dom.damageFlash && dom.damageFlash.style.opacity !== '0') {
    var op = parseFloat(dom.damageFlash.style.opacity || '0') - dt * 3;
    dom.damageFlash.style.opacity = op > 0 ? String(op) : '0';
  }
  updatePlayer(dt);
  updateGun(dt);
  if (state === 'playing') {
    if (fireHeld) shootOnce();
    updateEnemies(dt);
    updateItems(dt);
    updateBoss(dt);
    updateBossShots(dt);
    updateGrenades(dt);
    updateFishBullets(dt);
    updateCombo(dt);   // 连杀窗口倒计时（暂停时冻结）
    if (debugMode) {
      debugHealTimer -= dt;                       // 开发者模式：每 5 秒恢复 100 生命
      if (debugHealTimer <= 0) {
        debugHealTimer = 5;
        player.hp = Math.min(CFG.maxHp, player.hp + 100);
        updateHUD();
      }
    }
  } else {
    updateBoss(dt);   // 暂停/结算时 Boss 仍做视觉动画
  }
  // 换弹进程（1.5 秒后扣备弹补弹夹）
  if (ammo.reloading) {
    ammo.reloadTimer -= dt;
    if (dom.reloadWrap) {
      dom.reloadWrap.style.display = 'block';
      dom.reloadFill.style.width = Math.max(0, Math.min(100, (1 - ammo.reloadTimer / CFG.reloadTime) * 100)) + '%';
    }
    if (ammo.reloadTimer <= 0) {
      var need = CFG.magSize - ammo.mag;
      var take = Math.min(need, ammo.reserve);
      ammo.mag += take;
      ammo.reserve -= take;
      ammo.reloading = false;
      if (dom.reloadWrap) dom.reloadWrap.style.display = 'none';
      Sfx.reloadDone();
      updateAmmoHUD();
    }
  }
  updateFishVisuals(dt);
  updateParticles(dt);
  updateHUD();
  drawMiniMap();
  updateBgm(dt);
  if (debugMode) updateDebugLog(dt);   // Debug 消息上移/淡出/清理
  ensureFishPool();   // 小怪生成速率成长：场上数量补足上限
}

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(0.05, clock.getDelta());
  update(dt);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- 初始化
function init() {
  if (renderer !== undefined) return; // 防重入
  window.__stage = ['init-start'];
  function mark(s) { try { window.__stage.push(s); } catch (e) {} }
  var canvas = document.getElementById('game-canvas');
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) {
    showFatalError('无法初始化 WebGL：' + (e && e.message ? e.message : e) + '（请确认浏览器开启了硬件加速/WebGL）');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mark('renderer');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mark('shadow');

  scene = new THREE.Scene();
  clock = new THREE.Clock();
  mark('scene/clock');

  dom.canvas = canvas;
  var idMap = {
    healthFill: 'health-fill', healthText: 'health-text',
    scoreValue: 'score-value', killsValue: 'kills-value',
    damageFlash: 'damage-flash', crosshair: 'crosshair', killfeed: 'killfeed',
    menuOverlay: 'menu-overlay', pauseOverlay: 'pause-overlay',
    gameoverOverlay: 'gameover-overlay', finalScore: 'final-score', finalKills: 'final-kills',
    gameoverTitle: 'gameover-title',
    fallbackHint: 'fallback-hint', errorBar: 'error-bar',
    ammoMag: 'ammo-mag', ammoReserve: 'ammo-reserve',
    reloadWrap: 'reload-wrap', reloadFill: 'reload-fill', noticePop: 'notice-pop',
    bossBarWrap: 'boss-bar-wrap', bossName: 'boss-name', bossFill: 'boss-fill',
    bossHpCur: 'boss-hp-cur', bossHpMax: 'boss-hp-max',
    nadeCount: 'nade-count', comboPop: 'combo-pop',
    armorValue: 'armor-value', armorDots: 'armor-dots',
    rewardOverlay: 'reward-overlay', rewardCards: 'reward-cards',
    victoryOverlay: 'victory-overlay', finalScoreV: 'final-score-v',
    finalKillsV: 'final-kills-v', finalBossKillsV: 'final-bosskills-v',
    finalBossKills: 'final-bosskills',
    skillsOverlay: 'skills-overlay', skillsList: 'skills-list',
    debugLog: 'debug-log',
    minimapCanvas: 'minimap-canvas',
    levelOverlay: 'level-overlay',
  };
  Object.keys(idMap).forEach(function (key) { dom[key] = document.getElementById(idMap[key]); });

  var preview = document.getElementById('fish-preview');
  if (preview && window.FISH_TEXTURE_DATA) preview.src = window.FISH_TEXTURE_DATA;

  buildEnvironment();
  mark('environment');
  buildMiniMap();
  initBgm();
  buildPlayer();
  mark('player');
  buildGun();
  mark('gun');
  buildParticles();
  mark('particles');
  loadFishTexture();
  mark('texture');
  ammo.mag = CFG.magSize;
  ammo.reserve = CFG.startReserve;
  itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax);
  if (dom.bossName) dom.bossName.textContent = '超级蓝色大肥鱼';
  updateHUD();
  updateArmorHUD();

  mark('events-before');
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', onResize);

  mark('buttons-about-to-bind');
  var btnStart = document.getElementById('btn-start');
  var btnResume = document.getElementById('btn-resume');
  var btnRestart = document.getElementById('btn-restart');
  if (btnStart) btnStart.addEventListener('click', function () { showLevelSelect(); });
  if (btnResume) btnResume.addEventListener('click', function () {
    if (lockMode === 'fallback') { state = 'playing'; hideAllOverlays(); return; }
    requestLockWithFallback();
  });
  if (btnRestart) btnRestart.addEventListener('click', function () { restartGame(); });
  var btnVictoryRestart = document.getElementById('btn-victory-restart');
  if (btnVictoryRestart) btnVictoryRestart.addEventListener('click', function () { restartGame(); });
  // 奖励卡片：点击选择对应技能（事件委托，卡片动态重建）
  if (dom.rewardCards) {
    dom.rewardCards.addEventListener('click', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.reward-card') : null;
      if (card && card.getAttribute('data-idx') !== null) chooseReward(parseInt(card.getAttribute('data-idx'), 10));
    });
  }
  var btnLevelDesert = document.getElementById('btn-level-desert');
  var btnLevelBack = document.getElementById('btn-level-back');
  if (btnLevelDesert) btnLevelDesert.addEventListener('click', function () {
    if (state !== 'levelSelect') return;
    hideAllOverlays();
    requestLockWithFallback();
  });
  if (btnLevelBack) btnLevelBack.addEventListener('click', function () {
    state = 'menu';
    showOverlay('menu');
  });
  mark('buttons-bound');
  animate();
  mark('animate-called');
}

// 供无头冒烟测试与调试使用
window.FishGame = {
  init: init,
  __debug: {
    getState: function () { return state; },
    getScore: function () { return score; },
    getKills: function () { return kills; },
    getPlayer: function () { return player; },
    getEnemies: function () { return enemies; },
    getObstacles: function () { return obstacles; },
    isFishReady: function () { return fishTexReady; },
    shootOnce: shootOnce,
    damagePlayer: damagePlayer,
    update: update,
    restart: restartGame,
    pressKey: function (code, down) { keys[code] = down; },
    releaseKeys: function () { keys = Object.create(null); },
    getLockMode: function () { return lockMode; },
    getAmmo: function () { return ammo; },
    setAmmo: function (mag, reserve) {
      ammo.mag = mag; ammo.reserve = reserve;
      ammo.reloading = false; ammo.reloadTimer = 0;
      updateAmmoHUD();
      updateHUD();
    },
    getItems: function () { return items; },
    getBoss: function () { return boss; },
    getBossShots: function () { return bossShots; },
    setBossTimer: function (v) { bossTimer = v; },
    getBossMisses: function () { return bossMisses; },
    getBgmInfo: function () {
      return {
        exists: !!bgmEl,
        loop: bgmEl ? bgmEl.loop : false,
        volume: bgmEl ? bgmEl.volume : 0,
        paused: bgmEl ? bgmEl.paused : true,
        overExists: !!overEl,                                    // 战败曲资源
        overPaused: overEl ? overEl.paused : true,
        overVolume: overEl ? overEl.volume : 0,
        bossExists: !!bossEl,                                    // Boss 战斗曲资源
        bossTempo: bossMusicTempo,
        bossVol: bossMusicVol,
        progressExists: !!progressEl,                                // "进步的小曲"资源
        progressOn: progressMusicOn,
        menuExists: !!menuEl,                                        // "来去曼波"资源
        menuOn: menuMusicOn,
        menuVol: menuMusicVol,
      };
    },
    openSkills: openSkills,
    closeSkills: closeSkills,
    isSkillsOpen: function () { return state === 'skills'; },
    // ---- 开发者模式 ----
    isDebugMode: function () { return debugMode; },
    enterDebug: enterDebugMode,
    exitDebug: exitDebugMode,
    getDebugLogs: function () { return debugLogs.map(function (l) { return l.el.textContent; }); },
    setBossMisses: function (v) { bossMisses = v; },
    inertEnemies: function () {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.alive) {
          e.state = 'patrol';
          e.seeCheckTimer = 9999;       // 冻结发现检测
          e.lostTimer = 0;
          e.waypoint.set(e.mesh.position.x, 0, e.mesh.position.z);
          e.waitTimer = 9999;
        }
      }
    },
    spawnTestShell: function (x, y, z, vx, vy, vz) {
      var ball = new THREE.Group();
      var body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x444a52, roughness: 0.4, metalness: 0.65 }));
      ball.add(body);
      ball.position.set(x, y, z);
      scene.add(ball);
      var sh = { mesh: ball, vel: new THREE.Vector3(typeof vx === 'number' ? vx : 0, typeof vy === 'number' ? vy : 0, typeof vz === 'number' ? vz : 7), life: 30, hits: 0 };
      bossShots.push(sh);
      return sh;
    },
    spawnBoss: function () { spawnBoss(); },
    getNadeCount: function () { return nadeCount; },
    setNadeCount: function (v) { nadeCount = v; updateNadeHUD(); },
    getGrenades: function () { return grenades; },
    getFishBullets: function () { return fishBullets; },
    clearProjectiles: function () {
      for (var i = 0; i < fishBullets.length; i++) scene.remove(fishBullets[i].mesh);
      fishBullets = [];
      for (var j = 0; j < bossShots.length; j++) scene.remove(bossShots[j].mesh);
      bossShots = [];
      for (var k = 0; k < grenades.length; k++) scene.remove(grenades[k].mesh);
      grenades = [];
    },
    getFireCount: function () { return dbgFireCount; },
    // ---- 连杀评级调试接口 ----
    comboAdd: function (points) { addComboPoints(points); },
    comboGet: function () { return { score: combo.score, rank: combo.rank, timer: combo.timer, rankName: combo.rank >= 0 ? CFG.comboRanks[combo.rank] : null }; },
    comboReset: resetCombo,
    comboRankPoints: function () { return CFG.comboRankPoints; },
    // ---- 局内强化调试接口（无尽模式） ----
    getUpgrades: function () { return upgrades; },
    setUpgradeLevel: function (id, lv) { upgrades[id] = lv; if (isAllUpgradeMax()) rewardAllMax = true; },
    getRewardOptions: function () { return rewardOptions; },
    chooseReward: chooseReward,
    getGrowth: function () {
      return { bossKillCount: bossKillCount, enemyHpNow: enemyHpNow, meleeAtkBonus: meleeAtkBonus,
        rangedAtkBonus: rangedAtkBonus, bossHpNext: bossHpNext, bossBallDmgNow: bossBallDmgNow, fishCapNow: fishCapNow };
    },
    getArmor: function () { return armorStacks; },
    setArmor: function (v) { armorStacks = v; updateArmorHUD(); },
    spawnArmorItem: spawnArmorItem,
    isRewardOpen: function () { return state === 'reward'; },
    isMaxAll: function () { return rewardAllMax; },
    setBossHp: function (v) { if (boss) { boss.hp = v; } },
    simulateGrowth: function () { growEnemies(); },
    resetProgression: function () {
      upgrades = { dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0 };
      bossKillCount = 0;
      rewardOptions = null;
      rewardAllMax = false;
      enemyHpNow = 1;
      meleeAtkBonus = 0;
      rangedAtkBonus = 0;
      bossHpNext = CFG.bossHp;
      bossBallDmgNow = CFG.bossBallDamage;
      fishCapNow = CFG.fishCount;
      armorStacks = 0;
      armorTimer = CFG.armorInterval;
      updateArmorHUD();
    },
    spawnShooter: function (x, z) {
      var e = spawnFish(new THREE.Vector3(x, 0, z));
      e.ranged = true;
      e.speedMul = 1.0;
      if (e.gunMesh) e.gunMesh.visible = true;
      return e;
    },
    removeBoss: function () {
      if (boss) { scene.remove(boss.mesh); boss = null; }
      for (var i = 0; i < bossShots.length; i++) scene.remove(bossShots[i].mesh);
      bossShots = [];
      hideBossBar();
    },
    spawnTestItem: function (type, x, z) {
      var mesh = buildItem(type, new THREE.Vector3(x, 0, z));
      scene.add(mesh);
      items.push({ mesh: mesh, type: type, phase: 0 });
      return items[items.length - 1];
    },
    reload: requestReload,
    setHp: function (v) { player.hp = v; updateHUD(); },
    resetHurt: function () { hurtCd = 0; },
    setState: function (s) { state = s; },
    enterFallback: enterFallbackMode,
    requestLock: requestLockWithFallback,
    CFG: CFG,
  },
};

// 自动启动：脚本位于 body 末尾，DOM 已就绪，直接初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { init(); });
} else {
  init();
}

})();
