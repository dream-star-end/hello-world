/**
 * Local-first terminal intelligence helpers.
 *
 * These functions intentionally avoid network access. They remove terminal
 * control sequences, redact likely secrets, classify failures and produce a
 * compact context window that can be passed to the configured AI provider
 * only after the user explicitly requests a summary.
 */

const MAX_OUTPUT_LENGTH = 24000
// eslint-disable-next-line no-control-regex, prefer-regex-literals
const oscSequencePattern = new RegExp('\\u001b\\][^\\u0007]*(?:\\u0007|\\u001b\\\\)', 'g')
// eslint-disable-next-line no-control-regex, prefer-regex-literals
const ansiSequencePattern = new RegExp('\\u001b(?:[@-_][0-?]*[ -/]*[@-~]|\\[[0-?]*[ -/]*[@-~])', 'g')

const secretPatterns = [
  {
    pattern: /(authorization\s*:\s*(?:bearer|basic)\s+)[^\s]+/gi,
    replacement: '$1<redacted>'
  },
  {
    pattern: /((?:password|passwd|pwd|token|api[_-]?key|secret|private[_-]?key)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s]+)/gi,
    replacement: '$1<redacted>'
  },
  {
    pattern: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g,
    replacement: '$1\n<redacted>\n$2'
  },
  {
    pattern: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: '<redacted-aws-key>'
  },
  {
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
    replacement: '<redacted-github-token>'
  }
]

const issueRules = [
  {
    id: 'disk-full',
    severity: 'critical',
    pattern: /no space left on device|disk quota exceeded|filesystem.+100%/i,
    title: '磁盘空间不足',
    summary: '命令输出表明文件系统空间或配额已经耗尽。',
    suggestions: ['df -h', 'du -xhd1 /var | sort -h', 'journalctl --vacuum-time=7d']
  },
  {
    id: 'oom',
    severity: 'critical',
    pattern: /out of memory|oom-kill|killed process \d+|cannot allocate memory/i,
    title: '检测到内存耗尽',
    summary: '系统可能触发了 OOM Killer，服务存在被系统终止的风险。',
    suggestions: ['free -h', 'dmesg -T | grep -i -E "oom|killed process" | tail -30', 'ps aux --sort=-%mem | head']
  },
  {
    id: 'permission',
    severity: 'warning',
    pattern: /permission denied|operation not permitted|access denied/i,
    title: '权限或身份不满足',
    summary: '当前用户缺少执行该操作所需的权限。',
    suggestions: ['id', 'namei -l <path>', 'sudo -l']
  },
  {
    id: 'connection',
    severity: 'warning',
    pattern: /connection refused|connection reset|no route to host|network is unreachable/i,
    title: '服务连接失败',
    summary: '目标端口拒绝连接，或服务与网络链路不可达。',
    suggestions: ['ss -lntp', 'systemctl --failed', 'curl -v --connect-timeout 5 <url>']
  },
  {
    id: 'timeout',
    severity: 'warning',
    pattern: /timed? out|upstream timed out|deadline exceeded|gateway timeout|504 gateway/i,
    title: '请求或上游响应超时',
    summary: '请求超过了允许的等待时间，应检查上游服务和资源压力。',
    suggestions: ['uptime', 'ss -s', 'journalctl -p warning --since "-15 min"']
  },
  {
    id: 'service-failed',
    severity: 'warning',
    pattern: /failed to start|active:\s+failed|main process exited|status=\d+\/failure/i,
    title: '系统服务启动失败',
    summary: '服务进程已退出或 systemd 将其标记为失败。',
    suggestions: ['systemctl --failed', 'systemctl status <service> --no-pager', 'journalctl -u <service> -n 100 --no-pager']
  },
  {
    id: 'command-not-found',
    severity: 'info',
    pattern: /command not found|is not recognized as an internal or external command/i,
    title: '命令不可用',
    summary: '目标命令尚未安装，或不在当前 PATH 中。',
    suggestions: ['command -v <command>', 'printf "%s\\n" "$PATH"']
  },
  {
    id: 'dns',
    severity: 'warning',
    pattern: /could not resolve host|temporary failure in name resolution|name or service not known|nxdomain/i,
    title: 'DNS 解析异常',
    summary: '当前主机无法把域名解析为 IP 地址。',
    suggestions: ['getent hosts <domain>', 'resolvectl status', 'cat /etc/resolv.conf']
  }
]

export function stripTerminalSequences (value = '') {
  return String(value)
    // OSC sequences, including shell integration events
    .replace(oscSequencePattern, '')
    // CSI and other common ANSI control sequences
    .replace(ansiSequencePattern, '')
    .replace(/\r/g, '')
    .split(String.fromCharCode(8)).join('')
}

export function redactSensitiveData (value = '') {
  let result = String(value)
  for (const rule of secretPatterns) {
    result = result.replace(rule.pattern, rule.replacement)
  }
  return result
}

export function sanitizeTerminalOutput (value = '') {
  const normalized = redactSensitiveData(stripTerminalSequences(value))
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
  if (normalized.length <= MAX_OUTPUT_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, MAX_OUTPUT_LENGTH)}\n…<output truncated>`
}

export function sanitizeCommand (command = '') {
  return redactSensitiveData(stripTerminalSequences(command)).trim().slice(0, 2000)
}

export function isSensitiveCommand (command = '') {
  return /(?:password|passwd|token|api[_-]?key|secret|private[_-]?key)\s*[=:]|authorization\s*:\s*(?:bearer|basic)|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(command)
}

export function classifyCommand (command = '') {
  const cmd = command.trim().toLowerCase()
  if (/^(rm|shred|wipefs|mkfs|dd)\b/.test(cmd)) return 'destructive'
  if (/^(sudo|su)\b/.test(cmd)) return 'privileged'
  if (/^(systemctl|service|journalctl)\b/.test(cmd)) return 'service'
  if (/^(docker|podman|kubectl|helm)\b/.test(cmd)) return 'container'
  if (/^(ssh|scp|rsync|curl|wget|ping|dig|nslookup|ss|netstat)\b/.test(cmd)) return 'network'
  if (/^(ps|top|htop|free|vmstat|iostat|df|du|uptime)\b/.test(cmd)) return 'diagnostic'
  if (/^(vim|vi|nano|sed|awk|cat|less|tail|head)\b/.test(cmd)) return 'file'
  return 'other'
}

export function detectIssues ({ output = '', exitCode = 0 } = {}) {
  const issues = issueRules
    .filter(rule => rule.pattern.test(output))
    .map(rule => ({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      summary: rule.summary,
      suggestions: [...rule.suggestions]
    }))

  if (Number(exitCode) !== 0 && !issues.length) {
    issues.push({
      id: 'non-zero-exit',
      severity: 'warning',
      title: `命令执行失败（退出码 ${exitCode}）`,
      summary: '命令返回了非零退出状态，可结合输出与前序操作继续定位。',
      suggestions: []
    })
  }
  return issues
}

export function buildOpsContext (events = []) {
  return events.slice(-12).map((event, index) => {
    const output = (event.output || '').slice(-4000)
    return [
      `#${index + 1} [${event.host || 'local'}] ${event.command}`,
      `cwd=${event.cwd || '-'} exitCode=${event.exitCode ?? 'unknown'} durationMs=${event.durationMs || 0}`,
      output ? `output:\n${output}` : 'output: <empty>'
    ].join('\n')
  }).join('\n\n')
}

export function buildLocalSummary (events = []) {
  const recent = events.slice(-20)
  const failed = recent.filter(event => Number(event.exitCode) !== 0)
  const hosts = [...new Set(recent.map(event => event.host).filter(Boolean))]
  const categories = recent.reduce((result, event) => {
    result[event.category || 'other'] = (result[event.category || 'other'] || 0) + 1
    return result
  }, {})
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other'
  return {
    title: failed.length
      ? `会话中有 ${failed.length} 个命令需要关注`
      : `已完成 ${recent.length} 个操作`,
    summary: `本次会话涉及 ${hosts.length || 1} 台主机，主要操作类型为 ${topCategory}。${failed.length ? '建议优先复核失败命令及其后续修复结果。' : '当前未检测到非零退出状态。'}`,
    problem: failed[0]?.issues?.[0]?.title || '',
    resolution: failed.length ? '尚未确认最终解决方案' : '所有已记录命令均正常返回',
    commands: recent.slice(-5).map(event => event.command),
    tags: [...new Set([topCategory, ...hosts])].slice(0, 5)
  }
}
