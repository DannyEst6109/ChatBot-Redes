import type { JsonObject } from '../shared/json.js'
import { MCP_PROTOCOL_VERSION } from './protocol.js'
import type { McpTransport, TransportHandlers } from './transport.js'

const SESSION_HEADER = 'mcp-session-id'
const PROTOCOL_HEADER = 'mcp-protocol-version'

export interface HttpTransportConfig {
  url: string
  apiKey?: string
}

/**
 * Cliente del transporte HTTP manual descrito en `http-server.ts`. Cada
 * mensaje JSON-RPC se envía como una solicitud POST independiente; la
 * respuesta (o la ausencia de ella, para notificaciones) llega en la misma
 * respuesta HTTP, así que no se necesita un socket persistente ni SSE.
 */
export class HttpTransport implements McpTransport {
  readonly kind = 'http'
  private sessionId: string | undefined
  private handlers: TransportHandlers | undefined

  constructor(
    private readonly name: string,
    private readonly config: HttpTransportConfig,
  ) {}

  async start(handlers: TransportHandlers): Promise<void> {
    this.handlers = handlers
  }

  async send(message: JsonObject): Promise<void> {
    const handlers = this.handlers
    if (!handlers) throw new Error(`HTTP transport ${this.name} has not been started.`)

    const headers: Record<string, string> = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    }
    if (this.config.apiKey !== undefined) headers.authorization = `Bearer ${this.config.apiKey}`
    if (this.sessionId) {
      headers[SESSION_HEADER] = this.sessionId
      headers[PROTOCOL_HEADER] = MCP_PROTOCOL_VERSION
    }

    let response: Response
    try {
      response = await fetch(this.config.url, { method: 'POST', headers, body: JSON.stringify(message) })
    } catch (error) {
      const failure = new Error(`MCP server ${this.name} is unreachable: ${error instanceof Error ? error.message : String(error)}`)
      throw failure
    }

    const openedSessionId = response.headers.get(SESSION_HEADER)
    if (openedSessionId) this.sessionId = openedSessionId

    if (response.status === 202) return

    const text = await response.text()
    if (text.trim() === '') {
      if (!response.ok) {
        const failure = new Error(`MCP server ${this.name} returned HTTP ${response.status} with an empty body.`)
        throw failure
      }
      return
    }

    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      const failure = new Error(`MCP server ${this.name} returned a non-JSON HTTP ${response.status} response.`)
      handlers.diagnostic('client', { message: failure.message, status: response.status, body: text.slice(0, 500) })
      throw failure
    }
    if (!response.ok) {
      const serverMessage = typeof payload === 'object' && payload !== null && 'error' in payload
        && typeof payload.error === 'object' && payload.error !== null && 'message' in payload.error
        && typeof payload.error.message === 'string'
        ? payload.error.message
        : 'request failed'
      const failure = new Error(`MCP server ${this.name} returned HTTP ${response.status}: ${serverMessage}`)
      throw failure
    }
    handlers.message(payload)
  }

  async close(): Promise<void> {
    this.sessionId = undefined
    this.handlers = undefined
  }
}
