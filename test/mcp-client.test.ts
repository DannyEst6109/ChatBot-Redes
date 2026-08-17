import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { AuditLogger } from '../src/logging/audit-logger.js'
import { McpClient } from '../src/mcp/client.js'
import { StdioTransport } from '../src/mcp/stdio-transport.js'
import type { McpTransport, TransportHandlers } from '../src/mcp/transport.js'
import type { JsonObject } from '../src/shared/json.js'

async function silentLogger(): Promise<AuditLogger> {
  const directory = await mkdtemp(join(tmpdir(), 'supply-mcp-test-'))
  return new AuditLogger(join(directory, 'audit.jsonl'), false)
}

test('speaks MCP with the compiled supply server over the stdio transport', async (context) => {
  const transport = new StdioTransport('supply-test', {
    enabled: true,
    command: process.execPath,
    args: [resolve('dist/src/mcp/supply-server-entry.js')],
    cwd: process.cwd(),
  })
  const client = new McpClient('supply-test', transport, await silentLogger())
  context.after(() => client.close())

  await client.connect()
  assert.equal(client.transportKind, 'stdio')
  const tools = await client.listTools()
  assert.equal(tools.length, 5)
  const result = await client.callTool('get_supply_data_status', {})
  assert.equal(result.isError, undefined)
  assert.match(result.content[0]?.text ?? '', /"synthetic": true/)
})

/**
 * Answers every request from an in-memory script instead of a real peer. It
 * proves the protocol layer holds no assumption about how bytes travel, which
 * is what lets a remote transport reuse it unchanged.
 */
class ScriptedTransport implements McpTransport {
  readonly kind = 'scripted'
  readonly sent: JsonObject[] = []
  private handlers: TransportHandlers | null = null

  async start(handlers: TransportHandlers): Promise<void> {
    this.handlers = handlers
  }

  async send(message: JsonObject): Promise<void> {
    this.sent.push(message)
    if (message.id === undefined) return
    const reply = message.method === 'initialize'
      ? { serverInfo: { name: 'scripted', version: '9.9.9' } }
      : { tools: [{ name: 'ping', description: 'demo', inputSchema: { type: 'object' } }] }
    this.handlers?.message({ jsonrpc: '2.0', id: message.id, result: reply })
  }

  async close(): Promise<void> {}
}

test('runs the same protocol logic over a non-stdio transport', async () => {
  const transport = new ScriptedTransport()
  const client = new McpClient('scripted', transport, await silentLogger())

  await client.connect()
  assert.equal(client.serverInfo?.version, '9.9.9')
  assert.equal(client.transportKind, 'scripted')

  const tools = await client.listTools()
  assert.equal(tools[0]?.name, 'ping')

  // initialize, notifications/initialized, tools/list
  assert.equal(transport.sent.length, 3)
  assert.equal(transport.sent[1]?.method, 'notifications/initialized')
  assert.equal(transport.sent[1]?.id, undefined)
})

test('rejects tool calls issued before initialization', async () => {
  const client = new McpClient('scripted', new ScriptedTransport(), await silentLogger())
  await assert.rejects(() => client.listTools(), /is not initialized/u)
})
