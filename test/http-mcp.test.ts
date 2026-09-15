import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'

import { AuditLogger } from '../src/logging/audit-logger.js'
import { McpClient } from '../src/mcp/client.js'
import { runHttpServer } from '../src/mcp/http-server.js'
import { HttpTransport } from '../src/mcp/http-transport.js'
import { ManualMcpServer } from '../src/mcp/json-rpc-server.js'
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
