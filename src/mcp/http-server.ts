import { randomUUID, timingSafeEqual } from 'node:crypto'
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
  /** Tiempo de inactividad tras el cual una sesión se descarta. */
  sessionTtlMs?: number
  /** Número máximo de sesiones simultáneas. */
  maxSessions?: number
  /** Tamaño máximo aceptado para el cuerpo de una solicitud JSON-RPC. */
  maxBodyBytes?: number
}

const DEFAULT_PATH = '/mcp'
const SESSION_HEADER = 'mcp-session-id'
const PROTOCOL_HEADER = 'mcp-protocol-version'
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000
const DEFAULT_MAX_SESSIONS = 256
const DEFAULT_MAX_BODY_BYTES = 256 * 1024

interface Session {
  server: ManualMcpServer
  lastSeen: number
}

/**
 * Transporte HTTP manual para MCP (subconjunto sin streaming de "Streamable
 * HTTP"): un único endpoint POST recibe un mensaje JSON-RPC por solicitud y
 * responde de forma síncrona. `initialize` abre una sesión identificada por
 * `Mcp-Session-Id`, que el cliente debe reenviar en las solicitudes
 * siguientes; así el servidor puede escalar a varias sesiones concurrentes
 * sin compartir el estado `initialized` de `ManualMcpServer` entre ellas.
 *
 * El endpoint queda expuesto a internet, así que la sesión caduca por
 * inactividad, su número está acotado y el cuerpo de la solicitud se limita:
 * de otro modo un proceso de larga duración acumula estado sin liberarlo.
 */
export async function runHttpServer(
  createSession: () => ManualMcpServer,
  options: HttpServerOptions,
): Promise<Server> {
  const path = options.path ?? DEFAULT_PATH
  const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  const sessions = new Map<string, Session>()

  const server = createServer((req, res) => {
    void handleRequest(req, res).catch((error: unknown) => {
      if (error instanceof PayloadTooLargeError) {
        if (!res.headersSent) res.writeHead(413, { 'content-type': 'application/json' })
        res.end(JSON.stringify(failure(null, -32600, error.message)))
        return
      }
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

    const isMcpRequest = req.url === path && (req.method === 'POST' || req.method === 'DELETE')
    if (!isMcpRequest) {
      if (options.fallback && await options.fallback(req, res)) return
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32601, 'Not found')))
      return
    }

    if (options.apiKey !== undefined && !bearerMatches(req.headers.authorization, options.apiKey)) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32000, 'Unauthorized')))
      return
    }

    expireSessions()

    const requestSessionHeader = req.headers[SESSION_HEADER]
    const requestSessionId = typeof requestSessionHeader === 'string' ? requestSessionHeader : undefined

    // `DELETE` cierra la sesión explícitamente, como indica la especificación
    // de Streamable HTTP; sin él la sesión sólo se liberaría al caducar.
    if (req.method === 'DELETE') {
      const existed = requestSessionId !== undefined && sessions.delete(requestSessionId)
      res.writeHead(existed ? 204 : 404, existed ? {} : { 'content-type': 'application/json' })
      res.end(existed ? undefined : JSON.stringify(failure(null, -32001, 'Unknown or expired MCP session')))
      return
    }

    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
    if (contentType !== 'application/json') {
      res.writeHead(415, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32600, 'Content-Type must be application/json')))
      return
    }

    const body = await readBody(req, maxBodyBytes)
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify(failure(null, -32700, 'Parse error')))
      return
    }

    const method = isRecord(payload) && typeof payload.method === 'string' ? payload.method : undefined

    let session: Session | undefined
    let openedSessionId: string | undefined

    if (method === 'initialize') {
      if (sessions.size >= maxSessions) {
        res.writeHead(503, { 'content-type': 'application/json', 'retry-after': '30' })
        res.end(JSON.stringify(failure(null, -32002, 'Too many open MCP sessions')))
        return
      }
      openedSessionId = randomUUID()
      session = { server: createSession(), lastSeen: Date.now() }
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
      session.lastSeen = Date.now()
    }

    const response = await session.server.handle(payload)
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

  function expireSessions(): void {
    const deadline = Date.now() - sessionTtlMs
    for (const [id, session] of sessions) {
      if (session.lastSeen < deadline) sessions.delete(id)
    }
  }

  await new Promise<void>((resolveListen) => {
    server.listen(options.port, () => resolveListen())
  })
  console.error(`[supply-mcp-http] Ready on port ${options.port}. Endpoint: POST ${path}`)
  return server
}

/**
 * Compara el token en tiempo constante. La longitud sí se filtra, pero no el
 * contenido, que es lo que permitiría adivinar la clave byte a byte.
 */
function bearerMatches(header: string | undefined, apiKey: string): boolean {
  if (header === undefined) return false
  const received = Buffer.from(header, 'utf8')
  const expected = Buffer.from(`Bearer ${apiKey}`, 'utf8')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

class PayloadTooLargeError extends Error {}

/**
 * Deja de acumular en cuanto se excede el límite, pero sigue drenando el flujo
 * para poder responder 413 por la misma conexión; cerrar el socket de golpe le
 * llega al cliente como un error de red en lugar de como un código HTTP.
 */
function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const declared = Number(req.headers['content-length'])
  const tooLarge = new PayloadTooLargeError(`Request body must not exceed ${maxBytes} bytes`)

  return new Promise((resolvePromise, reject) => {
    if (Number.isFinite(declared) && declared > maxBytes) {
      req.resume()
      req.on('end', () => reject(tooLarge))
      req.on('error', reject)
      return
    }

    let data = ''
    let bytes = 0
    let overflowed = false
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      if (overflowed) return
      bytes += Buffer.byteLength(chunk, 'utf8')
      if (bytes > maxBytes) {
        overflowed = true
        data = ''
        return
      }
      data += chunk
    })
    req.on('end', () => overflowed ? reject(tooLarge) : resolvePromise(data))
    req.on('error', reject)
  })
}
