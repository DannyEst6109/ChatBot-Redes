import type { TerminalCapabilities } from './capabilities.js'

/**
 * Semantic names for every colour used by the interface.
 *
 * Callers never choose a colour directly. They state what the text means, so
 * the meaning stays consistent across the transcript, tables, and headers, and
 * the palette can change in one place.
 */
export type Token =
  | 'sinStock'
  | 'critico'
  | 'enRiesgo'
  | 'ideal'
  | 'sinDatos'
  | 'user'
  | 'assistant'
  | 'protocol'
  | 'heading'
  | 'muted'
  | 'error'
  | 'success'

// Basic ANSI codes are used instead of 256-colour or truecolour because every
// terminal that supports colour at all supports these, including older Windows
// consoles.
const CODES: Record<Token, string> = {
  sinStock: '1;91', // bold bright red: stock already exhausted
  critico: '33', // amber: will be exhausted within the horizon
  enRiesgo: '93', // bright yellow: below target coverage
  ideal: '32', // green: healthy
  sinDatos: '35', // magenta: master data missing, not a risk level
  user: '96', // bright cyan
  assistant: '97', // bright white: the primary reading surface
  protocol: '90', // grey: subordinate to the conversation
  heading: '1', // bold
  muted: '2', // dim
  error: '1;91',
  success: '92',
}

const RESET = '[0m'

/** Wraps text in the colour for `token`, or returns it unchanged without colour support. */
export function paint(capabilities: TerminalCapabilities, token: Token, text: string): string {
  if (!capabilities.color || text === '') return text
  return `[${CODES[token]}m${text}${RESET}`
}

/**
 * Maps an operational status from the supply server to its colour.
 *
 * Colour is never the only signal: callers print the status label alongside it,
 * so the information survives colour blindness and redirected output.
 */
export function statusToken(status: string): Token {
  switch (status) {
    case 'SIN_STOCK':
      return 'sinStock'
    case 'CRITICO':
      return 'critico'
    case 'EN_RIESGO':
      return 'enRiesgo'
    case 'DSI_IDEAL':
      return 'ideal'
    case 'EXCESO':
    case 'SIN_CONSUMO':
      return 'muted'
    default:
      return 'sinDatos'
  }
}

/** Removes ANSI escapes so widths can be measured on the visible text. */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\[[0-9;]*m/gu, '')
}

/** Counts visible characters, ignoring escapes. */
export function displayWidth(text: string): number {
  return [...stripAnsi(text)].length
}
