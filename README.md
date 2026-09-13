# 🐍 NEON SERPENT · 霓虹巨蟒

A polished, sci-fi themed **Snake** game — pilot a glowing energy serpent through a
neon holo-grid, devour energy orbs, and survive as long as you can. Built as a
single static web app: plain **HTML + CSS + JavaScript**, zero dependencies,
zero build step.

一款科幻风格的贪吃蛇游戏：驾驶发光的能量巨蟒穿梭于霓虹网格之中，吞噬能量球，尽可能地生存下去。
纯静态网页（HTML + CSS + JavaScript），无需依赖、无需构建。

![tech](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-00f6ff) ![deps](https://img.shields.io/badge/dependencies-none-39ff8f)

---

## ▶️ Play it / 开始游戏

**Option A — just open the file 直接打开文件**

Double-click `index.html` (or open it with your browser). That's it.

**Option B — run a tiny local server (recommended for the best experience) 本地静态服务器（推荐）**

Some browsers restrict certain APIs (like `localStorage` for the high score) when
opening files directly via `file://`. If you notice the high score isn't
persisting, serve the folder instead:

```bash
# Python 3
python3 -m http.server 8000

# or Node.js
npx serve .

# or PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

---

## 🎮 Controls / 操作方式

| Action 操作 | Keys 按键 |
| --- | --- |
| Move 移动 | Arrow keys `↑ ↓ ← →` or `W A S D` |
| Move (touch) 移动端 | Swipe on the game grid 在游戏区域滑动 |
| Pause / Resume 暂停/继续 | `Space` or `Esc`, or the `II` button in the HUD |
| Start / Restart 开始/重新开始 | `Enter`, `Space`, or the on-screen buttons |

---

## ✨ Features / 特性

- **Classic snake gameplay** — eat to grow, avoid walls and your own tail,
  score climbs as you survive. 经典玩法：吃食物变长，撞墙或撞到自己即失败，分数持续累积。
- **Sci-fi visual identity** — animated starfield backdrop, a pulsing holo-grid
  arena, a glowing gradient serpent (cyan → violet) with directional "eyes,"
  and radiant energy-orb food with a soft bloom. 科幻视觉：动态星空背景、脉动全息网格、
  青色到紫色渐变发光的巨蟒（带方向性"眼睛"），以及带柔光的能量球食物。
  - Rare **magenta "unstable core" orbs** appear occasionally, worth more
    points but decay on a visible countdown ring before they destabilize.
    偶尔出现的品红色"不稳定能量核心"分值更高，但带有可见的倒计时环，过期后会消散。
- **Spaceship-console HUD** — live `SCORE`, `LENGTH`, `SECTOR` (difficulty
  level), an `ENERGY` bar showing progress to the next sector, and your
  all-time `BEST`. 飞船控制台风格 HUD：实时显示分数、长度、区域（难度等级）、通往下一区域的能量条，以及历史最高分。
- **Smooth, responsive controls** — arrow keys, WASD, and swipe gestures on
  touch devices, with a small input buffer so quick direction taps never feel
  dropped. 流畅的操作：方向键、WASD、触屏滑动，并带有输入缓冲，快速转向也不会丢失指令。
- **Particles & juice** — thruster-trail sparks behind the snake's head,
  energy bursts when eating, a screen shake + red flash + explosion on death.
  粒子与打击感：巨蟒头部的推进器尾迹火花、进食时的能量爆裂效果，死亡时的画面震动、红色闪光与爆炸。
  Tiny procedurally-generated sound effects (Web Audio, no audio files) for
  eating, sector-ups, and crashes. 使用 Web Audio 实时生成的音效（无需音频文件），用于进食、升区和撞毁。
- **Start / Pause / Game Over screens** — bilingual sci-fi framing, a
  how-to-play panel, and a persistent high score stored in `localStorage`.
  开始/暂停/结束界面：中英双语科幻风格文案、玩法说明，以及保存在 `localStorage` 中的历史最高分。
- **Responsive layout** — scales cleanly from desktop to phone screens.
  响应式布局：从桌面到手机屏幕均可良好适配。

---

## 🗂️ Project structure / 项目结构

```
.
├── index.html   # Markup: HUD, canvas, start/pause/game-over overlays
├── style.css    # Sci-fi theme: neon glow, starfield frame, responsive layout
├── game.js      # Game loop, input, rendering, particles, audio — all vanilla JS
├── LICENSE      # MIT
└── README.md    # You are here
```

No package manager, no bundler, no build step — everything runs directly in
the browser.

---

## 🛠️ How it works / 实现说明

- The playfield is a **28×18 grid** rendered on a `<canvas>`; a second,
  full-window `<canvas>` behind it draws a soft, drifting starfield.
- The game loop uses `requestAnimationFrame` with a fixed-timestep
  accumulator for snake movement, decoupled from real-time particle and
  background animation, so the game feels smooth on any refresh rate.
- Difficulty scales through **sectors**: every 50 points, the sector
  increases and the snake's move interval shortens slightly (clamped to a
  minimum speed) — shown live on the `ENERGY` bar.
- The snake body is rendered as a gradient (bright cyan head → deep violet
  tail) of rounded, glowing tiles; the head gets extra glow and a pair of
  directional "eyes."
- High scores persist locally via `localStorage` — no backend required.

---

## 📄 License

MIT — see [`LICENSE`](LICENSE).
