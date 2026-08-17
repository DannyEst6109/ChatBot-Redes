#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'

import { loadEnvironmentFile } from '../config/environment.js'
import { loadMcpConfiguration } from '../config/mcp-config.js'
import { AuditLogger } from '../logging/audit-logger.js'
import { McpManager } from '../mcp/manager.js'
import { detectCapabilities } from '../ui/capabilities.js'
import { ProtocolFormatter } from '../ui/protocol-format.js'
import { header, rule } from '../ui/render.js'
import { Spinner } from '../ui/spinner.js'
import { tableFromStructured } from '../ui/structured.js'
import { renderTable } from '../ui/table.js'
import { paint } from '../ui/theme.js'
import { assistantTurn, errorTurn, userTurn } from '../ui/transcript.js'
import { AnthropicGateway } from './anthropic-gateway.js'
import { ChatSession } from './chat-session.js'

await loadEnvironmentFile()

// Claude Haiku 4.5 keeps the academic budget low while still supporting tool use.
const DEFAULT_MODEL = 'claude-haiku-4-5'

const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL

// Mutable so `/plain` can turn colour off without restarting the session.
const capabilities = detectCapabilities()
const write = (lines: readonly string[]): void => {
  for (const line of lines) console.log(line)
}

if (!apiKey) {
  write(errorTurn(capabilities, 'ANTHROPIC_API_KEY is required. Copy .env.example to .env and set your key.'))
  write(errorTurn(capabilities, 'You can run `npm run demo` without an API key.'))
  process.exitCode = 1
} else {
  const formatter = new ProtocolFormatter(capabilities)
  const spinner = new Spinner(capabilities)

  const logger = new AuditLogger(process.env.MCP_LOG_PATH ?? 'logs/mcp-interactions.jsonl', (record) => {
    // Name the running tool in the spinner, so a wait becomes visible progress.
    const message = record.message
    if (record.direction === 'REQUEST' && typeof message === 'object' && message !== null && !Array.isArray(message)) {
      const params = message.params
      const tool = typeof params === 'object' && params !== null && !Array.isArray(params) ? params.name : undefined
      if (typeof tool === 'string') spinner.setLabel(`${record.server} · ${tool}`)
    }
    spinner.around(() => console.log(formatter.format(record)))
  })

  const manager = new McpManager(await loadMcpConfiguration(process.env.MCP_CONFIG_PATH ?? 'config/mcp-servers.json'), logger, (event) => {
    const table = tableFromStructured(capabilities, event.result.structuredContent)
    if (table !== null) spinner.around(() => write(table))
  })

  await manager.connectAll()

  if (manager.servers().length === 0) {
    write(errorTurn(capabilities, 'No MCP server could be connected.'))
    for (const [name, error] of manager.connectionErrors) {
      write(errorTurn(capabilities, `${name}: ${error}`))
    }
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
    // A terminal echoes what the user types, so the prompt is enough. A scripted
    // session echoes nothing, so the prompt is suppressed and the transcript
    // renders the question itself; otherwise the label would appear twice.
    const prompt = capabilities.animate ? paint(capabilities, 'user', ' Tú   ') : ''

    write(header(capabilities, {
      model,
      servers: manager.servers().map((server) => server.name),
      toolCount: tools.length,
      unavailable: [...manager.connectionErrors.keys()],
    }))
    write([paint(capabilities, 'muted', ' Datos sintéticos. /help para ver los comandos.'), ''])

    // On a terminal each turn is prompted; `question` never settles once
    // standard input ends, so the close event ends the loop. A scripted session
    // is simply iterated, which already stops at end of input.
    const closed = new Promise<null>((resolve) => terminal.once('close', () => resolve(null)))
    async function* prompted(): AsyncGenerator<string> {
      while (true) {
        const answer = await Promise.race([terminal.question(prompt), closed])
        if (answer === null) return
        yield answer
      }
    }

    let running = true
    for await (const raw of capabilities.animate ? prompted() : terminal) {
      if (!running) break
      const input = raw.trim()
      if (input === '') continue

      switch (input.toLowerCase()) {
        case '/exit':
        case '/quit':
          running = false
          break
        case '/help':
          write(commandHelp())
          break
        case '/servers':
          write(serverTable())
          break
        case '/tools':
          write(toolList())
          break
        case '/log':
          write([paint(capabilities, 'muted', `  ${logger.path}`)])
          break
        case '/verbose':
          write([paint(capabilities, 'muted', `  Registro MCP: ${formatter.toggle() === 'verbose' ? 'completo' : 'compacto'}`)])
          break
        case '/plain':
          capabilities.color = !capabilities.color
          write([`  Color: ${capabilities.color ? 'activado' : 'desactivado'}`])
          break
        case '/clear':
          session.clear()
          write([paint(capabilities, 'muted', '  Contexto de conversación borrado.')])
          break
        default:
          await ask(input)
      }
      write([''])
    }
    terminal.close()

    async function ask(question: string): Promise<void> {
      // On a terminal the prompt already shows what was typed, so echoing it
      // again would duplicate the line. When the session is scripted or piped,
      // nothing echoed it, and the transcript needs the question to make sense.
      if (!capabilities.animate) write(userTurn(capabilities, question))
      spinner.start('consultando el modelo')
      try {
        const answer = await session.ask(question)
        spinner.stop()
        write(assistantTurn(capabilities, answer))
      } catch (error) {
        spinner.stop()
        write(errorTurn(capabilities, error instanceof Error ? error.message : String(error)))
      }
    }

    function commandHelp(): string[] {
      return renderTable(capabilities, [{ header: 'Comando' }, { header: 'Qué hace' }], [
        [{ text: '/servers' }, { text: 'Servidores MCP conectados y su transporte' }],
        [{ text: '/tools' }, { text: 'Herramientas descubiertas, por servidor' }],
        [{ text: '/verbose' }, { text: 'Alterna el registro MCP compacto o completo' }],
        [{ text: '/plain' }, { text: 'Activa o desactiva el color' }],
        [{ text: '/log' }, { text: 'Ruta del archivo de auditoría' }],
        [{ text: '/clear' }, { text: 'Borra el contexto de la conversación' }],
        [{ text: '/exit' }, { text: 'Cierra los servidores y termina' }],
      ])
    }

    function serverTable(): string[] {
      const connected = manager.servers().map((server) => [
        { text: server.name },
        { text: server.transport },
        { text: server.info?.name ?? '—' },
        { text: server.info?.version ?? '—' },
      ])
      const failed = [...manager.connectionErrors.entries()].map(([name, error]) => [
        { text: name },
        { text: '—' },
        { text: 'no disponible', token: 'error' as const },
        { text: error },
      ])
      return renderTable(
        capabilities,
        [{ header: 'Servidor' }, { header: 'Transporte' }, { header: 'Implementación' }, { header: 'Versión' }],
        [...connected, ...failed],
      )
    }

    function toolList(): string[] {
      const lines: string[] = []
      for (const server of manager.servers()) {
        const owned = manager.tools().filter((tool) => tool.serverName === server.name)
        lines.push(paint(capabilities, 'heading', `  ${server.name} · ${owned.length}`))
        for (const tool of owned) {
          lines.push(paint(capabilities, 'muted', `    ${tool.originalName}`))
        }
      }
      return lines
    }
  }

  write([rule(capabilities)])
  await manager.closeAll()
}
