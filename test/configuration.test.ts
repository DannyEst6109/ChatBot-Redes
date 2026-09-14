import assert from 'node:assert/strict'
import { test } from 'node:test'

import { loadMcpConfiguration } from '../src/config/mcp-config.js'

test('enables the custom server and both official reference servers by default', async () => {
  const config = await loadMcpConfiguration()
  assert.equal(config.servers.supply?.enabled, true)
  assert.equal(config.servers.filesystem?.enabled, true)
  assert.equal(config.servers.git?.enabled, true)
  const filesystemServer = config.servers.filesystem
  const gitServer = config.servers.git
  assert.ok(filesystemServer?.transport !== 'http')
  assert.ok(gitServer?.transport !== 'http')
  assert.match(filesystemServer?.args.join(' ') ?? '', /@modelcontextprotocol\/server-filesystem/)
  assert.match(gitServer?.args.join(' ') ?? '', /mcp-server-git/)
})

