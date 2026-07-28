import { action } from 'manate'
import uid from '../common/uid'
import { refs } from '../components/common/ref'
import { notification } from '../components/common/notification'
import * as ls from '../common/safe-local-storage'
import {
  buildLocalSummary,
  buildOpsContext,
  classifyCommand,
  detectIssues,
  isSensitiveCommand,
  sanitizeCommand,
  sanitizeTerminalOutput
} from '../common/ops-intelligence'

const AUTO_CAPTURE_KEY = 'termmind-ops-auto-capture'
const MAX_EVENTS = 800
const MAX_INSIGHTS = 120
const MAX_KNOWLEDGE = 300

function parseJSONResponse (response = '') {
  const text = String(response)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {}
    }
  }
  return null
}

function hostLabel (tab = {}) {
  return tab.title || tab.host || (tab.type === 'local' ? 'local' : 'unknown')
}

export default Store => {
  Store.prototype.openOpsPanel = action(function (section = 'diagnosis') {
    const { store } = window
    store.opsPanelSection = section
    store.rightPanelVisible = true
    store.rightPanelTab = 'ops'
  })

  Store.prototype.toggleOpsAutoCapture = function (enabled) {
    window.store.opsAutoCapture = enabled
    ls.setItem(AUTO_CAPTURE_KEY, enabled ? 'y' : 'n')
  }

  Store.prototype.recordOpsCommand = action(function (rawEvent) {
    const { store } = window
    if (!store.opsAutoCapture || !rawEvent?.command) {
      return
    }

    const command = sanitizeCommand(rawEvent.command)
    if (!command) {
      return
    }

    const sensitive = isSensitiveCommand(command)
    const output = sensitive
      ? '<sensitive command output omitted>'
      : sanitizeTerminalOutput(rawEvent.output)
    const issues = detectIssues({
      output,
      exitCode: rawEvent.exitCode
    })
    const event = {
      ...rawEvent,
      id: uid(),
      command,
      output,
      sensitive,
      issues,
      category: classifyCommand(command),
      createdAt: Date.now()
    }

    store.opsCommandEvents.push(event)
    if (store.opsCommandEvents.length > MAX_EVENTS) {
      store.opsCommandEvents.splice(0, store.opsCommandEvents.length - MAX_EVENTS)
    }

    for (const issue of issues) {
      const recent = store.opsInsights.find(item => (
        item.ruleId === issue.id &&
        item.host === event.host &&
        Date.now() - item.updatedAt < 10 * 60 * 1000
      ))
      if (recent) {
        recent.count = (recent.count || 1) + 1
        recent.updatedAt = Date.now()
        recent.eventId = event.id
        recent.command = event.command
        recent.evidence = event.output.slice(-1800)
        recent.exitCode = event.exitCode
        continue
      }
      store.opsInsights.unshift({
        id: uid(),
        ruleId: issue.id,
        severity: issue.severity,
        title: issue.title,
        summary: issue.summary,
        suggestions: issue.suggestions,
        eventId: event.id,
        command: event.command,
        evidence: event.output.slice(-1800),
        exitCode: event.exitCode,
        host: event.host,
        address: event.address,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        count: 1,
        status: 'open'
      })
    }
    if (store.opsInsights.length > MAX_INSIGHTS) {
      store.opsInsights.splice(MAX_INSIGHTS)
    }

    if (issues.some(issue => issue.severity === 'critical')) {
      notification.warning({
        message: `TermMind：${issues[0].title}`,
        description: '已完成本地诊断，点击底部「智维」查看证据与建议。',
        duration: 8
      })
    }
  })

  Store.prototype.dismissOpsInsight = action(function (id) {
    const item = window.store.opsInsights.find(insight => insight.id === id)
    if (item) {
      item.status = 'resolved'
      item.updatedAt = Date.now()
    }
  })

  Store.prototype.runOpsSuggestion = function (command) {
    if (!command || /<[^>]+>/.test(command)) {
      notification.info({
        message: '命令需要补充参数',
        description: '请复制命令并替换尖括号中的占位内容后再执行。'
      })
      return
    }
    const term = refs.get('term-' + window.store.activeTabId)
    if (!term) {
      notification.warning({
        message: '没有可用的终端',
        description: '请先打开或连接一个终端会话。'
      })
      return
    }
    term.runQuickCommand(command)
  }

  Store.prototype.analyzeOpsSelection = action(function (selection, tab = {}) {
    const output = sanitizeTerminalOutput(selection)
    if (!output) {
      return
    }
    const detected = detectIssues({ output })
    const issue = detected[0] || {
      id: 'manual-analysis',
      severity: 'info',
      title: '已采集终端片段',
      summary: '没有命中本地故障规则，可在智能助手中继续做语义分析。',
      suggestions: []
    }
    window.store.opsInsights.unshift({
      id: uid(),
      ruleId: issue.id,
      severity: issue.severity,
      title: issue.title,
      summary: issue.summary,
      suggestions: issue.suggestions,
      evidence: output.slice(-3000),
      host: hostLabel(tab),
      address: tab.host || '',
      command: '手动选取的终端输出',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      count: 1,
      status: 'open',
      manual: true
    })
    window.store.openOpsPanel('diagnosis')
  })

  Store.prototype.captureOpsKnowledgeFromSelection = action(function (selection, tab = {}) {
    const content = sanitizeTerminalOutput(selection)
    if (!content) {
      return
    }
    const firstLine = content.split('\n').find(Boolean) || '终端经验'
    window.store.opsKnowledge.unshift({
      id: uid(),
      title: firstLine.slice(0, 72),
      summary: content.slice(0, 4000),
      problem: '',
      resolution: '',
      commands: [],
      tags: ['手动摘录', hostLabel(tab)],
      source: 'terminal-selection',
      host: hostLabel(tab),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    if (window.store.opsKnowledge.length > MAX_KNOWLEDGE) {
      window.store.opsKnowledge.splice(MAX_KNOWLEDGE)
    }
    window.store.openOpsPanel('knowledge')
    notification.success({
      message: '已沉淀为运维经验',
      description: '内容已脱敏并保存在本地加密知识库中。'
    })
  })

  Store.prototype.saveOpsInsightAsKnowledge = action(function (id) {
    const item = window.store.opsInsights.find(insight => insight.id === id)
    if (!item) {
      return
    }
    window.store.opsKnowledge.unshift({
      id: uid(),
      title: item.title,
      summary: item.summary,
      problem: item.evidence,
      resolution: '',
      commands: [item.command, ...(item.suggestions || [])].filter(Boolean),
      tags: [item.ruleId, item.host].filter(Boolean),
      source: 'diagnosis',
      host: item.host,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    item.status = 'saved'
    notification.success({
      message: '诊断已加入经验库',
      description: '后续遇到相似输出时，TermMind 会优先召回这条经验。'
    })
  })

  Store.prototype.deleteOpsKnowledge = action(function (id) {
    const index = window.store.opsKnowledge.findIndex(item => item.id === id)
    if (index !== -1) {
      window.store.opsKnowledge.splice(index, 1)
    }
  })

  Store.prototype.generateOpsSummary = async function () {
    const { store } = window
    const events = store.opsCommandEvents.slice(-20)
    if (!events.length) {
      notification.info({
        message: '暂无可总结的操作',
        description: '执行几条命令后，TermMind 会在本地形成结构化时间线。'
      })
      return null
    }
    if (store.opsSummaryPending) {
      return null
    }

    store.opsSummaryPending = true
    const localSummary = buildLocalSummary(events)
    let summary = localSummary
    let source = 'local'

    try {
      if (!store.aiConfigMissing()) {
        const {
          modelAI,
          roleAI,
          baseURLAI,
          apiPathAI,
          apiKeyAI,
          proxyAI,
          authHeaderNameAI
        } = store.config
        const prompt = `你是资深 SRE。根据以下经过本地脱敏的 SSH 操作记录，提取可复用经验。
只返回严格 JSON，不要 Markdown，结构为：
{"title":"","summary":"","problem":"","resolution":"","commands":[],"tags":[]}
要求：
1. 不虚构记录中不存在的结果；
2. title 不超过 40 个中文字符；
3. problem 说明症状与证据，resolution 说明已验证的处理过程；若未解决则明确写“尚未确认”；
4. commands 只保留最多 6 条关键命令；
5. 不输出任何密码、Token、私钥。

操作记录：
${buildOpsContext(events)}`
        const response = await window.pre.runGlobalAsync(
          'AIchat',
          prompt,
          modelAI,
          `${roleAI || ''};只输出符合要求的 JSON`,
          baseURLAI,
          apiPathAI,
          apiKeyAI,
          proxyAI,
          false,
          authHeaderNameAI
        )
        const parsed = parseJSONResponse(response?.response)
        if (parsed) {
          summary = {
            ...localSummary,
            ...parsed,
            commands: Array.isArray(parsed.commands) ? parsed.commands.slice(0, 6) : localSummary.commands,
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : localSummary.tags
          }
          source = 'ai'
        }
      }
    } catch (error) {
      console.warn('[TermMind] AI summary failed, using local summary:', error)
    } finally {
      store.opsSummaryPending = false
    }

    const knowledge = {
      id: uid(),
      ...summary,
      source,
      host: events[events.length - 1]?.host || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    store.opsKnowledge.unshift(knowledge)
    if (store.opsKnowledge.length > MAX_KNOWLEDGE) {
      store.opsKnowledge.splice(MAX_KNOWLEDGE)
    }
    store.opsPanelSection = 'knowledge'

    notification.success({
      message: source === 'ai' ? 'AI 会话总结已生成' : '本地会话总结已生成',
      description: source === 'ai'
        ? '已从问题、操作、验证和结果四个维度提取经验。'
        : '当前未调用远程模型，已使用本地规则完成基础总结。'
    })
    return knowledge
  }

  Store.prototype.clearOpsTimeline = action(function () {
    window.store.opsCommandEvents = []
    window.store.opsInsights = []
  })
}

export function getOpsAutoCaptureDefault () {
  return ls.getItem(AUTO_CAPTURE_KEY) !== 'n'
}
