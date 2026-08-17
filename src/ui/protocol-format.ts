import type { AuditRecord } from '../logging/audit-logger.js'
import { isRecord } from '../shared/json.js'
import type { TerminalCapabilities } from './capabilities.js'
import { paint } from './theme.js'
import { truncate } from './render.js'

export type ProtocolVerbosity = 'compact' | 'verbose'

interface PendingRequest {
  method: string
  startedAt: number
}

/**
 * Renders MCP traffic for the terminal.
 *
 * Requirement 3 of the course asks for every interaction to be shown, but the
 * raw envelopes run to thousands of characters per call and bury the
 * conversation. The compact mode states what happened in one line per message
 * and keeps the dialogue readable; `verbose` restores the full envelopes. The
 * complete record is written to the JSONL file under both modes, so nothing is
 * lost either way.
 */
export class ProtocolFormatter {
  private readonly pending = new Map<string, PendingRequest>()

  constructor(
    private readonly capabilities: TerminalCapabilities,
    private verbosity: ProtocolVerbosity = 'compact',
  ) {}

  get mode(): ProtocolVerbosity {
    return this.verbosity
  }

  /** Switches between the one-line and full-envelope views. */
  toggle(): ProtocolVerbosity {
    this.verbosity = this.verbosity === 'compact' ? 'verbose' : 'compact'
    return this.verbosity
  }

  format(record: AuditRecord): string {
    return this.verbosity === 'verbose' ? this.formatVerbose(record) : this.formatCompact(record)
  }

  private formatVerbose(record: AuditRecord): string {
    const outbound = record.direction === 'REQUEST' || record.direction === 'NOTIFICATION'
    const arrow = outbound ? '→' : '←'
    const line = `[MCP ${arrow} ${record.server} · ${record.direction}] ${JSON.stringify(record.message)}`
    return paint(this.capabilities, 'protocol', line)
  }

  private formatCompact(record: AuditRecord): string {
    const message = isRecord(record.message) ? record.message : {}
    const token = record.direction === 'CLIENT_ERROR' ? 'error' : 'protocol'
    return paint(this.capabilities, token, `  ${this.describe(record, message)}`)
  }

  private describe(record: AuditRecord, message: Record<string, unknown>): string {
    switch (record.direction) {
      case 'REQUEST':
        return `→ ${record.server} · ${this.rememberRequest(record, message)}`
      case 'NOTIFICATION':
        return `→ ${record.server} · ${String(message.method ?? 'notificación')}`
      case 'RESPONSE':
        return `← ${record.server} · ${this.describeResponse(record, message)}`
      case 'SERVER_STDERR':
        return `· ${record.server} · ${truncate(String(message.line ?? ''), this.capabilities.width - 12)}`
      default:
        return `! ${record.server} · ${String(message.message ?? 'error de cliente')}`
    }
  }

  /** Records the request so its response can report a round-trip time. */
  private rememberRequest(record: AuditRecord, message: Record<string, unknown>): string {
    const method = String(message.method ?? 'solicitud')
    const id = message.id
    if (id !== undefined) {
      this.pending.set(`${record.server}#${String(id)}`, {
        method,
        startedAt: Date.parse(record.timestamp),
      })
    }
    const params = isRecord(message.params) ? message.params : undefined
    const tool = params && typeof params.name === 'string' ? ` · ${params.name}` : ''
    return `${method}${tool}`
  }

  private describeResponse(record: AuditRecord, message: Record<string, unknown>): string {
    const key = `${record.server}#${String(message.id)}`
    const request = this.pending.get(key)
    this.pending.delete(key)

    const elapsed = request === undefined
      ? ''
      : ` · ${Math.max(0, Date.parse(record.timestamp) - request.startedAt)}ms`

    if (isRecord(message.error)) {
      const code = String(message.error.code ?? '')
      return `error ${code} · ${String(message.error.message ?? '')}${elapsed}`
    }

    const method = request?.method ?? 'respuesta'
    return `${method} · ${summarize(message.result)}${elapsed}`
  }
}

/** Describes a result by shape rather than dumping it. */
function summarize(result: unknown): string {
  if (!isRecord(result)) return 'ok'
  if (Array.isArray(result.tools)) return `${result.tools.length} herramientas`
  if (isRecord(result.structuredContent)) {
    const rows = Object.values(result.structuredContent).find(Array.isArray)
    if (Array.isArray(rows)) return `${rows.length} registros`
  }
  if (result.isError === true) return 'error de herramienta'
  if (Array.isArray(result.content)) return 'ok'
  if (isRecord(result.serverInfo)) return String(result.serverInfo.name ?? 'ok')
  return 'ok'
}
