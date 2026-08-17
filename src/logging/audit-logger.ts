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

/** Receives every recorded interaction for display. */
export type AuditSink = (record: AuditRecord) => void

/** The plain presentation used by the demos, which have no terminal interface. */
export function defaultSink(record: AuditRecord): void {
  const outbound = record.direction === 'REQUEST' || record.direction === 'NOTIFICATION'
  console.error(`[MCP ${outbound ? '→' : '←'} ${record.server} · ${record.direction}] ${JSON.stringify(record.message)}`)
}

export class AuditLogger {
  readonly path: string
  private readonly sink: AuditSink | null

  /**
   * `output` selects the presentation: `true` keeps the plain console format,
   * `false` records silently, and a function lets the caller render records its
   * own way. The JSONL file is written identically in every case.
   */
  constructor(path = 'logs/mcp-interactions.jsonl', output: boolean | AuditSink = true) {
    this.path = resolve(path)
    this.sink = output === false ? null : output === true ? defaultSink : output
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

    this.sink?.(entry)
  }
}

