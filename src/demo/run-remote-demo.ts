#!/usr/bin/env node
import { loadEnvironmentFile } from '../config/environment.js'
import { AuditLogger } from '../logging/audit-logger.js'
import { McpClient } from '../mcp/client.js'
import { HttpTransport } from '../mcp/http-transport.js'

await loadEnvironmentFile()

const url = process.env.SUPPLY_REMOTE_URL?.trim()
const apiKey = process.env.SUPPLY_REMOTE_API_KEY?.trim()
if (!url || !apiKey) {
  throw new Error('Set SUPPLY_REMOTE_URL and SUPPLY_REMOTE_API_KEY in .env before running the remote demo.')
}

const logger = new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', true)
const client = new McpClient('supply-remote', new HttpTransport('supply-remote', { url, apiKey }), logger)

try {
  await client.connect()
  const tools = await client.listTools()
  console.log(`Remote server: ${client.serverInfo?.name} ${client.serverInfo?.version}`)
  console.log(`Transport: ${client.transportKind}; tools: ${tools.length}`)

  const result = await client.callTool('get_supply_data_status', {})
  console.log('Remote tool result:')
  console.log(result.content.map((block) => block.text).join('\n'))
} finally {
  await client.close()
}
