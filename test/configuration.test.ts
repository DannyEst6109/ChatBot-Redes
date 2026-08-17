import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadMcpConfiguration } from '../src/config/mcp-config.js'

test('contains the custom server and configurable official reference servers', async () => {
  const config = await loadMcpConfiguration()
  assert.equal(config.servers.supply?.enabled, true)
  assert.match(config.servers.filesystem?.args.join(' ') ?? '', /@modelcontextprotocol\/server-filesystem/)
  assert.match(config.servers.git?.args.join(' ') ?? '', /mcp-server-git/)
})

