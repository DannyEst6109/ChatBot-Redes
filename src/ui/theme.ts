import type { TerminalCapabilities } from './capabilities.js'

/** Nombres semánticos para los colores utilizados por la interfaz. */
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

// Se usan códigos ANSI básicos para mantener compatibilidad con terminales antiguas.
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

/** Aplica el color del token cuando la terminal lo permite. */
export function paint(capabilities: TerminalCapabilities, token: Token, text: string): string {
  if (!capabilities.color || text === '') return text
  return `[${CODES[token]}m${text}${RESET}`
}

/** Asigna un color a cada estado sin utilizarlo como único indicador. */
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

/** Elimina códigos ANSI para medir únicamente el texto visible. */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\[[0-9;]*m/gu, '')
}

/** Cuenta caracteres visibles sin incluir códigos ANSI. */
export function displayWidth(text: string): number {
  return [...stripAnsi(text)].length
}
