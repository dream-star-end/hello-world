const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => min + Math.random() * (max - min);
const choose = (list) => list[(Math.random() * list.length) | 0];
const distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const TAU = Math.PI * 2;
const WAVE_DURATION = 42;
const FINAL_WAVE = 6;

const ui = {
  landing: $('#landing'), game: $('#game-ui'), heroList: $('#hero-list'),
  start: $('#start-btn'), difficulty: $('#difficulty'), cave: $('#cave-btn'), guide: $('#guide-btn'),
  soundMenu: $('#sound-menu-btn'), bestLevel: $('#best-level'), bestTime: $('#best-time'), jadeCount: $('#jade-count'),
  realm: $('#realm-name'), playerLevel: $('#player-level'), hpFill: $('#hp-fill'), hpText: $('#hp-text'),
  qiFill: $('#qi-fill'), waveLabel: $('#wave-label'), timer: $('#timer'), waveFill: $('#wave-fill'),
  kills: $('#kill-count'), runJade: $('#run-jade'), pause: $('#pause-btn'), portrait: $('#portrait'),
  bossHud: $('#boss-hud'), bossName: $('#boss-name'), bossFill: $('#boss-fill'),
  objectiveProgress: $('#objective-progress'), objectiveText: $('#objective-text'), objectiveFill: $('#objective-fill'),
  combo: $('#combo'), announcement: $('#announcement'), dock: $('#skill-dock'),
  xpText: $('#xp-text'), xpFill: $('#xp-fill'), nextRealm: $('#next-realm'),
  levelModal: $('#level-modal'), cards: $('#upgrade-cards'), reroll: $('#reroll-btn'),
  pauseModal: $('#pause-modal'), resume: $('#resume-btn'), soundPause: $('#sound-pause-btn'),
  restart: $('#restart-btn'), quit: $('#quit-btn'), result: $('#result-modal'),
  resultSeal: $('#result-seal'), resultKicker: $('#result-kicker'), resultTitle: $('#result-title'),
  resultQuote: $('#result-quote'), resultTime: $('#result-time'), resultKills: $('#result-kills'),
  resultLevel: $('#result-level'), resultJade: $('#result-jade'), again: $('#again-btn'), home: $('#home-btn'),
  caveModal: $('#cave-modal'), caveJade: $('#cave-jade-count'), metaList: $('#meta-list'), guideModal: $('#guide-modal'),
  joystick: $('#joystick'), dashTouch: $('#dash-touch'), hitFlash: $('#hit-flash'), cursorGlow: $('#cursor-glow')
};

const HEROES = [
  {
    id: 'jian', name: '太虚剑宗', glyph: '剑', tagline: '御剑千里 · 破甲追袭', color: '#80e2c1',
    skill: 'sword', hp: 100, speed: 205, damage: 1.1, attackSpeed: 1,
    intro: '剑心通明', passive: '飞剑伤害提高 10%'
  },
  {
    id: 'lei', name: '九霄雷府', glyph: '雷', tagline: '天雷灌体 · 连锁群伤', color: '#9fb9ff',
    skill: 'thunder', hp: 92, speed: 198, damage: 1, attackSpeed: 1.08,
    intro: '先天雷体', passive: '施法间隔缩短 8%'
  },
  {
    id: 'yan', name: '赤炼丹霞', glyph: '焱', tagline: '业火焚妖 · 坚韧续战', color: '#f29b72',
    skill: 'flame', hp: 125, speed: 188, damage: 1.04, attackSpeed: 1,
    intro: '琉璃火身', passive: '气血上限提高 25%'
  }
];

const SKILLS = {
  sword: {
    name: '青冥飞剑', glyph: '剑', color: '#82e3c2', rarity: '本命法宝', max: 6,
    desc: (l) => l ? `飞剑自动追击，当前可贯穿 ${Math.floor((l - 1) / 2)} 个目标` : '祭出青冥飞剑，自动斩击最近的妖物',
    delta: (l) => l ? `飞剑数量或威力提升，伤害 <b>+${14 + l * 4}%</b>` : '解锁自动追踪飞剑'
  },
  thunder: {
    name: '九霄雷引', glyph: '雷', color: '#a8bdff', rarity: '上品神通', max: 6,
    desc: (l) => `召唤雷霆在妖物间跃迁，连锁 ${2 + l} 个目标`,
    delta: () => '连锁数 <b>+1</b>，雷霆伤害提升'
  },
  orb: {
    name: '太一灵珠', glyph: '珠', color: '#f0d788', rarity: '护道法宝', max: 6,
    desc: (l) => `${Math.min(2 + l, 7)} 枚灵珠环身，持续击退近身妖物`,
    delta: (l) => l === 0 ? '解锁护体灵珠' : '灵珠数量或旋转速度提升'
  },
  flame: {
    name: '红莲业火', glyph: '焱', color: '#ff9a6d', rarity: '地阶术法', max: 6,
    desc: (l) => `在妖群中降下红莲，焚烧范围提高 ${l * 8}%`,
    delta: () => '范围与灼烧伤害提高 <b>+18%</b>'
  },
  frost: {
    name: '玄冥霜华', glyph: '霜', color: '#9ce7ff', rarity: '地阶术法', max: 6,
    desc: (l) => `寒气周期扩散，冻结妖物 ${(.5 + l * .12).toFixed(1)} 秒`,
    delta: () => '寒潮范围扩大，冻结时间延长'
  },
  array: {
    name: '万剑归墟', glyph: '阵', color: '#e3c77d', rarity: '天阶剑阵', max: 6,
    desc: (l) => `每隔数息落下 ${3 + l * 2} 道天剑诛灭妖邪`,
    delta: () => '天剑数量 <b>+2</b>，落剑更迅疾'
  }
};

const PASSIVES = {
  power: { name: '剑心淬炼', glyph: '锋', color: '#efc978', rarity: '道体', max: 5, desc: '凝练杀伐之意，所有伤害提高', delta: '全局伤害 <b>+14%</b>' },
  haste: { name: '太清心法', glyph: '息', color: '#81ddbd', rarity: '心法', max: 5, desc: '灵台无垢，神通运转更加流畅', delta: '施法间隔 <b>-8%</b>' },
  vitality: { name: '不灭金身', glyph: '体', color: '#e9a274', rarity: '道体', max: 5, desc: '以天地灵气洗髓伐骨，并回复气血', delta: '气血上限 <b>+22</b>，立即恢复 30%' },
  speed: { name: '踏月无痕', glyph: '影', color: '#9ed9ee', rarity: '身法', max: 4, desc: '缩地成寸，来去不留形迹', delta: '移动速度 <b>+9%</b>，闪身冷却缩短' },
  magnet: { name: '聚灵真诀', glyph: '引', color: '#b7e59a', rarity: '秘术', max: 4, desc: '牵引散落灵气，加速修为累积', delta: '拾取范围 <b>+45</b>，修为获取 +5%' },
  crit: { name: '洞玄真瞳', glyph: '瞳', color: '#d8acff', rarity: '秘术', max: 5, desc: '窥见万物破绽，出手直指命门', delta: '会心几率 <b>+7%</b>' },
  armor: { name: '玄甲护身', glyph: '甲', color: '#b9c3ae', rarity: '道体', max: 4, desc: '灵甲自行护主，抵御妖物侵袭', delta: '受到伤害 <b>-7%</b>' }
};

const ENEMIES = {
  wisp: { name: '幽火', hp: 18, speed: 76, damage: 7, radius: 13, xp: 4, color: '#6ed6ba' },
  wolf: { name: '影狼', hp: 31, speed: 93, damage: 10, radius: 16, xp: 6, color: '#78958a' },
  spider: { name: '鬼面蛛', hp: 48, speed: 62, damage: 12, radius: 19, xp: 8, color: '#a87976' },
  cultist: { name: '邪修', hp: 42, speed: 48, damage: 9, radius: 17, xp: 9, color: '#b48d62', ranged: true },
  brute: { name: '山魈', hp: 105, speed: 39, damage: 19, radius: 27, xp: 14, color: '#8d6a55' }
};

const BOSS_DATA = {
  3: { name: '噬月狼王', glyph: '狼', color: '#bd7c74', hp: 1850, speed: 44, damage: 21, radius: 52 },
  6: { name: '九幽魔尊', glyph: '魔', color: '#d76454', hp: 4800, speed: 39, damage: 26, radius: 62 }
};

const REALMS = [
  '炼气一层', '炼气二层', '炼气三层', '炼气四层', '炼气五层', '炼气六层', '炼气七层', '炼气八层', '炼气九层',
  '筑基初期', '筑基中期', '筑基后期', '筑基圆满', '金丹初期', '金丹中期', '金丹后期', '金丹圆满', '元婴初期', '元婴中期', '元婴后期', '化神之境'
];

const META = {
  body: { name: '先天道体', glyph: '体', desc: '每级使初始气血提高 6%', max: 5 },
  insight: { name: '悟道灵台', glyph: '悟', desc: '每级使修为获取提高 5%', max: 5 },
  edge: { name: '庚金剑骨', glyph: '锋', desc: '每级使所有伤害提高 4%', max: 5 }
};
const META_COST = [25, 55, 110, 190, 300];

const DEFAULT_SAVE = { jade: 0, bestLevel: 1, bestTime: 0, meta: { body: 0, insight: 0, edge: 0 } };

function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem('wanjie-save-v1') || '{}');
    return {
      ...DEFAULT_SAVE, ...data,
      meta: { ...DEFAULT_SAVE.meta, ...(data.meta || {}) },
      jade: Math.max(0, Number(data.jade) || 0)
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

let save = loadSave();
let selectedHero = HEROES[0];

function persist() {
  localStorage.setItem('wanjie-save-v1', JSON.stringify(save));
  refreshSaveUI();
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function realmFor(level) {
  return REALMS[Math.min(level - 1, REALMS.length - 1)];
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = new Map();
  }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq = 440, duration = .08, type = 'sine', volume = .035, slide = 0, key = '') {
    if (this.muted) return;
    const now = performance.now();
    if (key && now - (this.last.get(key) || 0) < 45) return;
    if (key) this.last.set(key, now);
    this.init();
    const t = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, t);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + .008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start(t);
    oscillator.stop(t + duration + .02);
  }
  sword() { this.tone(780, .065, 'triangle', .025, 340, 'sword'); }
  hit() { this.tone(150, .045, 'square', .013, -55, 'hit'); }
  thunder() { this.tone(92, .28, 'sawtooth', .035, -40, 'thunder'); }
  pickup() { this.tone(680, .07, 'sine', .018, 180, 'pickup'); }
  level() { [420, 590, 820].forEach((n, i) => setTimeout(() => this.tone(n, .24, 'sine', .04, 80), i * 100)); }
  hurt() { this.tone(110, .18, 'sawtooth', .045, -45, 'hurt'); }
  boss() { this.tone(65, .8, 'sawtooth', .05, -12, 'boss'); }
  toggle() {
    this.muted = !this.muted;
    document.querySelectorAll('#sound-menu-btn b, #sound-pause-btn b').forEach((n) => { n.textContent = this.muted ? '关' : '开'; });
  }
}

const audio = new AudioEngine();

class SpatialHash {
  constructor(size = 110) { this.size = size; this.cells = new Map(); }
  clear() { this.cells.clear(); }
  insert(entity) {
    const key = `${Math.floor(entity.x / this.size)},${Math.floor(entity.y / this.size)}`;
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(entity);
  }
  nearby(x, y, radius = 130) {
    const result = [];
    const range = Math.ceil(radius / this.size);
    const cx = Math.floor(x / this.size), cy = Math.floor(y / this.size);
    for (let ix = cx - range; ix <= cx + range; ix++) {
      for (let iy = cy - range; iy <= cy + range; iy++) {
        const bucket = this.cells.get(`${ix},${iy}`);
        if (bucket) result.push(...bucket);
      }
    }
    return result;
  }
}

class Game {
  constructor() {
    this.mode = 'menu';
    this.frame = 0;
    this.lastTime = performance.now();
    this.keys = new Set();
    this.joystick = { x: 0, y: 0, pointer: null };
    this.hash = new SpatialHash();
    this.camera = { x: 0, y: 0, shake: 0 };
    this.ambientTime = 0;
    this.lastHero = selectedHero;
    this.resetCollections();
  }

  resetCollections() {
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
  }

  start(hero = selectedHero) {
    audio.init();
    this.lastHero = hero;
    this.difficulty = Number(ui.difficulty.value) || 1;
    this.resetCollections();
    this.time = 0;
    this.wave = 1;
    this.previousWave = 0;
    this.spawnClock = .45;
    this.kills = 0;
    this.waveKills = 0;
    this.runJade = 0;
    this.combo = 0;
    this.comboClock = 0;
    this.rerolls = 1;
    this.bossesSpawned = new Set();
    this.objectiveDone = false;
    this.pendingLevels = 0;
    this.upgradeChoices = [];
    this.skillLevels = Object.fromEntries(Object.keys(SKILLS).map((id) => [id, 0]));
    this.passiveLevels = Object.fromEntries(Object.keys(PASSIVES).map((id) => [id, 0]));
    this.skillLevels[hero.skill] = 1;
    const metaHp = 1 + save.meta.body * .06;
    const maxHp = Math.round(hero.hp * metaHp);
    this.player = {
      x: 0, y: 0, radius: 17,
      hp: maxHp, maxHp, baseSpeed: hero.speed, speed: hero.speed,
      damageMult: hero.damage * (1 + save.meta.edge * .04),
      attackSpeed: hero.attackSpeed, armor: 0, crit: .05, critDamage: 1.75,
      magnet: 92, xpMult: 1 + save.meta.insight * .05,
      level: 1, xp: 0, xpNeed: 22,
      invuln: 0, dashCooldown: 0, dashTime: 0, dashX: 0, dashY: 0,
      facing: 0, anim: 0, lastHit: 0
    };
    this.cooldowns = { sword: .15, thunder: .7, flame: 1.1, frost: 1.8, array: 3.2 };
    this.orbHits = new Map();
    this.camera.x = 0;
    this.camera.y = 0;
    this.mode = 'running';
    ui.landing.classList.remove('active');
    ui.game.classList.add('active');
    closeAllModals();
    this.refreshSkillDock();
    this.updateHUD(true);
    this.announce('秘境开启', `${hero.intro} · ${hero.passive}`);
    this.burst(0, 0, hero.color, 38, 160);
    this.ring(0, 0, hero.color, 24, 135, .8);
    this.lastTime = performance.now();
  }

  returnHome() {
    if (this.mode !== 'menu' && this.runJade) {
      save.jade += this.runJade;
      this.runJade = 0;
      persist();
    }
    this.mode = 'menu';
    closeAllModals();
    ui.game.classList.remove('active');
    ui.landing.classList.add('active');
    refreshSaveUI();
  }

  togglePause(force) {
    if (this.mode === 'ended' || this.mode === 'menu' || this.mode === 'levelup') return;
    const pause = force ?? this.mode === 'running';
    this.mode = pause ? 'paused' : 'running';
    ui.pauseModal.classList.toggle('hidden', !pause);
    if (!pause) this.lastTime = performance.now();
  }

  dash() {
    if (this.mode !== 'running' || this.player.dashCooldown > 0) return;
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x--;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x++;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y--;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y++;
    x += this.joystick.x;
    y += this.joystick.y;
    const length = Math.hypot(x, y);
    if (length < .1) { x = Math.cos(this.player.facing); y = Math.sin(this.player.facing); }
    else { x /= length; y /= length; }
    this.player.dashX = x;
    this.player.dashY = y;
    this.player.dashTime = .18;
    this.player.dashCooldown = Math.max(1.25, 2.45 - this.passiveLevels.speed * .18);
    this.player.invuln = .35;
    this.camera.shake = 3;
    audio.tone(260, .12, 'triangle', .028, 520, 'dash');
    this.ring(this.player.x, this.player.y, '#a9f5d7', 12, 62, .35);
  }

  update(dt) {
    if (this.mode !== 'running') return;
    this.time += dt;
    this.frame++;
    const calculatedWave = Math.min(FINAL_WAVE, Math.floor(this.time / WAVE_DURATION) + 1);
    if (calculatedWave !== this.wave || this.previousWave === 0) {
      this.wave = calculatedWave;
      this.onWaveStart();
    }

    this.hash.clear();
    this.enemies.forEach((enemy) => { if (!enemy.dead) this.hash.insert(enemy); });
    this.updatePlayer(dt);
    this.updateSpawns(dt);
    this.updateSkills(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateVisuals(dt);

    this.enemies = this.enemies.filter((e) => !e.remove);
    this.projectiles = this.projectiles.filter((e) => e.life > 0 && !e.remove);
    this.pickups = this.pickups.filter((e) => e.life > 0 && !e.remove);
    this.particles = this.particles.filter((e) => e.life > 0);
    this.effects = this.effects.filter((e) => e.life > 0);
    this.texts = this.texts.filter((e) => e.life > 0);

    this.comboClock -= dt;
    if (this.comboClock <= 0) this.combo = 0;
    this.camera.x = lerp(this.camera.x, this.player.x, 1 - Math.exp(-dt * 7));
    this.camera.y = lerp(this.camera.y, this.player.y, 1 - Math.exp(-dt * 7));
    this.camera.shake = Math.max(0, this.camera.shake - dt * 18);
    this.updateHUD();
  }

  onWaveStart() {
    this.previousWave = this.wave;
    this.waveKills = 0;
    this.objectiveDone = false;
    const names = ['第一劫 · 幽火迷踪', '第二劫 · 百鬼夜行', '第三劫 · 月蚀狼啸', '第四劫 · 魔念丛生', '第五劫 · 万妖来朝', '第六劫 · 九幽降世'];
    this.announce(`第${['一', '二', '三', '四', '五', '六'][this.wave - 1]}劫`, names[this.wave - 1].split(' · ')[1]);
    if (BOSS_DATA[this.wave] && !this.bossesSpawned.has(this.wave)) {
      setTimeout(() => {
        if (this.mode !== 'menu' && this.wave === this.previousWave && !this.bossesSpawned.has(this.wave)) this.spawnBoss(this.wave);
      }, 1450);
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    p.anim += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    let mx = this.joystick.x, my = this.joystick.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx--;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx++;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my--;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my++;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; p.facing = Math.atan2(my, mx); }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * 690 * dt;
      p.y += p.dashY * 690 * dt;
      if (Math.random() < .85) this.particle(p.x - p.dashX * 14, p.y - p.dashY * 14, '#8aebc8', rand(5, 10), rand(.18, .38), -p.dashX * rand(30, 90), -p.dashY * rand(30, 90));
    } else {
      p.x += mx * p.speed * dt;
      p.y += my * p.speed * dt;
    }
  }

  updateSpawns(dt) {
    if (this.time >= FINAL_WAVE * WAVE_DURATION) return;
    this.spawnClock -= dt;
    const cap = 75 + this.wave * 18;
    if (this.spawnClock <= 0 && this.enemies.length < cap) {
      const batch = this.wave >= 5 && Math.random() < .28 ? 2 : 1;
      for (let i = 0; i < batch; i++) this.spawnEnemy();
      const rate = Math.max(.17, .62 - this.wave * .065 - this.time * .0006) / Math.sqrt(this.difficulty);
      this.spawnClock = rate * rand(.72, 1.28);
    }
  }

  spawnEnemy(forcedType, elite = false) {
    const pool = ['wisp', 'wolf'];
    if (this.wave >= 2) pool.push('spider', 'cultist');
    if (this.wave >= 4) pool.push('brute', 'cultist');
    const type = forcedType || choose(pool);
    const base = ENEMIES[type];
    const angle = Math.random() * TAU;
    const distance = Math.max(viewWidth, viewHeight) * .56 + rand(80, 210);
    const scale = (1 + (this.wave - 1) * .22 + this.time * .0016) * this.difficulty;
    elite ||= Math.random() < .012 + this.wave * .003;
    const hp = base.hp * scale * (elite ? 4.2 : 1);
    this.enemies.push({
      ...base, type, x: this.player.x + Math.cos(angle) * distance, y: this.player.y + Math.sin(angle) * distance,
      hp, maxHp: hp, speed: base.speed * rand(.91, 1.08), damage: base.damage * (1 + (this.wave - 1) * .12) * this.difficulty,
      elite, boss: false, dead: false, remove: false, hitFlash: 0, attackCd: rand(.4, 1.6),
      spellCd: rand(1.8, 3.5), contactCd: 0, burn: 0, burnTick: 0, freeze: 0,
      phase: Math.random() * TAU, seed: Math.random() * 1000
    });
  }

  spawnBoss(wave) {
    const data = BOSS_DATA[wave];
    if (!data) return;
    this.bossesSpawned.add(wave);
    const angle = -Math.PI / 2 + rand(-.35, .35);
    const distance = Math.max(viewWidth, viewHeight) * .58;
    const hp = data.hp * this.difficulty;
    const boss = {
      ...data, type: 'boss', x: this.player.x + Math.cos(angle) * distance, y: this.player.y + Math.sin(angle) * distance,
      hp, maxHp: hp, boss: true, elite: true, dead: false, remove: false, hitFlash: 0,
      attackCd: 1, spellCd: 2.4, contactCd: 0, burn: 0, burnTick: 0, freeze: 0, phase: 0, seed: Math.random() * 1000
    };
    this.enemies.push(boss);
    ui.bossName.textContent = data.name;
    ui.bossHud.classList.remove('hidden');
    this.announce('大妖降世', `${data.name} · 镇守此劫`);
    this.camera.shake = 12;
    audio.boss();
  }

  updateSkills(dt) {
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] -= dt;
    const haste = this.player.attackSpeed * (1 + this.passiveLevels.haste * .08);
    const levels = this.skillLevels;

    if (levels.sword && this.cooldowns.sword <= 0) {
      const target = this.nearestEnemy(this.player.x, this.player.y, 720);
      if (target) {
        const count = levels.sword >= 5 ? 3 : levels.sword >= 3 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + (i - (count - 1) / 2) * .12;
          this.projectiles.push({
            type: 'sword', friendly: true, x: this.player.x + Math.cos(angle) * 24, y: this.player.y + Math.sin(angle) * 24,
            vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660, angle, radius: 10,
            damage: (18 + levels.sword * 7) * this.player.damageMult, life: 1.35,
            pierce: Math.floor((levels.sword - 1) / 2), hit: new Set(), color: SKILLS.sword.color
          });
        }
        audio.sword();
        this.cooldowns.sword = Math.max(.22, (.72 - levels.sword * .045) / haste);
      }
    }

    if (levels.thunder && this.cooldowns.thunder <= 0) {
      const first = this.nearestEnemy(this.player.x, this.player.y, 640);
      if (first) {
        const hit = [];
        let current = { x: this.player.x, y: this.player.y };
        for (let i = 0; i < 2 + levels.thunder; i++) {
          const next = this.nearestEnemy(current.x, current.y, i ? 210 : 640, hit);
          if (!next) break;
          hit.push(next);
          this.effects.push({ type: 'lightning', x: current.x, y: current.y, x2: next.x, y2: next.y, color: '#a9c8ff', life: .19, maxLife: .19, seed: Math.random() * 99 });
          this.hitEnemy(next, (27 + levels.thunder * 8) * this.player.damageMult, { element: 'thunder', knockback: 8 });
          current = next;
        }
        audio.thunder();
        this.camera.shake = Math.max(this.camera.shake, 3);
        this.cooldowns.thunder = Math.max(.7, (2.7 - levels.thunder * .13) / haste);
      }
    }

    if (levels.flame && this.cooldowns.flame <= 0) {
      const target = this.nearestEnemy(this.player.x, this.player.y, 620);
      if (target) {
        const radius = 70 + levels.flame * 7;
        this.effects.push({ type: 'flame', x: target.x, y: target.y, radius, life: 2.9, maxLife: 2.9, tick: 0, level: levels.flame, color: '#fa7958' });
        this.ring(target.x, target.y, '#ff8b61', 10, radius, .45);
        this.burst(target.x, target.y, '#ff875e', 18, 120);
        audio.tone(125, .28, 'sawtooth', .028, -50, 'flame');
        this.cooldowns.flame = Math.max(1, (3.2 - levels.flame * .16) / haste);
      }
    }

    if (levels.frost && this.cooldowns.frost <= 0) {
      const radius = 130 + levels.frost * 18;
      this.effects.push({ type: 'frost', x: this.player.x, y: this.player.y, radius, life: .72, maxLife: .72, color: '#a5ebff' });
      for (const enemy of this.enemies) {
        if (!enemy.dead && distanceSq(enemy, this.player) < radius * radius) {
          enemy.freeze = Math.max(enemy.freeze, .5 + levels.frost * .12);
          this.hitEnemy(enemy, (12 + levels.frost * 5) * this.player.damageMult, { element: 'frost', noText: Math.random() > .4 });
        }
      }
      audio.tone(420, .5, 'sine', .025, -210, 'frost');
      this.cooldowns.frost = Math.max(1.4, (4.4 - levels.frost * .17) / haste);
    }

    if (levels.array && this.cooldowns.array <= 0) {
      const candidates = this.enemies.filter((e) => !e.dead).sort((a, b) => distanceSq(a, this.player) - distanceSq(b, this.player));
      const count = 3 + levels.array * 2;
      for (let i = 0; i < count && candidates.length; i++) {
        const target = candidates[i % Math.min(candidates.length, Math.max(4, count))];
        const x = target.x + rand(-35, 35), y = target.y + rand(-35, 35);
        this.effects.push({ type: 'swordfall', x, y, delay: i * .055, life: .65 + i * .055, maxLife: .65 + i * .055, damage: (22 + levels.array * 7) * this.player.damageMult, struck: false, color: '#ecd68f' });
      }
      audio.tone(520, .18, 'triangle', .025, 350, 'array');
      this.cooldowns.array = Math.max(1.6, (5.2 - levels.array * .2) / haste);
    }

    if (levels.orb) this.updateOrbs(dt, levels.orb);
    this.updatePersistentEffects(dt);
  }

  updateOrbs(dt, level) {
    const count = Math.min(2 + level, 7);
    const radius = 66 + level * 4;
    const speed = .9 + level * .11;
    const now = this.time;
    for (let i = 0; i < count; i++) {
      const angle = now * speed + i * TAU / count;
      const x = this.player.x + Math.cos(angle) * radius;
      const y = this.player.y + Math.sin(angle) * radius;
      for (const enemy of this.hash.nearby(x, y, 35)) {
        if (enemy.dead || distanceSq(enemy, { x, y }) > (enemy.radius + 13) ** 2) continue;
        const key = `${i}:${enemy.seed}`;
        if ((this.orbHits.get(key) || 0) > now) continue;
        this.orbHits.set(key, now + .42);
        this.hitEnemy(enemy, (10 + level * 3.5) * this.player.damageMult, { knockback: 25, noText: true });
      }
    }
    if (this.frame % 180 === 0) {
      for (const [key, time] of this.orbHits) if (time < now - 1) this.orbHits.delete(key);
    }
  }

  updatePersistentEffects(dt) {
    for (const effect of this.effects) {
      if (effect.type === 'flame') {
        effect.tick -= dt;
        if (effect.tick <= 0) {
          effect.tick = .38;
          for (const enemy of this.hash.nearby(effect.x, effect.y, effect.radius)) {
            if (!enemy.dead && distanceSq(enemy, effect) < (effect.radius + enemy.radius) ** 2) {
              enemy.burn = Math.max(enemy.burn, .8);
              this.hitEnemy(enemy, (6 + effect.level * 3.4) * this.player.damageMult, { element: 'fire', noText: Math.random() > .28 });
            }
          }
        }
      } else if (effect.type === 'swordfall' && !effect.struck) {
        effect.delay -= dt;
        if (effect.delay <= 0) {
          effect.struck = true;
          this.ring(effect.x, effect.y, '#e9d48c', 4, 39, .28);
          for (const enemy of this.hash.nearby(effect.x, effect.y, 48)) {
            if (!enemy.dead && distanceSq(enemy, effect) < (enemy.radius + 34) ** 2) this.hitEnemy(enemy, effect.damage, { knockback: 18 });
          }
          this.camera.shake = Math.max(this.camera.shake, 2.5);
        }
      }
    }
  }

  nearestEnemy(x, y, range, excluded = []) {
    let nearest = null, best = range * range;
    const excludedSet = excluded instanceof Set ? excluded : new Set(excluded);
    for (const enemy of this.enemies) {
      if (enemy.dead || excludedSet.has(enemy)) continue;
      const d = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
      if (d < best) { best = d; nearest = enemy; }
    }
    return nearest;
  }

  updateEnemies(dt) {
    const p = this.player;
    const now = this.time;
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        enemy.deathTime -= dt;
        if (enemy.deathTime <= 0) enemy.remove = true;
        continue;
      }
      enemy.phase += dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.contactCd = Math.max(0, enemy.contactCd - dt);
      enemy.attackCd -= dt;
      enemy.spellCd -= dt;
      enemy.freeze = Math.max(0, enemy.freeze - dt);
      enemy.burn = Math.max(0, enemy.burn - dt);
      if (enemy.burn > 0 && Math.random() < dt * 8) this.particle(enemy.x + rand(-enemy.radius, enemy.radius), enemy.y + rand(-enemy.radius, enemy.radius), '#ff774f', rand(2, 5), rand(.18, .35), rand(-15, 15), rand(-55, -20));

      const dx = p.x - enemy.x, dy = p.y - enemy.y;
      const dist = Math.max(.001, Math.hypot(dx, dy));
      let speed = enemy.speed * (enemy.freeze > 0 ? .16 : 1);
      if (enemy.ranged && dist < 285) speed *= dist < 170 ? -.55 : .12;
      if (enemy.boss && dist < 150) speed *= .35;
      enemy.x += dx / dist * speed * dt;
      enemy.y += dy / dist * speed * dt;

      // Gentle separation prevents a single unreadable enemy blob.
      if (this.frame % 2 === 0) {
        for (const other of this.hash.nearby(enemy.x, enemy.y, enemy.radius * 2.1)) {
          if (other === enemy || other.dead) continue;
          const sx = enemy.x - other.x, sy = enemy.y - other.y;
          const sd = Math.hypot(sx, sy) || 1;
          const min = (enemy.radius + other.radius) * .72;
          if (sd < min) {
            const force = (min - sd) * .45 * dt;
            enemy.x += sx / sd * force;
            enemy.y += sy / sd * force;
          }
        }
      }

      if (enemy.ranged && enemy.attackCd <= 0 && dist < 520) {
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({ type: 'enemyOrb', friendly: false, x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 175, vy: Math.sin(angle) * 175, radius: 7, damage: enemy.damage, life: 4, color: '#d99a66' });
        enemy.attackCd = rand(2.1, 2.8);
        audio.tone(180, .13, 'sine', .012, -60, 'enemy-shot');
      }

      if (enemy.boss && enemy.spellCd <= 0) {
        this.castBossSpell(enemy);
        enemy.spellCd = enemy.hp / enemy.maxHp < .5 ? 2.55 : 3.5;
      }

      if (dist < enemy.radius + p.radius + 3 && enemy.contactCd <= 0) {
        this.damagePlayer(enemy.damage, enemy.x, enemy.y);
        enemy.contactCd = enemy.boss ? .68 : .85;
      }

      // Remove stragglers extremely far away so the encounter remains dense.
      if (!enemy.boss && dist > Math.max(viewWidth, viewHeight) * 1.8) enemy.remove = true;
      if (enemy.boss) ui.bossFill.style.width = `${clamp(enemy.hp / enemy.maxHp * 100, 0, 100)}%`;
    }
  }

  castBossSpell(boss) {
    const enraged = boss.hp / boss.maxHp < .5;
    const count = enraged ? 14 : 10;
    const start = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    for (let i = 0; i < count; i++) {
      const angle = start + i * TAU / count + Math.sin(boss.phase) * .15;
      this.projectiles.push({
        type: 'bossOrb', friendly: false, x: boss.x + Math.cos(angle) * boss.radius, y: boss.y + Math.sin(angle) * boss.radius,
        vx: Math.cos(angle) * (enraged ? 205 : 175), vy: Math.sin(angle) * (enraged ? 205 : 175),
        radius: enraged ? 10 : 9, damage: boss.damage * .75, life: 5, color: boss.color
      });
    }
    const tx = this.player.x + this.player.dashX * 30;
    const ty = this.player.y + this.player.dashY * 30;
    this.effects.push({ type: 'danger', x: tx, y: ty, radius: enraged ? 105 : 88, life: 1.05, maxLife: 1.05, struck: false, damage: boss.damage * 1.15, color: boss.color });
    this.ring(boss.x, boss.y, boss.color, boss.radius, boss.radius + 72, .6);
    this.camera.shake = 7;
    audio.boss();
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.type === 'sword') {
        shot.angle = Math.atan2(shot.vy, shot.vx);
        if (Math.random() < dt * 32) this.particle(shot.x - shot.vx * .018, shot.y - shot.vy * .018, '#a9f7dc', rand(1, 3), .18, -shot.vx * .04, -shot.vy * .04);
      }
      if (shot.friendly) {
        const nearby = this.hash.nearby(shot.x, shot.y, shot.radius + 35);
        for (const enemy of nearby) {
          if (enemy.dead || shot.hit.has(enemy) || distanceSq(shot, enemy) > (shot.radius + enemy.radius) ** 2) continue;
          shot.hit.add(enemy);
          this.hitEnemy(enemy, shot.damage, { knockback: 15 });
          this.effects.push({ type: 'slash', x: shot.x, y: shot.y, angle: shot.angle, life: .2, maxLife: .2, color: shot.color });
          if (shot.pierce-- <= 0) { shot.remove = true; break; }
        }
      } else if (distanceSq(shot, this.player) < (shot.radius + this.player.radius) ** 2) {
        this.damagePlayer(shot.damage, shot.x, shot.y);
        shot.remove = true;
      }
    }

    for (const effect of this.effects) {
      if (effect.type === 'danger' && !effect.struck && effect.life < .18) {
        effect.struck = true;
        if (distanceSq(effect, this.player) < (effect.radius + this.player.radius) ** 2) this.damagePlayer(effect.damage, effect.x, effect.y);
        this.burst(effect.x, effect.y, effect.color, 28, 210);
        this.ring(effect.x, effect.y, effect.color, 14, effect.radius, .42);
        this.camera.shake = 12;
      }
    }
  }

  updatePickups(dt) {
    const p = this.player;
    for (const item of this.pickups) {
      item.life -= dt;
      item.phase += dt;
      const dx = p.x - item.x, dy = p.y - item.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < p.magnet || item.magnetized) {
        item.magnetized = true;
        const speed = clamp(160 + (p.magnet - Math.min(dist, p.magnet)) * 4, 160, 680);
        item.x += dx / dist * speed * dt;
        item.y += dy / dist * speed * dt;
      }
      if (dist < p.radius + item.radius + 5) {
        item.remove = true;
        if (item.type === 'xp') this.gainXp(item.value);
        else if (item.type === 'jade') {
          this.runJade += item.value;
          audio.pickup();
        } else if (item.type === 'heal') {
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .22);
          this.floatText(p.x, p.y - 30, `+${Math.round(p.maxHp * .22)}`, '#8fe3a9', 15);
          audio.tone(520, .22, 'sine', .03, 240, 'heal');
        } else if (item.type === 'chest') {
          const reward = 4 + this.wave * 2;
          this.runJade += reward;
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .18);
          this.floatText(p.x, p.y - 30, `宝匣 · 灵玉 +${reward}`, '#f5d987', 16);
          this.burst(item.x, item.y, '#f4d477', 34, 180);
          audio.level();
        }
        this.ring(item.x, item.y, item.color, 5, 34, .3);
      }
    }
  }

  updateVisuals(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-dt * 2.4);
      particle.vy *= Math.exp(-dt * 2.4);
      particle.vy += (particle.gravity || 0) * dt;
    }
    for (const effect of this.effects) effect.life -= dt;
    for (const text of this.texts) {
      text.life -= dt;
      text.y -= dt * text.speed;
      text.x += text.vx * dt;
    }
  }

  hitEnemy(enemy, rawDamage, options = {}) {
    if (!enemy || enemy.dead) return;
    const crit = Math.random() < this.player.crit;
    const damage = rawDamage * (crit ? this.player.critDamage : 1);
    enemy.hp -= damage;
    enemy.hitFlash = .09;
    if (options.knockback) {
      const dx = enemy.x - this.player.x, dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const resist = enemy.boss ? .15 : enemy.elite ? .45 : 1;
      enemy.x += dx / dist * options.knockback * resist;
      enemy.y += dy / dist * options.knockback * resist;
    }
    if (!options.noText) this.floatText(enemy.x + rand(-5, 5), enemy.y - enemy.radius, `${crit ? '会心 ' : ''}${Math.round(damage)}`, crit ? '#ffe59b' : options.element === 'fire' ? '#ff916d' : options.element === 'frost' ? '#b5edff' : '#e5e0ca', crit ? 17 : 12);
    if (Math.random() < .42) this.particle(enemy.x, enemy.y, options.element === 'fire' ? '#ff7755' : options.element === 'frost' ? '#9fe7ff' : '#e7d9a6', rand(2, 5), rand(.16, .32), rand(-75, 75), rand(-75, 75));
    audio.hit();
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  damagePlayer(rawDamage, sourceX, sourceY) {
    const p = this.player;
    if (p.invuln > 0 || this.mode !== 'running') return;
    const damage = Math.max(1, rawDamage * (1 - Math.min(.65, p.armor)));
    p.hp -= damage;
    p.invuln = .48;
    p.lastHit = this.time;
    const dx = p.x - sourceX, dy = p.y - sourceY, dist = Math.hypot(dx, dy) || 1;
    p.x += dx / dist * 18;
    p.y += dy / dist * 18;
    this.camera.shake = 9;
    ui.hitFlash.classList.add('on');
    setTimeout(() => ui.hitFlash.classList.remove('on'), 45);
    this.floatText(p.x, p.y - 34, `-${Math.round(damage)}`, '#ff7464', 16);
    this.burst(p.x, p.y, '#c85a4b', 12, 110);
    audio.hurt();
    if (p.hp <= 0) this.finish(false);
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.deathTime = .38;
    this.kills++;
    this.waveKills++;
    this.combo++;
    this.comboClock = 2.7;
    this.burst(enemy.x, enemy.y, enemy.boss ? enemy.color : '#779b89', enemy.boss ? 70 : enemy.elite ? 28 : 8, enemy.boss ? 280 : 105);
    this.ring(enemy.x, enemy.y, enemy.color, enemy.radius * .5, enemy.radius * (enemy.boss ? 3.2 : 1.8), enemy.boss ? .8 : .35);

    if (enemy.boss) {
      ui.bossHud.classList.add('hidden');
      for (let i = 0; i < 18; i++) this.dropPickup('xp', enemy.x + rand(-80, 80), enemy.y + rand(-80, 80), 9 + this.wave * 2);
      this.dropPickup('chest', enemy.x, enemy.y, 1);
      this.runJade += this.wave * 3;
      this.camera.shake = 20;
      this.announce('镇守已诛', `${enemy.name} · 神魂俱灭`);
      audio.level();
      if (this.wave === FINAL_WAVE) {
        window.setTimeout(() => { if (this.mode === 'running') this.finish(true); }, 1100);
      }
    } else {
      this.dropPickup('xp', enemy.x, enemy.y, enemy.xp * (enemy.elite ? 2.3 : 1));
      if (enemy.elite) {
        this.dropPickup('jade', enemy.x + rand(-16, 16), enemy.y + rand(-16, 16), 2);
        if (Math.random() < .35) this.dropPickup('heal', enemy.x, enemy.y, 1);
      } else if (Math.random() < .012 + this.passiveLevels.magnet * .002) {
        this.dropPickup('jade', enemy.x, enemy.y, 1);
      } else if (this.player.hp < this.player.maxHp * .45 && Math.random() < .009) {
        this.dropPickup('heal', enemy.x, enemy.y, 1);
      }
    }

    const target = 36 + this.wave * 24;
    if (!this.objectiveDone && this.waveKills >= target) {
      this.objectiveDone = true;
      const reward = 2 + this.wave;
      this.runJade += reward;
      this.floatText(this.player.x, this.player.y - 60, `天机达成 · 灵玉 +${reward}`, '#f0d67d', 17);
      audio.level();
    }
  }

  dropPickup(type, x, y, value) {
    const config = {
      xp: { radius: 6, color: '#78d7b5', life: 24 }, jade: { radius: 8, color: '#65e0b8', life: 30 },
      heal: { radius: 10, color: '#e28a72', life: 24 }, chest: { radius: 15, color: '#ebcf79', life: 40 }
    }[type];
    this.pickups.push({ type, x: x + rand(-5, 5), y: y + rand(-5, 5), value, phase: Math.random() * TAU, magnetized: false, remove: false, ...config });
  }

  gainXp(amount) {
    const p = this.player;
    p.xp += amount * p.xpMult;
    audio.tone(720, .045, 'sine', .008, 60, 'xp');
    let levels = 0;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = Math.round(20 + p.level * 7.5 + p.level ** 1.28 * 1.9);
      levels++;
    }
    if (levels) {
      this.pendingLevels += levels;
      this.openLevelUp();
    }
  }

  openLevelUp() {
    if (this.mode !== 'running' || this.pendingLevels <= 0) return;
    this.mode = 'levelup';
    this.rerolls = Math.max(this.rerolls, 1);
    this.rollUpgrades();
    ui.levelModal.classList.remove('hidden');
    audio.level();
  }

  rollUpgrades() {
    const pool = [];
    for (const [id, skill] of Object.entries(SKILLS)) if (this.skillLevels[id] < skill.max) pool.push({ type: 'skill', id });
    for (const [id, passive] of Object.entries(PASSIVES)) if (this.passiveLevels[id] < passive.max) pool.push({ type: 'passive', id });
    const choices = [];
    while (choices.length < 3 && pool.length) {
      const index = (Math.random() * pool.length) | 0;
      choices.push(pool.splice(index, 1)[0]);
    }
    if (choices.length < 3) choices.push({ type: 'heal', id: 'heal' });
    this.upgradeChoices = choices;
    ui.cards.innerHTML = choices.map((choice, index) => this.upgradeCardHTML(choice, index)).join('');
    $$('.upgrade-card').forEach((card, index) => card.addEventListener('click', () => this.chooseUpgrade(index)));
    ui.reroll.disabled = this.rerolls <= 0;
    ui.reroll.querySelector('span').textContent = this.rerolls;
  }

  upgradeCardHTML(choice, index) {
    if (choice.type === 'heal') {
      return `<button class="upgrade-card" data-index="${index}" style="--accent:#e99277;--accent-glow:rgba(233,146,119,.17)"><span class="card-index">0${index + 1}</span><span class="rarity">机缘</span><div class="upgrade-icon">愈<i></i></div><h3>灵泉洗髓</h3><span class="level-tag">气血回复</span><p>饮下秘境灵泉，洗去一身伤势</p><div class="delta">回复 <b>60%</b> 最大气血</div></button>`;
    }
    const data = choice.type === 'skill' ? SKILLS[choice.id] : PASSIVES[choice.id];
    const level = choice.type === 'skill' ? this.skillLevels[choice.id] : this.passiveLevels[choice.id];
    const isNew = level === 0;
    const desc = choice.type === 'skill' ? data.desc(level) : data.desc;
    const glow = data.color + '28';
    const delta = typeof data.delta === 'function' ? data.delta(level) : data.delta;
    return `<button class="upgrade-card" data-index="${index}" style="--accent:${data.color};--accent-glow:${glow}"><span class="card-index">0${index + 1}</span><span class="rarity">${data.rarity}</span><div class="upgrade-icon">${data.glyph}<i></i></div><h3>${data.name}</h3><span class="level-tag">${isNew ? '新得' : `第 ${level + 1} 重`}</span><p>${desc}</p><div class="delta">${delta}</div></button>`;
  }

  chooseUpgrade(index) {
    if (this.mode !== 'levelup') return;
    const choice = this.upgradeChoices[index];
    if (!choice) return;
    if (choice.type === 'skill') this.skillLevels[choice.id]++;
    else if (choice.type === 'passive') {
      this.passiveLevels[choice.id]++;
      this.applyPassive(choice.id);
    } else this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .6);
    this.pendingLevels--;
    ui.levelModal.classList.add('hidden');
    this.refreshSkillDock();
    this.burst(this.player.x, this.player.y, '#edda91', 28, 170);
    this.ring(this.player.x, this.player.y, '#edda91', 18, 120, .7);
    if (this.pendingLevels > 0) {
      window.setTimeout(() => { if (this.mode === 'levelup') { ui.levelModal.classList.remove('hidden'); this.rollUpgrades(); } }, 180);
    } else {
      this.mode = 'running';
      this.lastTime = performance.now();
    }
  }

  applyPassive(id) {
    const p = this.player;
    if (id === 'power') p.damageMult *= 1.14;
    if (id === 'vitality') { p.maxHp += 22; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .3); }
    if (id === 'speed') { p.speed *= 1.09; }
    if (id === 'magnet') { p.magnet += 45; p.xpMult *= 1.05; }
    if (id === 'crit') p.crit += .07;
    if (id === 'armor') p.armor += .07;
  }

  finish(victory) {
    if (this.mode === 'ended') return;
    this.mode = 'ended';
    save.jade += this.runJade;
    save.bestLevel = Math.max(save.bestLevel, this.player.level);
    save.bestTime = Math.max(save.bestTime, Math.floor(this.time));
    persist();
    ui.resultKicker.textContent = victory ? '劫尽道成' : '此劫未尽';
    ui.resultTitle.textContent = victory ? '羽化登仙' : '道消于此';
    ui.resultQuote.textContent = victory ? '一剑开天门，今日我为仙' : '大道五十，天衍四九，尚有一线生机';
    ui.resultSeal.innerHTML = victory ? '飞<br>升' : '渡<br>劫';
    ui.resultTime.textContent = formatTime(this.time);
    ui.resultKills.textContent = this.kills.toLocaleString();
    ui.resultLevel.textContent = realmFor(this.player.level);
    ui.resultJade.textContent = `+${this.runJade}`;
    ui.result.classList.remove('hidden');
    this.runJade = 0;
    if (victory) audio.level();
  }

  updateHUD(force = false) {
    if (!this.player) return;
    if (!force && this.frame % 3) return;
    const p = this.player;
    ui.realm.textContent = realmFor(p.level);
    ui.playerLevel.textContent = `LV.${p.level}`;
    ui.hpFill.style.width = `${clamp(p.hp / p.maxHp * 100, 0, 100)}%`;
    ui.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${Math.round(p.maxHp)}`;
    ui.qiFill.style.width = `${clamp((1 - p.dashCooldown / Math.max(1.25, 2.45 - this.passiveLevels.speed * .18)) * 100, 0, 100)}%`;
    ui.waveLabel.textContent = `第${['一', '二', '三', '四', '五', '六'][this.wave - 1]}劫`;
    ui.timer.textContent = formatTime(this.time);
    ui.waveFill.style.width = `${clamp(((this.time % WAVE_DURATION) / WAVE_DURATION) * 100, 0, 100)}%`;
    ui.kills.textContent = this.kills.toLocaleString();
    ui.runJade.textContent = this.runJade;
    ui.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpNeed}`;
    ui.xpFill.style.width = `${clamp(p.xp / p.xpNeed * 100, 0, 100)}%`;
    ui.nextRealm.textContent = p.xp / p.xpNeed > .72 ? '灵气盈满 · 即将突破' : '纳灵入体 · 淬炼道基';
    const target = 36 + this.wave * 24;
    ui.objectiveProgress.textContent = `${Math.min(this.waveKills, target)} / ${target}`;
    ui.objectiveText.textContent = this.objectiveDone ? '天机已应 · 奖励已得' : this.wave % 3 === 0 ? '在妖潮中存活并斩灭镇守' : '斩杀来袭妖物';
    ui.objectiveFill.style.width = `${clamp(this.waveKills / target * 100, 0, 100)}%`;
    ui.combo.classList.toggle('hidden', this.combo < 8);
    if (this.combo >= 8) {
      ui.combo.querySelector('b').textContent = this.combo;
      ui.combo.querySelector('span').textContent = this.combo > 80 ? '杀意凌天' : this.combo > 35 ? '剑势如虹' : '剑意正盛';
    }
  }

  refreshSkillDock() {
    const learned = Object.entries(this.skillLevels).filter(([, level]) => level > 0);
    const slots = Array.from({ length: 6 }, (_, index) => learned[index] || null);
    ui.dock.innerHTML = slots.map((entry) => {
      if (!entry) return '<div class="skill-slot empty"><span class="skill-glyph">·</span></div>';
      const [id, level] = entry, skill = SKILLS[id];
      return `<div class="skill-slot" title="${skill.name} · 第 ${level} 重" style="--skill-color:${skill.color}"><span class="skill-glyph" style="color:${skill.color}">${skill.glyph}</span><span class="skill-level">${level}</span><span class="skill-name">${skill.name}</span></div>`;
    }).join('');
  }

  announce(title, subtitle) {
    const token = Symbol('announcement');
    this.announcementToken = token;
    ui.announcement.querySelector('strong').textContent = title;
    ui.announcement.querySelector('small').textContent = subtitle;
    ui.announcement.classList.add('show');
    setTimeout(() => { if (this.announcementToken === token) ui.announcement.classList.remove('show'); }, 2100);
  }

  particle(x, y, color, size, life, vx = 0, vy = 0, gravity = 0) {
    if (this.particles.length > 1000) return;
    this.particles.push({ x, y, color, size, life, maxLife: life, vx, vy, gravity });
  }

  burst(x, y, color, count = 12, speed = 100) {
    const actual = Math.min(count, 1000 - this.particles.length);
    for (let i = 0; i < actual; i++) {
      const angle = Math.random() * TAU;
      const velocity = rand(speed * .18, speed);
      this.particle(x + rand(-4, 4), y + rand(-4, 4), color, rand(1.5, count > 30 ? 6 : 4), rand(.3, .85), Math.cos(angle) * velocity, Math.sin(angle) * velocity, rand(5, 55));
    }
  }

  ring(x, y, color, from, to, life) {
    this.effects.push({ type: 'ring', x, y, color, from, to, life, maxLife: life });
  }

  floatText(x, y, text, color, size = 12) {
    if (this.texts.length > 150) return;
    this.texts.push({ x, y, text, color, size, life: .75, maxLife: .75, speed: rand(28, 45), vx: rand(-5, 5) });
  }

  render() {
    const menu = this.mode === 'menu';
    if (menu) this.ambientTime += .016;
    const cameraX = menu ? Math.sin(this.ambientTime * .08) * 110 : this.camera.x;
    const cameraY = menu ? Math.cos(this.ambientTime * .06) * 55 : this.camera.y;
    const shakeX = menu ? 0 : rand(-this.camera.shake, this.camera.shake);
    const shakeY = menu ? 0 : rand(-this.camera.shake, this.camera.shake);
    this.renderBackground(cameraX, cameraY, menu);
    if (menu) {
      this.renderMenuWisps();
      return;
    }
    ctx.save();
    ctx.translate(viewWidth / 2 - cameraX + shakeX, viewHeight / 2 - cameraY + shakeY);
    this.renderGroundEffects();
    this.renderPickups();
    const entities = [...this.enemies.filter((e) => !e.remove), this.player].sort((a, b) => a.y - b.y);
    for (const entity of entities) entity === this.player ? this.renderPlayer() : this.renderEnemy(entity);
    this.renderProjectiles();
    this.renderOrbs();
    this.renderParticles();
    this.renderAirEffects();
    this.renderTexts();
    ctx.restore();
  }

  renderBackground(cameraX, cameraY, menu) {
    const gradient = ctx.createRadialGradient(viewWidth * .5, viewHeight * .45, 20, viewWidth * .5, viewHeight * .5, Math.max(viewWidth, viewHeight) * .76);
    gradient.addColorStop(0, menu ? '#163128' : '#122a22');
    gradient.addColorStop(.55, '#0a1b17');
    gradient.addColorStop(1, '#040c0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.save();
    ctx.translate(viewWidth / 2 - cameraX, viewHeight / 2 - cameraY);
    const grid = 92;
    const minX = Math.floor((cameraX - viewWidth / 2) / grid) - 1;
    const maxX = Math.ceil((cameraX + viewWidth / 2) / grid) + 1;
    const minY = Math.floor((cameraY - viewHeight / 2) / grid) - 1;
    const maxY = Math.ceil((cameraY + viewHeight / 2) / grid) + 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(124, 185, 157, .025)';
    ctx.beginPath();
    for (let x = minX * grid; x <= maxX * grid; x += grid) { ctx.moveTo(x, minY * grid); ctx.lineTo(x, maxY * grid); }
    for (let y = minY * grid; y <= maxY * grid; y += grid) { ctx.moveTo(minX * grid, y); ctx.lineTo(maxX * grid, y); }
    ctx.stroke();

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const h = hash2(gx, gy);
        if (h < .22) this.renderGrass(gx * grid + hash2(gx + 4, gy) * 70, gy * grid + hash2(gx, gy + 7) * 70, h);
        else if (h > .91) this.renderRune(gx * grid + 40, gy * grid + 40, h);
        else if (h > .76 && h < .8) this.renderRock(gx * grid + 40, gy * grid + 45, h);
      }
    }
    ctx.restore();

    const fog = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
    fog.addColorStop(0, 'rgba(101, 162, 135, .025)');
    fog.addColorStop(.5, 'rgba(255,255,255,0)');
    fog.addColorStop(1, 'rgba(70, 136, 111, .035)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  renderGrass(x, y, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = `rgba(88, 139, 113, ${.13 + seed * .1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const offset = i * 4 - 8;
      ctx.beginPath(); ctx.moveTo(offset, 8); ctx.quadraticCurveTo(offset + Math.sin(seed * 90 + i) * 5, -2, offset + randStatic(seed + i) * 7 - 3, -11 - randStatic(seed * 2 + i) * 7); ctx.stroke();
    }
    ctx.restore();
  }

  renderRune(x, y, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(seed * TAU); ctx.globalAlpha = .08;
    ctx.strokeStyle = '#9dd9bc'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.stroke();
    ctx.restore();
  }

  renderRock(x, y, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(seed); ctx.fillStyle = 'rgba(44, 68, 58, .28)';
    ctx.beginPath(); ctx.moveTo(-13, 7); ctx.lineTo(-8, -8); ctx.lineTo(5, -13); ctx.lineTo(15, 3); ctx.lineTo(8, 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(142, 176, 156, .08)'; ctx.stroke(); ctx.restore();
  }

  renderMenuWisps() {
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const x = ((i * 193 + this.ambientTime * (8 + i % 4)) % (viewWidth + 180)) - 90;
      const y = viewHeight * (.1 + ((i * 47) % 78) / 100) + Math.sin(this.ambientTime * .5 + i) * 13;
      const a = .12 + Math.sin(this.ambientTime + i) * .04;
      ctx.fillStyle = `rgba(131, 224, 188, ${a})`;
      ctx.shadowColor = '#73d5b2'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x, y, 1.2 + i % 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  renderGroundEffects() {
    for (const effect of this.effects) {
      const t = 1 - effect.life / effect.maxLife;
      if (effect.type === 'flame') {
        ctx.save(); ctx.translate(effect.x, effect.y); ctx.globalAlpha = clamp(effect.life / .5, 0, 1) * .7;
        const g = ctx.createRadialGradient(0, 0, 5, 0, 0, effect.radius);
        g.addColorStop(0, 'rgba(255,145,78,.27)'); g.addColorStop(.55, 'rgba(198,67,44,.12)'); g.addColorStop(1, 'rgba(91,18,15,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, effect.radius, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,128,78,.28)'; ctx.lineWidth = 2; ctx.setLineDash([12, 17]); ctx.rotate(this.time * .35); ctx.beginPath(); ctx.arc(0, 0, effect.radius * .78, 0, TAU); ctx.stroke(); ctx.restore();
      } else if (effect.type === 'danger') {
        const pulse = .45 + Math.sin(this.time * 26) * .25;
        ctx.save(); ctx.translate(effect.x, effect.y); ctx.globalAlpha = clamp(effect.life / .16, 0, 1);
        ctx.fillStyle = `rgba(180,52,42,${effect.life < .2 ? .45 : .08})`; ctx.beginPath(); ctx.arc(0, 0, effect.radius, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,113,82,${pulse})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(0, 0, effect.radius, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-effect.radius, 0); ctx.lineTo(effect.radius, 0); ctx.moveTo(0, -effect.radius); ctx.lineTo(0, effect.radius); ctx.stroke(); ctx.restore();
      } else if (effect.type === 'frost') {
        ctx.save(); ctx.translate(effect.x, effect.y); ctx.globalAlpha = (1 - t) * .6;
        ctx.strokeStyle = '#b2efff'; ctx.lineWidth = 2; const r = effect.radius * (.35 + t * .65);
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore();
      } else if (effect.type === 'ring') {
        ctx.save(); ctx.globalAlpha = (1 - t) ** .7; ctx.strokeStyle = effect.color; ctx.lineWidth = 2 + (1 - t) * 2; ctx.shadowColor = effect.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, lerp(effect.from, effect.to, t), 0, TAU); ctx.stroke(); ctx.restore();
      }
    }
  }

  renderPickups() {
    for (const item of this.pickups) {
      const bob = Math.sin(item.phase * 4) * 3;
      ctx.save(); ctx.translate(item.x, item.y + bob); ctx.shadowColor = item.color; ctx.shadowBlur = item.type === 'chest' ? 22 : 11;
      if (item.type === 'xp') {
        ctx.fillStyle = item.color; ctx.rotate(item.phase); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
      } else if (item.type === 'jade') {
        ctx.fillStyle = '#70dcb8'; ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(8,-2); ctx.lineTo(5,8); ctx.lineTo(-5,8); ctx.lineTo(-8,-2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c8ffec'; ctx.stroke();
      } else if (item.type === 'heal') {
        ctx.fillStyle = '#d3675c'; ctx.beginPath(); ctx.arc(-4,-2,5,0,TAU); ctx.arc(4,-2,5,0,TAU); ctx.lineTo(0,9); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#927233'; ctx.fillRect(-13,-9,26,19); ctx.strokeStyle = '#e8c967'; ctx.lineWidth = 2; ctx.strokeRect(-13,-9,26,19); ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(0,10); ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderPlayer() {
    const p = this.player;
    const hero = this.lastHero;
    const bob = Math.sin(p.anim * 6) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.invuln > 0 && Math.floor(p.invuln * 24) % 2) ctx.globalAlpha = .48;

    // Breath-like aura and rotating cultivation seal.
    ctx.save(); ctx.rotate(-p.anim * .22); ctx.strokeStyle = hero.color + '3d'; ctx.lineWidth = 1; ctx.setLineDash([3, 11]);
    ctx.beginPath(); ctx.arc(0, -4, 29 + Math.sin(p.anim * 2) * 2, 0, TAU); ctx.stroke(); ctx.restore();
    const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 42);
    aura.addColorStop(0, hero.color + '28'); aura.addColorStop(1, hero.color + '00');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(0, 18, 18, 7, 0, 0, TAU); ctx.fill();
    ctx.rotate(p.facing + Math.PI / 2);
    // Floating sword carried behind the cultivator.
    ctx.save(); ctx.translate(-17, 2); ctx.rotate(-.18); ctx.strokeStyle = '#d9c77e'; ctx.lineWidth = 2; ctx.shadowColor = hero.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, 17); ctx.lineTo(0, -19); ctx.stroke(); ctx.fillStyle = '#e8e0bd'; ctx.beginPath(); ctx.moveTo(0,-25); ctx.lineTo(-3,-17); ctx.lineTo(3,-17); ctx.closePath(); ctx.fill(); ctx.restore();

    // Robe, sleeves, head and hair are all code-drawn so they stay crisp at any size.
    ctx.fillStyle = hero.id === 'yan' ? '#75433d' : hero.id === 'lei' ? '#3f526e' : '#315e50';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-13, 5, -12, 20); ctx.lineTo(0, 15); ctx.lineTo(12, 20); ctx.quadraticCurveTo(13, 5, 0, -6); ctx.fill();
    ctx.fillStyle = hero.color + 'aa'; ctx.beginPath(); ctx.moveTo(-5,-3); ctx.lineTo(0,16); ctx.lineTo(5,-3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8c4a9'; ctx.beginPath(); ctx.arc(0,-12,7,0,TAU); ctx.fill();
    ctx.fillStyle = '#18221f'; ctx.beginPath(); ctx.arc(0,-15,7.2,Math.PI,TAU); ctx.lineTo(6,-8); ctx.quadraticCurveTo(0,-12,-6,-8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hero.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11,2); ctx.lineTo(-19,8); ctx.moveTo(11,2); ctx.lineTo(19,8); ctx.stroke();
    ctx.restore();
  }

  renderOrbs() {
    const level = this.skillLevels.orb;
    if (!level) return;
    const count = Math.min(2 + level, 7), radius = 66 + level * 4, speed = .9 + level * .11;
    for (let i = 0; i < count; i++) {
      const angle = this.time * speed + i * TAU / count;
      const x = this.player.x + Math.cos(angle) * radius;
      const y = this.player.y + Math.sin(angle) * radius;
      ctx.save(); ctx.translate(x, y); ctx.shadowColor = '#f3dc8d'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#e9d184'; ctx.beginPath(); ctx.arc(0,0,7,0,TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,193,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0,11 + Math.sin(this.time * 4 + i) * 2,0,TAU); ctx.stroke();
      ctx.restore();
    }
  }

  renderEnemy(enemy) {
    const death = enemy.dead ? clamp(enemy.deathTime / .38, 0, 1) : 1;
    const bob = Math.sin(enemy.phase * 4 + enemy.seed) * (enemy.type === 'wisp' ? 5 : 1.5);
    ctx.save(); ctx.translate(enemy.x, enemy.y + bob); ctx.globalAlpha = death;
    if (enemy.dead) ctx.scale(1 + (1 - death) * .5, death);
    if (enemy.freeze > 0) { ctx.shadowColor = '#9fe9ff'; ctx.shadowBlur = 15; }
    if (enemy.hitFlash > 0) { ctx.shadowColor = '#fff5d2'; ctx.shadowBlur = 18; }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, enemy.radius * .65, enemy.radius * .9, enemy.radius * .32, 0, 0, TAU); ctx.fill();

    if (enemy.boss) this.drawBoss(enemy);
    else if (enemy.type === 'wisp') this.drawWisp(enemy);
    else if (enemy.type === 'wolf') this.drawWolf(enemy);
    else if (enemy.type === 'spider') this.drawSpider(enemy);
    else if (enemy.type === 'cultist') this.drawCultist(enemy);
    else this.drawBrute(enemy);

    if (enemy.freeze > 0) {
      ctx.strokeStyle = 'rgba(171,238,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0,0,enemy.radius + 4,0,TAU); ctx.stroke();
    }
    if (enemy.elite && !enemy.boss) {
      ctx.save(); ctx.rotate(this.time); ctx.strokeStyle = '#e2bd68'; ctx.setLineDash([3,6]); ctx.beginPath(); ctx.arc(0,0,enemy.radius + 7,0,TAU); ctx.stroke(); ctx.restore();
    }
    if ((enemy.elite || enemy.boss || enemy.hp < enemy.maxHp) && !enemy.dead) {
      const w = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(-w/2, -enemy.radius - 12, w, 3);
      ctx.fillStyle = enemy.boss ? '#e36853' : enemy.elite ? '#dfbd69' : '#a46b5e'; ctx.fillRect(-w/2, -enemy.radius - 12, w * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
    }
    ctx.restore();
  }

  drawWisp(enemy) {
    const pulse = 1 + Math.sin(enemy.phase * 7) * .09;
    ctx.scale(pulse, pulse); ctx.shadowColor = enemy.color; ctx.shadowBlur = 17;
    const g = ctx.createRadialGradient(0,-2,1,0,0,enemy.radius);
    g.addColorStop(0,'#d8ffec'); g.addColorStop(.3,enemy.color); g.addColorStop(1,'rgba(63,145,117,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,enemy.radius,0,TAU); ctx.fill();
    ctx.fillStyle = '#17372d'; ctx.beginPath(); ctx.arc(-4,-1,1.5,0,TAU); ctx.arc(4,-1,1.5,0,TAU); ctx.fill();
    ctx.strokeStyle = enemy.color + 'aa'; ctx.beginPath(); ctx.moveTo(-5,9); ctx.quadraticCurveTo(-9,18,-2,23); ctx.moveTo(4,9); ctx.quadraticCurveTo(11,17,4,24); ctx.stroke();
  }

  drawWolf(enemy) {
    const face = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    ctx.rotate(face + Math.PI / 2); ctx.fillStyle = enemy.hitFlash > 0 ? '#f1e5cd' : enemy.color;
    ctx.beginPath(); ctx.ellipse(0,3,enemy.radius*.72,enemy.radius,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(-11,-21); ctx.lineTo(-2,-14); ctx.moveTo(8,-8); ctx.lineTo(11,-21); ctx.lineTo(2,-14); ctx.fill();
    ctx.fillStyle = '#e4c26e'; ctx.beginPath(); ctx.arc(-5,-8,2,0,TAU); ctx.arc(5,-8,2,0,TAU); ctx.fill();
    ctx.strokeStyle = '#596f67'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0,14); ctx.quadraticCurveTo(18,20,17,5); ctx.stroke();
  }

  drawSpider(enemy) {
    ctx.strokeStyle = enemy.hitFlash > 0 ? '#f1d8cf' : enemy.color; ctx.lineWidth = 3;
    for (let i=0;i<4;i++) { const y=-8+i*5; ctx.beginPath(); ctx.moveTo(-7,y); ctx.lineTo(-18-i*2,y-6+i*4); ctx.lineTo(-23-i,y+2+i*3); ctx.moveTo(7,y); ctx.lineTo(18+i*2,y-6+i*4); ctx.lineTo(23+i,y+2+i*3); ctx.stroke(); }
    ctx.fillStyle = '#563d40'; ctx.beginPath(); ctx.ellipse(0,4,13,16,0,0,TAU); ctx.fill();
    ctx.fillStyle = '#91706f'; ctx.beginPath(); ctx.arc(0,-9,10,0,TAU); ctx.fill();
    ctx.fillStyle = '#f1a15f'; for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-5+i*5,-11,1.5,0,TAU);ctx.fill();}
  }

  drawCultist(enemy) {
    ctx.fillStyle = '#352c29'; ctx.beginPath(); ctx.moveTo(0,-17); ctx.lineTo(-15,18); ctx.lineTo(15,18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = enemy.hitFlash > 0 ? '#eadfc8' : enemy.color; ctx.beginPath(); ctx.arc(0,-10,9,0,TAU); ctx.fill();
    ctx.fillStyle = '#171513'; ctx.beginPath(); ctx.arc(0,-12,9,Math.PI,TAU); ctx.lineTo(9,-6); ctx.lineTo(-9,-6); ctx.fill();
    ctx.strokeStyle = '#c89057'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(12,-3); ctx.lineTo(17,18); ctx.stroke();
    ctx.fillStyle='#e8a85f';ctx.beginPath();ctx.arc(12,-5,3,0,TAU);ctx.fill();
  }

  drawBrute(enemy) {
    ctx.fillStyle = enemy.hitFlash > 0 ? '#e4d8c4' : enemy.color; ctx.beginPath(); ctx.ellipse(0,3,22,27,0,0,TAU); ctx.fill();
    ctx.fillStyle='#4f4037';ctx.beginPath();ctx.arc(0,-17,16,0,TAU);ctx.fill();
    ctx.strokeStyle='#d5bd82';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,-27);ctx.lineTo(-17,-39);ctx.moveTo(10,-27);ctx.lineTo(17,-39);ctx.stroke();
    ctx.fillStyle='#e0bb64';ctx.beginPath();ctx.arc(-6,-18,2.5,0,TAU);ctx.arc(6,-18,2.5,0,TAU);ctx.fill();
    ctx.strokeStyle='#3f302b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(-27,18);ctx.moveTo(17,0);ctx.lineTo(27,18);ctx.stroke();
  }

  drawBoss(enemy) {
    const pulse = 1 + Math.sin(enemy.phase * 2.4) * .03;
    ctx.scale(pulse,pulse);
    const aura = ctx.createRadialGradient(0,0,10,0,0,enemy.radius*1.75);
    aura.addColorStop(0,enemy.color+'4d');aura.addColorStop(.7,enemy.color+'14');aura.addColorStop(1,enemy.color+'00');
    ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,enemy.radius*1.75,0,TAU);ctx.fill();
    ctx.save();ctx.rotate(-enemy.phase*.14);ctx.strokeStyle=enemy.color+'88';ctx.lineWidth=2;ctx.setLineDash([11,14]);ctx.beginPath();ctx.arc(0,0,enemy.radius+13,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle=enemy.hitFlash>0?'#faead4':'#3a2728';ctx.beginPath();ctx.ellipse(0,4,enemy.radius*.76,enemy.radius*.92,0,0,TAU);ctx.fill();
    ctx.fillStyle=enemy.color;ctx.beginPath();ctx.arc(0,-enemy.radius*.38,enemy.radius*.48,0,TAU);ctx.fill();
    ctx.fillStyle='#1a1315';ctx.beginPath();ctx.moveTo(-enemy.radius*.35,-enemy.radius*.55);ctx.lineTo(-enemy.radius*.6,-enemy.radius*1.03);ctx.lineTo(-enemy.radius*.05,-enemy.radius*.72);ctx.moveTo(enemy.radius*.35,-enemy.radius*.55);ctx.lineTo(enemy.radius*.6,-enemy.radius*1.03);ctx.lineTo(enemy.radius*.05,-enemy.radius*.72);ctx.fill();
    ctx.fillStyle='#ffe08a';ctx.shadowColor='#ff8b5d';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(-enemy.radius*.18,-enemy.radius*.42,4,0,TAU);ctx.arc(enemy.radius*.18,-enemy.radius*.42,4,0,TAU);ctx.fill();
    ctx.fillStyle='#e7ccb0';ctx.font=`${enemy.radius*.42}px 'Ma Shan Zheng'`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(enemy.glyph,0,enemy.radius*.18);
  }

  renderProjectiles() {
    for (const shot of this.projectiles) {
      ctx.save();ctx.translate(shot.x,shot.y);ctx.shadowColor=shot.color;ctx.shadowBlur=14;
      if (shot.type==='sword') {
        ctx.rotate(shot.angle+Math.PI/2);ctx.strokeStyle='#e9e5d0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,11);ctx.lineTo(0,-13);ctx.stroke();ctx.fillStyle=shot.color;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-3,-11);ctx.lineTo(3,-11);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-5,8);ctx.lineTo(5,8);ctx.stroke();
      } else {
        const g=ctx.createRadialGradient(0,0,1,0,0,shot.radius*1.8);g.addColorStop(0,'#fff0cc');g.addColorStop(.25,shot.color);g.addColorStop(1,shot.color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,shot.radius*1.8,0,TAU);ctx.fill();
        ctx.strokeStyle=shot.color;ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(0,0,shot.radius+Math.sin(this.time*9)*2,0,TAU);ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderParticles() {
    ctx.save();
    for(const p of this.particles){const a=clamp(p.life/p.maxLife,0,1);ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.size>3?6:0;ctx.beginPath();ctx.arc(p.x,p.y,p.size*a,0,TAU);ctx.fill();}
    ctx.restore();
  }

  renderAirEffects() {
    for (const effect of this.effects) {
      const t=1-effect.life/effect.maxLife;
      if(effect.type==='lightning'){
        ctx.save();ctx.globalAlpha=clamp(effect.life/effect.maxLife,0,1);ctx.strokeStyle=effect.color;ctx.shadowColor=effect.color;ctx.shadowBlur=15;
        for(let layer=0;layer<2;layer++){ctx.lineWidth=layer?1:3;ctx.beginPath();ctx.moveTo(effect.x,effect.y);const parts=8;for(let i=1;i<parts;i++){const f=i/parts;const px=lerp(effect.x,effect.x2,f);const py=lerp(effect.y,effect.y2,f);const j=Math.sin(effect.seed*13+i*19+this.frame)*10*(layer?1.2:1);ctx.lineTo(px+Math.cos(i)*j,py+Math.sin(i*2)*j);}ctx.lineTo(effect.x2,effect.y2);ctx.stroke();}ctx.restore();
      } else if(effect.type==='slash'){
        ctx.save();ctx.translate(effect.x,effect.y);ctx.rotate(effect.angle);ctx.globalAlpha=1-t;ctx.strokeStyle=effect.color;ctx.shadowColor=effect.color;ctx.shadowBlur=10;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,22,-.8,.8);ctx.stroke();ctx.restore();
      } else if(effect.type==='swordfall'){
        ctx.save();ctx.translate(effect.x,effect.y);const visible=effect.delay>0?clamp(1-effect.delay/.5,0,.7):clamp(effect.life/.35,0,1);ctx.globalAlpha=visible;ctx.shadowColor=effect.color;ctx.shadowBlur=15;ctx.strokeStyle='#f2e7bc';ctx.lineWidth=3;const lift=effect.struck?0:Math.max(0,effect.delay)*230;ctx.beginPath();ctx.moveTo(0,-8-lift);ctx.lineTo(0,-70-lift);ctx.stroke();ctx.fillStyle=effect.color;ctx.beginPath();ctx.moveTo(0,-82-lift);ctx.lineTo(-5,-68-lift);ctx.lineTo(5,-68-lift);ctx.closePath();ctx.fill();ctx.restore();
      }
    }
  }

  renderTexts() {
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    for(const text of this.texts){const a=clamp(text.life/text.maxLife,0,1);ctx.globalAlpha=a;ctx.fillStyle=text.color;ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=4;ctx.font=`700 ${text.size}px 'Noto Serif SC',serif`;ctx.fillText(text.text,text.x,text.y);}
    ctx.restore();
  }
}

function randStatic(n) {
  return Math.abs(Math.sin(n * 91.345 + 45.21) * 47453.5453) % 1;
}

function hash2(x, y) {
  return randStatic(x * 127.1 + y * 311.7);
}

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let dpr = Math.min(2, window.devicePixelRatio || 1);
const game = new Game();
if (import.meta.env.DEV) globalThis.__WANJIE_DEBUG__ = game;

function resizeCanvas() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function renderHeroChoices() {
  ui.heroList.innerHTML = HEROES.map((hero) => `
    <button class="hero-choice ${selectedHero.id === hero.id ? 'selected' : ''}" data-hero="${hero.id}" style="--hero-color:${hero.color}">
      <span class="hero-emblem" style="color:${hero.color}">${hero.glyph}</span>
      <span><strong>${hero.name}</strong><small>${hero.tagline}</small></span>
      <i class="hero-check">✓</i>
    </button>`).join('');
  $$('.hero-choice').forEach((button) => button.addEventListener('click', () => {
    selectedHero = HEROES.find((hero) => hero.id === button.dataset.hero) || HEROES[0];
    renderHeroChoices();
    audio.tone(510, .08, 'sine', .02, 90, 'select');
  }));
}

function refreshSaveUI() {
  ui.bestLevel.textContent = realmFor(save.bestLevel || 1);
  ui.bestTime.textContent = formatTime(save.bestTime || 0);
  ui.jadeCount.textContent = save.jade || 0;
  ui.caveJade.textContent = save.jade || 0;
  renderMeta();
}

function renderMeta() {
  if (!ui.metaList) return;
  ui.metaList.innerHTML = Object.entries(META).map(([id, item]) => {
    const level = save.meta[id] || 0;
    const cost = META_COST[level] ?? 0;
    const full = level >= item.max;
    return `<div class="meta-item"><div class="meta-icon">${item.glyph}</div><h3>${item.name}</h3><p>${item.desc}</p><button data-meta="${id}" ${full || save.jade < cost ? 'disabled' : ''}>${full ? '已参悟圆满' : `参悟 · ◆ ${cost}`}</button><div class="meta-level">${'◆'.repeat(level)}${'◇'.repeat(item.max - level)} · ${level}/${item.max}</div></div>`;
  }).join('');
  $$('[data-meta]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.meta;
    const level = save.meta[id] || 0;
    const cost = META_COST[level];
    if (level >= META[id].max || save.jade < cost) return;
    save.jade -= cost;
    save.meta[id] = level + 1;
    persist();
    audio.level();
  }));
}

function closeAllModals() {
  [ui.levelModal, ui.pauseModal, ui.result, ui.caveModal, ui.guideModal].forEach((modal) => modal.classList.add('hidden'));
}

function openMenuModal(modal) {
  closeAllModals();
  modal.classList.remove('hidden');
}

function bindEvents() {
  window.addEventListener('resize', resizeCanvas);
  ui.start.addEventListener('click', () => game.start(selectedHero));
  ui.cave.addEventListener('click', () => { refreshSaveUI(); openMenuModal(ui.caveModal); });
  ui.guide.addEventListener('click', () => openMenuModal(ui.guideModal));
  ui.soundMenu.addEventListener('click', () => audio.toggle());
  ui.soundPause.addEventListener('click', () => audio.toggle());
  ui.pause.addEventListener('click', () => game.togglePause(true));
  ui.resume.addEventListener('click', () => game.togglePause(false));
  ui.restart.addEventListener('click', () => game.start(game.lastHero));
  ui.quit.addEventListener('click', () => game.returnHome());
  ui.again.addEventListener('click', () => game.start(game.lastHero));
  ui.home.addEventListener('click', () => game.returnHome());
  ui.reroll.addEventListener('click', () => {
    if (game.mode !== 'levelup' || game.rerolls <= 0) return;
    game.rerolls--;
    game.rollUpgrades();
    audio.tone(360, .16, 'triangle', .02, 260, 'reroll');
  });
  $$('[data-close]').forEach((button) => button.addEventListener('click', () => {
    const modal = document.getElementById(button.dataset.close);
    modal?.classList.add('hidden');
  }));

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
    if (event.repeat && event.code === 'Space') return;
    game.keys.add(event.code);
    if (event.code === 'Space') game.dash();
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
      if (!ui.caveModal.classList.contains('hidden') || !ui.guideModal.classList.contains('hidden')) closeAllModals();
      else game.togglePause();
    }
    if (game.mode === 'levelup' && ['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)) {
      const index = Number(event.code.at(-1)) - 1;
      game.chooseUpgrade(index);
    }
    if (game.mode === 'menu' && event.code === 'Enter') game.start(selectedHero);
  });
  window.addEventListener('keyup', (event) => game.keys.delete(event.code));
  window.addEventListener('blur', () => game.keys.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'running') game.togglePause(true); });

  let joyRect = null;
  ui.joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    game.joystick.pointer = event.pointerId;
    joyRect = ui.joystick.getBoundingClientRect();
    ui.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event, joyRect);
  });
  ui.joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === game.joystick.pointer) updateJoystick(event, joyRect);
  });
  const endJoy = (event) => {
    if (event.pointerId !== game.joystick.pointer) return;
    game.joystick.pointer = null;
    game.joystick.x = 0; game.joystick.y = 0;
    ui.joystick.style.setProperty('--jx', '0px'); ui.joystick.style.setProperty('--jy', '0px');
  };
  ui.joystick.addEventListener('pointerup', endJoy);
  ui.joystick.addEventListener('pointercancel', endJoy);
  ui.dashTouch.addEventListener('pointerdown', (event) => { event.preventDefault(); game.dash(); });

  window.addEventListener('pointermove', (event) => {
    ui.cursorGlow.style.left = `${event.clientX}px`;
    ui.cursorGlow.style.top = `${event.clientY}px`;
  }, { passive: true });
  document.addEventListener('contextmenu', (event) => event.preventDefault());
}

function updateJoystick(event, rect) {
  if (!rect) return;
  let dx = event.clientX - (rect.left + rect.width / 2);
  let dy = event.clientY - (rect.top + rect.height / 2);
  const max = 35;
  const length = Math.hypot(dx, dy);
  if (length > max) { dx = dx / length * max; dy = dy / length * max; }
  game.joystick.x = dx / max;
  game.joystick.y = dy / max;
  ui.joystick.style.setProperty('--jx', `${dx}px`);
  ui.joystick.style.setProperty('--jy', `${dy}px`);
}

function loop(now) {
  // Keep simulation time honest even on low-end/mobile devices. Rendering may
  // drop frames, but combat is advanced in small substeps to avoid tunnelling.
  let dt = Math.min(.25, Math.max(0, (now - game.lastTime) / 1000));
  game.lastTime = now;
  while (dt > 0) {
    const step = Math.min(.034, dt);
    game.update(step);
    dt -= step;
    if (game.mode !== 'running') break;
  }
  game.render();
  requestAnimationFrame(loop);
}

resizeCanvas();
renderHeroChoices();
refreshSaveUI();
bindEvents();
requestAnimationFrame(loop);
