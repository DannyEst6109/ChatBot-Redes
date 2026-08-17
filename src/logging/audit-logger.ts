import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { toJsonValue, type JsonValue } from '../shared/json.js'

export type AuditDirection = 'REQUEST' | 'RESPONSE' | 'NOTIFICATION' | 'SERVER_STDERR' | 'CLIENT_ERROR'

export interface AuditRecord {
  timestamp: string
  server: string
  direction: AuditDirection
  message: JsonValue
}

export class AuditLogger {
  readonly path: string

  constructor(path = 'logs/mcp-interactions.jsonl', private readonly showOnConsole = true) {
    this.path = resolve(path)
  }

  async record(server: string, direction: AuditDirection, message: unknown): Promise<void> {
    const entry: AuditRecord = {
      timestamp: new Date().toISOString(),
      server,
      direction,
      message: toJsonValue(message),
    }
    await mkdir(dirname(this.path), { recursive: true })
    await appendFile(this.path, `${JSON.stringify(entry)}\n`, 'utf8')

    if (this.showOnConsole) {
      const arrow = direction === 'REQUEST' || direction === 'NOTIFICATION' ? '→' : '←'
      console.error(`[MCP ${arrow} ${server} · ${direction}] ${JSON.stringify(entry.message)}`)
    }
  }
}

