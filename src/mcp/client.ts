import type { AuditLogger } from '../logging/audit-logger.js'
import { isRecord, type JsonObject, type JsonValue } from '../shared/json.js'
import {
  MCP_PROTOCOL_VERSION,
  type JsonRpcFailure,
  type JsonRpcSuccess,
  type McpCallToolResult,
  type McpTool,
  type RequestId,
} from './protocol.js'
import type { McpTransport } from './transport.js'

interface PendingRequest {
  resolve(value: JsonValue): void
  reject(reason: Error): void
  timeout: NodeJS.Timeout
}

/**
 * Speaks MCP over JSON-RPC 2.0 with one server.
 *
 * This class owns the protocol only: message envelopes, the initialization
 * handshake, request/response correlation by id, and timeouts. Moving bytes is
 * delegated to an McpTransport, so the same logic serves a local child process
 * and a remote endpoint alike.
 */
export class McpClient {
  private nextId = 1
  private readonly pending = new Map<RequestId, PendingRequest>()
  private initialized = false
  private started = false
  serverInfo: { name: string; version: string } | null = null

  constructor(
    readonly name: string,
    private readonly transport: McpTransport,
    private readonly logger: AuditLogger,
    private readonly timeoutMs = 15_000,
  ) {}

  /** Reports which transport is in use, for logs and the `/servers` command. */
  get transportKind(): string {
    return this.transport.kind
  }

  async connect(): Promise<void> {
    if (this.started) return
    this.started = true

    await this.transport.start({
      message: (payload) => void this.handleMessage(payload),
      diagnostic: (origin, detail) => {
        void this.logger.record(this.name, origin === 'server' ? 'SERVER_STDERR' : 'CLIENT_ERROR', detail)
      },
      failure: (error) => this.rejectAll(error),
    })

    const initialized = await this.request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'supply-control-chatbot', version: '1.0.0' },
    })
    if (!isRecord(initialized) || !isRecord(initialized.serverInfo)) {
      throw new Error(`MCP server ${this.name} returned an invalid initialize result.`)
    }
    this.serverInfo = {
      name: typeof initialized.serverInfo.name === 'string' ? initialized.serverInfo.name : this.name,
      version: typeof initialized.serverInfo.version === 'string' ? initialized.serverInfo.version : 'unknown',
    }
    await this.notify('notifications/initialized', {})
    this.initialized = true
  }

  async listTools(): Promise<McpTool[]> {
    this.ensureInitialized()
    const result = await this.request('tools/list', {})
    if (!isRecord(result) || !Array.isArray(result.tools)) {
      throw new Error(`MCP server ${this.name} returned an invalid tools/list result.`)
    }
    return result.tools as unknown as McpTool[]
  }

  async callTool(name: string, argumentsValue: JsonObject): Promise<McpCallToolResult> {
    this.ensureInitialized()
    const result = await this.request('tools/call', { name, arguments: argumentsValue })
    if (!isRecord(result) || !Array.isArray(result.content)) {
      throw new Error(`MCP server ${this.name} returned an invalid tools/call result.`)
    }
    return result as unknown as McpCallToolResult
  }

  async close(): Promise<void> {
    this.initialized = false
    await this.transport.close()
  }

  private async request(method: string, params: JsonObject): Promise<JsonValue> {
    const id = this.nextId++
    const message = { jsonrpc: '2.0' as const, id, method, params }
    // The pending entry is registered before writing so a fast response cannot
    // arrive before this client knows how to correlate it.
    const response = new Promise<JsonValue>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`MCP request ${this.name}:${method} timed out after ${this.timeoutMs} ms.`))
      }, this.timeoutMs)
      this.pending.set(id, { resolve: resolvePromise, reject, timeout })
    })
    try {
      await this.logger.record(this.name, 'REQUEST', message)
      await this.transport.send(message)
    } catch (error) {
      const pending = this.pending.get(id)
      if (pending) clearTimeout(pending.timeout)
      this.pending.delete(id)
      throw error
    }
    return response
  }

  private async notify(method: string, params: JsonObject): Promise<void> {
    const message = { jsonrpc: '2.0' as const, method, params }
    await this.logger.record(this.name, 'NOTIFICATION', message)
    await this.transport.send(message)
  }

  private async handleMessage(payload: unknown): Promise<void> {
    const message = payload as JsonRpcSuccess | JsonRpcFailure
    await this.logger.record(this.name, 'RESPONSE', message)
    const pending = this.pending.get(message.id as RequestId)
    // Server-initiated requests and notifications are recorded but not awaited.
    if (!pending) return
    clearTimeout(pending.timeout)
    this.pending.delete(message.id as RequestId)
    if ('error' in message) pending.reject(new Error(`MCP ${message.error.code}: ${message.error.message}`))
    else pending.resolve(message.result)
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
    void this.logger.record(this.name, 'CLIENT_ERROR', { message: error.message })
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error(`MCP server ${this.name} is not initialized.`)
  }
}
