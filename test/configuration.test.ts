import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadMcpConfiguration } from '../src/config/mcp-config.js'

test('enables the custom server and both official reference servers by default', async () => {
  const config = await loadMcpConfiguration()
  assert.equal(config.servers.supply?.enabled, true)
  assert.equal(config.servers.filesystem?.enabled, true)
  assert.equal(config.servers.git?.enabled, true)
  assert.match(config.servers.filesystem?.args.join(' ') ?? '', /@modelcontextprotocol\/server-filesystem/)
  assert.match(config.servers.git?.args.join(' ') ?? '', /mcp-server-git/)
})

