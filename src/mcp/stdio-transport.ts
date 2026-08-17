import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'

import type { JsonObject } from '../shared/json.js'
import type { McpServerConfig } from './protocol.js'
import type { McpTransport, TransportHandlers } from './transport.js'

/**
 * Runs an MCP server as a child process and exchanges newline-delimited UTF-8
 * JSON over its standard streams. stdout carries protocol messages only;
 * stderr carries diagnostics.
 */
export class StdioTransport implements McpTransport {
  readonly kind = 'stdio'
  private process: ChildProcessWithoutNullStreams | null = null
  private output: Interface | null = null
  private closing = false

  constructor(
    private readonly name: string,
    private readonly config: McpServerConfig,
  ) {}

  async start(handlers: TransportHandlers): Promise<void> {
    if (this.process) return
    const child = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    this.process = child

    child.once('error', (error) => {
      handlers.failure(new Error(`MCP server ${this.name} failed to start: ${error.message}`))
    })
    child.once('exit', (code, signal) => {
      this.process = null
      if (this.closing) return
      handlers.failure(new Error(`MCP server ${this.name} exited (code=${String(code)}, signal=${String(signal)}).`))
    })

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/u).filter(Boolean)) handlers.diagnostic('server', { line })
    })

    this.output = createInterface({ input: child.stdout, crlfDelay: Infinity, terminal: false })
    this.output.on('line', (line) => {
      if (line.trim() === '') return
      let payload: unknown
      try {
        payload = JSON.parse(line)
      } catch {
        handlers.diagnostic('client', { message: 'Server wrote non-JSON data to stdout.', line })
        return
      }
      handlers.message(payload)
    })
  }

  async send(message: JsonObject): Promise<void> {
    if (!this.process?.stdin.writable) throw new Error(`MCP server ${this.name} is not connected.`)
    this.process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  async close(): Promise<void> {
    this.closing = true
    this.output?.close()
    this.output = null
    const child = this.process
    this.process = null
    if (!child) return
    child.stdin.end()
    if (child.exitCode === null) child.kill()
  }
}
