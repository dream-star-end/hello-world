import { useMemo, useState } from 'react'
import {
  AlertOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DeleteOutlined,
  HistoryOutlined,
  LockOutlined,
  PlayCircleOutlined,
  RadarChartOutlined,
  RobotOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Button, Empty, Input, Progress, Switch, Tag, Tooltip } from 'antd'
import './ops-intelligence.styl'

const sections = [
  { id: 'diagnosis', label: '智能诊断', icon: <RadarChartOutlined /> },
  { id: 'timeline', label: '操作时间线', icon: <HistoryOutlined /> },
  { id: 'knowledge', label: '经验库', icon: <BookOutlined /> }
]

const severityMap = {
  critical: { label: '严重', color: 'error' },
  warning: { label: '注意', color: 'warning' },
  info: { label: '提示', color: 'processing' }
}

function formatTime (value) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatDuration (value = 0) {
  if (value < 1000) return `${value}ms`
  return `${(value / 1000).toFixed(1)}s`
}

function EmptyState ({ type }) {
  const content = {
    diagnosis: {
      title: '暂未发现异常',
      desc: 'TermMind 会在本地观察命令与输出，发现异常时在这里给出证据和处理建议。'
    },
    timeline: {
      title: '还没有操作记录',
      desc: '连接支持 Shell Integration 的 SSH 会话并执行命令后，将自动生成结构化时间线。'
    },
    knowledge: {
      title: '经验库还是空的',
      desc: '完成一次排障后点击「总结本次会话」，即可提取问题、操作和结果。'
    }
  }[type]
  return (
    <div className='ops-empty'>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={null} />
      <strong>{content.title}</strong>
      <p>{content.desc}</p>
    </div>
  )
}

function PrivacyBanner () {
  return (
    <div className='ops-privacy-banner'>
      <LockOutlined />
      <div>
        <strong>本地优先 · 自动脱敏</strong>
        <span>原始终端内容加密保存在本机；仅在你主动总结时调用已配置的 AI。</span>
      </div>
    </div>
  )
}

function DiagnosisView ({ insights }) {
  const openInsights = insights.filter(item => item.status === 'open')
  if (!openInsights.length) {
    return <EmptyState type='diagnosis' />
  }
  return (
    <div className='ops-card-list'>
      {openInsights.map(item => {
        const severity = severityMap[item.severity] || severityMap.info
        return (
          <article className={`ops-diagnosis-card severity-${item.severity}`} key={item.id}>
            <div className='ops-card-topline'>
              <Tag color={severity.color}>{severity.label}</Tag>
              <span>{item.host}</span>
              <time>{formatTime(item.updatedAt)}</time>
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <div className='ops-command-origin'>
              <CodeOutlined />
              <code>{item.command}</code>
              {item.exitCode !== null && item.exitCode !== undefined && (
                <em>exit {item.exitCode}</em>
              )}
            </div>
            {item.evidence && (
              <details className='ops-evidence'>
                <summary><AlertOutlined />查看关键证据</summary>
                <pre>{item.evidence}</pre>
              </details>
            )}
            {!!item.suggestions?.length && (
              <div className='ops-suggestions'>
                <small>建议的下一步</small>
                {item.suggestions.map((command, index) => (
                  <button
                    key={`${command}-${index}`}
                    onClick={() => window.store.runOpsSuggestion(command)}
                  >
                    <code>{command}</code>
                    <PlayCircleOutlined />
                  </button>
                ))}
              </div>
            )}
            <div className='ops-card-actions'>
              <Button
                type='primary'
                size='small'
                icon={<SaveOutlined />}
                onClick={() => window.store.saveOpsInsightAsKnowledge(item.id)}
              >
                沉淀经验
              </Button>
              <Button
                size='small'
                onClick={() => window.store.dismissOpsInsight(item.id)}
              >
                标记已处理
              </Button>
              {item.count > 1 && <span>近 10 分钟重复 {item.count} 次</span>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function TimelineView ({ events }) {
  if (!events.length) {
    return <EmptyState type='timeline' />
  }
  return (
    <div className='ops-timeline'>
      {[...events].reverse().map(event => {
        const failed = Number(event.exitCode) !== 0 && event.exitCode !== null
        return (
          <article key={event.id} className={failed ? 'failed' : ''}>
            <div className='timeline-node'>
              {failed ? <AlertOutlined /> : <CheckCircleOutlined />}
            </div>
            <div className='timeline-content'>
              <div className='timeline-meta'>
                <span>{event.host}</span>
                <time>{formatTime(event.endedAt)}</time>
                <em>{formatDuration(event.durationMs)}</em>
              </div>
              <code>{event.command}</code>
              <div className='timeline-labels'>
                <Tag>{event.category}</Tag>
                {event.sensitive && <Tag color='warning'><LockOutlined /> 已脱敏</Tag>}
                {failed && <Tag color='error'>exit {event.exitCode}</Tag>}
              </div>
              {event.output && !event.sensitive && (
                <details>
                  <summary>查看输出摘要</summary>
                  <pre>{event.output.slice(-1800)}</pre>
                </details>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function KnowledgeView ({ knowledge }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return knowledge
    return knowledge.filter(item => [
      item.title,
      item.summary,
      item.problem,
      item.resolution,
      ...(item.tags || []),
      ...(item.commands || [])
    ].join(' ').toLowerCase().includes(q))
  }, [knowledge, query])

  if (!knowledge.length) {
    return <EmptyState type='knowledge' />
  }
  return (
    <div className='ops-knowledge-wrap'>
      <Input
        allowClear
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder='搜索问题、命令或主机'
        prefix={<BookOutlined />}
      />
      <div className='ops-card-list'>
        {filtered.map(item => (
          <article className='ops-knowledge-card' key={item.id}>
            <div className='knowledge-source'>
              <span><RobotOutlined />{item.source === 'ai' ? 'AI 提取' : '本地提取'}</span>
              <time>{new Date(item.createdAt).toLocaleDateString()}</time>
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            {item.problem && (
              <div className='knowledge-block'>
                <small>问题与证据</small>
                <span>{item.problem}</span>
              </div>
            )}
            {item.resolution && (
              <div className='knowledge-block success'>
                <small>处理结果</small>
                <span>{item.resolution}</span>
              </div>
            )}
            {!!item.commands?.length && (
              <details className='knowledge-commands'>
                <summary>{item.commands.length} 条关键命令</summary>
                {item.commands.map((command, index) => <code key={`${command}-${index}`}>{command}</code>)}
              </details>
            )}
            <div className='knowledge-footer'>
              <div>{(item.tags || []).map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
              <Tooltip title='删除'>
                <Button
                  type='text'
                  size='small'
                  icon={<DeleteOutlined />}
                  onClick={() => window.store.deleteOpsKnowledge(item.id)}
                />
              </Tooltip>
            </div>
          </article>
        ))}
        {!filtered.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='没有匹配的经验' />}
      </div>
    </div>
  )
}

export default function OpsIntelligence (props) {
  if (props.rightPanelTab !== 'ops') {
    return null
  }
  const section = props.opsPanelSection || 'diagnosis'
  const eventCount = props.opsCommandEvents.length
  const failureCount = props.opsCommandEvents.filter(item => Number(item.exitCode) !== 0 && item.exitCode !== null).length
  const resolvedRate = eventCount
    ? Math.round(((eventCount - failureCount) / eventCount) * 100)
    : 100
  const handleCaptureChange = (enabled) => {
    window.store.toggleOpsAutoCapture(enabled)
  }

  return (
    <div className='ops-intelligence'>
      <div className='ops-overview'>
        <div className='ops-live-title'>
          <span className='ops-ai-orb'><RadarChartOutlined /></span>
          <div><strong>智能会话观察中</strong><small><i />命令、输出与主机上下文正在本地关联</small></div>
        </div>
        <div className='ops-kpis'>
          <div><strong>{eventCount}</strong><small>已理解操作</small></div>
          <div><strong>{props.opsInsights.filter(item => item.status === 'open').length}</strong><small>待处理发现</small></div>
          <div className='ops-score'><Progress type='circle' percent={resolvedRate} size={38} strokeWidth={9} /><small>会话健康</small></div>
        </div>
        <div className='ops-capture-toggle'>
          <span><SafetyCertificateOutlined /><span><strong>智能记录</strong><small>自动提取命令边界并脱敏</small></span></span>
          <Switch checked={props.opsAutoCapture} onChange={handleCaptureChange} size='small' />
        </div>
      </div>

      <nav className='ops-section-tabs'>
        {sections.map(item => (
          <button
            key={item.id}
            className={section === item.id ? 'active' : ''}
            onClick={() => { window.store.opsPanelSection = item.id }}
          >
            {item.icon}<span>{item.label}</span>
            {item.id === 'diagnosis' && props.opsInsights.some(x => x.status === 'open') && <i />}
          </button>
        ))}
      </nav>

      <div className='ops-content'>
        {section === 'diagnosis' && <DiagnosisView insights={props.opsInsights} />}
        {section === 'timeline' && <TimelineView events={props.opsCommandEvents} />}
        {section === 'knowledge' && <KnowledgeView knowledge={props.opsKnowledge} />}
      </div>

      <div className='ops-summary-bar'>
        <PrivacyBanner />
        <Button
          type='primary'
          size='large'
          block
          icon={props.opsSummaryPending ? <ClockCircleOutlined /> : <ThunderboltOutlined />}
          loading={props.opsSummaryPending}
          disabled={!eventCount}
          onClick={() => window.store.generateOpsSummary()}
        >
          总结本次会话并沉淀经验
        </Button>
      </div>
    </div>
  )
}
