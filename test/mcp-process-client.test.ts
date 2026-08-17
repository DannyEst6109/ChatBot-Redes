import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { AuditLogger } from '../src/logging/audit-logger.js'
import { McpProcessClient } from '../src/mcp/process-client.js'

test('communicates with the compiled supply server over stdio', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'supply-mcp-test-'))
  const client = new McpProcessClient('supply-test', {
    enabled: true,
    command: process.execPath,
    args: [resolve('dist/src/mcp/supply-server-entry.js')],
    cwd: process.cwd(),
  }, new AuditLogger(join(directory, 'audit.jsonl'), false))
  context.after(() => client.close())

  await client.connect()
  const tools = await client.listTools()
  assert.equal(tools.length, 5)
  const result = await client.callTool('get_supply_data_status', {})
  assert.equal(result.isError, undefined)
  assert.match(result.content[0]?.text ?? '', /"synthetic": true/)
})

