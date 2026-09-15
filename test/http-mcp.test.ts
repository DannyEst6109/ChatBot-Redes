import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'

import { AuditLogger } from '../src/logging/audit-logger.js'
import { McpClient } from '../src/mcp/client.js'
import { runHttpServer } from '../src/mcp/http-server.js'
import { HttpTransport } from '../src/mcp/http-transport.js'
import { ManualMcpServer } from '../src/mcp/json-rpc-server.js'
import { MCP_PROTOCOL_VERSION } from '../src/mcp/protocol.js'
import { createSupplyToolRegistry } from '../src/mcp/supply-tools.js'
import { SyntheticSupplyRepository } from '../src/supply/repository.js'
import { SupplyService } from '../src/supply/service.js'

test('runs the complete MCP lifecycle over authenticated HTTP', async () => {
  const service = new SupplyService(await new SyntheticSupplyRepository().load())
  const server = await runHttpServer(
    () => new ManualMcpServer(
      { name: 'http-test', version: '1.0.0' },
      createSupplyToolRegistry(service),
    ),
    { port: 0, apiKey: 'test-secret' },
  )
  const address = server.address() as AddressInfo
  const logger = new AuditLogger('tmp/test-http-audit.jsonl', false)
  const client = new McpClient(
    'supply-remote',
    new HttpTransport('supply-remote', { url: `http://127.0.0.1:${address.port}/mcp`, apiKey: 'test-secret' }),
    logger,
  )

  try {
    await client.connect()
    assert.equal(client.transportKind, 'http')
    assert.equal((await client.listTools()).length, 5)
    const result = await client.callTool('get_material_status', {
      center: 'DC-PROD',
      material_code: 'SYN-PROD-001',
    })
    assert.equal(result.isError, undefined)
    assert.match(result.content[0]?.text ?? '', /SYN-PROD-001/u)
  } finally {
    await client.close()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('rejects an invalid HTTP bearer token without waiting for a timeout', async () => {
  const service = new SupplyService(await new SyntheticSupplyRepository().load())
  const server = await runHttpServer(
    () => new ManualMcpServer(
      { name: 'http-test', version: '1.0.0' },
      createSupplyToolRegistry(service),
    ),
    { port: 0, apiKey: 'correct-secret' },
  )
  const address = server.address() as AddressInfo
  const client = new McpClient(
    'supply-remote',
    new HttpTransport('supply-remote', { url: `http://127.0.0.1:${address.port}/mcp`, apiKey: 'wrong-secret' }),
    new AuditLogger('tmp/test-http-auth-audit.jsonl', false),
    1_000,
  )

  try {
    await assert.rejects(() => client.connect(), /HTTP 401: Unauthorized/u)
  } finally {
    await client.close()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

async function startTestServer(overrides: Partial<Parameters<typeof runHttpServer>[1]> = {}) {
  const service = new SupplyService(await new SyntheticSupplyRepository().load())
  const server = await runHttpServer(
    () => new ManualMcpServer({ name: 'http-test', version: '1.0.0' }, createSupplyToolRegistry(service)),
    { port: 0, apiKey: 'test-secret', ...overrides },
  )
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    async close() {
      await new Promise<void>((done, fail) => server.close((error) => error ? fail(error) : done()))
    },
  }
}

function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer test-secret', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } },
}

test('closes an MCP session on DELETE and refuses to reuse it', async () => {
  const server = await startTestServer()
  try {
    const opened = await post(server.url, INITIALIZE)
    const sessionId = opened.headers.get('mcp-session-id')
    assert.ok(sessionId)

    const closed = await fetch(server.url, {
      method: 'DELETE',
      headers: { authorization: 'Bearer test-secret', 'mcp-session-id': sessionId },
    })
    assert.equal(closed.status, 204)

    const reused = await post(server.url, { jsonrpc: '2.0', id: 2, method: 'ping', params: {} }, {
      'mcp-session-id': sessionId,
      'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    })
    assert.equal(reused.status, 404)
  } finally {
    await server.close()
  }
})

test('expires an idle MCP session instead of holding it forever', async () => {
  const server = await startTestServer({ sessionTtlMs: 0 })
  try {
    const opened = await post(server.url, INITIALIZE)
    const sessionId = opened.headers.get('mcp-session-id')
    assert.ok(sessionId)

    const later = await post(server.url, { jsonrpc: '2.0', id: 2, method: 'ping', params: {} }, {
      'mcp-session-id': sessionId,
      'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    })
    assert.equal(later.status, 404)
  } finally {
    await server.close()
  }
})

test('rejects a request body larger than the configured limit', async () => {
  const server = await startTestServer({ maxBodyBytes: 256 })
  try {
    const oversized = await post(server.url, JSON.stringify({ ...INITIALIZE, padding: 'x'.repeat(2_000) }))
    assert.equal(oversized.status, 413)
  } finally {
    await server.close()
  }
})

test('refuses to open more sessions than the configured maximum', async () => {
  const server = await startTestServer({ maxSessions: 1 })
  try {
    assert.equal((await post(server.url, INITIALIZE)).status, 200)
    const refused = await post(server.url, INITIALIZE)
    assert.equal(refused.status, 503)
  } finally {
    await server.close()
  }
})
