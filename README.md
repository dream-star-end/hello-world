# 万劫问仙

一款纯前端 Canvas 东方修仙割草游戏。包含三种传承、自动战斗、技能流派、境界突破、Boss 天劫、局外洞府养成、存档、音效与移动端触控。

在线游玩：https://dream-star-end.github.io/hello-world/

[使用 EdgeOne Makers 免费部署](https://console.cloud.tencent.com/edgeone/makers/new?repository-url=https%3A%2F%2Fgithub.com%2Fdream-star-end%2Fhello-world&repository-name=wanjie-xiuxian-edgeone&project-name=wanjie-xiuxian&output-directory=dist&install-command=npm%20ci&build-command=npm%20run%20build)

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 操作

- `WASD` / 方向键：移动
- `空格`：闪身
- `Esc` / `P`：暂停
- `1` / `2` / `3`：突破时快速选择仙缘
- 移动端：左侧虚拟摇杆移动，右侧“闪”按钮释放身法

游戏进度与洞府强化保存在浏览器 `localStorage` 中。
