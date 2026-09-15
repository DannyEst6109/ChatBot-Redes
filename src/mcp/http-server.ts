import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { isRecord } from '../shared/json.js'
import { failure, MCP_PROTOCOL_VERSION } from './protocol.js'
import type { ManualMcpServer } from './json-rpc-server.js'

export interface HttpServerOptions {
  port: number
  /** Cuando está definida, cada solicitud debe enviarla como `Authorization: Bearer <apiKey>`. */
  apiKey?: string
  /** Ruta del único endpoint MCP. */
  path?: string
  /** Manejador opcional para la aplicación web y su API. */
  fallback?: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>
}

const DEFAULT_PATH = '/mcp'
const SESSION_HEADER = 'mcp-session-id'
const PROTOCOL_HEADER = 'mcp-protocol-version'

/**
 * Transporte HTTP manual para MCP (subconjunto sin streaming de "Streamable
 * HTTP"): un único endpoint POST recibe un mensaje JSON-RPC por solicitud y
 * responde de forma síncrona. `initialize` abre una sesión identificada por
 * `Mcp-Session-Id`, que el cliente debe reenviar en las solicitudes
 * siguientes; así el servidor puede escalar a varias sesiones concurrentes
 * sin compartir el estado `initialized` de `ManualMcpServer` entre ellas.
 */
export async function runHttpServer(
  createSession: () => ManualMcpServer,
  options: HttpServerOptions,
): Promise<Server> {
  const path = options.path ?? DEFAULT_PATH
  const sessions = new Map<string, ManualMcpServer>()

  const server = createServer((req, res) => {
    void handleRequest(req, res).catch((error: unknown) => {
      console.error('[supply-mcp-http] Unexpected error handling request:', error)
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32603, 'Internal error')))
    })
  })

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
      return
    }

    if (req.method !== 'POST' || req.url !== path) {
      if (options.fallback && await options.fallback(req, res)) return
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32601, 'Not found')))
      return
    }

    if (options.apiKey !== undefined && req.headers.authorization !== `Bearer ${options.apiKey}`) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32000, 'Unauthorized')))
      return
    }

    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
    if (contentType !== 'application/json') {
      res.writeHead(415, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32600, 'Content-Type must be application/json')))
      return
    }

    const body = await readBody(req)
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32700, 'Parse error')))
      return
    }

    const method = isRecord(payload) && typeof payload.method === 'string' ? payload.method : undefined
    const requestSessionHeader = req.headers[SESSION_HEADER]
    const requestSessionId = typeof requestSessionHeader === 'string' ? requestSessionHeader : undefined

    let session: ManualMcpServer | undefined
    let openedSessionId: string | undefined

    if (method === 'initialize') {
      openedSessionId = randomUUID()
      session = createSession()
      sessions.set(openedSessionId, session)
    } else {
      session = requestSessionId ? sessions.get(requestSessionId) : undefined
      if (!session) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify(failure(null, -32001, 'Unknown or expired MCP session')))
        return
      }
      if (req.headers[PROTOCOL_HEADER] !== MCP_PROTOCOL_VERSION) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify(failure(null, -32600, `Mcp-Protocol-Version must be ${MCP_PROTOCOL_VERSION}`)))
        return
      }
    }

    const response = await session.handle(payload)
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (openedSessionId) headers[SESSION_HEADER] = openedSessionId

    if (response === null) {
      res.writeHead(202, headers)
      res.end()
      return
    }
    res.writeHead(200, headers)
    res.end(JSON.stringify(response))
  }

  await new Promise<void>((resolveListen) => {
    server.listen(options.port, () => resolveListen())
  })
  console.error(`[supply-mcp-http] Ready on port ${options.port}. Endpoint: POST ${path}`)
  return server
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      data += chunk
    })
    req.on('end', () => resolvePromise(data))
    req.on('error', reject)
  })
}
