import type { TerminalCapabilities } from './capabilities.js'
import { indent, wrap } from './render.js'
import { paint } from './theme.js'

const LABEL_WIDTH = 6

/**
 * Renders one conversational turn.
 *
 * The dialogue is the primary reading surface, so both turns use the full
 * width and high contrast, while the speaker label stays in a fixed gutter so
 * the eye can find the start of each turn without reading it.
 */
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

/** Echoes what the user typed, confirming immediately that it was received. */
export function userTurn(capabilities: TerminalCapabilities, text: string): string[] {
  return turn(capabilities, 'Tú', 'user', text)
}

export function assistantTurn(capabilities: TerminalCapabilities, text: string): string[] {
  return turn(capabilities, 'IA', 'assistant', plainify(text))
}

/**
 * Strips markdown the model still emits out of habit.
 *
 * A terminal cannot render `**bold**` or `## headings`, so the markers arrive
 * as literal noise. Bullets are normalised to a single character that survives
 * wrapping and indentation.
 */
export function plainify(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gsu, '$1')
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/gsu, '$1')
    .replace(/^#{1,6}\s+/gmu, '')
    .replace(/^(\s*)[-*]\s+/gmu, '$1• ')
}

/** A failure the user must act on, kept distinct from ordinary assistant text. */
export function errorTurn(capabilities: TerminalCapabilities, text: string): string[] {
  const gutter = ' !'.padEnd(LABEL_WIDTH, ' ')
  const body = wrap(text.trim(), capabilities.width - LABEL_WIDTH)
  return indent(body.map((line) => paint(capabilities, 'error', line)), paint(capabilities, 'error', gutter))
}
