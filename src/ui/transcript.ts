import type { TerminalCapabilities } from './capabilities.js'
import { indent, wrap } from './render.js'
import { paint } from './theme.js'

const LABEL_WIDTH = 6

/** Presenta un turno de conversación con la etiqueta del hablante alineada. */
function turn(
  capabilities: TerminalCapabilities,
  label: string,
  token: 'user' | 'assistant',
  text: string,
): string[] {
  const gutter = ` ${label}`.padEnd(LABEL_WIDTH, ' ')
  const body = wrap(text.trim(), capabilities.width - LABEL_WIDTH)
  return indent(body.map((line) => paint(capabilities, token, line)), paint(capabilities, 'muted', gutter))
}

/** Muestra el texto recibido del usuario. */
export function userTurn(capabilities: TerminalCapabilities, text: string): string[] {
  return turn(capabilities, 'Tú', 'user', text)
}

export function assistantTurn(capabilities: TerminalCapabilities, text: string): string[] {
  return turn(capabilities, 'IA', 'assistant', plainify(text))
}

/** Elimina marcas de Markdown que una terminal no puede representar. */
export function plainify(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gsu, '$1')
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/gsu, '$1')
    .replace(/^#{1,6}\s+/gmu, '')
    .replace(/^(\s*)[-*]\s+/gmu, '$1• ')
}

/** Presenta un error que requiere atención del usuario. */
export function errorTurn(capabilities: TerminalCapabilities, text: string): string[] {
  const gutter = ' !'.padEnd(LABEL_WIDTH, ' ')
  const body = wrap(text.trim(), capabilities.width - LABEL_WIDTH)
  return indent(body.map((line) => paint(capabilities, 'error', line)), paint(capabilities, 'error', gutter))
}
