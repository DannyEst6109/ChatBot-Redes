import type { TerminalCapabilities } from './capabilities.js'
import { displayWidth, paint } from './theme.js'

/**
 * Wraps plain text to `width` columns, preserving the author's line breaks.
 *
 * Wrapping runs on uncoloured text so the measured width matches what the
 * reader sees; colour is applied afterwards, one line at a time.
 */
export function wrap(text: string, width: number): string[] {
  if (width <= 0) return [text]
  const lines: string[] = []

  for (const paragraph of text.split(/\r?\n/u)) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of paragraph.split(/\s+/u).filter(Boolean)) {
      // A word longer than the available width is broken rather than allowed
      // to overflow, which would corrupt table and indentation alignment.
      if (displayWidth(word) > width) {
        if (current !== '') {
          lines.push(current)
          current = ''
        }
        for (const chunk of chunkWord(word, width)) lines.push(chunk)
        continue
      }
      const candidate = current === '' ? word : `${current} ${word}`
      if (displayWidth(candidate) > width) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current !== '') lines.push(current)
  }

  return lines
}

function chunkWord(word: string, width: number): string[] {
  const characters = [...word]
  const chunks: string[] = []
  for (let index = 0; index < characters.length; index += width) {
    chunks.push(characters.slice(index, index + width).join(''))
  }
  return chunks
}

/** Prefixes every line, using blanks of equal width after the first. */
export function indent(lines: readonly string[], prefix: string): string[] {
  const continuation = ' '.repeat(displayWidth(prefix))
  return lines.map((line, index) => `${index === 0 ? prefix : continuation}${line}`)
}

/** Shortens text to `width`, marking the cut with an ellipsis. */
export function truncate(text: string, width: number): string {
  if (width <= 0) return ''
  const characters = [...text]
  if (characters.length <= width) return text
  if (width === 1) return '…'
  return `${characters.slice(0, width - 1).join('')}…`
}

/** Pads text on the right to `width` visible characters. */
export function padEnd(text: string, width: number): string {
  const missing = width - displayWidth(text)
  return missing > 0 ? `${text}${' '.repeat(missing)}` : text
}

/** A horizontal rule spanning the usable width. */
export function rule(capabilities: TerminalCapabilities): string {
  return paint(capabilities, 'muted', '─'.repeat(capabilities.width))
}

export interface HeaderInfo {
  model: string
  servers: readonly string[]
  toolCount: number
  unavailable: readonly string[]
}

/**
 * Builds the fixed header: the persistent context a user needs while reading
 * the conversation, kept to two lines so it never competes with the dialogue.
 */
export function header(capabilities: TerminalCapabilities, info: HeaderInfo): string[] {
  const title = paint(capabilities, 'heading', 'Supply Control MCP')
  const model = paint(capabilities, 'muted', `· ${info.model}`)

  const servers = info.servers.length > 0
    ? info.servers.map((name) => paint(capabilities, 'success', name)).join(paint(capabilities, 'muted', ' · '))
    : paint(capabilities, 'error', 'sin servidores')
  const tools = paint(capabilities, 'muted', `· ${info.toolCount} herramientas`)

  const lines = [`${title} ${model}`, `${servers} ${tools}`]
  for (const name of info.unavailable) {
    lines.push(paint(capabilities, 'error', `no disponible: ${name}`))
  }
  lines.push(rule(capabilities))
  return lines
}
