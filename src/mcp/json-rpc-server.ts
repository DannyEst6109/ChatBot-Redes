import { ValidationError, isRecord, toJsonValue, type JsonObject, type JsonValue } from '../shared/json.js'
import {
  MCP_PROTOCOL_VERSION,
  failure,
  isJsonRpcNotification,
  isJsonRpcRequest,
  success,
  type JsonRpcFailure,
  type JsonRpcRequest,
  type JsonRpcSuccess,
  type McpCallToolResult,
  type McpServerInfo,
} from './protocol.js'
import type { ToolRegistry } from './tool-registry.js'

export type ServerResponse = JsonRpcSuccess | JsonRpcFailure | null

export class ManualMcpServer {
  private initialized = false

  constructor(
    private readonly info: McpServerInfo,
    private readonly tools: ToolRegistry,
  ) {}

  async handle(message: unknown): Promise<ServerResponse> {
    if (isJsonRpcNotification(message)) {
      if (message.method === 'notifications/initialized') this.initialized = true
      return null
    }
    if (!isJsonRpcRequest(message)) {
      return failure(null, -32600, 'Invalid Request')
    }

    try {
      return success(message.id, await this.dispatch(message))
    } catch (error) {
      if (error instanceof ValidationError) {
        return failure(message.id, -32602, 'Invalid params', { message: error.message })
      }
      if (error instanceof UnknownMethodError) {
        return failure(message.id, -32601, 'Method not found', { method: message.method })
      }
      console.error(`[supply-mcp] Unexpected error in ${message.method}:`, error)
      return failure(message.id, -32603, 'Internal error')
    }
  }

  private async dispatch(request: JsonRpcRequest): Promise<JsonValue> {
    switch (request.method) {
      case 'initialize':
        return this.initialize(request.params)
      case 'ping':
        return {}
      case 'tools/list':
        this.requireInitialized()
        return toJsonValue({ tools: this.tools.list() })
      case 'tools/call':
        this.requireInitialized()
        return toJsonValue(await this.callTool(request.params))
      default:
        throw new UnknownMethodError()
    }
  }

  private initialize(params: JsonObject | undefined): JsonValue {
    if (!params || typeof params.protocolVersion !== 'string') {
      throw new ValidationError('protocolVersion is required', 'protocolVersion')
    }
    return toJsonValue({
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: this.info,
      instructions: 'Synthetic, read-only supply planning server. All calculations are deterministic and isolated from external systems.',
    })
  }

  private async callTool(params: JsonObject | undefined): Promise<McpCallToolResult> {
    if (!params || typeof params.name !== 'string') throw new ValidationError('name is required', 'name')
    const argumentsValue = params.arguments === undefined ? {} : params.arguments
    if (!isRecord(argumentsValue)) throw new ValidationError('arguments must be an object', 'arguments')

    try {
      return await this.tools.call(params.name, argumentsValue as JsonObject)
    } catch (error) {
      if (error instanceof ValidationError || (error instanceof Error && error.message.startsWith('Unknown tool:'))) {
        return {
          content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        }
      }
      throw error
    }
  }

  private requireInitialized(): void {
    if (!this.initialized) throw new ValidationError('server has not received notifications/initialized')
  }
}

class UnknownMethodError extends Error {}

export async function handleLine(server: ManualMcpServer, line: string): Promise<string | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return JSON.stringify(failure(null, -32700, 'Parse error'))
  }
  const response = await server.handle(parsed)
  return response === null ? null : JSON.stringify(response)
}
