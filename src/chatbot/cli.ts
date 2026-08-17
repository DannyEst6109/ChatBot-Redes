#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'

import { loadEnvironmentFile } from '../config/environment.js'
import { loadMcpConfiguration } from '../config/mcp-config.js'
import { AuditLogger } from '../logging/audit-logger.js'
import { McpManager } from '../mcp/manager.js'
import { AnthropicGateway } from './anthropic-gateway.js'
import { ChatSession } from './chat-session.js'

await loadEnvironmentFile()

// Claude Haiku 4.5 keeps the academic budget low while still supporting tool use.
const DEFAULT_MODEL = 'claude-haiku-4-5'

const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is required. Copy .env.example to .env and set your key.')
  console.error('You can run `npm run demo` without an API key.')
  process.exitCode = 1
} else {
  const config = await loadMcpConfiguration(process.env.MCP_CONFIG_PATH ?? 'config/mcp-servers.json')
  const logger = new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', true)
  const manager = new McpManager(config, logger)
  await manager.connectAll()

  if (manager.servers().length === 0) {
    console.error('No MCP server could be connected.')
    for (const [name, error] of manager.connectionErrors) console.error(`- ${name}: ${error}`)
    process.exitCode = 1
  } else {
    const tools = manager.tools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }))
    const session = new ChatSession(
      new AnthropicGateway({ apiKey, model }),
      tools,
      { execute: (name, input) => manager.callTool(name, input) },
    )
    const terminal = createInterface({ input: process.stdin, output: process.stdout })

    console.log('Supply Control MCP Chatbot · Part 1')
    console.log('All operational data is synthetic. Type /help for commands.')
    console.log(`Model: ${model}`)
    console.log(`Connected servers: ${manager.servers().map((server) => server.name).join(', ')}`)
    for (const [name, error] of manager.connectionErrors) console.warn(`Server ${name} is unavailable: ${error}`)

    let running = true
    while (running) {
      const input = (await terminal.question('\nYou> ')).trim()
      if (input === '') continue
      switch (input.toLowerCase()) {
        case '/exit':
        case '/quit':
          running = false
          break
        case '/help':
          console.log('/help /servers /tools /log /clear /exit')
          break
        case '/servers':
          console.log(JSON.stringify({ connected: manager.servers(), errors: Object.fromEntries(manager.connectionErrors) }, null, 2))
          break
        case '/tools':
          console.log(manager.tools().map((tool) => `${tool.name}: ${tool.description}`).join('\n'))
          break
        case '/log':
          console.log(logger.path)
          break
        case '/clear':
          session.clear()
          console.log('Conversation context cleared.')
          break
        default:
          try {
            const answer = await session.ask(input)
            console.log(`\nAssistant> ${answer}`)
          } catch (error) {
            console.error(`Chat error: ${error instanceof Error ? error.message : String(error)}`)
          }
      }
    }
    terminal.close()
  }
  await manager.closeAll()
}

