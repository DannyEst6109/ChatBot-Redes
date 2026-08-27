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

/** Recibe cada interacción registrada para mostrarla en pantalla. */
export type AuditSink = (record: AuditRecord) => void

/** Formato sencillo utilizado por las demostraciones sin interfaz interactiva. */
export function defaultSink(record: AuditRecord): void {
  const outbound = record.direction === 'REQUEST' || record.direction === 'NOTIFICATION'
  console.error(`[MCP ${outbound ? '→' : '←'} ${record.server} · ${record.direction}] ${JSON.stringify(record.message)}`)
}

export class AuditLogger {
  readonly path: string
  private readonly sink: AuditSink | null

  /**
   * `output` controla la salida visible. El archivo JSONL se escribe siempre con
   * el mismo formato, aunque el registro no se muestre en la consola.
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
