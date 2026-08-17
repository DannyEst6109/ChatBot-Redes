import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'

import type { AuditLogger } from '../logging/audit-logger.js'
import { isRecord, type JsonObject, type JsonValue } from '../shared/json.js'
import {
  MCP_PROTOCOL_VERSION,
  type JsonRpcFailure,
  type JsonRpcSuccess,
  type McpCallToolResult,
  type McpServerConfig,
  type McpTool,
  type RequestId,
} from './protocol.js'

interface PendingRequest {
  resolve(value: JsonValue): void
  reject(reason: Error): void
  timeout: NodeJS.Timeout
}

export class McpProcessClient {
  private process: ChildProcessWithoutNullStreams | null = null
  private output: Interface | null = null
  private nextId = 1
  private readonly pending = new Map<RequestId, PendingRequest>()
  private initialized = false
  private closing = false
  serverInfo: { name: string; version: string } | null = null

  constructor(
    readonly name: string,
    private readonly config: McpServerConfig,
    private readonly logger: AuditLogger,
    private readonly timeoutMs = 15_000,
  ) {}

  async connect(): Promise<void> {
    if (this.process) return
    const child = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    this.process = child
    child.once('error', (error) => this.rejectAll(new Error(`MCP server ${this.name} failed to start: ${error.message}`)))
    child.once('exit', (code, signal) => {
      if (!this.closing) {
        this.rejectAll(new Error(`MCP server ${this.name} exited (code=${String(code)}, signal=${String(signal)}).`))
      }
      this.process = null
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/u).filter(Boolean)) {
        void this.logger.record(this.name, 'SERVER_STDERR', { line })
      }
    })
    this.output = createInterface({ input: child.stdout, crlfDelay: Infinity, terminal: false })
    this.output.on('line', (line) => void this.handleResponseLine(line))

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
    if (!isRecord(result) || !Array.isArray(result.tools)) throw new Error(`MCP server ${this.name} returned an invalid tools/list result.`)
    return result.tools as unknown as McpTool[]
  }

  async callTool(name: string, argumentsValue: JsonObject): Promise<McpCallToolResult> {
    this.ensureInitialized()
    const result = await this.request('tools/call', { name, arguments: argumentsValue })
    if (!isRecord(result) || !Array.isArray(result.content)) throw new Error(`MCP server ${this.name} returned an invalid tools/call result.`)
    return result as unknown as McpCallToolResult
  }

  async close(): Promise<void> {
    this.output?.close()
    this.output = null
    const child = this.process
    this.process = null
    if (!child) return
    this.closing = true
    child.stdin.end()
    if (child.exitCode === null) child.kill()
  }

  private async request(method: string, params: JsonObject): Promise<JsonValue> {
    const id = this.nextId++
    const message = { jsonrpc: '2.0' as const, id, method, params }
    const response = new Promise<JsonValue>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`MCP request ${this.name}:${method} timed out after ${this.timeoutMs} ms.`))
      }, this.timeoutMs)
      this.pending.set(id, { resolve: resolvePromise, reject, timeout })
    })
    try {
      await this.logger.record(this.name, 'REQUEST', message)
      this.write(message)
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
    this.write(message)
  }

  private write(message: unknown): void {
    if (!this.process?.stdin.writable) throw new Error(`MCP server ${this.name} is not connected.`)
    this.process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  private async handleResponseLine(line: string): Promise<void> {
    let message: JsonRpcSuccess | JsonRpcFailure
    try {
      message = JSON.parse(line) as JsonRpcSuccess | JsonRpcFailure
    } catch {
      await this.logger.record(this.name, 'CLIENT_ERROR', { message: 'Server wrote non-JSON data to stdout.', line })
      return
    }
    await this.logger.record(this.name, 'RESPONSE', message)
    const pending = this.pending.get(message.id as RequestId)
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
