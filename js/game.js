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
  // ---- 波次与阶段系统 ----
  waveBaseCount: 6,        // 第 1 阶段每波敌人数量
  waveCountPerStage: 2,    // 每升一阶段，每波额外敌人数量
  wavePrepareTime: 2.2,    // 波次提示到出怪的时间（秒）
  waveRestTime: 4.5,       // 清波后的喘息时间（秒）
  // ---- 特殊敌人参数 ----
  bomberChargeSpeed: 7.2,    // 自爆鱼冲锋速度（m/s）
  bomberTriggerRange: 2.0,   // 启动自爆的距离（米，爬行者式：贴近后点火）
  bomberFuseTime: 3.0,       // 引信时长（秒）：点火后定身 3 秒再爆
  bomberDetectRange: 14.0,   // 索敌范围（米）：玩家在此范围内触发红屏警告
  bomberMinSpawnDist: 12,    // 自爆鱼出生时距玩家的最小距离（米）
  bomberFatalRange: 1.0,     // 自爆致命范围：1 米内
  bomberBlastRange: 5.0,     // 自爆波及范围：1~5 米
  shieldFishHp: 3,           // 护盾鱼：护盾可承受的子弹数（破盾后才受伤）
  healerInterval: 2.4,       // 治疗鱼：治疗间隔（秒）
  healerAmount: 1,           // 治疗鱼：每次回复的生命值下限
  healerHealPercent: 0.18,   // 治疗鱼：每次按目标生命上限的百分比回复（取两者较大值）
  healerRange: 2.4,          // 治疗鱼：治疗生效距离
  splitterJumpHeight: 1.7,   // 分裂鱼：跳跃高度（米）
  splitterJumpPeriod: 0.8,   // 分裂鱼：跳跃周期（秒）
  splitterSpawnCount: 2,     // 分裂鱼：死亡分裂出的小鱼数量
  bomberDamageClose: 100,    // 1 米内基础伤害
  bomberDamageFar: 50,       // 1~5 米基础伤害
  bossEveryWaves: 5,       // 每清理 N 波刷新一次 Boss
  bossesPerStage: 4,       // 每击杀 N 次 Boss 升一个阶段（阶段 5 在第 16 只 Boss 出现）
  rewardsPerBoss: 2,       // 每击败一只 Boss 获得的强化次数（两次三选一）
  maxStage: 5,             // 阶段上限（共 5 阶段）
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
  // 弹药：实际数值见 WEAPONS（每枪弹夹/备弹）与 MAG_TIERS（扩容档位），此处不再重复定义
  // 补给物品
  healthPack: 10,          // 血量补给量
  itemIntervalMin: 8,      // 物品生成间隔下限（秒）
  itemIntervalMax: 12,     // 物品生成间隔上限（秒）
  itemMax: 4,              // 场上物品数量上限
  // 弹药箱：拾取后两把枪各补「一个弹夹容量」；刷新概率随弹药紧张度动态变化
  itemAmmoChanceBase: 0.30,   // 弹药充足（两把枪都满）时的基础出现概率
  itemAmmoChanceRange: 0.55,  // 弹药越紧缺，概率最多再叠加 55%（即上限 85%）
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
  magDropChance: 0.32,     // 击杀特殊敌人时掉落扩容弹夹的概率
  // ---- Boss 变体参数（按阶段切换类型）----
  bossChargeSpeed: 15,       // 狂暴冲锋鱼：冲锋速度（米/秒）
  bossChargeDamage: 30,      // 狂暴冲锋鱼：冲撞伤害
  bossChargeInterval: 4.5,   // 狂暴冲锋鱼：两次冲锋的间隔
  bossChargeTime: 1.0,       // 狂暴冲锋鱼：单次冲锋持续
  bossSummonInterval: 6.0,   // 召唤祭司鱼：召唤间隔
  bossSummonCount: 3,        // 召唤祭司鱼：每次召唤数量
  bossBarrageInterval: 3.2,  // 重炮台鱼：齐射间隔
  bossBarrageSpread: 0.15,   // 重炮台鱼：三连炮角度偏移（弧度）
  bossSplitCount: 3,         // 分裂母鱼：半血分裂的小怪数量
  bossShootInterval: 2.2,  // Boss 射击间隔（秒）
  bossScore: 50,           // 击败 Boss 得分
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
  upgradeMaxLevel: 8,         // 每种奖励技能最高等级
                              // 核心 5 项 = 40 次强化，配合每 Boss 2 次 ≈ 第 20 只 Boss 通关
                              // （原来 10 级 / 每 Boss 1 次 = 需要 50 只 Boss ≈ 250 波，实际不可达）
  upgradeDmgPerLevel: 1,      // （1）子弹伤害：每级 +L 点
  upgradeRefundChance: 0.10,  // （2）击杀后 10% 概率恢复子弹
  upgradeRefundPerLevel: 2,   // （2）每级恢复量 +2 颗（L 级回 2L 颗）
  upgradeHealChanceBase: 0.05,// （3）击杀后 5% 概率恢复 10 生命（每级 +1%）
  upgradeHealChanceInc: 0.01,
  upgradeHealAmount: 10,
  upgradeNadeChanceBase: 0.01,// （4）击杀后 1% 概率获得手雷（每级 +1%）
  upgradeNadeChanceInc: 0.01,
  upgradeSpeedPerLevel: 0.05, // （5）速度每级 +5%（L 级 +5L%）
  // ---- 扩展技能（V0.4.1 新增 6 项：让三选一真正有构筑感） ----
  upgradeMagPerLevel: 3,      // 扩容弹匣：弹匣容量每级 +3
  upgradeCritPerLevel: 0.05,  // 致命打击：暴击率每级 +5%（暴击伤害 ×2）
  upgradeCritMul: 2.0,        // 暴击伤害倍率
  upgradeNadeDmgPerLevel: 3,  // 高爆手雷：伤害每级 +3
  upgradeNadeRadiusPerLevel: 0.25, // 高爆手雷：半径每级 +0.25 米
  upgradeArmorPerLevel: 1,    // 护甲强化：护甲层数上限每级 +1
  upgradeVampirePerLevel: 0.5,// 杀戮汲取：每次击杀回血每级 +0.5
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
// 摄像机打击反馈：受击抖动 / 跳跃摆动 / 落地回正 / 行走晃动
var camFx = { shake: 0, sway: 0, swayT: 0, land: 0, landT: 0, lastLandV: 0, walk: 0, walkT: 0, lastX: 0, lastZ: 0, fire: 0, fireT: 0 };
var keys = Object.create(null);
var fireHeld = false;
var shootCd = 0, hurtCd = 0, stepTimer = 0;
// 受伤无敌帧按来源分组：近战 / 远程 / 爆炸各算各的 ——
// 否则 A 怪的伤害会屏蔽 B 怪（例如刚被咬过时，自爆鱼的 100 点核弹伤害会被整发吞掉）
var hurtCdByKind = { melee: 0, ranged: 0, blast: 0 };

/** 根据攻击方式判定伤害来源类型（用于分组无敌帧） */
function hurtKindOf(src) {
  var atk = (src && src.atk) ? String(src.atk) : '';
  if (atk.indexOf('爆炸') >= 0 || atk.indexOf('自爆') >= 0) return 'blast';
  if (atk.indexOf('子弹') >= 0 || atk.indexOf('射击') >= 0) return 'ranged';
  return 'melee';
}
var playingTime = 0;              // 本局游戏进行时长（秒）
var ammo = { mag: 0, reserve: 0, magSize: 7, reloading: false, reloadTimer: 0 };  // magSize 由 magSizeNow() 按武器与扩容等级维护
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
// 技能等级 0~10：5 项核心（通关判定只看核心）+ 6 项扩展（提供构筑多样性）
var upgrades = {
  dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0,
  crit: 0, pierce: 0, nadedmg: 0, armorup: 0, vampire: 0,
}; // 旧注释：dmg=子弹伤害, refund=回弹, heal=回血, nade=掉雷, speed=速度）
var upgradesAllMax = false;      // 缓存：技能全部满级（仅在技能等级变化时检测一次，击杀 Boss 时直接读取，零帧开销）
var bossKillCount = 0;         // 本局已击杀 Boss 数（驱动敌人成长与阶段推进）

// ---- 波次系统状态 ----
var wave = {
  number: 0,           // 当前波次编号（1 起）
  state: 'prepare',    // prepare 准备 | fighting 战斗中 | cleared 已清空 | boss Boss 战
  timer: 0,
  total: 0,            // 本波敌人总数
};
var stageShown = 1;    // 已播报过的阶段（用于阶段提升提示）

// 各阶段解锁的特殊敌人（阶段 2 起每种 2 个，依次解锁）
var STAGE_ENEMIES = ['bomber', 'shield', 'healer', 'splitter'];
var ENEMY_LABEL = { bomber: '自爆鱼', shield: '护盾鱼', healer: '治疗鱼', splitter: '分裂鱼', normal: '常规鱼' };
var rewardOptions = null;
var rewardRoundsLeft = 0;   // 当前 Boss 剩余的强化选择次数（每只 Boss rewardsPerBoss 次）      // 当前奖励窗口可选项 [{id, name, ico, lv, desc, next}]

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
var cheatMusicOn = false;        // 作弊被抓搞怪音乐循环开关
var cheatMusicTimer = 0;         // 音符节奏计时
var cheatMusicStep = 0;          // 循环音符步进
// ===== 触屏控制（手机版） =====
var isTouch = false;             // 触屏设备检测
var touchJoy = { f: 0, s: 0 };   // 虚拟摇杆向量（f=前后 -1~1, s=左右 -1~1）
var touchFiring = false;         // 开火按钮按住
var touchLastX = 0, touchLastY = 0, touchHasLast = false;
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
// ---------------------------------------------------------------- 本地存档（最高记录 / 设置 / 成就）
// 用 localStorage 持久化；隐私模式或存储被禁用时静默降级为「本局有效」
var sens = 0.0022;   // 鼠标灵敏度（设置面板会按倍数调整）
var SAVE_KEY = 'bff_save_v1';
var save = {
  bestScore: 0,      // 历史最高得分
  bestTime: 0,       // 最久存活（秒）
  bestCombo: -1,     // 最高连杀评级索引（-1 = 尚未获得）
  bestWave: 0,       // 最远波次
  bestStage: 1,      // 最远阶段
  bestBoss: 0,       // 单局最多击破 Boss
  unlockedLevel: false,                              // 闯关模式解锁（预留）
  tutorialShown: false,                              // 是否已弹过「三武器」新手提示
  stats: { totalKills: 0, totalBoss: 0, totalGames: 0 },  // 跨局累计统计（成就用）
  v: 4,                                              // 存档版本（用于一次性迁移）
  settings: {
    bgm: 1.0, boss: 1.0, menu: 1.0, sfx: 1.0,   // 音量倍数（0~1）
    sens: 1.0,                                   // 鼠标灵敏度倍数（0.25~3.0）
    particles: true, shadow: true, colorblind: false,  // 画质与无障碍
  },
  achievements: {},                                  // 成就解锁状态（成就系统使用）
};

function loadSave() {
  try {
    var raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    var obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      for (var k in save) {
        if (obj[k] !== undefined && obj[k] !== null) save[k] = obj[k];
      }
      // settings 是嵌套对象：逐字段合并，兼容旧存档缺失的键
      if (obj.settings && typeof obj.settings === 'object') {
        for (var sk in save.settings) {
          if (obj.settings[sk] !== undefined) save.settings[sk] = obj.settings[sk];
        }
      }
      // 存档迁移：v2 起重新记录成就 —— 清掉之前版本（含开发期测试）留下的成就数据。
      // 注意必须判断「旧存档里的 v」，不能用 save.v（它的默认值就是 2，会掩盖旧版本）
      if (!obj.v || obj.v < 2) {
        save.achievements = {};
        save.stats = { totalKills: 0, totalBoss: 0, totalGames: 0 };
      }
      // v3：清空成就、游玩统计与最佳记录（设置保留，玩家可手动清）
      if (!obj.v || obj.v < 3) {
        save.achievements = {};
        save.stats = { totalKills: 0, totalBoss: 0, totalGames: 0 };
        save.bestScore = 0; save.bestTime = 0; save.bestCombo = -1;
        save.bestWave = 0; save.bestStage = 1; save.bestBoss = 0;
      }
      // v4：正式发布版本 —— 再次清空成就 / 统计 / 最佳记录，
      // 保证玩家首次打开时是干净存档（不带任何开发期测试数据）
      if (!obj.v || obj.v < 4) {
        save.achievements = {};
        save.stats = { totalKills: 0, totalBoss: 0, totalGames: 0 };
        save.bestScore = 0; save.bestTime = 0; save.bestCombo = -1;
        save.bestWave = 0; save.bestStage = 1; save.bestBoss = 0;
      }
      save.v = 4;
      persistSave();
    }
  } catch (e) { /* 隐私模式 / 存储禁用：忽略 */ }
}

function persistSave() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

// ---------------------------------------------------------------- 真实音效（assets/sfx/）
// 命名里带 1 / 2 的音效会在触发时随机播放其中一个（如 Boss 检测语音）
var SFX_FILES = {
  bossDetect:  ['sfx_boss_detect_1.mp3', 'sfx_boss_detect_2.mp3'],   // 随机二选一
  pistolShot:  'sfx_pistol_shot.mp3',
  rifleShot:   'sfx_rifle_shot.mp3',
  fishShoot:   'sfx_fish_shoot.mp3',
  meleeNear:   'sfx_melee_near.mp3',
  shieldNear:  'sfx_shield_near.mp3',
  bomberAlert: 'sfx_bomber_alert.mp3',
  heal:        'sfx_heal.mp3',
  split:       'sfx_split.mp3',
  grenade:     'sfx_grenade.mp3',
  boom:        'sfx_boom.mp3',
  swordHit:    'sfx_sword_hit.mp3',
  gameOver:    'sfx_gameover.mp3',
};

// 池化播放：每个音效准备若干 Audio 实例轮换，支持连发时重叠播放
var SFX_POOL_SIZE = 6;
var sfxPool = {};

function playSfx(key, volume) {
  if (typeof Audio === 'undefined') return;   // 无头测试环境没有 Audio，直接跳过
  var files = SFX_FILES[key];
  if (!files) return;
  var vol = (volume === undefined ? 1 : volume) * (save.settings ? save.settings.sfx : 1);
  vol = Math.max(0, Math.min(1, vol));
  if (vol <= 0) return;

  if (!sfxPool[key]) {
    var arr = [];
    for (var i = 0; i < SFX_POOL_SIZE; i++) {
      // 多文件音效把不同池位分到不同文件上，播放时随机取池位即等于随机文件
      var f = Array.isArray(files) ? files[i % files.length] : files;
      var a = new Audio('assets/sfx/' + f);
      a.preload = 'auto';
      arr.push(a);
    }
    sfxPool[key] = { idx: Math.floor(Math.random() * SFX_POOL_SIZE), audios: arr };
  }
  var pool = sfxPool[key];
  var audio = pool.audios[pool.idx];
  pool.idx = (pool.idx + 1) % pool.audios.length;
  audio.volume = vol;
  try { audio.currentTime = 0; } catch (e) {}
  var pr = audio.play();
  if (pr && pr.catch) pr.catch(function () {});
  return audio;
}

// ---------------------------------------------------------------- 敌人语音绑定
// 敌人语音（台词 / 射手鱼 biu）与具体敌人绑定：该敌人死亡时立即掐断，
// 避免鱼已经消失但台词还在继续播放。
function stopEnemyVoice(e) {
  if (e && e.voiceAudio) {
    try { e.voiceAudio.pause(); e.voiceAudio.currentTime = 0; } catch (er) {}
    e.voiceAudio = null;
  }
}

function playEnemyVoice(e, key, volume) {
  stopEnemyVoice(e);                       // 同一敌人同一时刻只留一条语音
  var a = playSfx(key, volume);
  if (a && e) e.voiceAudio = a;
  return a;
}

// ---------------------------------------------------------------- 武器系统（双武器切换）
// 手枪：均衡（标准弹夹 7 发 / 0.16s / 1.0 倍伤害），点射
// 突击步枪：高射速大弹匣但单发偏低（标准弹夹 25 发 / 0.082s / 0.72 倍），全自动 + 轻微散布
// 两把武器弹药独立，备弹池各自累计
var WEAPONS = {
  pistol: {
    key: '1', name: '手枪', magSize: 7, shootInterval: 0.16, reloadTime: 1.5,
    damageMul: 1.0, recoil: 0.13, spread: 0, reserveStart: 42,
    reserveMagMul: 8,            // 备弹上限 = 当前弹夹容量 × 8
    auto: false,                 // 点射：按一下打一发，按住不放不会连发
  },
  rifle: {
    key: '2', name: '突击步枪', magSize: 25, shootInterval: 0.082, reloadTime: 2.0,
    damageMul: 0.72, recoil: 0.075, spread: 0.014, reserveStart: 100,
    reserveMagMul: 6,            // 备弹上限 = 当前弹夹容量 × 6
    auto: true,                  // 全自动：按住持续射击
  },
  knife: {
    key: '3', name: '匕首', melee: true,
    magSize: 0, reserveStart: 0, reserveMagMul: 0,
    shootInterval: 0.38,         // 轻击间隔
    heavyCd: 1.05,               // 重击间隔（明显更慢）
    // ★ N4 修复：攻击范围 1.0 -> 2.6 米。
    //   近战鱼攻击范围 2.1 米，1.0 米的匕首会让玩家必定站在敌人攻击圈里 ——
    //   杀一只 10 血小怪要挨 3 次咬（45~150 伤害），基本必死。
    //   2.6 米略大于敌人，让「卡着距离戳」成为真正的技术点。
    range: 2.6,
    damage: 2,                   // 轻击基础伤害
    heavyMul: 2,                 // 重击伤害恒为轻击的 2 倍
    auto: false,                 // 需要逐次点击
  },
};
var knifeCd = 0;                 // 匕首攻击冷却

// 扩容弹夹：靠击杀特殊敌人掉落，不叠加 —— 只有「更高级别」拾取后才会替换
var MAG_TIERS = {
  pistol: [
    { name: '标准弹夹',       size: 7 },
    { name: '手枪小扩容弹夹', size: 10 },
    { name: '手枪中扩容弹夹', size: 12 },
    { name: '手枪大扩容弹夹', size: 15 },
  ],
  rifle: [
    { name: '标准弹夹',       size: 25 },
    { name: '步枪小扩容弹夹', size: 35 },
    { name: '步枪中扩容弹夹', size: 48 },
    { name: '步枪大扩容弹夹', size: 60 },
    { name: '步枪弹鼓',       size: 120 },
  ],
};
var magTier = { pistol: 0, rifle: 0 };   // 每把枪当前装备的扩容等级（0 = 标准）

var currentWeapon = 'pistol';
var weaponAmmo = {
  pistol: { mag: 7, reserve: 42 },
  rifle: { mag: 25, reserve: 100 },
};

/** 当前武器弹夹容量（按已装备的扩容等级） */
function magTierInfo(weapon, tier) {
  var list = MAG_TIERS[weapon];
  if (!list) return null;
  return list[clamp(tier === undefined ? (magTier[weapon] || 0) : tier, 0, list.length - 1)];
}

/** 读取指定武器的当前备弹（当前武器直接用 ammo，其余查武器池；近战无备弹） */
function reserveOf(weapon) {
  if (weapon === currentWeapon) {
    return weaponDef().melee ? 0 : ammo.reserve;
  }
  var w = weaponAmmo[weapon];
  return w ? w.reserve : 0;
}

/** 备弹紧张度：0 = 两把枪的备弹都满，1 = 全部打空
    =（手枪备弹 + 步枪备弹）/（手枪备弹上限 + 步枪备弹上限）的补数 */
function ammoTension() {
  var cur = reserveOf('pistol') + reserveOf('rifle');
  var cap = reserveMaxNow('pistol') + reserveMaxNow('rifle');
  return cap > 0 ? clamp(1 - cur / cap, 0, 1) : 0;
}

/** 备弹上限（手枪 ×8 / 步枪 ×6，按当前弹夹容量计算） */
function reserveMaxNow(weapon) {
  var w = weapon || currentWeapon;
  var def = WEAPONS[w];
  if (!def) return 999;
  var mag = magTierInfo(w) ? magTierInfo(w).size : def.magSize;
  return mag * (def.reserveMagMul || 6);
}
function weaponDef() { return WEAPONS[currentWeapon]; }

/** 切换武器（保存当前弹药、载入目标弹药、切模型、刷新 HUD） */
function switchWeapon(id) {
  if (!WEAPONS[id] || id === currentWeapon) return;
  // 保存当前武器的弹药（近战武器没有弹药池）
  if (!WEAPONS[currentWeapon].melee && weaponAmmo[currentWeapon]) {
    weaponAmmo[currentWeapon].mag = ammo.mag;
    weaponAmmo[currentWeapon].reserve = ammo.reserve;
  }

  currentWeapon = id;
  var def = WEAPONS[id];
  if (def.melee) {
    ammo.mag = 0; ammo.reserve = 0; ammo.magSize = 0;
  } else {
    ammo.mag = weaponAmmo[id].mag;
    ammo.reserve = weaponAmmo[id].reserve;
    ammo.magSize = magSizeNow();
  }
  ammo.reloading = false;
  ammo.reloadTimer = 0;
  if (dom.reloadWrap) dom.reloadWrap.style.display = 'none';

  applyWeaponVisual();
  updateAmmoHUD();
  showNotice('切换武器：' + def.name + '（' + def.key + ' 键切换）');
  Sfx.reloadDone();
}

/** 按当前武器显示对应枪械模型，并把枪口火焰/枪口光移到该枪的枪口处
    （两把枪枪管长度不同：手枪枪口 z≈-0.30，步枪枪口 z≈-0.96） */
function applyWeaponVisual() {
  var isMelee = !!(WEAPONS[currentWeapon] && WEAPONS[currentWeapon].melee);
  if (gun.pistolGroup) gun.pistolGroup.visible = (currentWeapon === 'pistol');
  if (gun.rifleGroup) gun.rifleGroup.visible = (currentWeapon === 'rifle');
  if (gun.knifeGroup) gun.knifeGroup.visible = isMelee;
  // 近战武器：枪口火焰/枪口光不需要
  if (gun.flashMesh) {
    gun.flashMesh.visible = false;
    var muzzleZ = (currentWeapon === 'rifle') ? -1.05 : -0.36;
    gun.flashMesh.position.set(0, 0.055, muzzleZ);
  }
  if (gun.light) {
    gun.light.intensity = 0;
    var mz2 = (currentWeapon === 'rifle') ? -1.05 : -0.36;
    gun.light.position.set(0, 0.055, mz2 - 0.03);
  }
  // 匕首握持位置更贴身
  if (gun.knifeGroup) {
    gun.knifeGroup.position.set(isMelee ? 0.26 : 0, isMelee ? -0.20 : 0, isMelee ? -0.42 : 0);
  }
}

// ---------------------------------------------------------------- 成就系统
// 解锁状态存在 save.achievements；同一成就只解锁一次，解锁时右上角弹出提示
var ACHIEVEMENTS = {
  firstBlood:  { ico: '🩸', name: '初次猎杀',   desc: '击杀第一条蓝色肥鱼' },
  firstBoss:   { ico: '👑', name: '巨兽猎人',   desc: '首次击破 Boss' },
  comboSSS:    { ico: '✨', name: '完美连击',   desc: '达成 SSS 连杀评级' },
  kills100:    { ico: '💯', name: '百鱼斩',     desc: '单局击杀 100 条肥鱼' },
  kills1000:   { ico: '🔥', name: '千鱼斩',     desc: '累计击杀 1000 条肥鱼' },
  stage5:      { ico: '🌊', name: '深海尽头',   desc: '推进到第 5 阶段' },
  wave20:      { ico: '🧱', name: '二十波老兵', desc: '单局清空 20 波' },
  boss10:      { ico: '⚔️', name: '十连巨兽',   desc: '单局击破 10 只 Boss' },
  survive10:   { ico: '⏳', name: '铁人',       desc: '单局存活 10 分钟' },
  flawless3:   { ico: '🛡️', name: '完美无瑕',   desc: '开局后 3 分钟内不受伤' },
  pierce3:     { ico: '➶', name: '一石三鸟',   desc: '一次射击穿透击杀 3 条肥鱼' },
  maxCore:     { ico: '🏆', name: '登峰造极',   desc: '把任意一项核心技能升到满级' },
  ghost:       { ico: '💀', name: '自爆旁观者', desc: '在自爆鱼引爆时保持 5 米以上距离全身而退' },
  conqueror:   { ico: '🏅', name: '无尽征服者', desc: '通关无尽模式（核心技能全满后再击败一只 Boss）' },
};
var achTimer = null;
var runTookDamage = false;   // 本局是否受过伤（「完美无瑕」成就用）

function unlockAchievement(id) {
  if (debugMode) return false;          // 开发者模式不记录成就
  if (!id || !ACHIEVEMENTS[id] || save.achievements[id]) return false;
  save.achievements[id] = true;
  persistSave();
  showAchievementPop(ACHIEVEMENTS[id]);
  return true;
}

function showAchievementPop(def) {
  var el = document.getElementById('achievement-pop');
  if (!el) return;
  el.innerHTML =
    '<div class="ach-ico">' + def.ico + '</div>' +
    '<div class="ach-body">' +
    '<div class="ach-title">成就解锁</div>' +
    '<div class="ach-name">' + def.name + '</div>' +
    '<div class="ach-desc">' + def.desc + '</div>' +
    '</div>';
  el.classList.remove('hidden');
  // 强制回流后再加 show，保证过渡动画生效
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(achTimer);
  achTimer = setTimeout(function () {
    el.classList.remove('show');
    setTimeout(function () { el.classList.add('hidden'); }, 400);
  }, 3400);
}

// 周期性成就检查（每秒一次，成本可忽略）
var achCheckTimer = 0;
function checkAchievements(dt) {
  achCheckTimer -= dt;
  if (achCheckTimer > 0) return;
  achCheckTimer = 1.0;
  if (state !== 'playing') return;
  if (kills >= 100) unlockAchievement('kills100');
  if (save.stats && save.stats.totalKills >= 1000) unlockAchievement('kills1000');
  if (currentStage() >= 5) unlockAchievement('stage5');
  if (wave.number >= 20) unlockAchievement('wave20');
  if (bossKillCount >= 10) unlockAchievement('boss10');
  if (playingTime >= 600) unlockAchievement('survive10');
  if (combo.rank >= 6) unlockAchievement('comboSSS');
  for (var i = 0; i < CORE_UPGRADES.length; i++) {
    if (upgrades[CORE_UPGRADES[i]] >= CFG.upgradeMaxLevel) { unlockAchievement('maxCore'); break; }
  }
  if (!runTookDamage && playingTime >= 180) unlockAchievement('flawless3');
}

/** 累计统计（跨局）：击杀 / Boss / 局数 —— 存在 save.stats */
function bumpStat(key, delta) {
  if (!save.stats) save.stats = { totalKills: 0, totalBoss: 0, totalGames: 0 };
  save.stats[key] = (save.stats[key] || 0) + (delta || 1);
}

/** 音量目标值（基础值 × 玩家设置） */
function bossVolTarget() { return CFG.bossMusicVolume * save.settings.boss; }
function menuVolTarget() { return CFG.menuMusicVolume * save.settings.menu; }

/** 应用设置（启动、面板调整、读档后调用） */
function applySettings() {
  var s = save.settings;
  if (bgmEl) bgmEl.volume = Math.min(1, CFG.bgmVolume * s.bgm);
  if (renderer) renderer.shadowMap.enabled = !!s.shadow;
  sens = 0.0022 * s.sens;                       // 鼠标灵敏度
  if (Sfx && Sfx.setMasterVolume) Sfx.setMasterVolume(0.5 * s.sfx);
}

/** 当前剑气颜色（色盲友好时改为金黄色） */
function swordWaveColor() { return save.settings.colorblind ? 0xffd24a : 0x3fb0ff; }

/** 秒 → mm:ss */
function formatTime(sec) {
  var s = Math.max(0, Math.floor(sec || 0));
  var m = Math.floor(s / 60);
  return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
}

/** 一局结束时更新历史记录，返回本次打破的记录名（用于「新纪录」提示） */
function updateRecords() {
  var broken = [];
  if (score > save.bestScore) { save.bestScore = score; broken.push('最高得分'); }
  if (playingTime > save.bestTime) { save.bestTime = playingTime; broken.push('最久存活'); }
  if (combo.rank > save.bestCombo) { save.bestCombo = combo.rank; broken.push('最高连杀'); }
  if (wave.number > save.bestWave) { save.bestWave = wave.number; broken.push('最远波次'); }
  if (currentStage() > save.bestStage) { save.bestStage = currentStage(); broken.push('最高阶段'); }
  if (bossKillCount > save.bestBoss) { save.bestBoss = bossKillCount; broken.push('最多 Boss 击破'); }
  if (broken.length) persistSave();
  return broken;
}

/** 填充结算界面统计（suffix: '' = 失败界面，'-v' = 通关界面）并显示新纪录 */
function fillResultStats(suffix, broken) {
  function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  set('final-time' + suffix, formatTime(playingTime));
  set('final-combo' + suffix, combo.rank >= 0 ? CFG.comboRanks[combo.rank] : '—');
  set('final-stage' + suffix, String(currentStage()));
  set('final-wave' + suffix, String(wave.number));
  var rec = document.getElementById('final-record' + suffix);
  if (rec) {
    if (broken && broken.length) {
      rec.classList.remove('hidden');
      var list = document.getElementById('final-record-list' + suffix);
      if (list) list.textContent = broken.join(' · ');
    } else {
      rec.classList.add('hidden');
    }
  }
}

/** 刷新主菜单的「历史最佳」显示 */
function refreshBestRecords() {
  var wrap = document.getElementById('best-records');
  if (!wrap) return;
  if (save.bestScore <= 0 && save.bestWave <= 0) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  set('best-score', String(save.bestScore));
  set('best-time', formatTime(save.bestTime));
  set('best-combo', save.bestCombo >= 0 ? CFG.comboRanks[save.bestCombo] : '—');
  set('best-stage', String(save.bestStage));
  set('best-wave', String(save.bestWave));
  set('best-boss', String(save.bestBoss));
}

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
  // 总音量可调（设置面板「音效」滑块）
  function setMasterVolume(v) { if (master) master.gain.value = Math.max(0, Math.min(1, v)); }
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
    setMasterVolume: setMasterVolume,
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
    // 作弊被抓：程序生成滑稽搞怪音符（歪斜下滑 + 偶尔滑稽高音与"啪"声）
    cheatNote: function (step) {
      var freqs = [392, 370, 349, 311, 349, 311, 294, 262];
      var f = freqs[step % freqs.length];
      tone('triangle', f, f * 0.8, 0.22, 0.38);
      if (step % 4 === 2) tone('square', f * 1.5, f * 1.15, 0.12, 0.12);
      if (step % 4 === 3) noiseHit(0.05, 'bandpass', 700, 320, 0.14);
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
    menuEl.volume = menuVolTarget();
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
      var bossTarget = bossVolTarget();
      bossMusicVol = Math.min(bossTarget, bossMusicVol + (bossTarget / CFG.bossMusicFadeIn) * dt);
      if (bossMusicVol >= bossTarget) bossMusicTempo = 2;
    } else if (bossMusicTempo === -1) {             // 淡出（匀速 0.5s → 0）
      bossMusicVol = Math.max(0, bossMusicVol - (bossVolTarget() / CFG.bossMusicFadeOut) * dt);
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
      menuMusicVol = menuVolTarget();
      if (menuEl) {
        menuEl.volume = menuVolTarget();
        if (menuEl.paused) safePlay(menuEl);
      }
      if (bgmEl && !bgmEl.paused) bgmEl.pause();
      if (bossEl && !bossEl.paused) bossEl.pause();
      if (progressEl && !progressEl.paused) progressEl.pause();
      if (overEl && !overEl.paused) overEl.pause();
    } else if (state === 'playing' || state === 'reward' || state === 'skills') {
      // 从菜单进入游戏：来去曼波淡出收尾（音量包络独立于音频元素，元素存在时同步音量与停止）
      if (menuMusicOn) {
        menuMusicVol = Math.max(0, menuMusicVol - (menuVolTarget() / CFG.menuMusicFadeOut) * dt);
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
function makeSkyTexture(theme) {
  var c = makeCanvas(4, 512);
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 512);
  // 默认晴日天空；传主题时用主题的配色（血月/深夜等）
  var top = (theme && theme.skyTop) || '#2a63c8';
  var mid = (theme && theme.skyMid) || '#6ea9e8';
  var low = (theme && theme.skyLow) || '#cfe6f5';
  var bot = (theme && theme.skyBot) || '#dceef2';
  g.addColorStop(0.0, top);
  g.addColorStop(0.45, mid);
  g.addColorStop(0.78, low);
  g.addColorStop(1.0, bot);
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return c;
}

/** 按主题生成天空背景贴图（缓存，避免重复绘制） */
var _skyTexCache = {};
function skyTextureFor(idx, theme) {
  if (!_skyTexCache[idx]) {
    var t = toTex(makeSkyTexture(theme));
    t.colorSpace = THREE.SRGBColorSpace;
    _skyTexCache[idx] = t;
  }
  return _skyTexCache[idx];
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
// ---------------------------------------------------------------- 每局随机掩体
// 每局在场地内随机散布若干箱子作为掩体；全部走 addWallBox，
// 因此自带碰撞体（obstacles）与射击遮挡（wallMeshes），玩家可跳上去、子弹会被挡住。
var randomCovers = [];

function clearRandomCovers() {
  for (var i = 0; i < randomCovers.length; i++) {
    var m = randomCovers[i];
    scene.remove(m);
    for (var j = obstacles.length - 1; j >= 0; j--) if (obstacles[j].mesh === m) obstacles.splice(j, 1);
    for (var k = wallMeshes.length - 1; k >= 0; k--) if (wallMeshes[k] === m) wallMeshes.splice(k, 1);
  }
  randomCovers = [];
}

/** 每局随机散布掩体：数量、位置、尺寸都随机，但保证不堵死出生点与通路 */
function spawnRandomCovers() {
  clearRandomCovers();
  var wanted = Math.floor(rand(5, 10));          // 5~9 个额外掩体
  var spX = CFG.spawnPoint[0], spZ = CFG.spawnPoint[1];
  var placed = 0, tries = 0;
  while (placed < wanted && tries < 90) {
    tries++;
    var sx = rand(1.1, 1.9), sz = rand(1.1, 1.9), h = rand(1.1, 1.9);
    var x = rand(-CFG.arena + 8, CFG.arena - 8);
    var z = rand(-CFG.arena + 8, CFG.arena - 8);

    // 保护①：不靠出生点太近（6 米内不放，避免开局被堵）
    if (Math.sqrt((x - spX) * (x - spX) + (z - spZ) * (z - spZ)) < 6) continue;

    // 保护②：不与已有障碍重叠（留 1.3 米通行缓冲）
    var clear = true;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (x + sx / 2 + 1.3 > o.min.x && x - sx / 2 - 1.3 < o.max.x &&
          z + sz / 2 + 1.3 > o.min.z && z - sz / 2 - 1.3 < o.max.z) { clear = false; break; }
    }
    if (!clear) continue;

    var m = addWallBox(x, z, sx, sz, h);         // 自带碰撞体 + 可被子弹击中
    randomCovers.push(m);
    placed++;
  }
  debugLog('本局随机掩体：' + placed + ' 个（均带碰撞体积）', 'dbg-hit');
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

// 环境（地图/灯光/云等）在首次进入游戏时才构建；回主菜单时整体卸载，
// 这样主菜单不是"游戏场景已加载"的状态，也省下地图占用的内存与显存。
var envObjects = [];    // 本次构建出的环境对象
var envBuilt = false;   // 是否已构建（幂等保护）
var hemiLight = null, sunLight = null;   // 环境灯光（环境主题会调整它们）

// ---------------------------------------------------------------- 环境主题（每 10 波变化）
// 调整雾 / 两盏灯光 / 天空贴图（按主题程序化重绘并缓存），变化明显但成本极低
// 每种环境除了视觉，还挂一条「玩法修饰」（N5）——
// 让「环境剧变」是事件而不只是换皮。mod 缺省即基准值。
var ENV_MOD_DEFAULT = {
  supplyIntervalMul: 1,    // 补给刷新间隔倍率（越小刷得越勤）
  enemyDetectMul: 1,       // 敌人索敌距离倍率
  playerDmgMul: 1,         // 玩家伤害倍率
  enemyDmgMul: 1,          // 敌人伤害倍率
  nadeDmgMul: 1,           // 手雷伤害倍率
  nadeRadiusAdd: 0,        // 手雷半径附加（米）
};
var envMod = {};
for (var _emk in ENV_MOD_DEFAULT) envMod[_emk] = ENV_MOD_DEFAULT[_emk];

/** 读取环境修饰值（envMod 未就绪或字段异常时回退到默认值，避免 NaN/undefined 污染伤害计算） */
function envMul(key) {
  var fallback = (ENV_MOD_DEFAULT[key] !== undefined) ? ENV_MOD_DEFAULT[key] : 1;
  if (!envMod || typeof envMod[key] !== 'number' || !isFinite(envMod[key])) return fallback;
  return envMod[key];
}

var ENV_THEMES = [
  { name: '晴日沙漠', fog: 0xd8c9a8, fogNear: 45, fogFar: 165, hemiSky: 0xfff2dc, hemiGnd: 0x8a7a55, hemiInt: 0.9, sun: 0xfff0d0, sunInt: 1.7,
    skyTop: '#2a63c8', skyMid: '#6ea9e8', skyLow: '#cfe6f5', skyBot: '#dceef2',
    mod: {}, rule: '基准环境' },
  { name: '黄昏',     fog: 0xd9a06a, fogNear: 32, fogFar: 130, hemiSky: 0xffd0a0, hemiGnd: 0x6a5038, hemiInt: 0.8, sun: 0xff9a50, sunInt: 1.35,
    skyTop: '#2c3f7a', skyMid: '#a86a9a', skyLow: '#f0a860', skyBot: '#ffd08a',
    mod: { supplyIntervalMul: 0.8 }, rule: '补给刷新间隔 -20%' },
  { name: '沙尘暴',   fog: 0xc8a860, fogNear: 14, fogFar: 72,  hemiSky: 0xe0c898, hemiGnd: 0x7a6844, hemiInt: 0.85, sun: 0xf0d090, sunInt: 1.05,
    skyTop: '#8a7038', skyMid: '#c8a860', skyLow: '#e0c890', skyBot: '#d8c088',
    mod: { enemyDetectMul: 0.7 }, rule: '视野骤降，但敌人索敌距离同步 -30%' },
  { name: '血月',     fog: 0x4a2030, fogNear: 26, fogFar: 105, hemiSky: 0xb07080, hemiGnd: 0x40202a, hemiInt: 0.6, sun: 0xff6070, sunInt: 0.85,
    skyTop: '#1a0c18', skyMid: '#4a1830', skyLow: '#8a2c38', skyBot: '#c04850',
    mod: { playerDmgMul: 1.1, enemyDmgMul: 1.1 }, rule: '敌我伤害双双 +10%（高风险高回报）' },
  { name: '深夜',     fog: 0x121c30, fogNear: 22, fogFar: 95,  hemiSky: 0x5070b0, hemiGnd: 0x202838, hemiInt: 0.55, sun: 0x90a0d0, sunInt: 0.7,
    skyTop: '#050a18', skyMid: '#0e1a34', skyLow: '#1c2c4c', skyBot: '#26385c',
    mod: { nadeDmgMul: 1.3, nadeRadiusAdd: 1.0 }, rule: '视野最差，但手雷伤害 +30%、半径 +1 米' },
];
var envIndex = 0;
var envTitleTimer = null;

/** 屏幕中央的半屏大字（渐显 → 停留 → 渐隐） */
function showEnvTitle(name) {
  var el = document.getElementById('env-title');
  if (!el) return;
  el.textContent = name;
  el.classList.add('show');
  clearTimeout(envTitleTimer);
  envTitleTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
}

/** 程序化环境贴图：全景渐变（天空 / 地平线 / 地面）+ 太阳亮斑。
    作为 scene.environment 为金属材质提供环境反射 ——
    否则枪械与火箭筒（金属度 0.65~0.8）在逆光下会退化成黑色剪影 */
function makeEnvMapTexture() {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  var x = c.getContext('2d');
  var sky = x.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, '#5878b0');
  sky.addColorStop(0.55, '#a8ccf0');
  sky.addColorStop(1, '#f0e2c4');
  x.fillStyle = sky;
  x.fillRect(0, 0, 512, 128);
  var gnd = x.createLinearGradient(0, 128, 0, 256);
  gnd.addColorStop(0, '#e0c898');
  gnd.addColorStop(1, '#8a7a58');
  x.fillStyle = gnd;
  x.fillRect(0, 128, 512, 128);
  // 太阳亮斑（金属高光来源）
  var sun = x.createRadialGradient(140, 62, 0, 140, 62, 78);
  sun.addColorStop(0, 'rgba(255,255,245,1)');
  sun.addColorStop(0.35, 'rgba(255,248,220,0.5)');
  sun.addColorStop(1, 'rgba(255,245,210,0)');
  x.fillStyle = sun;
  x.fillRect(0, 0, 512, 200);
  var tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 应用环境主题（idx 会自动取模）；announce = 是否播报 */
function applyEnvTheme(idx, announce) {
  if (!scene.fog || !hemiLight || !sunLight) return;
  envIndex = ((idx % ENV_THEMES.length) + ENV_THEMES.length) % ENV_THEMES.length;
  var t = ENV_THEMES[envIndex];
  scene.background = skyTextureFor(envIndex, t);   // 天空也跟随主题（血月/深夜等）
  scene.fog.color.setHex(t.fog);
  scene.fog.near = t.fogNear;
  scene.fog.far = t.fogFar;
  hemiLight.color.setHex(t.hemiSky);
  hemiLight.groundColor.setHex(t.hemiGnd);
  hemiLight.intensity = t.hemiInt;
  sunLight.color.setHex(t.sun);
  sunLight.intensity = t.sunInt;

  // 玩法修饰：先复位默认值，再叠加本主题的 mod
  for (var mk in ENV_MOD_DEFAULT) envMod[mk] = ENV_MOD_DEFAULT[mk];
  if (t.mod) { for (var mk2 in t.mod) envMod[mk2] = t.mod[mk2]; }

  if (announce) {
    showNotice('环境变化 —— ' + t.name + (t.rule ? '（' + t.rule + '）' : ''));
    showEnvTitle(t.name);              // 屏幕中央半屏大字（渐显渐隐）
  }
}

/** 每 10 波推进一次环境（循环 5 种主题） */
function updateEnvByWave() {
  var want = Math.floor(wave.number / 10) % ENV_THEMES.length;
  if (want !== envIndex) applyEnvTheme(want, true);
}

function buildEnvironment() {
  if (envBuilt) return;
  var beforeChildren = scene.children.slice();
  scene.background = toTex(makeSkyTexture());
  scene.fog = new THREE.Fog(0xd8c9a8, 45, 165);

  hemiLight = new THREE.HemisphereLight(0xfff2dc, 0x8a7a55, 0.9);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xfff0d0, 1.7);
  sunLight.position.set(40, 55, 28);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -55; sunLight.shadow.camera.right = 55;
  sunLight.shadow.camera.top = 55; sunLight.shadow.camera.bottom = -55;
  sunLight.shadow.camera.near = 4; sunLight.shadow.camera.far = 140;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

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

  // ===== 每局随机掩体（首次构建时生成，重开时重新随机）=====
  spawnRandomCovers();

  // ===== 云朵 =====
  var cloudTex = new THREE.CanvasTexture(makeCloudTexture());
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  for (var k = 0; k < 5; k++) {
    var cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false }));
    cloud.position.set(rand(-80, 80), rand(30, 48), rand(-80, 80));
    cloud.scale.set(rand(26, 42), rand(10, 16), 1);
    scene.add(cloud);
  }

  // 环境反射贴图：让金属材质（枪械/火箭筒/炮弹）有东西可反射，避免逆光变剪影
  if (!window.__envMapTex) window.__envMapTex = makeEnvMapTexture();
  scene.environment = window.__envMapTex;

  // 记录本次新建的对象，供卸载时整体移除
  envObjects = scene.children.filter(function (o) { return beforeChildren.indexOf(o) < 0; });
  envBuilt = true;
}

/** 卸载游戏场景（回主菜单时调用）：移除地图 / 灯光 / 云等全部环境对象并释放几何 */
function unloadGameScene() {
  for (var i = 0; i < envObjects.length; i++) {
    var o = envObjects[i];
    scene.remove(o);
    // 只释放几何；材质（砖墙/沙地等）是模块级共享缓存，重建时要复用
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
  }
  scene.environment = null;   // 解除环境反射
  envObjects = [];
  envBuilt = false;
  wallMeshes = [];        // 子弹遮挡列表
  obstacles = [];         // 碰撞体列表
  randomCovers = [];      // 每局随机掩体
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
  var offX = 0, offY = 0, roll = 0, pitchOff = 0;

  // ① 受击抖动：短促的高频位移（命中/被打时）
  if (camFx.shake > 0.001) {
    var s = camFx.shake * 0.11;   // 受击抖动幅度（v0.3.0 起为原来的 2 倍）
    offX += rand(-s, s);
    offY += rand(-s, s);
    roll += rand(-s, s) * 0.5;
  }

  // ② 跳跃摆动：起跳后轻微摆动几下（频率与幅度已在原基础上减半）
  if (camFx.sway > 0.001) {
    var w = Math.sin(camFx.swayT * 8.5) * camFx.sway * 0.025;
    roll += w;
    pitchOff += w * 0.6;
    offX += Math.cos(camFx.swayT * 5.5) * camFx.sway * 0.01;
  }

  // ⑤ 行走晃动：频率与幅度均为跳跃的 1/5（持续轻微摇晃，步伐感）
  if (camFx.walk > 0.002) {
    var ww = Math.sin(camFx.walkT * 1.7) * camFx.walk * 0.005;
    roll += ww;
    pitchOff += ww * 0.6;
    offX += Math.cos(camFx.walkT * 1.1) * camFx.walk * 0.002;
  }

  // ⑥ 射击后坐：每发一次短促抖动（幅度 = 走路的 1.5 倍，0.1 秒内回正）
  if (camFx.fire > 0.002) {
    var fw = Math.sin(camFx.fireT * 34) * camFx.fire * 0.0075;
    roll += fw;
    pitchOff += fw * 1.15;                                  // 偏俯仰：更像后坐
    offX += Math.cos(camFx.fireT * 22) * camFx.fire * 0.003;
    offY += camFx.fire * 0.0035;                            // 轻微上顶
  }

  // ③ 落地回正：着地瞬间相机下沉 + 轻微前倾回弹，随后归位
  if (camFx.land > 0.001) {
    offY -= camFx.land * 0.13;
    pitchOff += camFx.land * 0.055;
    roll += Math.sin(camFx.landT * 24) * camFx.land * 0.03;
  }

  camera.position.set(player.pos.x + offX, player.pos.y + CFG.eyeHeight + offY, player.pos.z);
  camera.rotation.set(player.pitch + pitchOff, player.yaw, roll);
}

// 摄像机反馈衰减（每帧调用）
function updateCamFx(dt) {
  if (camFx.shake > 0) camFx.shake = Math.max(0, camFx.shake - dt * 3.2);
  if (camFx.sway > 0) {
    camFx.swayT += dt;
    camFx.sway = Math.max(0, camFx.sway - dt * 2.4);
  }
  if (camFx.land > 0) {
    camFx.landT += dt;
    camFx.land = Math.max(0, camFx.land - dt * 5.5);
  }

  if (camFx.fire > 0) {
    camFx.fireT += dt;
    camFx.fire = Math.max(0, camFx.fire - dt * 11);   // 约 0.09 秒回正
  }

  // 行走晃动：按实际水平位移判断是否在走动（无需改移动逻辑），走动时淡入、停下淡出
  var ddx = player.pos.x - camFx.lastX;
  var ddz = player.pos.z - camFx.lastZ;
  camFx.lastX = player.pos.x;
  camFx.lastZ = player.pos.z;
  var speed = dt > 0 ? Math.sqrt(ddx * ddx + ddz * ddz) / dt : 0;
  var moving = (speed > 0.4 && player.onGround) ? 1 : 0;
  camFx.walk += (moving - camFx.walk) * Math.min(1, dt * 9);
  if (camFx.walk > 0.002) {
    // 走得快摇晃略快（基准 6 米/秒）
    camFx.walkT += dt * (0.7 + Math.min(1.3, speed / 6));
  }
}

// ---------------------------------------------------------------- 枪
function buildGun() {
  gun.group = new THREE.Group();
  camera.add(gun.group);
  gun.group.position.set(0.3, -0.28, -0.6);
  var dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.65 });
  var darker = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.35, metalness: 0.7 });
  var grip = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8 });

  // ===== 手枪（经典比例）：套筒 + 短圆柱枪管 + 明显后倾握把 + 扳机护圈 =====
  // 套筒（上部主体，扁平长方）
  var slide = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.32), dark);
  slide.position.set(0, 0.058, -0.06);
  // 套筒尾部的防滑纹（3 条细槽）
  for (var gvi = 0; gvi < 3; gvi++) {
    var gv = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.013, 0.013), darker);
    gv.position.set(0, 0.058, 0.076 + gvi * 0.023);
    gun.group.add(gv);
  }
  // 枪管（圆柱，从套筒前端露出）
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.09, 10), darker);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, -0.255);
  // 枪口套
  var muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.026), darker);
  muzzle.position.set(0, 0.06, -0.302);
  // 握把（明显向后倾斜约 17°）
  var gripMesh = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.185, 0.095), grip);
  gripMesh.position.set(0, -0.1, 0.076);
  gripMesh.rotation.x = -0.3;
  // 握把防滑纹
  for (var gvi2 = 0; gvi2 < 3; gvi2++) {
    var gg = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.01, 0.01), darker);
    gg.position.set(0, -0.06 - gvi2 * 0.032, 0.09 + gvi2 * 0.01);
    gg.rotation.x = -0.3;
    gun.group.add(gg);
  }
  // 弹匣底座（握把末端微微外扩）
  var magBase = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.02, 0.108), darker);
  magBase.position.set(0, -0.194, 0.104);
  magBase.rotation.x = -0.3;
  // 扳机护圈（半圆环，开口朝上）
  var guard = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0072, 6, 14, Math.PI), darker);
  guard.rotation.set(Math.PI / 2, 0, Math.PI);
  guard.position.set(0, -0.034, -0.03);
  // 扳机
  var trigger = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.03, 0.011), darker);
  trigger.position.set(0, -0.032, -0.026);
  // 击锤（套筒尾部小凸起）
  var hammer = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.036, 0.022), darker);
  hammer.position.set(0, 0.055, 0.108);
  // 准星（前）与照门（后）
  var frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.019, 0.015), darker);
  frontSight.position.set(0, 0.103, -0.19);
  var rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.019, 0.015), darker);
  rearSight.position.set(0, 0.103, 0.055);
  gun.group.add(slide, barrel, muzzle, gripMesh, magBase, guard, trigger, hammer, frontSight, rearSight);

  // 枪口闪光
  gun.light = new THREE.PointLight(0xffc46e, 0, 7);
  gun.light.position.set(0, 0.055, -0.39);   // 初值对应手枪枪口（切换武器时会重新定位）
  gun.group.add(gun.light);
  // 枪口光焰贴图：径向光晕 + 十字尖角（比纯色方块更像枪焰）
  if (!window.__flashTex) {
    var fc = document.createElement('canvas');
    fc.width = fc.height = 128;
    var fx2 = fc.getContext('2d');
    var fg = fx2.createRadialGradient(64, 64, 0, 64, 64, 64);
    fg.addColorStop(0, 'rgba(255,255,240,1)');
    fg.addColorStop(0.22, 'rgba(255,238,150,0.95)');
    fg.addColorStop(0.55, 'rgba(255,175,60,0.45)');
    fg.addColorStop(1, 'rgba(255,140,40,0)');
    fx2.fillStyle = fg;
    fx2.fillRect(0, 0, 128, 128);
    fx2.globalCompositeOperation = 'lighter';
    for (var fi2 = 0; fi2 < 4; fi2++) {
      fx2.save();
      fx2.translate(64, 64);
      fx2.rotate(fi2 * Math.PI / 2);
      var flg = fx2.createLinearGradient(0, 0, 0, -62);
      flg.addColorStop(0, 'rgba(255,250,225,0.95)');
      flg.addColorStop(1, 'rgba(255,205,95,0)');
      fx2.fillStyle = flg;
      fx2.beginPath();
      fx2.moveTo(-6, 0); fx2.lineTo(0, -62); fx2.lineTo(6, 0);
      fx2.closePath();
      fx2.fill();
      fx2.restore();
    }
    var ft = new THREE.CanvasTexture(fc);
    ft.colorSpace = THREE.SRGBColorSpace;
    window.__flashTex = ft;
  }
  gun.flashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ map: window.__flashTex, color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false })
  );
  gun.flashMesh.position.set(0, 0.055, -0.36);   // 初值对应手枪枪口
  gun.flashMesh.visible = false;
  // ===== 双武器模型：手枪组（上面这些）、步枪组 =====
  // 把已有手枪部件收进一个子组，便于整体显隐
  gun.pistolGroup = new THREE.Group();
  for (var pi = gun.group.children.length - 1; pi >= 0; pi--) {
    var ch = gun.group.children[pi];
    if (ch !== gun.light) { gun.pistolGroup.add(ch); }
  }
  gun.group.add(gun.pistolGroup);

  // 突击步枪：更长的枪身 + 弹匣 + 枪托 + 散热片
  gun.rifleGroup = new THREE.Group();
  var rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.78), dark);
  var rifleBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.62), darker);
  rifleBarrel.position.set(0, 0.05, -0.62);
  var rifleMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), darker);
  rifleMuzzle.position.set(0, 0.05, -0.96);
  var rifleMag = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.24, 0.13), darker);
  rifleMag.position.set(0, -0.17, -0.06);
  rifleMag.rotation.x = -0.12;
  var rifleStock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.3), grip);
  rifleStock.position.set(0, -0.03, 0.5);
  var rifleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.19, 0.11), grip);
  rifleGrip.position.set(0, -0.15, 0.18);
  rifleGrip.rotation.x = 0.32;
  var rifleSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.24), darker);
  rifleSight.position.set(0, 0.145, -0.16);
  // 散热片（3 片薄板，识别度）
  for (var fi = 0; fi < 3; fi++) {
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.05), dark);
    fin.position.set(0, 0.09, -0.34 - fi * 0.13);
    gun.rifleGroup.add(fin);
  }
  gun.rifleGroup.add(rifleBody, rifleBarrel, rifleMuzzle, rifleMag, rifleStock, rifleGrip, rifleSight);
  gun.group.add(gun.rifleGroup);
  gun.rifleGroup.visible = false;

  // ===== 近战武器：匕首（贴身握持，位置与枪械不同）=====
  gun.knifeGroup = makeKnifeModel();
  gun.group.add(gun.knifeGroup);
  gun.knifeGroup.visible = false;

  applyWeaponVisual();   // 初始化枪口火焰位置（默认手枪）
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
  if (!particles || !save.settings.particles) return;   // 设置里可关闭粒子特效
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

function spawnFish(pos, kind) {
  kind = kind || 'normal';
  // 特殊敌人一律为近战型（自爆/护盾/治疗/分裂），只有常规鱼会随机成射手
  var ranged = (kind === 'normal') && (Math.random() < CFG.fishRangedChance);
  var e = {
    kind: kind,
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
  if (kind === 'bomber') {
    // 自爆鱼：怀抱核弹（不持枪剑）
    e.bombMesh = makeBombMesh();
    e.mesh.add(e.bombMesh);
    e.fuseTimer = -1;                // -1 = 未点火；>=0 表示引信倒计时中（定身）
  } else if (kind === 'shield') {
    // 护盾鱼：持剑冲锋 + 举盾（需先击破护盾才能造成伤害）
    e.swordMesh = makeFishSword();
    e.swordMesh.visible = true;
    e.mesh.add(e.swordMesh);
    e.shieldMesh = makeShieldMesh();
    e.mesh.add(e.shieldMesh);
    e.shieldHp = CFG.shieldFishHp;
  } else if (kind === 'healer') {
    // 治疗鱼：护士帽 + 大针筒（不主动攻击玩家，优先治疗受伤同伴）
    e.hatMesh = makeNurseHatMesh();
    e.hatMesh.position.set(0, 0.6, 0.06);
    e.hatMesh.scale.set(1.45, 1.45, 1.45);
    e.mesh.add(e.hatMesh);
    e.syringeMesh = makeSyringeMesh();
    e.mesh.add(e.syringeMesh);
    e.healTimer = CFG.healerInterval;
  } else if (kind === 'splitter') {
    // 分裂鱼：外表暂不区分（靠蹦跳动作识别），持剑近战
    e.swordMesh = makeFishSword();
    e.swordMesh.visible = true;
    e.mesh.add(e.swordMesh);
    e.jumpPhase = rand(0, Math.PI * 2);
  } else {
    e.gunMesh = makeFishGun();
    e.gunMesh.visible = ranged;            // 射手鱼持枪
    e.mesh.add(e.gunMesh);
    e.swordMesh = makeFishSword();
    e.swordMesh.visible = !ranged;         // 近战鱼持小剑
    e.mesh.add(e.swordMesh);
  }
  e.swingT = -1;                           // 挥剑动画计时（-1 = 未在挥剑）
  scene.add(e.mesh);
  enemies.push(e);
  return e;
}

// 注：刷怪已由波次系统（startWave / updateWaves）接管；此函数保留仅作标记位设置
function ensureFishSpawned() {
  if (fishSpawned || !fishTexReady) return;
  fishSpawned = true;
}

// ---------------------------------------------------------------- 波次与阶段系统
// 说明：波次系统接管刷怪节奏（原来的"固定上限 + 自动补生"已停用），Boss 改为每 N 波出现一次。

/** 当前阶段（1~5）：每击杀 bossesPerStage 次 Boss 升一阶段 */
function currentStage() {
  return Math.min(CFG.maxStage, Math.floor(bossKillCount / CFG.bossesPerStage) + 1);
}

/** 生成本波敌人构成：基础数量 + 每阶段 +2，其中各阶段新解锁的特殊敌人每种 2 个 */
function buildWaveComposition(stage) {
  var total = CFG.waveBaseCount + (stage - 1) * CFG.waveCountPerStage;
  var list = [];
  var unlocked = Math.min(stage - 1, STAGE_ENEMIES.length);
  for (var i = 0; i < unlocked; i++) {
    list.push(STAGE_ENEMIES[i], STAGE_ENEMIES[i]);   // 每种 2 个
  }
  while (list.length < total) list.push('normal');
  return list;
}

/** 开启第 n 波 */
function startWave(n) {
  wave.number = n;
  wave.state = 'fighting';
  wave.timer = 0;
  var comp = buildWaveComposition(currentStage());
  wave.total = comp.length;
  for (var i = 0; i < comp.length; i++) {
    // 自爆鱼必须离玩家足够远（否则一出生就贴脸点火）
    var spawnDist = (comp[i] === 'bomber') ? CFG.bomberMinSpawnDist : 20;
    var e = spawnFish(pickSpawnPos(spawnDist), comp[i]);
    e.waveTag = n;                                   // 标记归属波次，用于清波判定
  }
  showNotice('第 ' + n + ' 波来袭（' + comp.length + ' 只）');
}

/** 本波仍存活的敌人数 */
function countWaveAlive() {
  var n = 0;
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive && enemies[i].waveTag === wave.number) n += 1;
  }
  return n;
}

/** 阶段提升播报（在成长函数里调用） */
function checkStageUp() {
  var st = currentStage();
  if (st > stageShown) {
    stageShown = st;
    var newKind = STAGE_ENEMIES[st - 2];
    showNotice('★ 进入第 ' + st + ' 阶段！新敌人登场：' + (ENEMY_LABEL[newKind] || ''));
  }
}

/** 波次状态机（每帧） */
function updateWaves(dt) {
  if (state !== 'playing') return;

  // Boss 存活期间：波次暂停，玩家专心 Boss 战
  if (boss) {
    if (wave.state !== 'boss') wave.state = 'boss';
    return;
  }

  switch (wave.state) {
    case 'prepare':
      wave.timer += dt;
      if (wave.timer >= CFG.wavePrepareTime) {
        startWave(wave.number + 1);
      }
      break;

    case 'fighting':
      if (countWaveAlive() <= 0) {
        wave.state = 'cleared';
        wave.timer = 0;
        var isBossWave = (wave.number % CFG.bossEveryWaves === 0);
        showNotice('第 ' + wave.number + ' 波已清空' + (isBossWave ? ' —— BOSS 来袭！' : ''));
        updateEnvByWave();   // 每 10 波切换一次环境主题（晴日/黄昏/沙尘暴/血月/深夜）
      }
      break;

    case 'cleared':
      wave.timer += dt;
      if (wave.timer >= CFG.waveRestTime) {
        if (wave.number % CFG.bossEveryWaves === 0) {
          spawnBoss();
          wave.state = 'boss';
        } else {
          wave.state = 'prepare';
          wave.timer = 0;
        }
      }
      break;

    case 'boss':
      if (!boss) {                 // Boss 被击败 → 继续下一波
        wave.state = 'prepare';
        wave.timer = 0;
      }
      break;
  }
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
        // 枪与剑必须互斥显示：重生会重新随机形态，两者都要同步（曾经只同步枪，导致远程鱼同时握枪持剑）
        if (e.gunMesh) e.gunMesh.visible = e.ranged;
        if (e.swordMesh) e.swordMesh.visible = !e.ranged;
        e.swingT = -1;                 // 重生时清理挥剑动画状态
        e.waypoint.set(rand(-43, 43), 0, rand(-43, 43));
        e.waitTimer = 0; e.attackTimer = 0; e.lostTimer = 0;
        e.mesh.visible = true;
      }
      continue;
    }

    // ---- 自爆鱼：冲锋 → 2 米内点火定身 → 3 秒引信后自爆（爬行者式）----
    if (e.kind === 'bomber') {
      if (e.fuseTimer >= 0) {
        // 引信已点燃：原地定身（不再移动），等待爆炸
        e.fuseTimer -= dt;
        if (e.fuseTimer <= 0) explodeBomber(e);
        continue;
      }
      var bdx = player.pos.x - e.mesh.position.x;
      var bdz = player.pos.z - e.mesh.position.z;
      var bDist = Math.sqrt(bdx * bdx + bdz * bdz);
      e.state = 'chase';                 // 复用追击配色：身体发红警示玩家
      if (bDist > 0.5) {
        moveFishAvoiding(e, player.pos.x, player.pos.z, CFG.bomberChargeSpeed * e.speedMul, dt, 1.0, 1.7, 0.8);
        clampFish(e);
      }
      if (bDist <= CFG.bomberTriggerRange) {
        e.fuseTimer = CFG.bomberFuseTime;   // 点火：进入引信倒计时
        startBomberFuse(e);
        playEnemyVoice(e, 'bomberAlert', 0.7);   // 点火播报：「奶奶滴，我跟你爆了！」
      }
      continue;
    }

    // ---- 治疗鱼：奔向受伤的同伴为其回血（不主动攻击，玩家应优先击杀）----
    if (e.kind === 'healer') {
      e.healTimer -= dt;
      var healTarget = null, healDist = 1e9;
      var maxHpNow = Math.min(CFG.enemyHpMax, enemyHpNow);
      for (var hi = 0; hi < enemies.length; hi++) {
        var other = enemies[hi];
        if (other === e || !other.alive) continue;
        if ((other.hp || 1) >= maxHpNow) continue;                    // 满血的不治
        var hd = Math.sqrt(Math.pow(other.mesh.position.x - e.mesh.position.x, 2) +
                           Math.pow(other.mesh.position.z - e.mesh.position.z, 2));
        if (hd < healDist) { healDist = hd; healTarget = other; }
      }
      if (healTarget) {
        e.state = 'chase';                                            // 复用追击红色警示
        if (healDist > CFG.healerRange) {
          moveFishAvoiding(e, healTarget.mesh.position.x, healTarget.mesh.position.z,
            CFG.fishChaseSpeed * 0.85, dt, 1.0, 1.6, 0.8);
          clampFish(e);
        } else if (e.healTimer <= 0) {
          e.healTimer = CFG.healerInterval;
          // 按目标生命上限的百分比治疗（下限 healerAmount），否则永远追不上玩家的输出节奏
          var healAmt = Math.max(CFG.healerAmount, Math.ceil(maxHpNow * CFG.healerHealPercent));
          healTarget.hp = Math.min(maxHpNow, (healTarget.hp || 1) + healAmt);
          spawnBurst(healTarget.mesh.position, 0x7cf08a, 16, 3.4);    // 绿色治疗特效
          playEnemyVoice(e, 'heal', 0.5);                             // 治疗鱼台词（绑定到治疗鱼）
          debugLog('治疗鱼为 ' + enemyName(healTarget) + ' 回复了 ' + healAmt + ' 点生命', 'dbg-hit');
        }
      } else {
        // 无伤员：远离战斗游荡
        e.state = 'patrol';
        e.waitTimer -= dt;
        if (e.waitTimer <= 0) {
          e.waypoint.set(rand(-40, 40), 0, rand(-40, 40));
          e.waitTimer = rand(1.5, 3.0);
        }
        moveFishAvoiding(e, e.waypoint.x, e.waypoint.z, CFG.fishPatrolSpeed, dt, 1.05, 1.75, 0.7);
        clampFish(e);
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
        if (playingTime > CFG.graceTime && dist < CFG.fishDetectRange * envMul('enemyDetectMul') && hasLineOfSight(e.mesh.position.x, eyeY, e.mesh.position.z)) {
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
        // 挥剑 + 剑气（纯视觉表现：伤害仍按原近战距离 CFG.fishAttackRange 判定，不是远程攻击）
        e.swingT = 0;
        if (!e.ranged && e.swordMesh && e.swordMesh.visible) {
          e.swordMesh.getWorldPosition(_tmpSwordPos);
          _tmpWaveDir.set(
            player.pos.x - e.mesh.position.x, 0.18,
            player.pos.z - e.mesh.position.z).normalize();
          spawnSwordWave(_tmpSwordPos, _tmpWaveDir, swordWaveColor());   // 弧形剑气（色盲友好时改为金黄）
          spawnBurst(_tmpSwordPos, 0xcfefff, 6, 2.0);            // 剑刃火花
        }
        damagePlayer(Math.min(CFG.meleeDmgMax, Math.round(rand(CFG.fishDamageMin, CFG.fishDamageMax)) + meleeAtkBonus),
          { name: enemyName(e), atk: '剑气斩' });
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
    if (!e.alive) {
      // 死亡碎裂动画：快速缩小 + 轻微上浮，播完再隐藏
      if (e.dyingT > 0) {
        e.dyingT -= dt;
        var kk = Math.max(0, e.dyingT / 0.28);
        var dsc = kk * kk;
        e.mesh.scale.set(dsc, dsc, dsc);
        e.mesh.position.y += dt * 1.8;
        if (e.dyingT <= 0) e.mesh.visible = false;
      }
      continue;
    }
    // 悬浮上下浮动（分裂鱼改为史莱姆式蹦跳）
    var floatY;
    if (e.kind === 'splitter') {
      e.jumpPhase = (e.jumpPhase || 0) + dt * (Math.PI * 2 / CFG.splitterJumpPeriod);
      floatY = Math.abs(Math.sin(e.jumpPhase)) * CFG.splitterJumpHeight - 0.35;
    } else {
      floatY = Math.sin(time * 2.3 + e.phase) * 0.28;
    }
    e.mesh.position.y = e.baseY + floatY;
    // 接近提示：不同敌人进入 6 米范围时播一次台词（离开 8 米后可再次触发）
    var dpx = e.mesh.position.x - player.pos.x;
    var dpz = e.mesh.position.z - player.pos.z;
    var distP = Math.sqrt(dpx * dpx + dpz * dpz);
    if (!e.nearAnnounced && distP <= 6.0) {
      e.nearAnnounced = true;
      if (e.kind === 'shield') playEnemyVoice(e, 'shieldNear', 0.55);
      else if (e.kind === 'bomber') playEnemyVoice(e, 'bomberAlert', 0.6);
      else if (!e.ranged) playEnemyVoice(e, 'meleeNear', 0.5);
    } else if (e.nearAnnounced && distP > 8.0) {
      e.nearAnnounced = false;
    }

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
    // 自爆鱼引信已点燃：本体脉动 + 白色光环高频闪烁
    if (e.kind === 'bomber' && e.fuseTimer >= 0) {
      var blink = 0.5 + 0.5 * Math.sin(time * 16);
      s *= 1.0 + 0.08 * blink;
      if (e.fuseHalo) {
        var hs = 1.0 + 0.12 * blink;                 // 光圈脉动
        e.fuseHalo.scale.set(hs, hs, hs);
        e.fuseHalo.children[0].material.opacity = 0.2 + 0.75 * blink;
        if (e.fuseHalo.children[1]) e.fuseHalo.children[1].material.opacity = 0.15 + 0.55 * blink;
      }
    }
    e.mesh.scale.set(s, s, s);

    // 挥剑序列动画（近战攻击）：① 预备后拉 → ② 沿剑刃向玩家方向猛挥 → ③ 收招回位
    if (e.swordMesh && e.swordMesh.visible) {
      if (e.swingT >= 0) {
        e.swingT += dt;
        var T = e.swingT;
        var swing;
        if (T < 0.13) {
          swing = -(T / 0.13) * 0.5;                     // ① 预备：剑向后上方拉
        } else if (T < 0.27) {
          var k1 = (T - 0.13) / 0.14;
          swing = -0.5 + k1 * 1.85;                      // ② 挥砍：快速前挥到底
        } else if (T < 0.52) {
          var k2 = (T - 0.27) / 0.25;
          swing = 1.35 * (1 - k2) * (1 - k2);            // ③ 收招：缓动回待机
        } else {
          swing = 0;
          e.swingT = -1;                                 // 动画结束
        }
        e.swordMesh.rotation.set(
          SWORD_REST_X + swing * 1.25,
          SWORD_REST_Y - swing * 0.40,
          SWORD_REST_Z + swing * 0.60);
      }
    }
  }
}

function killFish(e, hitPoint) {
  e.alive = false;
  e.respawnTimer = 99999;   // 波次制：敌人不重生（下一波由波次系统补足）
  if (!e.isChild) rollKillRewards();   // 子鱼不掉战利品
  // 特殊敌人概率掉落扩容弹夹（手枪/步枪，级别随机）
  if (!e.isChild && (e.kind === 'bomber' || e.kind === 'shield' || e.kind === 'healer' || e.kind === 'splitter') &&
      Math.random() < CFG.magDropChance) {
    spawnMagItem(e.mesh.position.clone());
    debugLog(enemyName(e) + ' 掉落了扩容弹夹', 'dbg-hit');
  }
  stopEnemyVoice(e);              // 死亡立即掐断该敌人的语音（如射手鱼的 biu biu）
  e.dyingT = 0.28;                // 死亡碎裂动画：缩小 + 上浮后再隐藏（不再瞬间消失）

  // 分裂鱼：死亡时分裂出数条小鱼（归入同一波，保证清波判定正确）
  if (e.kind === 'splitter') {
    for (var si = 0; si < CFG.splitterSpawnCount; si++) {
      var sang = rand(0, Math.PI * 2);
      var sp = spawnFish(new THREE.Vector3(
        e.mesh.position.x + Math.cos(sang) * 1.3, 0,
        e.mesh.position.z + Math.sin(sang) * 1.3), 'normal');
      sp.waveTag = e.waveTag;
      sp.hp = 1;                      // 分裂出的小鱼只有 1 点生命
      sp.isChild = true;              // 子鱼：不计分、不计连杀、不掉战利品
      sp.ranged = false;              // 且禁止随机成远程射手（否则一条分裂鱼等于 3 次击杀还带枪）
      if (sp.gunMesh) sp.gunMesh.visible = false;
      if (sp.swordMesh) sp.swordMesh.visible = true;
      spawnBurst(sp.mesh.position, 0xa8f0c0, 10, 2.6);
    }
    playSfx('split', 0.7);   // 分裂鱼台词：「oh-no，我裂开了喵」
    showNotice('分裂鱼分裂成了 ' + CFG.splitterSpawnCount + ' 条小鱼！');
  }

  kills += 1;
  // 分裂子鱼：只计击杀数，不计分 / 不计连杀 / 不计成就与统计
  //（否则一条分裂鱼相当于 3 次击杀，成为刷分与刷评级的燃料）
  if (!e.isChild) {
    score += 10;
    unlockAchievement('firstBlood');     // 成就：初次猎杀
    bumpStat('totalKills', 1);           // 累计击杀（千鱼斩）
    addComboPoints(CFG.comboFishPoints); // 连杀 +1 点
  }
  // 回血来源①：连杀 SSS 增益（击杀回复 2% 最大生命）
  var lifeSteal = comboBonus().lifesteal;
  if (lifeSteal > 0 && player.hp < CFG.maxHp) {
    player.hp = Math.min(CFG.maxHp, player.hp + CFG.maxHp * lifeSteal);
    updateHUD();
  }
  // 回血来源②：杀戮汲取技能（每次击杀固定回血）
  var vampHeal = upgrades.vampire * CFG.upgradeVampirePerLevel;
  if (vampHeal > 0 && player.hp < CFG.maxHp) {
    player.hp = Math.min(CFG.maxHp, player.hp + vampHeal);
    updateHUD();
  }
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

// ---------------------------------------------------------------- 近战肥鱼（手持小剑）
// 剑同样挂在贴图右手位置（与射手鱼的枪一致：图片伸出的爪爪 x≈28%, y≈72% → 平面坐标 -0.44,-0.44）
function makeFishSword() {
  var sword = new THREE.Group();

  // 剑身：银蓝金属细长条（金属度压到 0.35 —— 场景无环境贴图，纯金属会显示成黑色）
  var bladeMat = new THREE.MeshStandardMaterial({ color: 0xdce8f5, roughness: 0.34, metalness: 0.35 });
  var blade = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.5, 0.022), bladeMat);
  blade.position.y = 0.27;

  // 剑尖：四棱锥（旋转 45° 让棱线对齐剑身）
  var tip = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.13, 4), bladeMat);
  tip.position.y = 0.585;
  tip.rotation.y = Math.PI / 4;

  // 血槽高光：中间一条更亮的窄条（金属质感）
  var fuller = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.44, 0.028),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.2 }));
  fuller.position.y = 0.27;

  // 护手：金色横条 + 两端小圆球
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c05a, roughness: 0.42, metalness: 0.35 });
  var guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.038, 0.055), goldMat);
  guard.position.y = 0.01;

  var guardBallL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), goldMat);
  guardBallL.position.set(-0.12, 0.01, 0);
  var guardBallR = guardBallL.clone();
  guardBallR.position.x = 0.12;

  // 剑柄：深棕皮革
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.15, 0.048),
    new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.88 }));
  grip.position.y = -0.1;

  // 剑柄末端配重球
  var pommel = new THREE.Mesh(new THREE.SphereGeometry(0.037, 8, 6), goldMat);
  pommel.position.y = -0.19;

  sword.add(blade, tip, fuller, guard, guardBallL, guardBallR, grip, pommel);

  // 挂在爪爪上：斜握在身侧、剑尖朝前上方（避免竖直穿过鱼身），整体缩小到合适比例
  sword.position.set(-0.5, -0.46, 0.3);
  sword.rotation.set(SWORD_REST_X, SWORD_REST_Y, SWORD_REST_Z);
  sword.scale.set(1.35, 1.35, 1.35);
  return sword;
}

// 剑的待机姿态（挥剑动画以此为基准）
var SWORD_REST_X = 0.55, SWORD_REST_Y = 0.28, SWORD_REST_Z = -0.95;

// ---------------------------------------------------------------- 自爆肥鱼（怀抱「大伊万」核弹）
// 核辐射警告标志贴图（程序化绘制：黄底 + 黑色三叶形 + 边框）
function makeRadiationTexture() {
  var c = makeCanvas(128, 128);
  var x = c.getContext('2d');
  x.fillStyle = '#f2d024'; x.fillRect(0, 0, 128, 128);          // 黄底
  x.strokeStyle = '#141414'; x.lineWidth = 9; x.strokeRect(4, 4, 120, 120);  // 黑边
  var cx = 64, cy = 64;
  x.fillStyle = '#141414';
  // 三叶形（环形扇区，彼此留缝）
  for (var i = 0; i < 3; i++) {
    var mid = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    var half = 0.52;
    x.beginPath();
    x.arc(cx, cy, 46, mid - half, mid + half);
    x.arc(cx, cy, 19, mid + half, mid - half, true);
    x.closePath();
    x.fill();
  }
  // 中心圆
  x.beginPath(); x.arc(cx, cy, 11, 0, Math.PI * 2); x.fill();
  return c;
}

// 核弹模型（大伊万）：椭圆柱弹体 + 锥形头部 + 尾翼 + 白色头巾
function makeBombMesh() {
  var g = new THREE.Group();
  var bodyTex = new THREE.CanvasTexture(makeRadiationTexture());
  bodyTex.colorSpace = THREE.SRGBColorSpace;
  var bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.55, metalness: 0.2 });
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.42, metalness: 0.45 });

  // 弹体（圆柱横放，朝前 +Z）
  var body = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.92, 14), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  // 锥形头部
  var nose = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.32, 14), metalMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.62;
  g.add(nose);

  // 尾部收口
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.13, 0.22, 12), metalMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = -0.55;
  g.add(tail);

  // 四片尾翼
  var finMat = new THREE.MeshStandardMaterial({ color: 0x6f7880, roughness: 0.5, metalness: 0.4 });
  for (var i = 0; i < 4; i++) {
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.28, 0.3), finMat);
    var ang = i * Math.PI / 2 + Math.PI / 4;
    fin.position.set(Math.cos(ang) * 0.21, Math.sin(ang) * 0.21, -0.45);
    fin.rotation.z = ang;
    g.add(fin);
  }

  // 白色头巾：包裹弹体前段的布罩 + 打结 + 两条飘逸巾角（比环形更醒目）
  var clothMat = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.95 });
  var hood = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), clothMat);
  hood.position.z = 0.34;
  hood.scale.set(1.06, 1.06, 1.2);
  g.add(hood);
  // 打结
  var knot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), clothMat);
  knot.position.set(-0.26, 0.12, 0.3);
  g.add(knot);
  // 两条向后飘的巾角
  for (var k = 0; k < 2; k++) {
    var band = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.026), clothMat);
    band.position.set(-0.32 - k * 0.05, -0.08 - k * 0.06, 0.1 - k * 0.12);
    band.rotation.set(0.45, 0, 0.55 + k * 0.4);
    g.add(band);
  }

  // 辐射警告牌：用 Sprite（始终面向相机，标志不会被拉伸或遮挡）
  var warnTex = new THREE.CanvasTexture(makeRadiationTexture());
  warnTex.colorSpace = THREE.SRGBColorSpace;
  var warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: warnTex, transparent: true, depthWrite: false }));
  warn.scale.set(0.4, 0.4, 1);
  warn.position.set(-0.28, 0.1, 0.12);
  g.add(warn);

  // 抱在身前（像抱着一颗炸弹）—— 尺寸贴近身体，不遮挡鱼脸
  g.position.set(-0.44, -0.5, 0.26);
  g.rotation.set(0.32, 0, -0.18);
  g.scale.set(0.82, 0.82, 0.82);
  return g;
}

// ---------------------------------------------------------------- 护盾肥鱼（身前举着能量盾）
function makeShieldMesh() {
  var g = new THREE.Group();
  // 主盾面：半透明圆形能量场
  var face = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.06, 24),
    new THREE.MeshBasicMaterial({
      color: 0x6fd0ff, transparent: true, opacity: 0.34,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending,
    }));
  g.add(face);
  // 外圈发光边
  var rim = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.13, 24),
    new THREE.MeshBasicMaterial({ color: 0xb0eaff, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }));
  g.add(rim);
  // 中心能量核心
  var core = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 14),
    new THREE.MeshBasicMaterial({ color: 0xe6faff, transparent: true, opacity: 0.9, depthWrite: false }));
  g.add(core);
  // 举在身前（约遮住鱼身下半部，露出头部便于辨认）
  g.position.set(0, -0.12, 0.6);
  g.scale.set(0.76, 0.76, 0.76);
  return g;
}

// ---------------------------------------------------------------- 治疗肥鱼（护士帽 + 大针筒）
function makeNurseHatMesh() {
  var g = new THREE.Group();
  var white = new THREE.MeshStandardMaterial({ color: 0xf7f9fb, roughness: 0.86 });
  var red = new THREE.MeshStandardMaterial({ color: 0xd83030, roughness: 0.7 });

  // 帽体（小圆盘，略微上窄下宽）
  var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 0.11, 14), white);
  g.add(cap);
  // 红十字（两片薄板交叉）
  var crossA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.05), red);
  crossA.position.y = 0.062;
  var crossB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.16), red);
  crossB.position.y = 0.062;
  g.add(crossA, crossB);
  return g;
}

function makeSyringeMesh() {
  var g = new THREE.Group();
  // 针筒（半透明药剂管，横放）
  var barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82 }));
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);
  // 药剂（浅绿，略细）
  var fluid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0x8ce6a0, roughness: 0.4, transparent: true, opacity: 0.75 }));
  fluid.rotation.z = Math.PI / 2;
  fluid.position.x = 0.03;
  g.add(fluid);
  // 活塞杆
  var rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.4, metalness: 0.5 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.x = -0.25;
  g.add(rod);
  // 推板
  var plate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xc6d0d8, roughness: 0.45, metalness: 0.4 }));
  plate.position.x = -0.35;
  g.add(plate);
  // 针头
  var needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xe2e9ef, roughness: 0.2, metalness: 0.8 }));
  needle.rotation.z = Math.PI / 2;
  needle.position.x = 0.27;
  g.add(needle);

  // 手持（与剑/枪同锚点：贴图右手爪爪）
  g.position.set(-0.44, -0.42, 0.3);
  g.rotation.set(0.16, 0, -0.55);
  g.scale.set(1.55, 1.55, 1.55);
  return g;
}

// 爆炸特效（火球 + 冲击环 + 蘑菇云烟团）
var blastFx = [];

function spawnMushroomCloud(pos) {
  // 粒子（减量，避免方块粒子盖过云体）
  spawnBurst(pos, 0xffd24a, 22, 8.5);
  spawnBurst(pos, 0xff7a2a, 14, 6.0);

  // ① 火球：中心亮球，膨胀较久（蘑菇云根部）
  var ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xffca55, transparent: true, opacity: 0.95, depthWrite: false }));
  ball.position.set(pos.x, pos.y + 0.3, pos.z);
  scene.add(ball);
  blastFx.push({ mesh: ball, mat: ball.material, t: 0, life: 0.85, growth: 2.4, rise: 1.1, growY: 0 });

  // ② 烟柱：垂直圆柱向上抽升（蘑菇柄）
  var stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.85, 2.4, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xd9c9a8, transparent: true, opacity: 0.72, depthWrite: false,
      side: THREE.DoubleSide,
    }));
  stem.position.set(pos.x, pos.y + 1.2, pos.z);
  scene.add(stem);
  blastFx.push({ mesh: stem, mat: stem.material, t: 0, life: 1.5, growth: 0.9, rise: 1.4, growY: 1.1 });

  // ③ 云冠：顶部横向铺开的圆盘（蘑菇伞盖）
  var cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe6c2, transparent: true, opacity: 0.88, depthWrite: false }));
  cap.position.set(pos.x, pos.y + 2.5, pos.z);
  cap.scale.set(1.5, 0.65, 1.5);
  scene.add(cap);
  blastFx.push({ mesh: cap, mat: cap.material, t: 0, life: 1.35, growth: 1.8, rise: 0.8, growY: 0 });

  // ④ 地面冲击环：水平扩散并抬升一点（避免完全贴地被忽视）
  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.95, 26),
    new THREE.MeshBasicMaterial({
      color: 0xffe0b0, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.NormalBlending,
    }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.35, pos.z);
  scene.add(ring);
  blastFx.push({ mesh: ring, mat: ring.material, t: 0, life: 0.8, growth: 5.0, rise: 0, growY: 0 });
}

function updateBlastFx(dt) {
  for (var i = blastFx.length - 1; i >= 0; i--) {
    var f = blastFx[i];
    f.t += dt;
    var k = f.t / f.life;
    var s = 1 + k * f.growth;
    var sy = s * (1 + k * (f.growY || 0));   // 烟柱可额外纵向拉伸
    f.mesh.scale.set(s, sy, s);
    f.mesh.position.y += f.rise * dt;
    f.mat.opacity = Math.max(0, (1 - k) * 0.95);
    if (f.t >= f.life) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mat.dispose();
      blastFx.splice(i, 1);
    }
  }
}

// 自爆鱼索敌警告：玩家处在存活自爆鱼的索敌范围内时，持续闪烁红屏
var bomberWarnOn = false;
function updateBomberWarn() {
  if (!dom.bomberWarn) return;
  var danger = false;
  if (state === 'playing') {
    var r2 = CFG.bomberDetectRange * CFG.bomberDetectRange;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive || e.kind !== 'bomber') continue;
      var dx = e.mesh.position.x - player.pos.x;
      var dz = e.mesh.position.z - player.pos.z;
      if (dx * dx + dz * dz <= r2) { danger = true; break; }
    }
  }
  if (danger !== bomberWarnOn) {
    bomberWarnOn = danger;
    dom.bomberWarn.classList.toggle('on', danger);
  }
}

// 自爆鱼点火：挂上白色闪烁光环（爬行者式预警，给玩家 3 秒撤离时间）
function startBomberFuse(e) {
  if (e.fuseHalo) return;
  // 光圈：双层发光圆环环绕鱼身（鱼是 billboard，圆环自然面向相机）
  var halo = new THREE.Group();
  var ringOuter = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.05, 8, 30),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.NormalBlending,
    }));
  halo.add(ringOuter);
  var ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.03, 8, 26),
    new THREE.MeshBasicMaterial({
      color: 0xf2f8ff, transparent: true, opacity: 0.4, depthWrite: false,
      blending: THREE.NormalBlending,
    }));
  halo.add(ringInner);
  e.mesh.add(halo);
  e.fuseHalo = halo;
  debugLog('自爆鱼点燃引信：' + CFG.bomberFuseTime + ' 秒后爆炸，快撤！', 'dbg-hit');
}

// 自爆：范围伤害（1m 内 100 / 1~5m 50 / 5m 外免伤）+ 蘑菇云
function explodeBomber(e) {
  var pos = e.mesh.position.clone();
  var d = Math.sqrt(Math.pow(player.pos.x - pos.x, 2) + Math.pow(player.pos.z - pos.z, 2));

  if (d <= CFG.bomberFatalRange) {
    damagePlayer(CFG.bomberDamageClose, { name: '自爆肥鱼', atk: '核弹自爆' });
  } else if (d <= CFG.bomberBlastRange) {
    damagePlayer(CFG.bomberDamageFar, { name: '自爆肥鱼', atk: '核弹冲击' });
  }
  spawnMushroomCloud(pos);
  stopEnemyVoice(e);         // 自爆鱼语音立即掐断
  if (d > CFG.bomberBlastRange) unlockAchievement('ghost');   // 成就：5 米外全身而退
  playSfx('boom', 0.9);      // 自爆爆炸（比 Boss 炸弹更响）
  Sfx.fishDie();

  e.alive = false;
  e.respawnTimer = 99999;
  e.mesh.visible = false;
  // 自爆是敌人自身行为：不计入玩家击杀/得分/连杀（避免站着不动刷分）
  updateHUD();
  debugLog('自爆肥鱼引爆（距离 ' + d.toFixed(1) + ' 米，造成 ' +
    (d <= CFG.bomberFatalRange ? CFG.bomberDamageClose : d <= CFG.bomberBlastRange ? CFG.bomberDamageFar : 0) + ' 点伤害）', 'dbg-hit');
}

// ---------------------------------------------------------------- 剑气特效
// 近战攻击的"具象化"：挥剑瞬间从剑刃朝玩家方向冲出一道弧形剑气。
// 纯视觉表现 —— 伤害判定仍按原有近战距离（CFG.fishAttackRange），不做远程判定。
var _waveGeo = null;
var _waveGeoInner = null;
var swordWaves = [];
var _tmpSwordPos = new THREE.Vector3();
var _tmpWaveDir = new THREE.Vector3();

function spawnSwordWave(origin, dir, colorHex) {
  if (!_waveGeo) {
    // 弧形扇面（约 80° 弧）：像一道月牙剑气
    _waveGeo = new THREE.RingGeometry(0.30, 1.15, 20, 1, Math.PI * 0.30, Math.PI * 0.44);
  }
  // 用普通混合而不是加色混合：明亮沙漠背景下加色几乎看不见（实测踩坑）
  var mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  var group = new THREE.Group();
  var mesh = new THREE.Mesh(_waveGeo, mat);
  group.add(mesh);

  // 内层白色高亮（略小）：让剑气在亮背景上也有对比度
  if (!_waveGeoInner) {
    _waveGeoInner = new THREE.RingGeometry(0.38, 0.92, 20, 1, Math.PI * 0.32, Math.PI * 0.40);
  }
  var matInner = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, blending: THREE.NormalBlending, depthWrite: false,
  });
  group.add(new THREE.Mesh(_waveGeoInner, matInner));

  group.position.copy(origin);
  group.lookAt(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);
  group.rotateZ(Math.PI * 0.5);          // 月牙立起来（弧口朝飞行方向）
  scene.add(group);
  swordWaves.push({
    mesh: group, mat: mat, matInner: matInner,
    dir: dir.clone(),
    life: 0.34, t: 0, speed: 7.2,
  });
}

function updateSwordWaves(dt) {
  for (var i = swordWaves.length - 1; i >= 0; i--) {
    var w = swordWaves[i];
    w.t += dt;
    var k = w.t / w.life;
    w.mesh.position.x += w.dir.x * w.speed * dt;
    w.mesh.position.y += w.dir.y * w.speed * dt;
    w.mesh.position.z += w.dir.z * w.speed * dt;
    var s = 0.72 + k * 0.9;             // 边飞边扩张
    w.mesh.scale.set(s, s, s);
    w.mat.opacity = 0.88 * (1 - k * k); // 快速淡出
    if (w.matInner) w.matInner.opacity = 0.55 * (1 - k * k);
    if (w.t >= w.life) {
      scene.remove(w.mesh);
      w.mat.dispose();
      if (w.matInner) w.matInner.dispose();
      swordWaves.splice(i, 1);
    }
  }
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
  playEnemyVoice(e, 'fishShoot', 0.42);   // 射手鱼开火（绑定到该鱼，死亡即掐断）
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
  // 武器栏：高亮当前武器；匕首不显示弹药数字
  var wbar = document.getElementById('weapon-bar');
  if (wbar && typeof wbar.querySelectorAll === 'function') {   // 无头测试环境的 DOM 桩可能不支持
    var slots = wbar.querySelectorAll('.wslot');
    for (var si = 0; si < slots.length; si++) {
      if (slots[si].classList) {
        slots[si].classList.toggle('active', slots[si].getAttribute('data-wkey') === WEAPONS[currentWeapon].key);
      }
    }
  }
  var isMeleeNow = !!WEAPONS[currentWeapon].melee;
  if (dom.ammoWrap) dom.ammoWrap.style.opacity = isMeleeNow ? '0.35' : '1';
}

// 换弹请求：R 键或弹夹打空时触发；备用为 0 时提示"弹药耗尽"且不换弹
function requestReload() {
  if (state !== 'playing' || ammo.reloading) return;
  if (weaponDef().melee) return;             // 近战武器不需要换弹
  if (ammo.mag >= magSizeNow()) return;
  if (ammo.reserve <= 0) {
    showNotice('弹药耗尽');
    Sfx.empty();
    return;
  }
  ammo.reloading = true;
  ammo.reloadTimer = weaponDef().reloadTime;   // 换弹时长取当前武器（手枪 1.5s / 步枪 2.0s）
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
// ---------------------------------------------------------------- 连杀评级增益
// 让「维持连杀」有实际收益：B 移速+5% / A 伤害+10% / S +15% / SS +20% / SSS +25% 且击杀吸血 2%
function comboBonus() {
  var r = combo.rank;
  if (r >= 6) return { speed: 0.12, damage: 0.25, lifesteal: 0.02 };   // SSS
  if (r >= 5) return { speed: 0.10, damage: 0.20, lifesteal: 0 };      // SS
  if (r >= 4) return { speed: 0.08, damage: 0.15, lifesteal: 0 };      // S
  if (r >= 3) return { speed: 0.05, damage: 0.10, lifesteal: 0 };      // A
  if (r >= 2) return { speed: 0.05, damage: 0, lifesteal: 0 };         // B
  return { speed: 0, damage: 0, lifesteal: 0 };                        // D / C / 无
}

/** 当前子弹伤害（技能升级 × 连杀评级加成） */
function gunDamageNow() {
  // 环境修饰：血月时玩家伤害 +10%（N5）
  return (1 + upgrades.dmg) * (1 + comboBonus().damage) * envMul('playerDmgMul');
}

/** 结算一次子弹伤害：含暴击判定（致命打击） */
function rollGunDamage() {
  var base = gunDamageNow() * weaponDef().damageMul;   // 武器伤害倍率
  var critRate = upgrades.crit * CFG.upgradeCritPerLevel;
  var isCrit = critRate > 0 && Math.random() < critRate;
  return { damage: isCrit ? base * CFG.upgradeCritMul : base, isCrit: isCrit };
}

/** 当前弹匣容量（按武器已装备的扩容等级） */
function magSizeNow() {
  var info = magTierInfo(currentWeapon);
  return info ? info.size : weaponDef().magSize;
}

/** 给指定武器加备弹（自动受备弹上限约束）；默认当前武器 */
function addReserve(n, weapon) {
  var w = weapon || currentWeapon;
  if (WEAPONS[w] && WEAPONS[w].melee) return 0;   // 近战武器没有备弹
  var cap = reserveMaxNow(w);
  if (w === currentWeapon) {
    ammo.reserve = Math.min(cap, ammo.reserve + n);
    return ammo.reserve;
  }
  weaponAmmo[w].reserve = Math.min(cap, weaponAmmo[w].reserve + n);
  return weaponAmmo[w].reserve;
}

/** 武器负重对移速的影响：
    步枪大扩容弹夹 -5% 基础移速；步枪弹鼓 -10% 当前移速 */
function weaponSpeedPenalty() {
  if (currentWeapon !== 'rifle') return { base: 1, final: 1 };
  var t = magTier.rifle || 0;
  return {
    base: t >= 3 ? 0.95 : 1,     // 在基础移速上扣
    final: t >= 4 ? 0.90 : 1,    // 在最终（含技能与连杀加成）移速上扣
  };
}

/** 当前手雷伤害区间（高爆手雷） */
function nadeDamageNow() {
  var bonus = upgrades.nadedmg * CFG.upgradeNadeDmgPerLevel;
  // 环境修饰：深夜时手雷伤害 +30%、半径 +1 米（N5）
  return {
    min: (CFG.nadeDamageMin + bonus) * envMul('nadeDmgMul'),
    max: (CFG.nadeDamageMax + bonus) * envMul('nadeDmgMul'),
    radius: CFG.nadeRadius + upgrades.nadedmg * CFG.upgradeNadeRadiusPerLevel + envMul('nadeRadiusAdd'),
  };
}

/** 当前护甲层数上限（护甲强化） */
function armorMaxNow() {
  return CFG.armorMaxStacks + upgrades.armorup * CFG.upgradeArmorPerLevel;
}

/** 连杀增益文案（用于提升时播报） */
function comboBonusText() {
  var b = comboBonus();
  var parts = [];
  if (b.damage > 0) parts.push('伤害 +' + Math.round(b.damage * 100) + '%');
  if (b.speed > 0) parts.push('移速 +' + Math.round(b.speed * 100) + '%');
  if (b.lifesteal > 0) parts.push('击杀吸血 ' + Math.round(b.lifesteal * 100) + '%');
  return parts.join(' · ');
}

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
    var bonusText = comboBonusText();
    if (bonusText) showNotice('连杀增益：' + bonusText);
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
  // ---- 扩展技能（V0.4.1 新增）----
  crit:    { ico: '🎯', name: '致命打击', short: '暴击率 +5%' },
  pierce:  { ico: '➶', name: '穿甲弹',   short: '子弹穿透 +1' },
  nadedmg: { ico: '🧨', name: '高爆手雷', short: '手雷更强' },
  armorup: { ico: '🛡️', name: '护甲强化', short: '护甲上限 +1' },
  vampire: { ico: '🩸', name: '杀戮汲取', short: '击杀回血' },
};
var UPGRADE_ORDER = ['dmg', 'refund', 'heal', 'nade', 'speed',
  'crit', 'pierce', 'nadedmg', 'armorup', 'vampire'];
// 注：「扩容弹夹」已从技能改为击杀特殊敌人掉落的道具（见 MAG_TIERS / magTier）
// 核心 5 项：通关判定只看它们（扩展技能不强制满级，避免通关周期被拉长到 110 次强化）
var CORE_UPGRADES = ['dmg', 'refund', 'heal', 'nade', 'speed'];

// 下一级效果描述（lv = 即将达到的等级 1~8）
function upgradeNextDesc(id, lv) {
  switch (id) {
    case 'dmg':    return '子弹伤害 +' + lv + ' 点';
    case 'refund': return '击杀后 10% 概率恢复 ' + (CFG.upgradeRefundPerLevel * lv) + ' 颗子弹';
    case 'heal':   return '击杀后 ' + Math.round((CFG.upgradeHealChanceBase + (lv - 1) * CFG.upgradeHealChanceInc) * 100) + '% 概率恢复 ' + CFG.upgradeHealAmount + ' 生命';
    case 'nade':   return '击杀后 ' + Math.round((CFG.upgradeNadeChanceBase + (lv - 1) * CFG.upgradeNadeChanceInc) * 100) + '% 概率获得 1 颗手雷';
    case 'speed':  return '移动速度 +' + Math.round(CFG.upgradeSpeedPerLevel * lv * 100) + '%';
    case 'crit':    return '暴击率 ' + Math.round(CFG.upgradeCritPerLevel * lv * 100) + '%（暴击伤害 ×' + CFG.upgradeCritMul + '）';
    case 'pierce':  return '子弹可额外穿透 ' + lv + ' 个敌人';
    case 'nadedmg': return '手雷伤害 +' + (CFG.upgradeNadeDmgPerLevel * lv) + '、半径 +' + (CFG.upgradeNadeRadiusPerLevel * lv).toFixed(1) + ' 米';
    case 'armorup': return '护甲层数上限 +' + (CFG.upgradeArmorPerLevel * lv) + '（每层仍减 2 伤）';
    case 'vampire': return '每次击杀回复 ' + (CFG.upgradeVampirePerLevel * lv).toFixed(1) + ' 点生命';
  }
  return '';
}

function isAllUpgradeMax() {
  // 通关判定只看核心 5 项（扩展技能是额外构筑选择，不强制满级）
  for (var i = 0; i < CORE_UPGRADES.length; i++) {
    if (upgrades[CORE_UPGRADES[i]] < CFG.upgradeMaxLevel) return false;
  }
  return true;
}

// 每次技能等级变化后调用一次：刷新"全部满级"缓存（通关判定零扫描）
function refreshUpgradesMaxFlag() {
  upgradesAllMax = isAllUpgradeMax();
}

// 从未满级技能中随机抽取（最多 3 个；不足 3 个有多少抽多少）
// ★ N1 修复：保证至少出现一张「核心技能」牌。
//   原来从全部未满级技能（核心 + 扩展）里直接抽 3 张 —— 核心只剩 1 项未满时，
//   有 C(5,3)/C(6,3) = 50% 的概率一张核心都不出，玩家会被迫连续点扩展技能，
//   实测通关被拉长到约 23 只 Boss（README 声称 20 只）。
function pickRewardOptions() {
  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  }
  var corePool = [], extPool = [];
  for (var i = 0; i < UPGRADE_ORDER.length; i++) {
    var id = UPGRADE_ORDER[i];
    if (upgrades[id] >= CFG.upgradeMaxLevel) continue;   // 已满级不参与
    if (CORE_UPGRADES.indexOf(id) >= 0) corePool.push(id);
    else extPool.push(id);
  }
  var picked = [];
  if (corePool.length > 0) {          // ① 核心未满：先固定塞一张核心牌
    shuffle(corePool);
    picked.push(corePool.pop());
  }
  var rest = shuffle(corePool.concat(extPool));   // ② 剩余名额从混合池抽
  while (picked.length < 3 && rest.length > 0) picked.push(rest.pop());
  shuffle(picked);                    // 打乱顺序，避免核心永远在第一张
  var opts = [];
  for (var m = 0; m < picked.length; m++) {
    opts.push({ id: picked[m], lv: upgrades[picked[m]], def: UPGRADE_DEFS[picked[m]] });
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
        '<div class="rw-lv">' + (o.lv > 0 ? '当前 Lv.' + o.lv + ' / ' + CFG.upgradeMaxLevel : '新强化') + '</div>' +
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
  refreshUpgradesMaxFlag();                  // 升级时检测一次满级缓存
  rewardOptions = null;
  rewardRoundsLeft -= 1;
  // 每只 Boss 有多次强化机会：还有次数且仍有可升级技能时继续弹下一次
  if (rewardRoundsLeft > 0 && pickRewardOptions().length > 0) {
    showRewardWindow();
    return;
  }
  rewardRoundsLeft = 0;
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
    var zero = lv <= 0;
    var dots = '';
    for (var d = 0; d < CFG.upgradeMaxLevel; d++) {
      dots += '<span class="' + (d < lv ? '' : 'off') + '">▮</span>';
    }
    // 开发者模式：技能行显示 -/+ 可编辑（0~10 级）
    var ctrl = '';
    if (debugMode) {
      ctrl = '<div class="sk-ctrl">' +
        '<button class="sk-btn sk-minus" data-id="' + id + '" data-act="minus" ' + (zero ? 'disabled' : '') + '>−</button>' +
        '<button class="sk-btn sk-plus" data-id="' + id + '" data-act="plus" ' + (maxed ? 'disabled' : '') + '>＋</button>' +
        '</div>';
    }
    html += '<div class="skill-row' + (maxed ? ' sk-max' : '') + '">' +
      '<div class="sk-ico">' + def.ico + '</div>' +
      '<div class="sk-body">' +
      '<div class="sk-name">' + def.name + (maxed ? '<span class="sk-lv">MAX 已满级</span>' : '<span class="sk-lv">Lv.' + lv + ' / ' + CFG.upgradeMaxLevel + '</span>') + '</div>' +
      '<div class="sk-desc">' + upgradeNextDesc(id, Math.max(1, lv + 1)) + '</div>' +
      '<div class="sk-dots">' + dots + '</div>' +
      '</div>' + ctrl + '</div>';
  }
  dom.skillsList.innerHTML = html;
}

// 开发者模式：调整技能等级（0 ~ 10，实时生效并刷新面板）
function adjustSkill(id, delta) {
  if (!upgrades.hasOwnProperty(id)) return;
  upgrades[id] = Math.max(0, Math.min(CFG.upgradeMaxLevel, upgrades[id] + delta));
  refreshUpgradesMaxFlag();                  // 编辑时检测一次满级缓存
  renderSkillsPanel();
  updateHUD();
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

// ---------------------------------------------------------------- 作弊被抓（开发者模式通关后回主菜单）
function triggerCheatCaught() {
  state = 'cheat';
  exitDebugMode();                       // 解除开发者模式
  if (dom.cheatOverlay) dom.cheatOverlay.classList.remove('hidden');
  if (document.exitPointerLock) document.exitPointerLock();
  cheatMusicOn = true;
  cheatMusicTimer = 0;
  cheatMusicStep = 0;
  Sfx.cheatNote(0);
}

// 任意键：关闭搞怪音乐 → 完整重置回主菜单（菜单音乐随之恢复）
function closeCheatCaught() {
  if (state !== 'cheat') return;
  cheatMusicOn = false;
  if (dom.cheatOverlay) dom.cheatOverlay.classList.add('hidden');
  restartGame(true);
}

// 搞怪音乐循环驱动（WebAudio 程序合成，0.26 秒一拍）
function updateCheatMusic(dt) {
  if (!cheatMusicOn) return;
  cheatMusicTimer -= dt;
  if (cheatMusicTimer <= 0) {
    cheatMusicTimer = 0.26;
    cheatMusicStep += 1;
    Sfx.cheatNote(cheatMusicStep);
  }
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
    addReserve(CFG.upgradeRefundPerLevel * upgrades.refund);   // 弹药回收（受备弹上限约束）
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
  // ★ N3：小怪生命成长放缓 —— 每 2 只 Boss +1（原来每只 +1，
  //   第 9 只 Boss 就涨到 10 血上限，与弹药压力叠加后波次 20~45 极易弹药荒）
  enemyHpNow = Math.min(CFG.enemyHpMax, 1 + Math.floor(bossKillCount / 2));
  if (enemyHpNow >= CFG.enemyAtkGrowAtHp) {                          // 血量到 10 后攻击 +1/次
    var atkSteps = bossKillCount - (CFG.enemyAtkGrowAtHp - 1);
    meleeAtkBonus = Math.min(CFG.meleeDmgMax - 25, atkSteps);        // 近战基数 15~25 → 上限 50
    rangedAtkBonus = Math.min(CFG.rangedDmgMax - 12, atkSteps);      // 射手基数 7~12 → 上限 30
  }
  bossHpNext = Math.min(CFG.bossHpMax, 15 + 5 * bossKillCount);      // 下只 Boss 血量（≤100）
  bossBallDmgNow = Math.min(CFG.bossBallDmgMax, 25 + 2 * bossKillCount); // Boss 炮弹伤害（≤60）
  fishCapNow = Math.round(CFG.fishCount * Math.pow(1 + CFG.fishCapGrowRate, bossKillCount)); // 生成速率 +5%
  checkStageUp();   // 阶段推进播报（每 bossesPerStage 次 Boss 升一阶段，解锁新敌人）
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
  unlockAchievement('conqueror');     // 成就：无尽征服者（通关）
  Sfx.bossDie();
  if (document.exitPointerLock) document.exitPointerLock();
  if (dom.finalScoreV) dom.finalScoreV.textContent = String(score);
  if (dom.finalKillsV) dom.finalKillsV.textContent = String(kills);
  if (dom.finalBossKillsV) dom.finalBossKillsV.textContent = String(bossKillCount);
  // 通关同样计入历史记录
  fillResultStats('-v', updateRecords());
  refreshBestRecords();
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

/** 扩容弹夹道具的外观：弹夹本体 + 子弹头，颜色按级别区分 */
function buildMagItem(weapon, tier, pos) {
  var g = new THREE.Group();
  var isRifle = weapon === 'rifle';
  var colors = isRifle ? [0x8ad8b0, 0x6ec8ff, 0xc8a0ff, 0xffb060, 0xff7a7a]
                       : [0x8ad8b0, 0x6ec8ff, 0xc8a0ff, 0xffb060];
  var col = colors[clamp(tier, 0, colors.length - 1)];
  var isDrum = (isRifle && tier >= 4);
  // 底座光环（区分道具类型）
  var ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 8, 26), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  var matBody = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.45, metalness: 0.7 });
  var matAcc = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.55, emissive: col, emissiveIntensity: 0.18 });
  if (isDrum) {
    // 弹鼓：圆柱形大弹鼓
    var drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 22), matBody);
    drum.rotation.x = Math.PI / 2;
    drum.position.y = 0.42;
    var drumFace = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.28, 18), matAcc);
    drumFace.rotation.x = Math.PI / 2;
    drumFace.position.y = 0.42;
    g.add(drum, drumFace);
  } else {
    // 弹夹：长方体 + 顶部子弹头
    var body = new THREE.Mesh(new THREE.BoxGeometry(isRifle ? 0.26 : 0.2, 0.5, isRifle ? 0.5 : 0.34), matBody);
    body.position.y = 0.32;
    body.castShadow = true;
    g.add(body);
    var band = new THREE.Mesh(new THREE.BoxGeometry(isRifle ? 0.29 : 0.23, 0.1, isRifle ? 0.53 : 0.37), matAcc);
    band.position.y = 0.46;
    g.add(band);
    for (var bi = 0; bi < 3; bi++) {
      var bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), matAcc);
      bullet.position.set((bi - 1) * 0.08, 0.62, 0);
      g.add(bullet);
    }
  }
  g.position.set(pos.x, 0, pos.z);
  return g;
}

/** 击杀特殊敌人时按概率掉落扩容弹夹 */
function spawnMagItem(pos) {
  // 枪种：优先当前武器；级别偏向“略高于当前”，保证大多数掉落有效
  var weapon = (Math.random() < (currentWeapon === 'rifle' ? 0.6 : 0.4)) ? 'rifle' : 'pistol';
  var list = MAG_TIERS[weapon];
  var maxT = list.length - 1;
  var cur = magTier[weapon] || 0;
  // ★ N2 修复：所有掉落都保证有效。
  //   原来是 45% +1 / 27% +2 / 16% 同级 / 12% 低级 —— 后两档共 28% 捡了不生效。
  //   现在 45% +1 / 27% +2 / 28% 也是 +1；该枪已满档时干脆不掉落。
  if (cur >= maxT) return;             // 满档：不再掉落这把枪的弹夹
  var roll = Math.random();
  var tier;
  if (roll < 0.45)      tier = Math.min(maxT, cur + 1);
  else if (roll < 0.72) tier = Math.min(maxT, cur + 2);
  else                  tier = Math.min(maxT, cur + 1);
  if (tier <= 0) tier = 1;
  var mesh = buildMagItem(weapon, tier, pos);
  scene.add(mesh);
  items.push({ mesh: mesh, type: 'mag', weapon: weapon, tier: tier, phase: rand(0, Math.PI * 2) });
}

function spawnItem() {
  if (items.length >= CFG.itemMax) return;
  var pos = pickItemPos();
  if (!pos) return;
  // 弹药越紧缺，出现弹药箱的概率越高（30% ~ 85%）
  var ammoChance = CFG.itemAmmoChanceBase + ammoTension() * CFG.itemAmmoChanceRange;
  var type = Math.random() < ammoChance ? 'ammo' : 'health';
  var mesh = buildItem(type, pos);
  scene.add(mesh);
  items.push({ mesh: mesh, type: type, phase: rand(0, Math.PI * 2) });
}

function pickupItem(it, index) {
  if (it.type === 'mag') {
    // 扩容弹夹：只有更高级别才会替换；同级或更低不生效，也不消耗道具（留在原地）
    var cur = magTier[it.weapon] || 0;
    var info = MAG_TIERS[it.weapon][it.tier];
    var curInfo = MAG_TIERS[it.weapon][cur];
    var wname = it.weapon === 'rifle' ? '步枪' : '手枪';
    if (it.tier <= cur) {
      showNotice(info.name + ' 不低于当前装备（' + curInfo.name + '），已忽略');
      return;                          // 不拾取：不播放音效、不移除道具
    }
    magTier[it.weapon] = it.tier;
    if (it.weapon === currentWeapon) {
      ammo.magSize = magSizeNow();
      ammo.mag = ammo.magSize;         // 换上新弹夹：直接装满
    } else {
      weaponAmmo[it.weapon].mag = info.size;
    }
    showNotice('装备 ' + info.name + ' —— ' + wname + '弹夹容量 ' + info.size +
      (it.weapon === 'rifle' && it.tier >= 4 ? '（移速 -10%）' : (it.weapon === 'rifle' && it.tier === 3 ? '（移速 -5%）' : '')));
    Sfx.pickupAmmo();
  } else if (it.type === 'ammo') {
    // ★ N3 改版：两把枪各补「一个弹夹容量」的备弹（各自受上限约束）
    var gained = [];
    ['pistol', 'rifle'].forEach(function (w) {
      var info = magTierInfo(w);
      var size = info ? info.size : WEAPONS[w].magSize;
      var cap = reserveMaxNow(w);
      var cur = reserveOf(w);
      var add = Math.min(size, cap - cur);
      if (add <= 0) return;
      if (w === currentWeapon && !weaponDef().melee) ammo.reserve += add;
      else weaponAmmo[w].reserve += add;
      gained.push((w === 'rifle' ? '步枪' : '手枪') + ' +' + add);
    });
    if (gained.length === 0) {
      showNotice('两把枪的备弹都已满');
      return;
    }
    showNotice('弹药补给 —— ' + gained.join(' · '));
    Sfx.pickupAmmo();
  } else if (it.type === 'armor') {
    // 每拾取一个护甲道具 = +1 层护盾（每层防御力 = CFG.armorPerPick 点）
    armorStacks = Math.min(armorMaxNow(), armorStacks + 1);
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
  if (armorStacks >= armorMaxNow()) return;   // 满层后不再生成
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
      // 环境修饰：黄昏时补给刷新间隔 -20%（N5）
      itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax) * envMul('supplyIntervalMul');
    }
    armorTimer -= dt;                  // 护甲生成判定：每 10 秒 25% 概率
    if (armorTimer <= 0) {
      armorTimer = CFG.armorInterval;
      if (armorStacks < armorMaxNow() && Math.random() < CFG.armorChance) spawnArmorItem();
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

// ---------------------------------------------------------------- Boss 变体
// 按阶段切换 Boss 类型：复用同一立绘，换武器模型与 AI 模式（共 5 种）
var BOSS_VARIANTS = [
  { name: '超级蓝色大肥鱼', mode: 'rocket',  hpMul: 1.0,  speedMul: 1.0,  tint: 0xffffff, tip: '半跟踪火箭弹' },
  { name: '狂暴冲锋鱼',     mode: 'charge',  hpMul: 1.15, speedMul: 1.75, tint: 0xffd8d8, tip: '高速冲撞' },
  { name: '召唤祭司鱼',     mode: 'summon',  hpMul: 0.9,  speedMul: 0.85, tint: 0xd8c8ff, tip: '召唤鱼群' },
  { name: '重炮台鱼',       mode: 'barrage', hpMul: 1.25, speedMul: 0.55, tint: 0xc8d8ff, tip: '三连扇形炮' },
  { name: '分裂母鱼',       mode: 'split',   hpMul: 1.2,  speedMul: 1.0,  tint: 0xc8ffd8, tip: '半血分裂' },
];

/** 当前阶段对应的 Boss 变体（阶段 1~5 依次对应 5 种） */
function bossVariantNow() {
  var idx = clamp(currentStage() - 1, 0, BOSS_VARIANTS.length - 1);
  return BOSS_VARIANTS[idx];
}

/** 大剑（狂暴冲锋鱼） */
/** 匕首模型（刀刃 + 护手 + 握柄 + 柄尾） */
function makeKnifeModel() {
  var g = new THREE.Group();
  var steel = new THREE.MeshStandardMaterial({ color: 0xeaf0fa, roughness: 0.16, metalness: 0.92 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.5, metalness: 0.55 });
  var blade = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.085, 0.40), steel);
  blade.position.set(0, 0, -0.28);
  var tip = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 4), steel);
  tip.rotation.x = -Math.PI / 2;
  tip.rotation.z = Math.PI / 4;
  tip.position.set(0, 0, -0.545);
  var guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.028, 0.045), dark);
  guard.position.set(0, 0, -0.065);
  var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.19, 8), dark);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.055);
  var pommel = new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 6), dark);
  pommel.position.set(0, 0, 0.16);
  g.add(blade, tip, guard, handle, pommel);
  return g;
}

function makeBossSword() {
  var g = new THREE.Group();
  var steel = new THREE.MeshStandardMaterial({ color: 0xdfe6f2, roughness: 0.28, metalness: 0.85 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x2f3540, roughness: 0.5, metalness: 0.5 });
  var blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 3.4), steel);   // 剑身
  var tip = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.6, 4), steel);        // 剑尖
  tip.rotation.x = -Math.PI / 2; tip.position.set(0, 0, -1.95);
  var guard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.17, 0.24), dark);     // 护手
  guard.position.set(0, 0, 1.6);
  var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8), dark);
  handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, 2.15);
  g.add(blade, tip, guard, handle);
  g.position.set(-1.35, -1.3, 0.5);
  g.rotation.y = Math.PI * 0.32;      // 斜握：剑身侧向，不正面挡脸
  var tipAnchor = new THREE.Object3D();
  tipAnchor.position.set(0, 0, -2.2);
  g.add(tipAnchor);
  g.muzzleTip = tipAnchor;
  return g;
}

/** 法杖（召唤祭司鱼） */
function makeBossStaff() {
  var g = new THREE.Group();
  var wood = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85 });
  var orb = new THREE.MeshStandardMaterial({ color: 0xb08cff, emissive: 0x7a4cff, emissiveIntensity: 0.9, roughness: 0.2 });
  var rod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.4, 10), wood);
  rod.rotation.x = Math.PI / 2;
  var head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), orb);
  head.position.set(0, 0, -1.85);
  var halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: 0.75 }));
  halo.position.set(0, 0, -1.85);
  var ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: 0.75 }));
  ring2.position.set(0, 0, -1.85);
  ring2.rotation.y = Math.PI / 2;
  g.add(rod, head, halo, ring2);
  g.position.set(-1.35, -1.3, 0.5);
  g.rotation.y = Math.PI * 0.28;      // 略斜：法球与杖身都能看清
  var tipAnchor = new THREE.Object3D();
  tipAnchor.position.set(0, 0, -2.1);
  g.add(tipAnchor);
  g.muzzleTip = tipAnchor;
  g.orb = head;
  return g;
}

/** 三管重炮（重炮台鱼） */
function makeBossCannon() {
  var g = new THREE.Group();
  var dark = new THREE.MeshStandardMaterial({ color: 0x232830, roughness: 0.42, metalness: 0.7 });
  var steel = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.35, metalness: 0.8 });
  for (var i = -1; i <= 1; i++) {
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 2.6, 10), steel);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(i * 0.42, 0, -0.7);
    var mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 10), dark);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(i * 0.42, 0, -2.0);
    g.add(tube, mouth);
  }
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.9), dark);
  base.position.set(0, 0, 0.6);
  g.add(base);
  g.position.set(-1.35, -1.3, 0.5);
  g.rotation.y = Math.PI * 0.5;       // 完全侧向：三根炮管从侧面展示，不再正对镜头变成黑块
  var tipAnchor = new THREE.Object3D();
  tipAnchor.position.set(0, 0, -2.2);
  g.add(tipAnchor);
  g.muzzleTip = tipAnchor;
  return g;
}

/** 按变体造武器 */
function makeBossWeapon(variant) {
  if (variant.mode === 'charge') return makeBossSword();
  if (variant.mode === 'summon') return makeBossStaff();
  if (variant.mode === 'barrage') return makeBossCannon();
  return makeBossLauncher();     // rocket / split 用火箭筒
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
  var variant = bossVariantNow();        // 按当前阶段选择 Boss 类型
  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.fishSize * CFG.bossSizeMul, CFG.fishSize * CFG.bossSizeMul),
    makeFishMaterial()
  );
  mesh.castShadow = true;
  mesh.position.set(pos.x, 3.0, pos.z);
  var weapon = makeBossWeapon(variant);
  // 武器整体尺寸：2.0 倍（Boss 本体是 6 米高；3 倍时炮管/巨剑会宽过本体，
  // 正面视角变成一整块黑色挡住 Boss，缩小后既能看清武器形状也不挡脸）
  weapon.scale.set(2.0, 2.0, 2.0);
  mesh.add(weapon);
  scene.add(mesh);
  var bossHpNow = Math.round(bossHpNext * variant.hpMul);
  boss = {
    variant: variant,
    mode: variant.mode,
    tint: variant.tint,
    weapon: weapon,
    launcher: weapon,                    // 兼容既有引用（炮弹从 weapon.muzzleTip 发射）
    mesh: mesh,
    hp: bossHpNow, maxHp: bossHpNow,     // BOSS 血量：成长曲线 × 变体系数
    baseY: 3.0,
    phase: rand(0, Math.PI * 2),
    fireTimer: CFG.bossShootInterval,
    hurt: 0,
    chargeCd: 1.5,                       // 冲锋鱼：下一次冲锋冷却
    chargeT: 0,                          // 冲锋进行中计时
    chargeDir: null,
    summonTimer: 4.5,                    // 祭司鱼：首次召唤倒计时
    splitDone: false,                    // 分裂母鱼：是否已分裂
  };
  spawnBossEntranceFx(pos);              // 出场演出：地面扩散光圈 + 光柱
  showNotice('BOSS 出现！' + variant.name + ' · ' + variant.tip);
  Sfx.bossAlarm();
  playSfx('bossDetect', 0.72);   // Boss 台词：「桀桀桀，我看到你了」（1/2 随机）
  updateBossBar();
  // Boss 战曲：从 0 音量淡入（主 BGM 由 updateBgm 暂停，进度保留）
  bossMusicVol = 0;
  bossMusicTempo = 1;
  if (bossEl) bossEl.currentTime = 0;
}

// ---------------------------------------------------------------- Boss 出场演出（地面光圈）
var bossFx = [];

/** Boss 登场：三层地面扩散光环 + 中心上升光柱 */
function spawnBossEntranceFx(pos) {
  for (var i = 0; i < 3; i++) {
    var mat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xff6a6a : (i === 1 ? 0xffa050 : 0xffd890),
      transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 56), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.09 + i * 0.02, pos.z);
    ring.scale.set(2.5, 2.5, 2.5);
    scene.add(ring);
    bossFx.push({ mesh: ring, mat: mat, t: -i * 0.16, life: 1.15, from: 2.5, to: 16 + i * 5, pillar: false });
  }
  // 中心竖直光柱（加色混合的空心圆柱，快速升起并淡出）
  var colMat = new THREE.MeshBasicMaterial({
    color: 0xffd0a0, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  var col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.8, 8, 20, 1, true), colMat);
  col.position.set(pos.x, 4.0, pos.z);
  scene.add(col);
  bossFx.push({ mesh: col, mat: colMat, t: 0, life: 0.8, pillar: true });
}

function updateBossFx(dt) {
  for (var i = bossFx.length - 1; i >= 0; i--) {
    var f = bossFx[i];
    f.t += dt;
    if (f.t < 0) continue;                      // 延迟启动
    var k = f.t / f.life;
    if (k >= 1) {
      scene.remove(f.mesh);
      if (f.mesh.geometry) f.mesh.geometry.dispose();
      f.mat.dispose();
      bossFx.splice(i, 1);
      continue;
    }
    if (f.pillar) {
      f.mat.opacity = 0.5 * (1 - k) * (1 - k);
      f.mesh.rotation.y += dt * 2.4;
    } else {
      var sc = f.from + (f.to - f.from) * (1 - Math.pow(1 - k, 2.2));
      f.mesh.scale.set(sc, sc, sc);
      f.mat.opacity = 0.85 * (1 - k);
    }
  }
}

function clearBossFx() {
  for (var i = 0; i < bossFx.length; i++) {
    scene.remove(bossFx[i].mesh);
    if (bossFx[i].mesh.geometry) bossFx[i].mesh.geometry.dispose();
    bossFx[i].mat.dispose();
  }
  bossFx = [];
}

var _bossBallGeo = null, _bossBallMat = null, _bossTipGeo = null, _bossTipMat = null;
function fireBossBall(angleOffset) {
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
  ).normalize();
  // 扇形偏移（重炮台鱼的三连齐射用）
  if (angleOffset) {
    var ca = Math.cos(angleOffset), sa = Math.sin(angleOffset);
    var nx = dir.x * ca - dir.z * sa;
    var nz = dir.x * sa + dir.z * ca;
    dir.x = nx; dir.z = nz;
    dir.normalize();
  }
  dir.multiplyScalar(CFG.bossBallSpeed);
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
  playSfx('boom', byPlayer ? 0.5 : 0.38);   // Boss 炸弹爆炸（音量偏小于自爆）
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
  // Boss 刷新已改由波次系统驱动（每清理 bossEveryWaves 波出现一次）
  if (!boss) return;
  var m = boss.mesh;
  if (state === 'playing') {
    var dx = player.pos.x - m.position.x;
    var dz = player.pos.z - m.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    var mode = boss.mode || 'rocket';
    var spd = CFG.fishChaseSpeed * CFG.bossSpeedMul * (boss.variant ? boss.variant.speedMul : 1);

    if (mode === 'charge') {
      // ===== 狂暴冲锋鱼：蓄势逼近 → 高速冲撞 =====
      if (boss.chargeHitCd > 0) boss.chargeHitCd -= dt;
      if (boss.chargeT > 0) {
        boss.chargeT -= dt;
        m.position.x += boss.chargeDir.x * CFG.bossChargeSpeed * dt;
        m.position.z += boss.chargeDir.z * CFG.bossChargeSpeed * dt;
        if (Math.random() < 0.6) spawnBurst(new THREE.Vector3(m.position.x, 0.35, m.position.z), 0xff8a5a, 2, 2.0);
        if (dist < 3.2 && boss.chargeHitCd <= 0) {
          damagePlayer(CFG.bossChargeDamage, { name: boss.variant.name, atk: '冲锋撞击' });
          boss.chargeHitCd = 1.0;
          camFx.shake = 1;
        }
        if (boss.chargeT <= 0) boss.chargeCd = CFG.bossChargeInterval;
      } else {
        if (dist > 6) moveFishAvoiding({ mesh: m }, player.pos.x, player.pos.z, spd * 0.6, dt, 1.8, 4.2, 1.8);
        boss.chargeCd -= dt;
        if (boss.chargeCd <= 0 && dist < 26 && dist > 3.5) {
          boss.chargeT = CFG.bossChargeTime;
          boss.chargeDir = { x: dx / (dist || 1), z: dz / (dist || 1) };
          boss.chargeHitCd = 0;
          spawnBurst(m.position.clone(), 0xff6a3a, 20, 4.5);   // 蓄力爆闪
          Sfx.bossShoot();
        }
      }
    } else if (mode === 'summon') {
      // ===== 召唤祭司鱼：保持距离 + 定时召唤鱼群 =====
      if (dist < 11) {
        moveFishAvoiding({ mesh: m }, m.position.x * 2 - player.pos.x, m.position.z * 2 - player.pos.z, spd * 0.7, dt, 1.8, 4.2, 1.8);
      } else if (dist > 19) {
        moveFishAvoiding({ mesh: m }, player.pos.x, player.pos.z, spd * 0.5, dt, 1.8, 4.2, 1.8);
      }
      boss.summonTimer -= dt;
      if (boss.summonTimer <= 0) {
        boss.summonTimer = CFG.bossSummonInterval;
        var summoned = 0;
        for (var si = 0; si < CFG.bossSummonCount; si++) {
          var sa2 = rand(0, Math.PI * 2), sr = rand(3, 6.5);
          var sp2 = spawnFish(new THREE.Vector3(
            clamp(m.position.x + Math.cos(sa2) * sr, -CFG.arena + 3, CFG.arena - 3), 0,
            clamp(m.position.z + Math.sin(sa2) * sr, -CFG.arena + 3, CFG.arena - 3)), 'normal');
          sp2.waveTag = wave.number;      // 归入当前波，清波判定正确
          summoned++;
          spawnBurst(sp2.mesh.position, 0xb08cff, 12, 3.2);
        }
        showNotice('召唤祭司鱼召来了 ' + summoned + ' 条肥鱼！');
        playSfx('bossDetect', 0.55);
        if (boss.weapon && boss.weapon.orb) boss.weapon.orb.scale.set(1.7, 1.7, 1.7);
      }
      if (boss.weapon && boss.weapon.orb && boss.weapon.orb.scale.x > 1) {
        var os = Math.max(1, boss.weapon.orb.scale.x - dt * 2.2);
        boss.weapon.orb.scale.set(os, os, os);
      }
    } else if (mode === 'barrage') {
      // ===== 重炮台鱼：原地压制 + 三连扇形齐射 =====
      if (dist > 16) moveFishAvoiding({ mesh: m }, player.pos.x, player.pos.z, spd, dt, 1.8, 4.2, 1.8);
      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0) {
        boss.fireTimer = CFG.bossBarrageInterval;
        fireBossBall(0);
        fireBossBall(-CFG.bossBarrageSpread);
        fireBossBall(CFG.bossBarrageSpread);
      }
    } else {
      // ===== 火箭 / 分裂母鱼：常规追击 + 半跟踪炮弹 =====
      if (dist > 8) moveFishAvoiding({ mesh: m }, player.pos.x, player.pos.z, spd, dt, 1.8, 4.2, 1.8);
      boss.fireTimer -= dt;
      if (boss.fireTimer <= 0) {
        boss.fireTimer = CFG.bossShootInterval;
        fireBossBall();
      }
      // 分裂母鱼：血量过半暴走，分裂出一批小鱼
      if (mode === 'split' && !boss.splitDone && boss.hp <= boss.maxHp * 0.5) {
        boss.splitDone = true;
        for (var pi2 = 0; pi2 < CFG.bossSplitCount; pi2++) {
          var pa2 = rand(0, Math.PI * 2), prr = rand(2.5, 5.5);
          var cp = spawnFish(new THREE.Vector3(
            clamp(m.position.x + Math.cos(pa2) * prr, -CFG.arena + 3, CFG.arena - 3), 0,
            clamp(m.position.z + Math.sin(pa2) * prr, -CFG.arena + 3, CFG.arena - 3)), 'normal');
          cp.waveTag = wave.number;
          cp.hp = Math.ceil(enemyHpNow * 0.5) + 1;
          spawnBurst(cp.mesh.position, 0x8cffb0, 14, 3.6);
        }
        spawnBurst(m.position.clone(), 0x8cffb0, 34, 6.5);
        showNotice('分裂母鱼半血暴走，分裂出 ' + CFG.bossSplitCount + ' 条小鱼！');
        playSfx('split', 0.85);
      }
    }
    m.position.x = clamp(m.position.x, -CFG.arena, CFG.arena);
    m.position.z = clamp(m.position.z, -CFG.arena, CFG.arena);
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
    // Boss 名称按变体显示（名称是 #boss-name 的第一个文本节点，其后跟着血量 span）
    if (dom.bossName && boss.variant && dom.bossName.firstChild &&
        dom.bossName.firstChild.nodeType === 3) {
      dom.bossName.firstChild.nodeValue = boss.variant.name;
    }
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
  unlockAchievement('firstBoss');      // 成就：巨兽猎人
  bumpStat('totalBoss', 1);
  addComboPoints(CFG.comboBossPoints); // 击败 Boss：连杀 +5 点，快速提升评级
  rollKillRewards();              // Boss 击杀同样触发概率战利品
  player.hp = CFG.maxHp;          // 击败 Boss：生命回满
  // Boss 弹药奖励：两把枪都补满当前弹夹，并各获得「相当于一个弹夹容量」的备弹（受上限约束）
  for (var bwk in WEAPONS) {
    if (WEAPONS[bwk].melee || !weaponAmmo[bwk]) continue;   // 近战武器没有弹药
    var binfo = magTierInfo(bwk);
    var bsize = binfo ? binfo.size : WEAPONS[bwk].magSize;
    var bcap = reserveMaxNow(bwk);
    if (bwk === currentWeapon) {
      ammo.mag = bsize;
      ammo.reserve = Math.min(bcap, ammo.reserve + bsize);
    } else {
      weaponAmmo[bwk].mag = bsize;
      weaponAmmo[bwk].reserve = Math.min(bcap, weaponAmmo[bwk].reserve + bsize);
    }
  }
  updateAmmoHUD();
  var nadeBonus = 1 + Math.floor(Math.random() * CFG.nadeBossBonusMax); // 随机 1~3 颗手雷
  nadeCount += nadeBonus;
  showNotice('BOSS 击破！生命回满 · 两把枪弹夹补满 + 各一弹夹备弹 · +' + nadeBonus + ' 手雷');
  Sfx.bossDie();
  hideBossBar();
  updateHUD();
  updateAmmoHUD();
  if (bossMusicTempo !== 0) bossMusicTempo = -1;   // 战斗曲开始匀速淡出（结束后主 BGM 续播）
  growEnemies();                  // 敌人成长：小怪变强、Boss 变硬、生成提速
  if (upgradesAllMax) {
    victory();                    // 通关判定：读取升级时的满级缓存（全部技能满级后击杀 Boss 即通关）
  } else {
    rewardRoundsLeft = CFG.rewardsPerBoss;   // 每只 Boss 两次三选一
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
  playSfx('grenade', 0.72);   // 真实手雷爆炸声
  // 手雷数值（高爆手雷技能会提升伤害与半径）
  var nade = nadeDamageNow();
  var nadeRadius = nade.radius;
  // 鱼：爆炸范围内按小怪血量扣伤
  var nadeDmg = Math.round(rand(nade.min, nade.max));
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    if (e.mesh.position.distanceTo(center) <= nadeRadius) {
      e.hp -= nadeDmg;
      if (e.hp <= 0) killFish(e, e.mesh.position.clone());
    }
  }
  // Boss：同样按当前手雷数值扣血
  if (boss && boss.mesh.position.distanceTo(center) <= nadeRadius) {
    boss.hp -= Math.round(rand(nade.min, nade.max));
    boss.hurt = 0.2;
    updateBossBar();
    if (boss.hp <= 0) defeatBoss();
  }
  // 玩家：距离中心 3 米内同样受伤
  var pdx = center.x - player.pos.x;
  var pdy = center.y - (player.pos.y + 1.0);
  var pdz = center.z - player.pos.z;
  if (pdx * pdx + pdy * pdy + pdz * pdz <= nadeRadius * nadeRadius) {
    damagePlayer(Math.round(rand(nade.min, nade.max)), { name: '自己', atk: '手雷爆炸' });
  }
}

// ---------------------------------------------------------------- 射击
var _rayOrigin = new THREE.Vector3();
var _rayDir = new THREE.Vector3();
var _tmpVec = new THREE.Vector3(), _tmpVec2 = new THREE.Vector3();   // 近战判定用临时向量
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

// ---------------------------------------------------------------- 近战武器（匕首）
// 轻击：范围 1 米、基础伤害 2；重击：伤害恒为轻击的 2 倍，速度更慢、动作明显不同。
// 用于弹尽粮绝时「铤而走险」；伤害随「子弹强化」技能与连杀评级一起成长。
function knifeAttack(heavy) {
  if (state !== 'playing' || knifeCd > 0) return false;
  var def = WEAPONS.knife;
  knifeCd = heavy ? def.heavyCd : def.shootInterval;
  shootCd = Math.min(0.001, shootCd);              // 与射击冷却解耦
  gun.knifeAnim = { heavy: !!heavy, t: 0, dur: heavy ? 0.62 : 0.30 };

  // 伤害：基础 + 技能等级，再乘连杀评级加成；重击恒为轻击的 heavyMul 倍
  var base = (def.damage + upgrades.dmg) * (1 + comboBonus().damage);
  var dmg = heavy ? base * def.heavyMul : base;

  camera.getWorldPosition(_rayOrigin);
  camera.getWorldDirection(_rayDir);

  // 命中判定：以准星为轴、身前 range 米内的最近目标
  var range = def.range;
  var best = null, bestAlong = Infinity;
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    var toE = _tmpVec.copy(e.mesh.position).sub(_rayOrigin);
    var along = toE.dot(_rayDir);
    if (along < -0.25 || along > range) continue;
    var perp = Math.sqrt(Math.max(0, toE.lengthSq() - along * along));
    if (perp > CFG.fishHitRadius + 0.4) continue;
    if (along < bestAlong) { bestAlong = along; best = e; }
  }
  var bestBoss = false;
  if (boss) {
    var toB = _tmpVec.copy(boss.mesh.position).sub(_rayOrigin);
    var alongB = toB.dot(_rayDir);
    if (alongB > -0.5 && alongB < range + 1.4) {
      var perpB = Math.sqrt(Math.max(0, toB.lengthSq() - alongB * alongB));
      if (perpB < 2.4) bestBoss = true;
    }
  }

  var hitAny = false;
  var fxColor = heavy ? 0xffe8a0 : 0xffffff;
  if (best) {
    var hp = _tmpVec2.copy(best.mesh.position);
    best.hp = (best.hp || 1) - dmg;
    spawnBurst(hp, fxColor, heavy ? 18 : 10, heavy ? 4.2 : 2.8);
    debugLog((heavy ? '重击' : '轻击') + '命中 ' + enemyName(best) + '，造成 ' + dmg.toFixed(1) + ' 点伤害', 'dbg-hit');
    if (best.hp <= 0) killFish(best, hp.clone());
    hitAny = true;
  } else if (bestBoss && boss) {
    boss.hp -= dmg;
    boss.hurt = 0.2;
    updateBossBar();
    spawnBurst(boss.mesh.position, fxColor, heavy ? 20 : 11, heavy ? 4.5 : 3.0);
    debugLog((heavy ? '重击' : '轻击') + '命中 Boss，造成 ' + dmg.toFixed(1) + ' 点伤害', 'dbg-hit');
    if (boss.hp <= 0) defeatBoss();
    hitAny = true;
  }
  playSfx('swordHit', heavy ? 0.75 : 0.5);
  if (hitAny) flashCrosshair();
  camFx.fire = heavy ? 1 : 0.45; camFx.fireT = 0;   // 挥砍也带一点镜头反馈
  return true;
}

function shootOnce() {
  if (state !== 'playing' || shootCd > 0) return;
  if (weaponDef().melee) { knifeAttack(false); return; }   // 近战武器：左键轻击
  if (ammo.reloading) return;               // 换弹期间不能射击
  if (ammo.mag <= 0) { requestReload(); return; }          // 弹夹打空：自动换弹（或提示弹药耗尽）
  var wdef = weaponDef();
  shootCd = wdef.shootInterval;
  ammo.mag -= 1;
  // 真实枪声：每发子弹播放一次（连发与点射都一样）
  playSfx(currentWeapon === 'rifle' ? 'rifleShot' : 'pistolShot', currentWeapon === 'rifle' ? 0.5 : 0.6);
  updateAmmoHUD();
  gun.recoil = wdef.recoil;
  camFx.fire = 1; camFx.fireT = 0;     // 相机后坐：每发一次短促抖动（幅度约为走路的 1.5 倍）
  gun.flashT = 0.055;
  gun.light.intensity = 6;
  gun.flashMesh.visible = true;
  gun.flashMesh.material.opacity = 0.9 + rand(0, 0.1);

  camera.getWorldPosition(_rayOrigin);
  camera.getWorldDirection(_rayDir);
  // 突击步枪：轻微散布（方向加随机偏移后再归一化）
  if (wdef.spread > 0) {
    _rayDir.x += rand(-1, 1) * wdef.spread;
    _rayDir.y += rand(-1, 1) * wdef.spread;
    _rayDir.z += rand(-1, 1) * wdef.spread * 0.5;
    _rayDir.normalize();
  }
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
    var rollB = rollGunDamage();       // 子弹伤害：技能升级 × 连杀评级 ×（暴击判定）
    boss.hp -= rollB.damage;
    if (rollB.isCrit) {
      spawnBurst(_hitPoint, 0xffe066, 14, 4.5);   // 暴击金色火花
      showCritFeed(rollB.damage);
      debugLog('暴击！对 Boss 造成 ' + rollB.damage.toFixed(1) + ' 点伤害', 'dbg-hit');
    }
    debugLog('你对 超级蓝色大肥鱼 造成了 ' + gunDamageNow().toFixed(1) + ' 点伤害（剩余 ' + Math.max(0, boss.hp).toFixed(1) + '）', 'dbg-hit');
    boss.hurt = 0.15;
    spawnBurst(_hitPoint, 0xffd54a, 10, 3.5);
    Sfx.bossHit();
    flashCrosshair();
    updateBossBar();
    if (boss.hp <= 0) defeatBoss();
  } else if (best) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, bestT);
    // 护盾鱼：护盾未破时吸收子弹（每发 -1 耐久），破盾后才真正受伤
    if (best.kind === 'shield' && best.shieldHp > 0) {
      best.shieldHp -= 1;
      spawnBurst(_hitPoint, 0x9fe4ff, 14, 4.0);       // 格挡火花
      Sfx.hitFish();
      flashCrosshair();
      if (best.shieldHp <= 0) {
        if (best.shieldMesh) best.shieldMesh.visible = false;
        spawnBurst(best.mesh.position, 0xb0eaff, 26, 5.5);   // 破盾碎裂
        showNotice('护盾已击破！');
      }
      debugLog('护盾抵挡了子弹（剩余耐久 ' + Math.max(0, best.shieldHp) + '）', 'dbg-hit');
      updateHUD();
      return;
    }
    var rollF = rollGunDamage();                    // 小怪扣血（含暴击判定）
    best.hp = (best.hp || 1) - rollF.damage;
    if (rollF.isCrit) {
      spawnBurst(_hitPoint, 0xffe066, 12, 4.0);     // 暴击金色火花
      flashCrosshair();
      showCritFeed(rollF.damage);
      debugLog('暴击！造成 ' + rollF.damage.toFixed(1) + ' 点伤害', 'dbg-hit');
    }
    debugLog('你对 ' + enemyName(best) + ' 造成了 ' + gunDamageNow().toFixed(1) + ' 点伤害' + (best.hp > 0 ? '（剩余 ' + best.hp.toFixed(1) + ' 血）' : '（击败！）'), 'dbg-hit');
    Sfx.hitFish();
    spawnBurst(_hitPoint, 0x9fd8ff, best.hp > 0 ? 6 : 12, best.hp > 0 ? 2.2 : 3.5);
    flashCrosshair();
    if (best.hp <= 0) killFish(best, _hitPoint);

    // 穿甲弹：沿射线继续伤害主目标之后的敌人（每级 +1 个）
    if (upgrades.pierce > 0) {
      var pierceLeft = upgrades.pierce;
      var pierceKills = 0;                 // 本次射击的穿透击杀数（「一石三鸟」成就）
      var fromT = bestT + 0.25;
      while (pierceLeft > 0) {
        var nextE = null, nextT = Infinity;
        for (var pi = 0; pi < enemies.length; pi++) {
          var pe = enemies[pi];
          if (!pe.alive || pe === best) continue;
          var pt = raySphere(_rayOrigin, _rayDir, pe.mesh.position, CFG.fishHitRadius);
          if (pt > fromT && pt < wallDist && pt < nextT) { nextT = pt; nextE = pe; }
        }
        if (!nextE) break;
        var piercePoint = _rayOrigin.clone().addScaledVector(_rayDir, nextT);
        var rollP = rollGunDamage();
        nextE.hp = (nextE.hp || 1) - rollP.damage;
        spawnBurst(piercePoint, 0xb0e8ff, 8, 3.0);       // 穿透命中特效
        debugLog('穿甲弹命中 ' + enemyName(nextE) + '，造成 ' + rollP.damage.toFixed(1) + ' 点伤害', 'dbg-hit');
        if (nextE.hp <= 0) { killFish(nextE, piercePoint); pierceKills += 1; }
        pierceLeft -= 1;
        fromT = nextT + 0.25;
      }
      if (pierceKills >= 3) unlockAchievement('pierce3');   // 成就：一石三鸟
    }
  } else if (hits.length) {
    _hitPoint.copy(_rayOrigin).addScaledVector(_rayDir, hits[0].distance);
    spawnBurst(_hitPoint, 0xcfc4ae, 7, 2.6);
    flashCrosshair();
  }
}

// ---------------------------------------------------------------- 伤害 / 结算
// src = { name: 怪物名, atk: 攻击方式 }（Debug 日志用，可缺省）
function damagePlayer(d, src) {
  var hurtKind = hurtKindOf(src);
  if (state !== 'playing' || hurtCdByKind[hurtKind] > 0) return;
  var raw = d;
  d = d * envMul('enemyDmgMul');                          // 环境修饰：血月时敌人伤害 +10%
  d = Math.max(0, d - armorStacks * CFG.armorPerPick);   // 护甲：每层减免 2 点伤害
  if (d <= 0) {
    if (src) debugLog('受到' + src.name + '的' + src.atk + '攻击（' + raw + '点伤害），经 ' + armorStacks + ' 层护盾完全吸收', 'dbg-dmg');
    return;                                              // 护甲完全吸收（不触发受击反馈）
  }
  if (src) debugLog('受到' + src.name + '的' + src.atk + '攻击的 ' + raw + ' 点伤害，经过 ' + armorStacks + ' 层护盾减免，最终受到 ' + d + ' 点伤害', 'dbg-dmg');
  hurtCd = 0.5;
  hurtCdByKind[hurtKind] = 0.5;
  runTookDamage = true;                 // 「完美无瑕」成就：本局已受伤
  player.hp = Math.max(0, player.hp - d);
  // 受击摄像机抖动（伤害越高抖得越明显）
  camFx.shake = Math.min(1, camFx.shake + 0.45 + Math.min(0.45, d / 120));
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
  playSfx('gameOver', 0.85);   // 真实失败语音：「你被大肥鱼吃掉了喵！」
  if (document.exitPointerLock) document.exitPointerLock();
  if (reason === 'suicide' && dom.gameoverTitle) dom.gameoverTitle.textContent = '你选择了自我了断…';
  dom.finalScore.textContent = String(score);
  dom.finalKills.textContent = String(kills);
  if (dom.finalBossKills) dom.finalBossKills.textContent = String(bossKillCount);
  bumpStat('totalGames', 1);            // 累计对局数
  // 结算统计 + 历史记录更新（打破记录时显示「新纪录」）
  fillResultStats('', updateRecords());
  refreshBestRecords();
  showOverlay('gameover');
}

// toMenu = true：通关/结算后回到主菜单（完整重置世界，不直接进入游戏）
function restartGame(toMenu) {
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
  cheatMusicOn = false;                 // 作弊搞怪音乐复位
  cheatMusicTimer = 0;
  cheatMusicStep = 0;
  score = 0; kills = 0; playingTime = 0;
  runTookDamage = false;                // 新一局重置「完美无瑕」标志
  currentWeapon = 'pistol';                            // 重开回到手枪
  magTier = { pistol: 0, rifle: 0 };                   // 扩容弹夹不继承，回到标准弹夹
  weaponAmmo = {
    pistol: { mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveStart },
    rifle:  { mag: WEAPONS.rifle.magSize,  reserve: WEAPONS.rifle.reserveStart },
  };
  ammo.mag = WEAPONS.pistol.magSize;
  ammo.reserve = WEAPONS.pistol.reserveStart;
  ammo.magSize = WEAPONS.pistol.magSize;
  ammo.reloading = false; ammo.reloadTimer = 0;
  applyWeaponVisual();
  nadeCount = CFG.nadeStartCount;
  for (var gni = 0; gni < grenades.length; gni++) scene.remove(grenades[gni].mesh);
  grenades = [];
  updateNadeHUD();
  for (var iti = 0; iti < items.length; iti++) scene.remove(items[iti].mesh);
  items = [];
  itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax) * envMul('supplyIntervalMul');
  resetCombo();   // 新一局连杀评级清零
  // 重置局内强化与成长（无尽模式技能独立：死亡重来/退出重进均不继承）
  upgrades = {
    dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0,
    crit: 0, pierce: 0, nadedmg: 0, armorup: 0, vampire: 0,
  };
  upgradesAllMax = false;
  bossKillCount = 0;
  rewardOptions = null;
  rewardRoundsLeft = 0;
  enemyHpNow = 1;
  meleeAtkBonus = 0;
  rangedAtkBonus = 0;
  bossHpNext = CFG.bossHp;
  bossBallDmgNow = CFG.bossBallDamage;
  fishCapNow = CFG.fishCount;
  armorStacks = 0;
  armorTimer = CFG.armorInterval;
  updateArmorHUD();
  clearBossFx();                             // 清掉 Boss 出场演出特效
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
  // 清空上一局全部怪（不继承成长状态）；波次系统会重新开始第 1 波
  for (var i = 0; i < enemies.length; i++) scene.remove(enemies[i].mesh);
  enemies = [];
  wave = { number: 0, state: 'prepare', timer: 0, total: 0 };
  stageShown = 1;
  fishSpawned = false;
  applyEnvTheme(0, false);             // 环境复位到晴日沙漠
  spawnRandomCovers();                 // 新一局重新随机掩体布局
  if (!toMenu) ensureFishSpawned();      // 回主菜单时不生成敌人（世界随后即被卸载）
  // 清空上一局遗留的投射物与特效 —— 否则新一局开局会被上一局的子弹打中（看起来像"敌人没消失"）
  for (var k = 0; k < fishBullets.length; k++) scene.remove(fishBullets[k].mesh);
  fishBullets = [];
  for (var w = 0; w < swordWaves.length; w++) {
    scene.remove(swordWaves[w].mesh);
    swordWaves[w].mat.dispose();
    if (swordWaves[w].matInner) swordWaves[w].matInner.dispose();
  }
  swordWaves = [];
  // 清空爆炸特效（蘑菇云的火球 / 烟柱 / 云冠 / 冲击环），避免残留到主菜单或下一局
  for (var bxi = 0; bxi < blastFx.length; bxi++) {
    scene.remove(blastFx[bxi].mesh);
    if (blastFx[bxi].mat) blastFx[bxi].mat.dispose();
  }
  blastFx = [];
  // 关闭自爆鱼红屏警告 + 收起成就弹窗
  bomberWarnOn = false;
  if (dom.bomberWarn) dom.bomberWarn.style.opacity = '0';
  var achPopEl = document.getElementById('achievement-pop');
  if (achPopEl) { achPopEl.classList.remove('show'); achPopEl.classList.add('hidden'); }
  if (dom.damageFlash) dom.damageFlash.style.opacity = '0';
  if (particles && particles.data) {
    for (var pi = 0; pi < particles.data.length; pi++) {
      if (particles.data[pi]) particles.data[pi].life = 0;   // 残留粒子立即清空
    }
  }
  syncCamera();
  updateHUD();
  hideAllOverlays();
  if (toMenu) {
    state = 'menu';
    unloadGameScene();                   // 回主菜单：卸载整个游戏场景（真正释放，不是只隐藏）
    showOverlay('menu');
    if (document.exitPointerLock) document.exitPointerLock();
    return;
  }
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

/** 暴击飘字（比普通击杀飘字更醒目，快速缩放） */
function showCritFeed(dmg) {
  if (!dom.killfeed) return;
  var div = document.createElement('div');
  div.className = 'crit-pop';
  div.textContent = '暴击 ' + dmg.toFixed(1);
  dom.killfeed.appendChild(div);
  setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 850);
}

function flashCrosshair() {
  if (!dom.crosshair) return;
  dom.crosshair.classList.add('hit-hit');
  if (crosshairTimer) clearTimeout(crosshairTimer);
  crosshairTimer = setTimeout(function () { dom.crosshair.classList.remove('hit-hit'); }, 90);
}

function showOverlay(which) {
  if (which === 'menu') refreshBestRecords();   // 每次回到主菜单都刷新「历史最佳」
  dom.menuOverlay.classList.toggle('hidden', which !== 'menu');
  dom.pauseOverlay.classList.toggle('hidden', which !== 'pause');
  dom.gameoverOverlay.classList.toggle('hidden', which !== 'gameover');
  dom.levelOverlay.classList.toggle('hidden', which !== 'level');
  if (dom.rewardOverlay) dom.rewardOverlay.classList.toggle('hidden', which !== 'reward');
  if (dom.victoryOverlay) dom.victoryOverlay.classList.toggle('hidden', which !== 'victory');
  if (dom.skillsOverlay) dom.skillsOverlay.classList.toggle('hidden', which !== 'skills');
  if (dom.settingsOverlay) dom.settingsOverlay.classList.toggle('hidden', which !== 'settings');
  if (dom.achievementsOverlay) dom.achievementsOverlay.classList.toggle('hidden', which !== 'achievements');
  if (dom.quitOverlay) dom.quitOverlay.classList.toggle('hidden', which !== 'quit');
}
function hideAllOverlays() {
  dom.menuOverlay.classList.add('hidden');
  dom.pauseOverlay.classList.add('hidden');
  dom.gameoverOverlay.classList.add('hidden');
  dom.levelOverlay.classList.add('hidden');
  if (dom.rewardOverlay) dom.rewardOverlay.classList.add('hidden');
  if (dom.victoryOverlay) dom.victoryOverlay.classList.add('hidden');
  if (dom.skillsOverlay) dom.skillsOverlay.classList.add('hidden');
  if (dom.settingsOverlay) dom.settingsOverlay.classList.add('hidden');
  if (dom.achievementsOverlay) dom.achievementsOverlay.classList.add('hidden');
  if (dom.quitOverlay) dom.quitOverlay.classList.add('hidden');
}

// ---------------------------------------------------------------- 成就一览界面
function renderAchievements() {
  var grid = document.getElementById('ach-grid');
  if (!grid) return;
  var html = '', unlocked = 0, total = 0;
  for (var id in ACHIEVEMENTS) {
    if (!ACHIEVEMENTS.hasOwnProperty(id)) continue;
    total++;
    var def = ACHIEVEMENTS[id];
    var got = !!save.achievements[id];
    if (got) unlocked++;
    html += '<div class="ach-card ' + (got ? 'unlocked' : 'locked') + '">' +
      '<div class="ach-ico">' + def.ico + '</div>' +
      '<div class="ach-body">' +
        '<div class="ach-name">' + def.name + '</div>' +
        '<div class="ach-desc">' + def.desc + '</div>' +
      '</div>' +
      '<div class="ach-state">' + (got ? '✓' : '🔒') + '</div>' +
    '</div>';
  }
  grid.innerHTML = html;
  var prog = document.getElementById('ach-progress');
  if (prog) prog.textContent = '已解锁 ' + unlocked + ' / ' + total;
}

function openAchievements() {
  renderAchievements();
  state = 'achievements';
  hideAllOverlays();
  if (dom.achievementsOverlay) dom.achievementsOverlay.classList.remove('hidden');
  if (document.exitPointerLock) document.exitPointerLock();
}

function closeAchievements() {
  state = 'menu';
  showOverlay('menu');
}

/** 清空全部本地数据：成就 / 跨局统计 / 最佳记录（设置与解锁标志保留） */
function wipeLocalData() {
  if (!window.confirm('确定清空成就、游玩记录与最佳成绩吗？此操作不可撤销（设置会保留）。')) return;
  save.achievements = {};
  save.stats = { totalKills: 0, totalBoss: 0, totalGames: 0 };
  save.bestScore = 0; save.bestTime = 0; save.bestCombo = -1;
  save.bestWave = 0; save.bestStage = 1; save.bestBoss = 0;
  persistSave();
  refreshBestRecords();
  if (dom.achievementsOverlay && !dom.achievementsOverlay.classList.contains('hidden')) renderAchievements();
  showNotice('本地数据已清空');
}

function resetAchievements() {
  if (!window.confirm('确定要清空全部成就记录吗？此操作不可撤销。')) return;
  save.achievements = {};
  persistSave();
  renderAchievements();
}

// ---------------------------------------------------------------- 退出游戏
function quitGame() {
  hideAllOverlays();
  state = 'quit';
  if (dom.quitOverlay) dom.quitOverlay.classList.remove('hidden');
  if (bgmEl) bgmEl.pause();
  if (bossEl) bossEl.pause();
  if (menuEl) menuEl.pause();
  if (progressEl) progressEl.pause();
  // 浏览器一般只允许关闭脚本打开的窗口；失败时停留在告别画面，玩家可自行关闭标签页
  try { window.close(); } catch (e) {}
  setTimeout(function () { try { window.close(); } catch (e) {} }, 350);
}

// ---------------------------------------------------------------- 设置面板
var settingsReturnState = 'menu';    // 关闭设置后回到哪个界面

function openSettings() {
  if (state !== 'settings') settingsReturnState = state;
  state = 'settings';
  renderSettingsUI();
  hideAllOverlays();
  if (dom.settingsOverlay) dom.settingsOverlay.classList.remove('hidden');
  if (document.exitPointerLock) document.exitPointerLock();
}

function closeSettings() {
  hideAllOverlays();
  if (settingsReturnState === 'playing') {
    state = 'playing';
    requestLockWithFallback();
  } else if (settingsReturnState === 'paused') {
    state = 'paused';
    showOverlay('pause');
  } else if (settingsReturnState === 'gameover') {
    state = 'gameover';
    showOverlay('gameover');
  } else {
    state = 'menu';
    showOverlay('menu');
  }
}

/** 把当前设置填回面板控件 */
function renderSettingsUI() {
  var s = save.settings;
  function setRange(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = String(Math.round(val * 100));
    var lab = document.getElementById(id + '-val');
    if (lab) lab.textContent = Math.round(val * 100) + '%';
  }
  setRange('set-bgm', s.bgm);
  setRange('set-boss', s.boss);
  setRange('set-menu', s.menu);
  setRange('set-sfx', s.sfx);
  setRange('set-sens', s.sens);
  var p = document.getElementById('set-particles'); if (p) p.checked = !!s.particles;
  var sh = document.getElementById('set-shadow'); if (sh) sh.checked = !!s.shadow;
  var cb = document.getElementById('set-colorblind'); if (cb) cb.checked = !!s.colorblind;
}

/** 绑定设置控件（实时生效 + 自动保存） */
function bindSettingsInputs() {
  function bindRange(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      save.settings[key] = Number(el.value) / 100;
      var lab = document.getElementById(id + '-val');
      if (lab) lab.textContent = el.value + '%';
      persistSave();
      applySettings();
    });
  }
  bindRange('set-bgm', 'bgm');
  bindRange('set-boss', 'boss');
  bindRange('set-menu', 'menu');
  bindRange('set-sfx', 'sfx');
  bindRange('set-sens', 'sens');
  function bindCheck(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      save.settings[key] = !!el.checked;
      persistSave();
      applySettings();
    });
  }
  bindCheck('set-particles', 'particles');
  bindCheck('set-shadow', 'shadow');
  bindCheck('set-colorblind', 'colorblind');
}

// 关卡选择界面
function showLevelSelect() {
  state = 'levelSelect';
  hideAllOverlays();
  dom.levelOverlay.classList.remove('hidden');
}

// 真实锁定状态（不能用 state 判定：state 要等 pointerlockchange 事件才更新，
// 而事件到达时机不确定，早期版本因此把"其实能锁定"的情况误判为不支持）
function isPointerLocked() {
  return document.pointerLockElement === dom.canvas;
}

// 锁定兜底检测：Chrome 在退出锁定后有约 1.25 秒冷却期，期间 requestPointerLock 会被拒。
// 因此分两段等待（1.3s + 0.7s），只有两段都没锁上才降级。
function scheduleLockCheck() {
  clearTimeout(pendingLockTimer);
  pendingLockTimer = setTimeout(function () {
    if (isPointerLocked()) return;
    pendingLockTimer = setTimeout(function () {
      if (!isPointerLocked()) enterFallbackMode();
    }, 700);
  }, 1300);
}

// 请求指针锁定；若浏览器不支持、明确拒绝或长时间未成功，才降级为拖动瞄准模式
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
      // 请求被拒（可能只是冷却期）→ 仍按真实状态走兜底检测，给锁定一次机会
      if (!isPointerLocked()) scheduleLockCheck();
    });
  } catch (e) {
    enterFallbackMode();
    return;
  }
  scheduleLockCheck();
}

// 隐藏降级提示条（恢复锁定模式时调用）
function hideFallbackHint() {
  if (!dom.fallbackHint) return;
  clearTimeout(hintTimer);
  dom.fallbackHint.style.opacity = '0';
  setTimeout(function () { dom.fallbackHint.style.display = 'none'; }, 300);
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
  if (state === 'cheat') { closeCheatCaught(); return; }   // 作弊被抓：任意键回主菜单
  if (handleKillCheat(ev.code)) return;   // 开发者模式 KILL 自毁序列（消费按键）
  handleDebugCheat(ev.code);          // 开发者模式秘技检测（任意状态下）
  if (ev.code === 'KeyR' && state === 'playing') { requestReload(); }
  if (ev.code === 'KeyG' && state === 'playing') { throwGrenade(); }
  // 武器切换：数字键 1 / 2（小键盘 1/2 在开发者模式下留给刷怪快捷键）
  if (state === 'playing') {
    var wKey = (ev.code === 'Digit1' || ev.code === 'Numpad1') ? 'pistol'
             : (ev.code === 'Digit2' || ev.code === 'Numpad2') ? 'rifle'
             : (ev.code === 'Digit3' || ev.code === 'Numpad3') ? 'knife' : null;
    var isNumpad = (ev.code === 'Numpad1' || ev.code === 'Numpad2' || ev.code === 'Numpad3');
    if (wKey && !(isNumpad && debugMode)) { switchWeapon(wKey); return; }
  }
  // 开发者模式：小键盘 1~4 快速刷出四种特殊敌人（便于测试）
  if (debugMode && state === 'playing') {
    var _devSpawnMap = { Numpad1: 'bomber', Numpad2: 'shield', Numpad3: 'healer', Numpad4: 'splitter' };
    var _devKind = _devSpawnMap[ev.code];
    if (_devKind) {
      // 自爆鱼同样保持安全距离（12 米），其他敌人在前方 6 米
      var _dist = (_devKind === 'bomber') ? CFG.bomberMinSpawnDist : 6;
      var _dx = player.pos.x - Math.sin(player.yaw) * _dist;
      var _dz = player.pos.z - Math.cos(player.yaw) * _dist;
      var _ne = spawnFish(new THREE.Vector3(_dx, 0, _dz), _devKind);
      _ne.waveTag = wave.number;              // 归入本波，避免干扰清波判定
      showNotice('开发者：刷出 ' + (ENEMY_LABEL[_devKind] || _devKind));
      debugLog('开发者快捷键刷出 ' + (ENEMY_LABEL[_devKind] || _devKind), 'dbg-hit');
      ev.preventDefault();
      return;
    }
  }
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
      camFx.sway = 1; camFx.swayT = 0;   // 起跳摄像机轻微摆动
      Sfx.jump();
    }
  }
}
function onKeyUp(ev) { keys[ev.code] = false; }

// ---------------------------------------------------------------- 触屏控制（手机/平板）
function initTouchControls() {
  isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var ui = dom.touchUI;
  if (!isTouch || !ui) return;
  ui.classList.add('touch-on');
  if (document.body) document.body.classList.add('touch-mode');

  // 虚拟摇杆（左下）：移动向量
  var pad = dom.joyPad, stick = dom.joyStick;
  function joyUpdate(tx, ty) {
    window.__joyCalls = (window.__joyCalls || 0) + 1;
    var r = pad.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = tx - cx, dy = ty - cy;
    var max = r.width / 2;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    touchJoy.s = dx / max;            // 左右（右为正）
    touchJoy.f = -dy / max;           // 前后（上为正=前进）
    if (stick) { stick.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  }
  function joyEnd() {
    touchJoy.f = 0; touchJoy.s = 0;
    if (stick) stick.style.transform = '';
  }
  if (pad) {
    pad.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      joyUpdate(t.clientX, t.clientY);
    }, { passive: false });
    pad.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      joyUpdate(t.clientX, t.clientY);
    }, { passive: false });
    ['touchend', 'touchcancel'].forEach(function (ev) {
      pad.addEventListener(ev, function (e) { e.preventDefault(); joyEnd(); }, { passive: false });
    });
  }

  // 开火按钮（按住连发）
  function bindFire(el, on, off) {
    if (!el) return;
    el.addEventListener('touchstart', function (e) { e.preventDefault(); on(); }, { passive: false });
    ['touchend', 'touchcancel'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); off(); }, { passive: false });
    });
  }
  bindFire(dom.btnTchFire, function () { touchFiring = true; }, function () { touchFiring = false; });
  bindFire(dom.btnTchJump, function () {
    if (state === 'playing' && player.onGround) {
      player.velY = CFG.jumpSpeed; player.onGround = false;
      camFx.sway = 1; camFx.swayT = 0;   // 起跳摄像机轻微摆动
      Sfx.jump();
    }
  }, function () {});
  bindFire(dom.btnTchReload, function () { requestReload(); }, function () {});
  bindFire(dom.btnTchNade, function () { throwGrenade(); }, function () {});
  bindFire(dom.btnTchSkill, function () { if (state === 'playing') openSkills(); }, function () {});
  bindFire(dom.touchPause, function () {
    if (state === 'playing') { state = 'paused'; showOverlay('pause'); }
  }, function () {});

  // 多指操控：左 38% 屏第一指 = 摇杆；其余手指 = 视角（按 identifier 独立跟踪，互不干扰）
  var TOUCH_SENS = 0.006;   // 触屏转视角灵敏度（约为鼠标的 2.7 倍）
  var joyTouchId = null, lookTouchId = null;
  // 仅游戏进行中拦截触摸（preventDefault 会阻止合成 click，菜单/奖励/暂停等界面必须放行才能正常点击按钮）
  document.addEventListener('touchstart', function (e) {
    if (state !== 'playing') return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.target && t.target.closest && t.target.closest('#touch-ui')) continue;  // 按钮/摇杆自身处理
      if (joyTouchId === null && t.clientX < window.innerWidth * 0.38) {
        joyTouchId = t.identifier;                 // 左侧空白：担任摇杆
        joyUpdate(t.clientX, t.clientY);
      } else if (lookTouchId === null) {
        lookTouchId = t.identifier;                // 其余：担任视角
        touchLastX = t.clientX; touchLastY = t.clientY; touchHasLast = true;
      }
    }
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    if (state !== 'playing') return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        joyUpdate(t.clientX, t.clientY);
      } else if (t.identifier === lookTouchId) {
        var dx = t.clientX - touchLastX, dy = t.clientY - touchLastY;
        touchLastX = t.clientX; touchLastY = t.clientY;
        player.yaw -= dx * TOUCH_SENS;
        player.pitch = clamp(player.pitch - dy * TOUCH_SENS, -1.55, 1.55);
      }
    }
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    if (state !== 'playing') return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) { joyTouchId = null; joyEnd(); }
      else if (t.identifier === lookTouchId) { lookTouchId = null; }
    }
    e.preventDefault();
  }, { passive: false });

  // 触屏调试（联调用）
  window.__touchDebug = function () {
    return { isTouch: isTouch, joy: { f: touchJoy.f, s: touchJoy.s }, joyId: joyTouchId, lookId: lookTouchId };
  };
}

function onMouseDown(ev) {
  if (state !== 'playing') return;
  // 右键：近战武器触发重击
  if (ev.button === 2) {
    if (weaponDef().melee) knifeAttack(true);
    return;
  }
  if (ev.button !== 0) return;
  if (lockMode === 'locked' && document.pointerLockElement !== dom.canvas) return;
  // 覆盖层/按钮上的点击不射击（HUD 默认 pointer-events:none）
  if (ev.target && ev.target !== dom.canvas && ev.target !== document.body) return;
  fireHeld = true;
  shootOnce();   // 按下即发射第一发（手枪点射完全靠这里；步枪之后由主循环连发）
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
  player.yaw -= dx * sens;
  player.pitch -= dy * sens;
  player.pitch = clamp(player.pitch, -1.55, 1.55);
}
function onPointerLockChange() {
  var locked = isPointerLocked();
  if (locked) {
    clearTimeout(pendingLockTimer);
    // ★ 关键修复：之前降级为拖动瞄准后，只要本次锁定成功就恢复锁定模式
    //（旧实现里 fallback 是不可逆的：一旦降级，后续即使锁定成功也永久停留在拖动模式）
    if (lockMode === 'fallback') {
      lockMode = 'locked';
      hideFallbackHint();
      showNotice('已恢复鼠标锁定模式');
      debugLog('指针锁定成功，已从拖动瞄准模式切回锁定模式', 'dbg-hit');
    }
    if (state === 'menu' || state === 'levelSelect' || state === 'paused' || state === 'gameover') {
      state = 'playing';
      hideAllOverlays();
    }
    return;
  }
  // 失去锁定：拖动瞄准模式本就不依赖锁定，无需暂停
  if (lockMode === 'fallback') return;
  if (state === 'playing') {
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
  if (isTouch) { f += touchJoy.f; s += touchJoy.s; }   // 虚拟摇杆叠加
  var sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  var mx = -sin * f + cos * s;
  var mz = -cos * f - sin * s;
  var len = Math.sqrt(mx * mx + mz * mz);
  var moving = len > 0.01;
  if (moving) {
    mx /= len; mz /= len;
    // 移速：基础 ×（技能 + 连杀加成）；步枪大扩容弹夹在基础移速上扣 5%，弹鼓在最终移速上再扣 10%
    var wpen = weaponSpeedPenalty();
    var spdNow = CFG.walkSpeed * wpen.base * (1 + upgrades.speed * CFG.upgradeSpeedPerLevel + comboBonus().speed) * wpen.final;
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
    // 落地回正：落地速度越大冲击越明显（轻跳轻，高处落地重），随后相机自动归位
    if (!player.onGround) {
      var landSpeed = Math.abs(player.velY);
      camFx.land = Math.min(1, 0.35 + landSpeed / (CFG.jumpSpeed * 1.6));
      camFx.landT = 0;
      camFx.sway = 0;            // 落地即结束跳跃摆动，交给回正
    }
    player.velY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  updateCamFx(dt);
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
  if (knifeCd > 0) knifeCd = Math.max(0, knifeCd - dt);

  var isMelee = !!weaponDef().melee;
  var baseZ = isMelee ? -0.42 : -0.6;
  var baseY = isMelee ? -0.20 : -0.28;

  // ===== 匕首攻击动画 =====
  // 轻击：快速向前刺出再收回（0.30s）；重击：抬手蓄力 → 大幅猛劈（0.62s，动作与轻击明显不同）
  if (gun.knifeAnim) {
    var ka = gun.knifeAnim;
    ka.t += dt;
    var k = ka.t / ka.dur;
    if (k >= 1) {
      gun.knifeAnim = null;
    } else {
      var offZ = 0, offY = 0, rotX = 0, rotZ = 0;
      if (ka.heavy) {
        if (k < 0.35) {                    // 抬手后仰蓄力
          var a = k / 0.35;
          offZ = 0.16 * a; offY = -0.14 * a; rotX = -0.85 * a; rotZ = -0.55 * a;
        } else if (k < 0.62) {             // 猛劈
          var b = (k - 0.35) / 0.27;
          offZ = 0.16 - 0.92 * b; offY = -0.14 + 0.32 * b; rotX = -0.85 + 1.7 * b; rotZ = -0.55 + 1.0 * b;
        } else {                            // 回位
          var c = (k - 0.62) / 0.38;
          offZ = -0.76 * (1 - c); offY = 0.18 * (1 - c); rotX = 0.85 * (1 - c); rotZ = 0.45 * (1 - c);
        }
      } else {
        if (k < 0.4) { var a2 = k / 0.4; offZ = -0.46 * a2; offY = 0.07 * a2; rotX = 0.3 * a2; }
        else { var c2 = (k - 0.4) / 0.6; offZ = -0.46 * (1 - c2); offY = 0.07 * (1 - c2); rotX = 0.3 * (1 - c2); }
      }
      gun.group.position.z = baseZ + offZ;
      gun.group.position.y = baseY + offY;
      gun.group.rotation.x = rotX;
      gun.group.rotation.z = rotZ;
      return;                              // 动画期间跳过默认摆动
    }
  }
  gun.group.rotation.z = 0;
  gun.group.position.z = baseZ + gun.recoil * 1.15;
  var moving = (keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD) && player.onGround && state === 'playing';
  var sway = moving ? 1 : 0;
  gun.group.position.y = baseY + Math.sin(time * 9) * 0.012 * sway;
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
  for (var hk in hurtCdByKind) { if (hurtCdByKind[hk] > 0) hurtCdByKind[hk] = Math.max(0, hurtCdByKind[hk] - dt); }
  if (dom.damageFlash && dom.damageFlash.style.opacity !== '0') {
    var op = parseFloat(dom.damageFlash.style.opacity || '0') - dt * 3;
    dom.damageFlash.style.opacity = op > 0 ? String(op) : '0';
  }
  updatePlayer(dt);
  updateGun(dt);
  if (state === 'playing') {
    // 手枪为点射（只有按下瞬间发射，见 onMouseDown），步枪为按住连发
    if ((fireHeld || touchFiring) && weaponDef().auto) shootOnce();
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
      dom.reloadFill.style.width = Math.max(0, Math.min(100, (1 - ammo.reloadTimer / weaponDef().reloadTime) * 100)) + '%';
    }
    if (ammo.reloadTimer <= 0) {
      var need = magSizeNow() - ammo.mag;
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
  updateSwordWaves(dt);   // 剑气特效（弧形能量波飞行与淡出）
  updateBlastFx(dt);      // 自爆特效（火球/冲击环/蘑菇云烟团）
  updateBossFx(dt);       // Boss 出场演出特效（地面光圈 / 光柱）
  updateBomberWarn();     // 自爆鱼索敌警告（红屏脉冲）
  checkAchievements(dt);  // 成就条件检查（每秒一次）
  updateParticles(dt);
  updateHUD();
  drawMiniMap();
  updateBgm(dt);
  if (debugMode) updateDebugLog(dt);   // Debug 消息上移/淡出/清理
  updateCheatMusic(dt);                // 作弊被抓搞怪音乐循环
  updateWaves(dt);    // 波次系统：刷怪节奏与 Boss 刷新（每 bossEveryWaves 波一只）
}

/** 进入游戏世界：按需构建场景（只构建一次，之后复用到卸载为止） */
function enterGameWorld() {
  if (!envBuilt) {
    buildEnvironment();
    buildMiniMap();
  }
  // ★ N6 修复：首次进入游戏时提示三武器切换（V0.5.0 的核心操作，
  //   原来在任何教学文本里都没有出现，不看 README 的玩家根本不知道有步枪和匕首）
  if (!save.tutorialShown) {
    save.tutorialShown = true;
    persistSave();
    setTimeout(function () {
      showNotice('【1 / 2 / 3】切换武器：手枪（点射）· 步枪（按住连发）· 匕首（右键重击）');
    }, 1100);
  }
}

/** 纯 UI 界面：主菜单 / 选关 / 成就 / 退出画面 —— 不显示 3D 场景，也不推进游戏逻辑 */
function isUiOnlyState() {
  return state === 'menu' || state === 'levelSelect' || state === 'achievements' || state === 'quit';
}

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(0.05, clock.getDelta());
  if (isUiOnlyState()) {
    updateBgm(dt);        // 菜单音乐仍需继续推进
    return;               // 不渲染 3D 场景（菜单使用独立的 CSS 背景），也不跑敌人 AI
  }
  update(dt);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- 初始化
function init() {
  if (renderer !== undefined) return; // 防重入
  loadSave();                         // 读取本地存档（最高记录 / 设置 / 成就）
  // 启动时主菜单是 HTML 默认显示的，不会经过 showOverlay('menu')，因此这里主动刷新一次
  try { refreshBestRecords(); } catch (e) {}
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
    bomberWarn: 'bomber-warn', settingsOverlay: 'settings-overlay',
    achievementsOverlay: 'achievements-overlay', quitOverlay: 'quit-overlay',
    menuOverlay: 'menu-overlay', pauseOverlay: 'pause-overlay',
    gameoverOverlay: 'gameover-overlay', finalScore: 'final-score', finalKills: 'final-kills',
    gameoverTitle: 'gameover-title',
    fallbackHint: 'fallback-hint', errorBar: 'error-bar',
    ammoMag: 'ammo-mag', ammoReserve: 'ammo-reserve', ammoWrap: 'ammo-wrap',
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
    debugLog: 'debug-log', cheatOverlay: 'cheat-overlay',
    touchUI: 'touch-ui', joyPad: 'joy-pad', joyStick: 'joy-stick',
    btnTchFire: 'btn-tch-fire', btnTchJump: 'btn-tch-jump',
    btnTchReload: 'btn-tch-reload', btnTchNade: 'btn-tch-nade',
    btnTchSkill: 'btn-tch-skill', touchPause: 'touch-pause',
    minimapCanvas: 'minimap-canvas',
    levelOverlay: 'level-overlay',
  };
  Object.keys(idMap).forEach(function (key) { dom[key] = document.getElementById(idMap[key]); });
  initTouchControls();   // 触屏控件初始化（需在 dom 映射建立后）

  var preview = document.getElementById('fish-preview');
  if (preview && window.FISH_TEXTURE_DATA) preview.src = window.FISH_TEXTURE_DATA;

  // 注意：环境与小地图改为「首次进入游戏时」构建（见 btn-level-desert 处理），
  // 主菜单不再是已经加载了游戏场景的状态。
  initBgm();
  buildPlayer();
  mark('player');
  buildGun();
  mark('gun');
  buildParticles();
  mark('particles');
  loadFishTexture();
  mark('texture');
  // 开局弹药：手枪 7/42（扩容弹夹靠掉落，不继承）
  magTier = { pistol: 0, rifle: 0 };
  ammo.magSize = magSizeNow();
  ammo.mag = magSizeNow();
  ammo.reserve = WEAPONS.pistol.reserveStart;
  weaponAmmo = {
    pistol: { mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveStart },
    rifle:  { mag: WEAPONS.rifle.magSize,  reserve: WEAPONS.rifle.reserveStart },
  };
  itemTimer = rand(CFG.itemIntervalMin, CFG.itemIntervalMax);
  // 血条数值由 HTML 静态 span 承载；仅在无子元素时兜底设置名字（避免 textContent 覆盖清除数字子元素）
  if (dom.bossName && dom.bossName.children.length === 0) dom.bossName.textContent = '超级蓝色大肥鱼';
  if (dom.bossHpCur) dom.bossHpCur.textContent = '15';
  if (dom.bossHpMax) dom.bossHpMax.textContent = '15';
  updateHUD();
  updateArmorHUD();

  mark('events-before');
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
  // 彻底屏蔽右键菜单与浏览器手势（右键未来会承载更多操作）
  // 1) document 级屏蔽 contextmenu —— 覆盖画面、HUD、面板等所有区域
  document.addEventListener('contextmenu', function (ev) { ev.preventDefault(); return false; });
  // 2) 屏蔽鼠标侧键（浏览器前进/后退）
  document.addEventListener('mousedown', function (ev) {
    if (ev.button === 3 || ev.button === 4) ev.preventDefault();
  });
  // 3) 屏蔽长按菜单与拖拽选择（触屏/触控板）
  document.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
  document.addEventListener('selectstart', function (ev) { ev.preventDefault(); });
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
  if (btnVictoryRestart) btnVictoryRestart.addEventListener('click', function () {
    if (debugMode) { triggerCheatCaught(); return; }    // 开发者模式通关回主菜单 → 抓到你作弊咯！
    restartGame(true);                                   // 通关 → 回到主菜单
  });
  // 奖励卡片：点击选择对应技能（事件委托，卡片动态重建）
  if (dom.rewardCards) {
    dom.rewardCards.addEventListener('click', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.reward-card') : null;
      if (card && card.getAttribute('data-idx') !== null) chooseReward(parseInt(card.getAttribute('data-idx'), 10));
    });
  }
  // 技能面板 -/+ 按钮（仅开发者模式，事件委托）
  if (dom.skillsList) {
    dom.skillsList.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.sk-btn') : null;
      if (!btn || btn.disabled) return;
      var id = btn.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (id) adjustSkill(id, act === 'plus' ? 1 : -1);
    });
  }
  // 技能面板"关闭并继续游戏"按钮（触屏设备无键盘时必需）
  var btnSkillsClose = document.getElementById('btn-skills-close');
  if (btnSkillsClose) btnSkillsClose.addEventListener('click', function () { closeSkills(); });
  // 设置面板：主菜单 / 暂停界面入口 + 关闭按钮 + 控件绑定
  var btnSetMenu = document.getElementById('btn-settings-menu');
  if (btnSetMenu) btnSetMenu.addEventListener('click', function () { openSettings(); });
  var btnSetPause = document.getElementById('btn-settings-pause');
  if (btnSetPause) btnSetPause.addEventListener('click', function () { openSettings(); });
  var btnSetClose = document.getElementById('btn-settings-close');
  if (btnSetClose) btnSetClose.addEventListener('click', function () { closeSettings(); });
  // 暂停界面：回到主菜单（restartGame(true) 会完整清场：敌人/子弹/特效/波次全部重置）
  var btnPauseMenu = document.getElementById('btn-pause-menu');
  if (btnPauseMenu) btnPauseMenu.addEventListener('click', function () {
    if (state !== 'paused' && state !== 'gameover' && state !== 'playing') return;
    restartGame(true);
  });
  // 主菜单：成就一览 / 退出游戏
  var btnAch = document.getElementById('btn-achievements');
  if (btnAch) btnAch.addEventListener('click', function () { openAchievements(); });
  var btnAchClose = document.getElementById('btn-ach-close');
  if (btnAchClose) btnAchClose.addEventListener('click', function () { closeAchievements(); });
  var btnAchReset = document.getElementById('btn-ach-reset');
  if (btnAchReset) btnAchReset.addEventListener('click', function () { resetAchievements(); });
  var btnQuit = document.getElementById('btn-quit');
  if (btnQuit) btnQuit.addEventListener('click', function () { quitGame(); });
  // 设置面板：一键清空本地数据（成就 / 游玩记录 / 最佳记录，设置保留）
  var btnWipe = document.getElementById('btn-wipe-data');
  if (btnWipe) btnWipe.addEventListener('click', function () { wipeLocalData(); });
  bindSettingsInputs();
  applySettings();          // 读档后立即应用音量 / 灵敏度 / 画质
  var btnLevelDesert = document.getElementById('btn-level-desert');
  var btnLevelBack = document.getElementById('btn-level-back');
  if (btnLevelDesert) btnLevelDesert.addEventListener('click', function () {
    if (state !== 'levelSelect') return;
    enterGameWorld();     // 首次进入时构建场景（主菜单不加载世界）
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
    getCamFx: function () { return camFx; },
    getWave: function () { return wave; },
    startWave: startWave,
    getComboBonus: function () { return comboBonus(); },
    getAchievements: function () { return JSON.parse(JSON.stringify(save.achievements)); },
    killNearest: function () {
      var best = null, bd = Infinity;
      for (var i = 0; i < enemies.length; i++) {
        var en = enemies[i];
        if (!en.alive) continue;
        var dx = en.mesh.position.x - player.pos.x, dz = en.mesh.position.z - player.pos.z;
        var d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = en; }
      }
      if (best) { killFish(best, best.mesh.position.clone()); return true; }
      return false;
    },
    getVoiceState: function (idx) {
      var list = [];
      for (var i = 0; i < enemies.length; i++) {
        var en = enemies[i];
        list.push({ i: i, alive: en.alive, hasVoice: !!en.voiceAudio, paused: en.voiceAudio ? en.voiceAudio.paused : null });
      }
      return list;
    },
    enterGameWorld: enterGameWorld,       // 测试用：构建游戏世界
    unloadGameScene: unloadGameScene,     // 测试用：卸载游戏世界
    showMuzzleFlash: function (on) {   // 测试/截图用：强制显示枪口火焰
      if (!gun.flashMesh) return null;
      gun.flashMesh.visible = !!on;
      if (gun.light) gun.light.intensity = on ? 6 : 0;
      return {
        weapon: currentWeapon,
        flashZ: +gun.flashMesh.position.z.toFixed(3),
        lightZ: gun.light ? +gun.light.position.z.toFixed(3) : null,
      };
    },
    getEnvMod: function () { return JSON.parse(JSON.stringify(envMod)); },
    getAmmoTension: ammoTension,
    getEnvRule: function () { return ENV_THEMES[envIndex].rule || ''; },
    getRewardOptionsPreview: pickRewardOptions,          // 测试用：预览三选一
    getAchievementCount: function () { return Object.keys(ACHIEVEMENTS).length; },
    getKnifeRange: function () { return WEAPONS.knife.range; },
    knifeAttack: knifeAttack,                            // 测试用：匕首攻击（true = 重击）
    getKnifeCd: function () { return knifeCd; },
    getWeapon: function () { return currentWeapon; },
    getMoveSpeedNow: function () {                       // 测试用：当前有效移速
      var wpen = weaponSpeedPenalty();
      return CFG.walkSpeed * wpen.base * (1 + upgrades.speed * CFG.upgradeSpeedPerLevel + comboBonus().speed) * wpen.final;
    },
    getAmmoLimits: function () {
      var def = weaponDef();
      var info = magTierInfo(currentWeapon);
      return {
        weapon: currentWeapon,
        magSize: magSizeNow(),
        reserveMax: reserveMaxNow(currentWeapon),
        reserveStart: def.reserveStart,
        tier: magTier[currentWeapon] || 0,
        tierName: info ? info.name : '标准弹夹',
        magTiers: MAG_TIERS[currentWeapon].map(function (x) { return { name: x.name, size: x.size }; }),
      };
    },
    giveMagTier: function (weapon, tier) {              // 测试用：直接设置扩容等级
      magTier[weapon] = tier;
      if (weapon === currentWeapon) ammo.magSize = magSizeNow();
      return magSizeNow();
    },
    spawnMagAt: function (weapon, tier, x, z) {         // 测试用：在指定坐标生成扩容弹夹道具
      var p = new THREE.Vector3(x, 0, z);
      var mesh = buildMagItem(weapon, tier, p);
      scene.add(mesh);
      items.push({ mesh: mesh, type: 'mag', weapon: weapon, tier: tier, phase: 0 });
      return { weapon: weapon, tier: tier };
    },
    spawnMagDrop: function (weapon, tier) {             // 测试用：在玩家附近生成一个扩容弹夹道具
      var p = player.pos.clone();
      p.x += 1.2;
      spawnMagItem(p);
      var last = items[items.length - 1];
      if (last && last.type === 'mag' && weapon) { last.weapon = weapon; last.tier = tier; }
      return last ? { weapon: last.weapon, tier: last.tier } : null;
    },
    setEnvTheme: applyEnvTheme,                          // 测试用：切换环境主题
    getEnvTheme: function () { return { index: envIndex, name: ENV_THEMES[envIndex].name }; },
    bossFxAt: function (x, z) {                          // 测试用：在指定位置播出场光圈
      spawnBossEntranceFx(new THREE.Vector3(x, 0, z));
    },
    spawnBossNow: spawnBoss,                             // 测试用：立即生成一只 Boss
    clearBossNow: function () {                          // 测试用：移除当前 Boss
      if (boss) { scene.remove(boss.mesh); boss = null; hideBossBar(); }
    },
    getBossVariant: function () {
      return boss ? { name: boss.variant.name, mode: boss.mode, hp: boss.hp, maxHp: boss.maxHp } : null;
    },
    setEnemyHpMax: function (v) { enemyHpNow = v; },     // 测试用
    getEnemyHpMax: function () { return enemyHpNow; },
    killKindForTest: function (kind) {                   // 测试用：击杀指定种类的敌人
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive && enemies[i].kind === kind) {
          killFish(enemies[i], enemies[i].mesh.position.clone());
          return true;
        }
      }
      return false;
    },
    getSceneStats: function () {
      var meshes = 0;
      scene.traverse(function (o) { if (o.isMesh || o.isSprite || o.isPoints) meshes++; });
      return {
        children: scene.children.length, meshes: meshes,
        envBuilt: envBuilt, envObjects: envObjects.length,
        obstacles: obstacles.length, wallMeshes: wallMeshes.length,
        enemies: enemies.filter(function (e) { return e.alive; }).length,
      };
    },
    getRandomCovers: function () { return randomCovers.map(function (m) { return { x: +m.position.x.toFixed(2), z: +m.position.z.toFixed(2) }; }); },
    respawnCovers: spawnRandomCovers,
    clearCovers: clearRandomCovers,     // 测试用：清空随机掩体，验证固定地图行为
    getStats: function () { return JSON.parse(JSON.stringify(save.stats || {})); },
    getUpgradeEffects: function () {
      return {
        magSize: magSizeNow(), nade: nadeDamageNow(), armorMax: armorMaxNow(),
        gunDamage: gunDamageNow() * weaponDef().damageMul,
        weapon: currentWeapon,
        upgrades: JSON.parse(JSON.stringify(upgrades)),
      };
    },
    setUpgrade: function (id, lv) { upgrades[id] = lv; refreshUpgradesMaxFlag(); },
    rollDamageSample: function (n) {
      var crit = 0, total = 0;
      for (var i = 0; i < (n || 100); i++) { var r = rollGunDamage(); if (r.isCrit) crit++; total += r.damage; }
      return { crit: crit, avg: total / (n || 100) };
    },
    getGunDamage: function () { return gunDamageNow(); },
    setComboRank: function (r) { combo.rank = r; combo.score = Math.max(1, (CFG.comboRankPoints[r] || 1)); },
    getStage: function () { return currentStage(); },
    getBossKillCount: function () { return bossKillCount; },
    setBossKillCount: function (n) { bossKillCount = n; checkStageUp(); },
    getWaveComposition: function (st) {
      return buildWaveComposition(st || currentStage());
    },
    killAllEnemies: function () {
      // 测试用：清空当前波次全部敌人（模拟玩家清波）
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) { enemies[i].alive = false; enemies[i].respawnTimer = 99999; enemies[i].mesh.visible = false; }
      }
    },
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
    isPointerLocked: isPointerLocked,
    forceFallback: enterFallbackMode,      // 测试用：强制进入拖动瞄准模式
    notifyLockChange: onPointerLockChange, // 测试用：手动触发锁定变化处理
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
    adjustSkill: adjustSkill,
    triggerCheatCaught: triggerCheatCaught,
    closeCheatCaught: closeCheatCaught,
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
    setUpgradeLevel: function (id, lv) { upgrades[id] = lv; refreshUpgradesMaxFlag(); },
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
    isMaxAll: function () { return upgradesAllMax; },
    setBossHp: function (v) { if (boss) { boss.hp = v; } },
    simulateGrowth: function () { growEnemies(); },
    resetProgression: function () {
      upgrades = {
    dmg: 0, refund: 0, heal: 0, nade: 0, speed: 0,
    crit: 0, pierce: 0, nadedmg: 0, armorup: 0, vampire: 0,
  };
      upgradesAllMax = false;
      bossKillCount = 0;
      rewardOptions = null;
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
    spawnEnemy: function (kind, x, z) {
      return spawnFish(new THREE.Vector3(x, 0, z), kind || 'normal');
    },
    spawnShooter: function (x, z) {
      var e = spawnFish(new THREE.Vector3(x, 0, z));
      e.ranged = true;
      e.speedMul = 1.0;
      if (e.gunMesh) e.gunMesh.visible = true;
      if (e.swordMesh) e.swordMesh.visible = false;   // 射手不持剑（保持互斥）
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
    resetHurt: function () { hurtCd = 0; hurtCdByKind = { melee: 0, ranged: 0, blast: 0 }; },
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
