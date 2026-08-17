import { createInterface } from 'node:readline'

import { handleLine, type ManualMcpServer } from './json-rpc-server.js'

export async function runStdioServer(server: ManualMcpServer): Promise<void> {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false })
  console.error('[supply-mcp] Ready on stdio. Protocol messages use stdout; diagnostics use stderr.')

  for await (const line of lines) {
    if (line.trim() === '') continue
    const response = await handleLine(server, line)
    if (response !== null) process.stdout.write(`${response}\n`)
  }
}

