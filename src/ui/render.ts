import type { TerminalCapabilities } from './capabilities.js'
import { displayWidth, paint } from './theme.js'

/** Ajusta texto sin color al ancho indicado y conserva los saltos existentes. */
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
      // Las palabras demasiado largas se dividen para no desalinear la salida.
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

/** Agrega un prefijo y alinea las líneas siguientes con espacios. */
export function indent(lines: readonly string[], prefix: string): string[] {
  const continuation = ' '.repeat(displayWidth(prefix))
  return lines.map((line, index) => `${index === 0 ? prefix : continuation}${line}`)
}

/** Recorta el texto al ancho indicado y agrega puntos suspensivos. */
export function truncate(text: string, width: number): string {
  if (width <= 0) return ''
  const characters = [...text]
  if (characters.length <= width) return text
  if (width === 1) return '…'
  return `${characters.slice(0, width - 1).join('')}…`
}

/** Completa con espacios hasta alcanzar el ancho visible. */
export function padEnd(text: string, width: number): string {
  const missing = width - displayWidth(text)
  return missing > 0 ? `${text}${' '.repeat(missing)}` : text
}

/** Crea una línea horizontal del ancho disponible. */
export function rule(capabilities: TerminalCapabilities): string {
  return paint(capabilities, 'muted', '─'.repeat(capabilities.width))
}

export interface HeaderInfo {
  model: string
  servers: readonly string[]
  toolCount: number
  unavailable: readonly string[]
}

/** Construye un encabezado breve con el modelo y los servidores conectados. */
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
