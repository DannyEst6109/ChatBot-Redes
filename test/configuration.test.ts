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

test('enables the remote supply server when its URL and API key are configured', async () => {
  const previousUrl = process.env.SUPPLY_REMOTE_URL
  const previousKey = process.env.SUPPLY_REMOTE_API_KEY
  process.env.SUPPLY_REMOTE_URL = 'https://example.invalid/mcp'
  process.env.SUPPLY_REMOTE_API_KEY = 'test-key'
  try {
    const config = await loadMcpConfiguration()
    assert.equal(config.servers['supply-remote']?.enabled, true)
    assert.equal(config.servers['supply-remote']?.transport, 'http')
  } finally {
    if (previousUrl === undefined) delete process.env.SUPPLY_REMOTE_URL
    else process.env.SUPPLY_REMOTE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPPLY_REMOTE_API_KEY
    else process.env.SUPPLY_REMOTE_API_KEY = previousKey
  }
})
