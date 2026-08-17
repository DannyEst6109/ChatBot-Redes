#!/usr/bin/env node
import { AuditLogger } from '../logging/audit-logger.js'
import { loadMcpConfiguration } from '../config/mcp-config.js'
import { McpManager } from '../mcp/manager.js'

const logger = new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', true)
const manager = new McpManager(await loadMcpConfiguration(), logger)

try {
  await manager.connectAll()
  if (manager.connectionErrors.size > 0) {
    console.error('Connection errors:', Object.fromEntries(manager.connectionErrors))
  }
  const supplyTools = manager.tools().filter((tool) => tool.serverName === 'supply')
  console.log(`Connected servers: ${manager.servers().map((server) => server.name).join(', ')}`)
  console.log(`Discovered supply tools: ${supplyTools.map((tool) => tool.originalName).join(', ')}`)

  const risks = await manager.callTool('supply__list_inventory_risks', {
    center: 'DC-PROD',
    horizon_days: 7,
    limit: 5,
  })
  console.log('\nTop synthetic production risks:\n', risks)

  const explanation = await manager.callTool('supply__explain_purchase_recommendation', {
    center: 'DC-PROD',
    material_code: 'SYN-PROD-001',
  })
  console.log('\nRecommendation explanation:\n', explanation)

  const sources = await manager.callTool('supply__get_supply_data_status', {})
  console.log('\nSynthetic source status:\n', sources)
} finally {
  await manager.closeAll()
}
