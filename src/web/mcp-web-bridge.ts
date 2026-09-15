import { performance } from 'node:perf_hooks'

import { isRecord, type JsonObject, type JsonValue } from '../shared/json.js'
import { ManualMcpServer } from '../mcp/json-rpc-server.js'
import { MCP_PROTOCOL_VERSION, type JsonRpcMessage, type McpCallToolResult, type McpTool } from '../mcp/protocol.js'

export interface ProtocolTrace {
  id: number
  method: string
  request: JsonRpcMessage
  response: JsonRpcMessage | null
  durationMs: number
  timestamp: string
}

export interface ToolInvocation {
  result: McpCallToolResult
  trace: ProtocolTrace
}

export class McpWebBridge {
  private nextId = 1
  private connected = false

  constructor(private readonly server: ManualMcpServer) {}

  async connect(): Promise<void> {
    if (this.connected) return
    await this.request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'supply-control-web', version: '1.0.0' },
    })
    await this.server.handle({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
    this.connected = true
  }

  async listTools(): Promise<{ tools: McpTool[]; trace: ProtocolTrace }> {
    this.ensureConnected()
    const { result, trace } = await this.request('tools/list', {})
    if (!isRecord(result) || !Array.isArray(result.tools)) throw new Error('MCP returned an invalid tools list.')
    return { tools: result.tools as unknown as McpTool[], trace }
  }

  async callTool(name: string, argumentsValue: JsonObject): Promise<ToolInvocation> {
    this.ensureConnected()
    const { result, trace } = await this.request('tools/call', { name, arguments: argumentsValue })
    if (!isRecord(result) || !Array.isArray(result.content)) throw new Error(`MCP tool ${name} returned an invalid result.`)
    return { result: result as unknown as McpCallToolResult, trace }
  }

  private async request(method: string, params: JsonObject): Promise<{ result: JsonValue; trace: ProtocolTrace }> {
    const id = this.nextId++
    const request = { jsonrpc: '2.0' as const, id, method, params }
    const startedAt = performance.now()
    const response = await this.server.handle(request)
    const trace: ProtocolTrace = {
      id,
      method,
      request,
      response,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      timestamp: new Date().toISOString(),
    }
    if (response === null) throw new Error(`MCP request ${method} returned no response.`)
    if ('error' in response) throw new Error(`MCP ${response.error.code}: ${response.error.message}`)
    return { result: response.result, trace }
  }

  private ensureConnected(): void {
    if (!this.connected) throw new Error('The web MCP bridge is not initialized.')
  }
}
