import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ManualMcpServer, handleLine } from '../src/mcp/json-rpc-server.js'
import { createSupplyToolRegistry } from '../src/mcp/supply-tools.js'
import { SyntheticSupplyRepository } from '../src/supply/repository.js'
import { SupplyService } from '../src/supply/service.js'

async function createServer() {
  const service = new SupplyService(await new SyntheticSupplyRepository().load())
  return new ManualMcpServer({ name: 'test-server', version: '1.0.0' }, createSupplyToolRegistry(service))
}

test('returns a JSON-RPC parse error for malformed JSON', async () => {
  const response = JSON.parse((await handleLine(await createServer(), '{bad-json')) ?? '{}')
  assert.equal(response.error.code, -32700)
  assert.equal(response.id, null)
})

test('performs MCP initialization and discovers exactly five tools', async () => {
  const server = await createServer()
  const initialized = await server.handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  })
  assert.ok(initialized && 'result' in initialized)
  await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
  const listed = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  assert.ok(listed && 'result' in listed)
  const result = listed.result as { tools: unknown[] }
  assert.equal(result.tools.length, 5)
})

test('executes tools/call and returns structured synthetic data', async () => {
  const server = await createServer()
  await server.handle({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  })
  await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
  const response = await server.handle({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_material_status', arguments: { center: 'DC-PROD', material_code: 'SYN-PROD-001' } },
  })
  assert.ok(response && 'result' in response)
  const callResult = response.result as { structuredContent: { material: { materialCode: string } } }
  assert.equal(callResult.structuredContent.material.materialCode, 'SYN-PROD-001')
})

test('returns tool errors without terminating the server', async () => {
  const server = await createServer()
  await server.handle({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  })
  await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
  const response = await server.handle({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'get_material_status', arguments: { center: 'INVALID', material_code: 'X' } },
  })
  assert.ok(response && 'result' in response)
  assert.equal((response.result as { isError: boolean }).isError, true)
})

