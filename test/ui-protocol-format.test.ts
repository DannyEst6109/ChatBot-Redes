import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { AuditRecord } from '../src/logging/audit-logger.js'
import { detectCapabilities } from '../src/ui/capabilities.js'
import { ProtocolFormatter } from '../src/ui/protocol-format.js'

const plain = detectCapabilities({ isTTY: false, columns: 80, env: {} })

function record(partial: Partial<AuditRecord> & Pick<AuditRecord, 'direction' | 'message'>): AuditRecord {
  return {
    timestamp: partial.timestamp ?? '2026-08-16T18:00:00.000Z',
    server: partial.server ?? 'supply',
    direction: partial.direction,
    message: partial.message,
  }
}

test('collapses a tool call to a single readable line', () => {
  const formatter = new ProtocolFormatter(plain)
  const line = formatter.format(record({
    direction: 'REQUEST',
    message: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_inventory_risks' } },
  }))
  assert.equal(line.trim(), '→ supply · tools/call · list_inventory_risks')
})

test('reports the round-trip time and the shape of the result', () => {
  const formatter = new ProtocolFormatter(plain)
  formatter.format(record({
    timestamp: '2026-08-16T18:00:00.000Z',
    direction: 'REQUEST',
    message: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_inventory_risks' } },
  }))
  const response = formatter.format(record({
    timestamp: '2026-08-16T18:00:00.142Z',
    direction: 'RESPONSE',
    message: { jsonrpc: '2.0', id: 3, result: { content: [], structuredContent: { risks: [1, 2, 3] } } },
  }))
  assert.equal(response.trim(), '← supply · tools/call · 3 registros · 142ms')
})

test('surfaces protocol errors with their code', () => {
  const formatter = new ProtocolFormatter(plain)
  const line = formatter.format(record({
    direction: 'RESPONSE',
    message: { jsonrpc: '2.0', id: 9, error: { code: -32602, message: 'Invalid params' } },
  }))
  assert.match(line, /error -32602 · Invalid params/u)
})

test('counts the tools discovered during initialization', () => {
  const formatter = new ProtocolFormatter(plain)
  formatter.format(record({ direction: 'REQUEST', message: { id: 2, method: 'tools/list' } }))
  const line = formatter.format(record({
    direction: 'RESPONSE',
    message: { id: 2, result: { tools: [{ name: 'a' }, { name: 'b' }] } },
  }))
  assert.match(line, /tools\/list · 2 herramientas/u)
})

test('verbose mode restores the complete JSON-RPC envelope', () => {
  const formatter = new ProtocolFormatter(plain)
  assert.equal(formatter.mode, 'compact')
  assert.equal(formatter.toggle(), 'verbose')

  const message = { jsonrpc: '2.0', id: 1, method: 'initialize' }
  const line = formatter.format(record({ direction: 'REQUEST', message }))
  assert.ok(line.includes(JSON.stringify(message)))
})

test('emits no escape sequences when colour is unavailable', () => {
  const formatter = new ProtocolFormatter(plain)
  const line = formatter.format(record({ direction: 'CLIENT_ERROR', message: { message: 'servidor caido' } }))
  assert.ok(!line.includes(''))
  assert.match(line, /! supply · servidor caido/u)
})
