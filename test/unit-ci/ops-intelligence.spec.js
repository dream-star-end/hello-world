const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function loadOpsIntelligence () {
  const url = pathToFileURL(
    path.resolve(__dirname, '../../src/client/common/ops-intelligence.js')
  )
  return import(url.href)
}

describe('TermMind operations intelligence', () => {
  it('strips terminal sequences and redacts credentials', async () => {
    const { sanitizeTerminalOutput } = await loadOpsIntelligence()
    const output = '\u001b[31mrequest failed\u001b[0m\nAuthorization: Bearer super-secret-token'
    const result = sanitizeTerminalOutput(output)

    assert.equal(result.includes('\u001b'), false)
    assert.equal(result.includes('super-secret-token'), false)
    assert.match(result, /Authorization: Bearer <redacted>/)
  })

  it('detects disk exhaustion and returns diagnostic commands', async () => {
    const { detectIssues } = await loadOpsIntelligence()
    const issues = detectIssues({
      output: 'write failed: No space left on device',
      exitCode: 1
    })

    assert.equal(issues[0].id, 'disk-full')
    assert.equal(issues[0].severity, 'critical')
    assert.ok(issues[0].suggestions.includes('df -h'))
  })

  it('builds a structured local fallback summary', async () => {
    const { buildLocalSummary } = await loadOpsIntelligence()
    const summary = buildLocalSummary([
      {
        command: 'systemctl status nginx',
        host: 'web-prod',
        category: 'service',
        exitCode: 0
      }
    ])

    assert.deepEqual(summary.commands, ['systemctl status nginx'])
    assert.ok(summary.tags.includes('service'))
    assert.match(summary.title, /已完成 1 个操作/)
  })
})
