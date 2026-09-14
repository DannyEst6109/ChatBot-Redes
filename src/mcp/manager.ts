import type { AuditLogger } from '../logging/audit-logger.js'
import { isRecord, type JsonObject } from '../shared/json.js'
import { McpClient } from './client.js'
import { HttpTransport } from './http-transport.js'
import type { McpCallToolResult, McpConfigFile, McpTool } from './protocol.js'
import { StdioTransport } from './stdio-transport.js'
import type { McpTransport } from './transport.js'

export interface QualifiedTool {
  name: string
  description: string
  inputSchema: JsonObject
  serverName: string
  originalName: string
}

/** Notifica cada resultado para que la interfaz pueda representarlo. */
export type ToolResultObserver = (event: {
  server: string
  tool: string
  result: McpCallToolResult
}) => void

export class McpManager {
  private readonly clients = new Map<string, McpClient>()
  private readonly toolIndex = new Map<string, QualifiedTool>()
  readonly connectionErrors = new Map<string, string>()

  constructor(
    private readonly config: McpConfigFile,
    private readonly logger: AuditLogger,
    private readonly observer?: ToolResultObserver,
  ) {}

  async connectAll(): Promise<void> {
    for (const [name, serverConfig] of Object.entries(this.config.servers)) {
      if (!serverConfig.enabled) continue
      const transport: McpTransport = serverConfig.transport === 'http'
        ? new HttpTransport(name, { url: serverConfig.url, ...(serverConfig.apiKey === undefined ? {} : { apiKey: serverConfig.apiKey }) })
        : new StdioTransport(name, serverConfig)
      const client = new McpClient(name, transport, this.logger)
      try {
        await client.connect()
        this.clients.set(name, client)
        const tools = await client.listTools()
        for (const tool of tools) {
          const qualifiedName = `${name}__${tool.name}`.replace(/[^a-zA-Z0-9_-]/gu, '_')
          this.toolIndex.set(qualifiedName, {
            name: qualifiedName,
            description: `[${name}] ${tool.description}`,
            inputSchema: tool.inputSchema,
            serverName: name,
            originalName: tool.name,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.connectionErrors.set(name, message)
        await client.close()
      }
    }
  }

  tools(): QualifiedTool[] {
    return [...this.toolIndex.values()]
  }

  servers() {
    return [...this.clients.entries()].map(([name, client]) => ({
      name,
      transport: client.transportKind,
      info: client.serverInfo,
    }))
  }

  async callTool(qualifiedName: string, input: unknown): Promise<string> {
    const tool = this.toolIndex.get(qualifiedName)
    if (!tool) throw new Error(`Unknown qualified MCP tool: ${qualifiedName}`)
    if (!isRecord(input)) throw new Error(`Tool ${qualifiedName} input must be an object.`)
    const client = this.clients.get(tool.serverName)
    if (!client) throw new Error(`MCP server ${tool.serverName} is not connected.`)
    const result = await client.callTool(tool.originalName, input as JsonObject)
    this.observer?.({ server: tool.serverName, tool: tool.originalName, result })
    const text = result.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n')
    if (result.isError) throw new Error(text || `MCP tool ${qualifiedName} failed.`)
    return text || JSON.stringify(result.structuredContent ?? {})
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.clients.values()].map((client) => client.close()))
    this.clients.clear()
    this.toolIndex.clear()
  }
}
