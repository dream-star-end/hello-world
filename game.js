/**
 * NEON SERPENT — a sci-fi themed Snake game.
 * Pure vanilla JS + Canvas2D, no build step, no dependencies.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------
  const COLS = 28;
  const ROWS = 18;
  const BASE_MOVE_INTERVAL = 140; // ms per grid step at sector 1
  const MIN_MOVE_INTERVAL = 72;
  const SCORE_PER_SECTOR = 50;
  const NORMAL_FOOD_SCORE = 10;
  const BONUS_FOOD_SCORE = 25;
  const BONUS_FOOD_CHANCE = 0.18;
  const BONUS_FOOD_TTL = 6500; // ms
  const HIGH_SCORE_KEY = 'neonSerpentHighScore';

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------
  const arenaEl = document.getElementById('arena');
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const bgCanvas = document.getElementById('bgCanvas');
  const bgCtx = bgCanvas.getContext('2d');

  const hudScoreEl = document.getElementById('hudScore');
  const hudLengthEl = document.getElementById('hudLength');
  const hudSectorEl = document.getElementById('hudSector');
  const hudEnergyEl = document.getElementById('hudEnergy');
  const hudBestEl = document.getElementById('hudBest');
  const btnPauseToggle = document.getElementById('btnPauseToggle');

  const screenStart = document.getElementById('screenStart');
  const screenPause = document.getElementById('screenPause');
  const screenOver = document.getElementById('screenOver');
  const startBestEl = document.getElementById('startBest');
  const overScoreEl = document.getElementById('overScore');
  const overBestEl = document.getElementById('overBest');
  const overReasonEl = document.getElementById('overReason');
  const newRecordEl = document.getElementById('newRecord');

  // ---------------------------------------------------------------------
  // Audio (tiny synth beeps, no external assets)
  // ---------------------------------------------------------------------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } else if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
  function beep(freq, duration, type = 'sine', gain = 0.06, delay = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(audioCtx.destination);
    const t0 = audioCtx.currentTime + delay;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  const sfx = {
    eat: () => beep(880, 0.09, 'triangle', 0.08),
    bonus: () => { beep(660, 0.08, 'square', 0.07); beep(990, 0.09, 'square', 0.06, 0.06); },
    turn: () => beep(220, 0.02, 'sine', 0.02),
    sector: () => { beep(523, 0.08, 'sine', 0.06); beep(784, 0.12, 'sine', 0.06, 0.08); },
    death: () => { beep(180, 0.35, 'sawtooth', 0.09); beep(90, 0.4, 'sawtooth', 0.08, 0.08); },
    start: () => { beep(440, 0.06, 'sine', 0.05); beep(660, 0.1, 'sine', 0.05, 0.07); }
  };

  // ---------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------
  let cell = 20;
  let logicalWidth = COLS * cell;
  let logicalHeight = ROWS * cell;

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;

    bgCanvas.width = Math.round(window.innerWidth * dpr);
    bgCanvas.height = Math.round(window.innerHeight * dpr);
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    regenerateStars();

    const rect = arenaEl.getBoundingClientRect();
    logicalWidth = rect.width;
    logicalHeight = rect.height;
    gameCanvas.width = Math.round(rect.width * dpr);
    gameCanvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = logicalWidth / COLS;
  }

  // ---------------------------------------------------------------------
  // Starfield background
  // ---------------------------------------------------------------------
  let stars = [];
  function regenerateStars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = Math.round((w * h) / 6000);
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.5 + 0.15,
      drift: Math.random() * 6 + 2
    }));
  }

  function renderBackground(time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    bgCtx.clearRect(0, 0, w, h);

    const grad = bgCtx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.8);
    grad.addColorStop(0, 'rgba(20, 30, 60, 0.55)');
    grad.addColorStop(0.5, 'rgba(6, 8, 20, 0.4)');
    grad.addColorStop(1, 'rgba(2, 2, 8, 0)');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, w, h);

    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time / 600 / s.speed + s.phase);
      bgCtx.globalAlpha = 0.25 + twinkle * 0.75;
      bgCtx.fillStyle = '#bdf6ff';
      bgCtx.beginPath();
      bgCtx.arc(s.x, (s.y + time * 0.01 * s.speed) % h, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    }
    bgCtx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------
  let state = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'
  let snake = [];
  let direction = 'right';
  let directionQueue = [];
  let food = null;
  let particles = [];
  let score = 0;
  let sector = 1;
  let moveInterval = BASE_MOVE_INTERVAL;
  let accumulator = 0;
  let lastTime = 0;
  let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;

  // The serpent waits on the launch pad until the pilot steers or the
  // countdown runs out, so nobody ever crashes before they can react.
  const LAUNCH_GRACE_MS = 1400;
  let launched = false;
  let launchDeadline = 0;

  hudBestEl.textContent = highScore;
  startBestEl.textContent = highScore;

  function resetGame() {
    const startX = Math.floor(COLS / 2);
    const startY = ROWS - 3;
    snake = [
      { x: startX, y: startY },
      { x: startX, y: startY + 1 },
      { x: startX, y: startY + 2 }
    ];
    direction = 'up';
    directionQueue = [];
    score = 0;
    sector = 1;
    moveInterval = BASE_MOVE_INTERVAL;
    accumulator = 0;
    particles = [];
    launched = false;
    launchDeadline = performance.now() + LAUNCH_GRACE_MS;
    spawnFood();
    updateHud();
  }

  function occupiedByFood(x, y) {
    return food && food.x === x && food.y === y;
  }

  function spawnFood(forceNormal = false) {
    let x, y, attempts = 0;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
      attempts++;
    } while (snake.some((s) => s.x === x && s.y === y) && attempts < 500);

    const isBonus = !forceNormal && score > 0 && Math.random() < BONUS_FOOD_CHANCE;
    food = {
      x, y,
      type: isBonus ? 'bonus' : 'normal',
      spawnTime: performance.now(),
      ttl: BONUS_FOOD_TTL
    };
  }

  function pushDirection(dir) {
    const reference = directionQueue.length ? directionQueue[directionQueue.length - 1] : direction;
    if (dir === reference || dir === OPPOSITE[reference]) return;
    launched = true;
    if (directionQueue.length >= 2) directionQueue.shift();
    directionQueue.push(dir);
    sfx.turn();
  }

  function step() {
    if (directionQueue.length) direction = directionQueue.shift();

    const d = DIRS[direction];
    const head = snake[0];
    const newHead = { x: head.x + d.x, y: head.y + d.y };

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      return gameOver('The serpent struck the outer hull. 撞上了外壳墙壁。');
    }

    const willEat = occupiedByFood(newHead.x, newHead.y);
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      return gameOver('The serpent collided with its own data-trail. 撞上了自己的尾迹。');
    }

    snake.unshift(newHead);

    if (willEat) {
      const gained = food.type === 'bonus' ? BONUS_FOOD_SCORE : NORMAL_FOOD_SCORE;
      score += gained;
      spawnEatParticles(newHead, food.type === 'bonus' ? '#ff2ee6' : '#39ff8f');
      food.type === 'bonus' ? sfx.bonus() : sfx.eat();

      const newSector = Math.floor(score / SCORE_PER_SECTOR) + 1;
      if (newSector !== sector) {
        sector = newSector;
        moveInterval = Math.max(MIN_MOVE_INTERVAL, BASE_MOVE_INTERVAL - (sector - 1) * 6);
        sfx.sector();
        flashArena(false);
      }
      spawnFood();
    } else {
      snake.pop();
    }

    if (
      food.type === 'bonus' &&
      performance.now() - food.spawnTime > food.ttl
    ) {
      spawnFizzle(food);
      spawnFood(true);
    }

    emitTrailParticle(head);
    updateHud();
  }

  function updateHud() {
    hudScoreEl.textContent = score;
    hudLengthEl.textContent = snake.length;
    hudSectorEl.textContent = String(sector).padStart(2, '0');
    const progress = ((score % SCORE_PER_SECTOR) / SCORE_PER_SECTOR) * 100;
    hudEnergyEl.style.width = `${progress}%`;
  }

  function gameOver(reason) {
    state = 'gameover';
    overReasonEl.textContent = reason;
    overScoreEl.textContent = score;
    const isNewRecord = score > highScore;
    if (isNewRecord) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
    overBestEl.textContent = highScore;
    hudBestEl.textContent = highScore;
    newRecordEl.classList.toggle('hidden', !isNewRecord);
    spawnEatParticles(snake[0], '#ff3860', 46, 3.2);
    sfx.death();
    flashArena(true);
    showScreen(screenOver);
  }

  // ---------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------
  function cellCenter(gx, gy) {
    return { x: gx * cell + cell / 2, y: gy * cell + cell / 2 };
  }

  function spawnEatParticles(gridPos, color, count = 14, speedMul = 1) {
    const { x, y } = cellCenter(gridPos.x, gridPos.y);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * speedMul;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 380 + Math.random() * 260,
        maxLife: 640,
        size: 1.5 + Math.random() * 2.5,
        color
      });
    }
  }

  function spawnFizzle(foodPos) {
    const { x, y } = cellCenter(foodPos.x, foodPos.y);
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 0.8,
        vy: Math.sin(angle) * 0.8,
        life: 300,
        maxLife: 300,
        size: 1.5,
        color: '#ff2ee6'
      });
    }
  }

  function emitTrailParticle(headPos) {
    if (Math.random() > 0.55) return;
    const { x, y } = cellCenter(headPos.x, headPos.y);
    particles.push({
      x: x + (Math.random() - 0.5) * cell * 0.3,
      y: y + (Math.random() - 0.5) * cell * 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      life: 260,
      maxLife: 260,
      size: 1.2 + Math.random(),
      color: '#00f6ff'
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function flashArena(isDamage) {
    arenaEl.classList.remove('shake', 'flash');
    void arenaEl.offsetWidth; // restart animation
    if (isDamage) arenaEl.classList.add('shake', 'flash');
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function renderGrid(time) {
    ctx.strokeStyle = 'rgba(0, 246, 255, 0.07)';
    ctx.lineWidth = 1;
    const pulse = 0.05 + 0.03 * Math.sin(time / 900);
    ctx.strokeStyle = `rgba(0, 246, 255, ${0.08 + pulse})`;
    ctx.beginPath();
    for (let cx = 0; cx <= COLS; cx++) {
      ctx.moveTo(cx * cell, 0);
      ctx.lineTo(cx * cell, logicalHeight);
    }
    for (let cy = 0; cy <= ROWS; cy++) {
      ctx.moveTo(0, cy * cell);
      ctx.lineTo(logicalWidth, cy * cell);
    }
    ctx.stroke();
  }

  function renderFood(time) {
    if (!food) return;
    const { x, y } = cellCenter(food.x, food.y);
    const isBonus = food.type === 'bonus';
    const baseColor = isBonus ? '#ff2ee6' : '#39ff8f';
    const pulse = 0.5 + 0.5 * Math.sin(time / 180);
    const radius = cell * (isBonus ? 0.3 : 0.26) + pulse * 1.5;

    ctx.save();
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isBonus) {
      const elapsed = performance.now() - food.spawnTime;
      const frac = Math.max(0, 1 - elapsed / food.ttl);
      ctx.save();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.42, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderSnake() {
    const len = snake.length;
    for (let i = len - 1; i >= 0; i--) {
      const seg = snake[i];
      const t = len > 1 ? i / (len - 1) : 0;
      const isHead = i === 0;

      const hue1 = [0, 246, 255];
      const hue2 = [130, 0, 220];
      const r = Math.round(hue1[0] + (hue2[0] - hue1[0]) * t);
      const g = Math.round(hue1[1] + (hue2[1] - hue1[1]) * t);
      const b = Math.round(hue1[2] + (hue2[2] - hue1[2]) * t);
      const color = `rgb(${r}, ${g}, ${b})`;

      const pad = cell * (isHead ? 0.08 : 0.12 + t * 0.06);
      const size = cell - pad * 2;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = isHead ? 16 : 8 * (1 - t * 0.6);
      ctx.fillStyle = color;
      roundedRect(seg.x * cell + pad, seg.y * cell + pad, size, size, size * 0.35);
      ctx.fill();
      ctx.restore();

      if (isHead) {
        const d = DIRS[direction];
        const cx = seg.x * cell + cell / 2;
        const cy = seg.y * cell + cell / 2;
        const eyeOffset = cell * 0.14;
        const perpX = -d.y * eyeOffset;
        const perpY = d.x * eyeOffset;
        const forward = cell * 0.12;
        ctx.fillStyle = '#04121a';
        ctx.beginPath();
        ctx.arc(cx + d.x * forward + perpX, cy + d.y * forward + perpY, cell * 0.07, 0, Math.PI * 2);
        ctx.arc(cx + d.x * forward - perpX, cy + d.y * forward - perpY, cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function renderLaunchHint(time) {
    const pulse = 0.55 + 0.45 * Math.sin(time / 220);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.font = `${Math.max(11, cell * 0.42)}px 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6cf7ff';
    ctx.shadowColor = '#00f6ff';
    ctx.shadowBlur = 10;
    ctx.fillText('STEER TO LAUNCH \u2022 \u63a7\u5236\u65b9\u5411\u4ee5\u51fa\u53d1', logicalWidth / 2, logicalHeight * 0.16);
    ctx.restore();
  }

  function renderGame(time) {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    renderGrid(time);
    renderParticles();
    if (state !== 'start') {
      renderFood(time);
      renderSnake();
    }
    if (state === 'playing' && !launched) {
      renderLaunchHint(time);
    }
  }

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------
  function hideAllScreens() {
    screenStart.classList.add('hidden');
    screenPause.classList.add('hidden');
    screenOver.classList.add('hidden');
  }

  function showScreen(el) {
    hideAllScreens();
    el.classList.remove('hidden');
  }

  function startGame() {
    ensureAudio();
    resetGame();
    state = 'playing';
    hideAllScreens();
    btnPauseToggle.textContent = 'II';
    sfx.start();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      showScreen(screenPause);
      btnPauseToggle.textContent = '▶';
    } else if (state === 'paused') {
      state = 'playing';
      hideAllScreens();
      btnPauseToggle.textContent = 'II';
    }
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  const KEY_TO_DIR = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  window.addEventListener('keydown', (e) => {
    if (KEY_TO_DIR[e.code]) {
      e.preventDefault();
      if (state === 'playing') pushDirection(KEY_TO_DIR[e.code]);
      return;
    }
    if (e.code === 'Space' || e.code === 'Escape') {
      e.preventDefault();
      if (state === 'start') startGame();
      else if (state === 'playing' || state === 'paused') togglePause();
      else if (state === 'gameover') startGame();
      return;
    }
    if (e.code === 'Enter') {
      if (state === 'start' || state === 'gameover') startGame();
    }
  });

  // Touch / swipe controls
  let touchStartX = 0, touchStartY = 0, touchActive = false;
  gameCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  gameCanvas.addEventListener('touchend', (e) => {
    if (!touchActive) return;
    touchActive = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    const THRESHOLD = 20;
    if (Math.max(absX, absY) < THRESHOLD) {
      if (state === 'start') startGame();
      return;
    }
    if (state !== 'playing') return;
    if (absX > absY) pushDirection(dx > 0 ? 'right' : 'left');
    else pushDirection(dy > 0 ? 'down' : 'up');
  });

  document.getElementById('btnStart').addEventListener('click', startGame);
  document.getElementById('btnResume').addEventListener('click', togglePause);
  document.getElementById('btnRestart').addEventListener('click', startGame);
  document.getElementById('btnRestartFromPause').addEventListener('click', startGame);
  btnPauseToggle.addEventListener('click', () => {
    if (state === 'playing' || state === 'paused') togglePause();
  });

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  function frame(time) {
    if (!lastTime) lastTime = time;
    const dt = Math.min(64, time - lastTime);
    lastTime = time;

    renderBackground(time);

    if (state === 'playing') {
      if (!launched && time >= launchDeadline) launched = true;
      if (launched) {
        accumulator += dt;
        while (accumulator >= moveInterval) {
          step();
          accumulator -= moveInterval;
          if (state !== 'playing') { accumulator = 0; break; }
        }
      }
    }
    updateParticles(dt);
    renderGame(time);

    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  function init() {
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    resetGame();
    updateHud();
    requestAnimationFrame(frame);
  }

  init();
})();
