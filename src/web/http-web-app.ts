import { readFile, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, relative, resolve } from 'node:path'

import { isRecord } from '../shared/json.js'
import type { WebAppController } from './app-controller.js'

const MAX_BODY_BYTES = 64 * 1024

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function createWebAppHandler(controller: WebAppController, staticRoot: string) {
  const root = resolve(staticRoot)

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === '/api/bootstrap' && req.method === 'GET') {
      return handleApi(res, () => controller.bootstrap())
    }

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      return handleApi(res, async () => {
        const body = await readJsonBody(req)
        return controller.analyze(readReference(body))
      })
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      return handleApi(res, async () => {
        const body = await readJsonBody(req)
        if (typeof body.message !== 'string' || body.message.trim() === '') throw new RequestError('Escribe una consulta antes de enviarla.')
        if (body.message.length > 1_000) throw new RequestError('La consulta no puede superar 1000 caracteres.')
        const reference = body.center === undefined && body.materialCode === undefined ? undefined : readReference(body)
        return controller.chat(body.message.trim(), reference)
      })
    }

    if (!['GET', 'HEAD'].includes(req.method ?? '')) return false
    return serveStatic(url.pathname, req.method === 'HEAD', root, res)
  }
}

async function handleApi(res: ServerResponse, operation: () => Promise<unknown>): Promise<true> {
  try {
    sendJson(res, 200, await operation())
  } catch (error) {
    const status = error instanceof RequestError ? 400 : 500
    sendJson(res, status, {
      error: error instanceof Error ? error.message : 'No fue posible completar la solicitud.',
    })
  }
  return true
}

async function serveStatic(pathname: string, headOnly: boolean, root: string, res: ServerResponse): Promise<true> {
  const decoded = decodeURIComponent(pathname)
  const requested = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  let filePath = resolve(root, requested)
  if (!isInside(root, filePath)) {
    sendJson(res, 403, { error: 'Ruta no permitida.' })
    return true
  }

  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not a file')
  } catch {
    if (extname(requested) !== '') {
      sendJson(res, 404, { error: 'Recurso no encontrado.' })
      return true
    }
    filePath = resolve(root, 'index.html')
  }

  try {
    const contents = await readFile(filePath)
    const headers = securityHeaders()
    headers['content-type'] = CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream'
    headers['cache-control'] = extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    res.writeHead(200, headers)
    res.end(headOnly ? undefined : contents)
  } catch {
    sendJson(res, 503, { error: 'La interfaz web todavía no está compilada.' })
  }
  return true
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let body = ''
  for await (const chunk of req) {
    body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw new RequestError('La solicitud es demasiado grande.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new RequestError('La solicitud debe contener JSON válido.')
  }
  if (!isRecord(parsed)) throw new RequestError('La solicitud debe ser un objeto JSON.')
  return parsed
}

function readReference(value: Record<string, unknown>): { center: string; materialCode: string } {
  if (typeof value.center !== 'string' || typeof value.materialCode !== 'string') {
    throw new RequestError('center y materialCode son obligatorios.')
  }
  return { center: value.center, materialCode: value.materialCode }
}

function isInside(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target)
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !pathFromRoot.startsWith('/') && !pathFromRoot.startsWith('\\'))
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { ...securityHeaders(), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function securityHeaders(): Record<string, string> {
  return {
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  }
}

class RequestError extends Error {}
