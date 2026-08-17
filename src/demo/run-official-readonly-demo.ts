#!/usr/bin/env node
import { loadMcpConfiguration } from '../config/mcp-config.js'
import { AuditLogger } from '../logging/audit-logger.js'
import { McpManager } from '../mcp/manager.js'

const selected = process.argv[2]
if (selected !== 'filesystem' && selected !== 'git') {
  throw new Error('Usage: run-official-readonly-demo <filesystem|git>')
}

const config = await loadMcpConfiguration()
for (const [name, server] of Object.entries(config.servers)) server.enabled = name === selected
const manager = new McpManager(config, new AuditLogger('logs/mcp-interactions.jsonl', true))

try {
  await manager.connectAll()
  if (manager.connectionErrors.size > 0) {
    throw new Error([...manager.connectionErrors.entries()].map(([name, error]) => `${name}: ${error}`).join('\n'))
  }
  console.log(`Connected official server: ${selected}`)
  console.log(`Discovered tools:\n${manager.tools().map((tool) => `- ${tool.originalName}`).join('\n')}`)

  const workspaceRoot = process.cwd()
  const output = selected === 'filesystem'
    ? await manager.callTool('filesystem__list_directory', { path: workspaceRoot })
    : await manager.callTool('git__git_status', { repo_path: workspaceRoot })
  console.log(`\nRead-only verification result:\n${output}`)
} finally {
  await manager.closeAll()
}

