import type { JsonObject } from '../shared/json.js'
import type { McpTransport, TransportHandlers } from './transport.js'

const SESSION_HEADER = 'mcp-session-id'

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

    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.config.apiKey !== undefined) headers.authorization = `Bearer ${this.config.apiKey}`
    if (this.sessionId) headers[SESSION_HEADER] = this.sessionId

    let response: Response
    try {
      response = await fetch(this.config.url, { method: 'POST', headers, body: JSON.stringify(message) })
    } catch (error) {
      const failure = new Error(`MCP server ${this.name} is unreachable: ${error instanceof Error ? error.message : String(error)}`)
      handlers.failure(failure)
      throw failure
    }

    const openedSessionId = response.headers.get(SESSION_HEADER)
    if (openedSessionId) this.sessionId = openedSessionId

    handlers.diagnostic('client', { message: 'HTTP response received.', status: response.status, url: this.config.url })

    if (response.status === 202) return

    const text = await response.text()
    if (text.trim() === '') return

    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      handlers.diagnostic('client', { message: 'Server returned a non-JSON HTTP body.', status: response.status, body: text })
      return
    }
    handlers.message(payload)
  }

  async close(): Promise<void> {
    this.sessionId = undefined
    this.handlers = undefined
  }
}
