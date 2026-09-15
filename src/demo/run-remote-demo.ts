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

// El plan gratuito de Render suspende el servicio tras un periodo inactivo y
// el primer contacto puede tardar cerca de un minuto. Se despierta con
// /healthz antes de medir el protocolo para que la demostración en vivo no
// dependa de ese arranque en frío.
await wakeRemoteService(new URL('/healthz', url).toString())

const logger = new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', true)
const client = new McpClient('supply-remote', new HttpTransport('supply-remote', { url, apiKey }), logger, 60_000)

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

async function wakeRemoteService(healthUrl: string, attempts = 6, perAttemptMs = 20_000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(perAttemptMs) })
      if (response.ok) {
        if (attempt > 1) console.error(`[remote-demo] Service awake after ${attempt} attempts.`)
        return
      }
      console.error(`[remote-demo] Health check returned HTTP ${response.status}; retrying (${attempt}/${attempts}).`)
    } catch (error) {
      console.error(`[remote-demo] Waiting for the remote service (${attempt}/${attempts}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.error('[remote-demo] Health check never succeeded. Continuing so the protocol error is visible.')
}
