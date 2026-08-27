#!/usr/bin/env node
// Demostración reproducible del uso de Filesystem y Git mediante el cliente MCP.
import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { loadMcpConfiguration } from '../config/mcp-config.js'
import { AuditLogger } from '../logging/audit-logger.js'
import { McpManager } from '../mcp/manager.js'

const run = promisify(execFile)

const workspaceRoot = process.cwd()
const scenarioRoot = resolve(workspaceRoot, 'demo-workspace')

// Git MCP no ofrece git_init, por lo que el repositorio temporal se prepara antes.
async function prepareRepository(): Promise<void> {
  await rm(scenarioRoot, { recursive: true, force: true })
  await mkdir(scenarioRoot, { recursive: true })
  await run('git', ['init', '--initial-branch=main'], { cwd: scenarioRoot })
  await run('git', ['config', 'user.name', 'MCP Scenario'], { cwd: scenarioRoot })
  await run('git', ['config', 'user.email', 'mcp-scenario@example.invalid'], { cwd: scenarioRoot })
}

await prepareRepository()

const config = await loadMcpConfiguration()
for (const [name, server] of Object.entries(config.servers)) {
  server.enabled = name === 'filesystem' || name === 'git'
  // Ambos servidores apuntan al repositorio temporal para no alterar el historial real.
  server.args = server.args.map((argument) => (argument === workspaceRoot ? scenarioRoot : argument))
}

const manager = new McpManager(config, new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', true))

async function step(title: string, tool: string, input: Record<string, unknown>): Promise<void> {
  console.log(`\n=== ${title} ===`)
  console.log(await manager.callTool(tool, input))
}

try {
  await manager.connectAll()
  if (manager.connectionErrors.size > 0) {
    throw new Error([...manager.connectionErrors.entries()].map(([name, error]) => `${name}: ${error}`).join('\n'))
  }
  console.log(`Scenario repository: ${scenarioRoot}`)
  console.log(`Connected servers: ${manager.servers().map((server) => server.name).join(', ')}`)

  await step('Filesystem: create the README', 'filesystem__write_file', {
    path: `${scenarioRoot}/README.md`,
    content: '# MCP Scenario Repository\n\nCreated by the chatbot through the official Filesystem MCP server.\n',
  })
  await step('Git: status before staging', 'git__git_status', { repo_path: scenarioRoot })
  await step('Git: stage the README', 'git__git_add', { repo_path: scenarioRoot, files: ['README.md'] })
  await step('Git: review the staged diff', 'git__git_diff_staged', { repo_path: scenarioRoot })
  await step('Git: commit the README', 'git__git_commit', {
    repo_path: scenarioRoot,
    message: 'Add README through the official MCP servers',
  })
  await step('Git: commit history', 'git__git_log', { repo_path: scenarioRoot })

  console.log('\nScenario completed. Every step above was a JSON-RPC tools/call.')
} finally {
  await manager.closeAll()
}
