# TermMind

基于 [Electerm](https://github.com/electerm/electerm) 二次开发的 AI 原生 SSH / SFTP 桌面运维工具。

TermMind 不重新实现 SSH 协议、终端仿真和文件传输，而是在成熟的 Electerm 能力之上增加“会话理解层”：自动关联命令、输出、退出码、主机与工作目录，形成可检索的操作时间线，并从真实排障过程里提取诊断与可复用经验。

## 当前能力

### 继承自 Electerm

- SSH / Telnet / Serial / RDP / VNC / Spice
- 本地终端、SFTP / FTP、端口转发、跳板机
- xterm.js 终端、多标签与分屏、命令历史
- 多平台 Electron 桌面端
- OpenAI 兼容模型、Agent 工具调用与 MCP

### TermMind 二开能力

- **智能会话观察**：基于 Shell Integration 精确识别命令开始与结束。
- **命令—输出关联**：记录命令、输出、退出码、耗时、主机、用户和工作目录。
- **本地故障定位**：无需调用模型即可识别磁盘耗尽、OOM、权限、连接、超时、服务失败、DNS 等常见问题。
- **处理建议**：根据故障证据提供下一步诊断命令，可直接送入当前终端。
- **操作时间线**：把原始终端流转成结构化、可回看的会话记录。
- **经验自动提取**：按“问题—证据—操作—结果—关键命令”总结会话并沉淀到知识库。
- **安全与隐私**：终端数据本地优先、数据库加密、输出自动脱敏；只有用户主动总结时才把脱敏上下文交给已配置的 AI。
- **智能运维侧栏**：终端底部点击「智维」即可查看诊断、时间线和经验库。

## 技术架构

```text
SSH / PTY / xterm.js（Electerm）
          │
          ▼
Shell Integration OSC 633
          │
          ▼
Command Capture
命令 + 输出 + exit code + cwd + host + duration
          │
          ├── Local Diagnosis Rules（不联网）
          ├── Encrypted Timeline（本地持久化）
          └── AI Experience Extractor（用户主动触发）
                         │
                         ▼
                 Operational Memory
```

核心新增目录：

```text
src/client/common/ops-intelligence.js
src/client/store/ops-intelligence.js
src/client/components/ops-intelligence/
```

## 开发

建议使用 Node.js 24.x。Electerm 的依赖包含 Electron 与原生模块，首次安装时间较长。

```bash
npm config set legacy-peer-deps true
npm install
```

启动 Vite 渲染进程：

```bash
npm start
```

另开一个终端启动 Electron：

```bash
npm run app
```

构建前端：

```bash
npm run build
```

代码规范检查：

```bash
npm run lint
```

## 隐私边界

1. 捕获层不会读取本地密码键入，只接收远端回显。
2. 命令与输出进入持久化前会清理 ANSI / OSC 控制序列。
3. Password、Token、API Key、私钥等常见敏感格式会自动替换为 `<redacted>`。
4. 命中敏感命令时不保存其输出。
5. `opsCommandEvents`、`opsInsights`、`opsKnowledge` 三张新增数据表均沿用 Electerm 的本地加密能力。
6. 自动诊断完全在本地完成；AI 总结只在用户点击后调用已配置的模型接口。

## 上游与许可证

本项目基于 Electerm `master` 分支提交 `b1729eb67a4cd9cf1182de69dc2c8e051931740f` 初始化。

Electerm 使用 MIT License。仓库保留原始 `LICENSE`，二次开发说明见 [NOTICE](NOTICE)。

