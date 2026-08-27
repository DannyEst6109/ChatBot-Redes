/** Capacidades de la terminal detectadas al iniciar el programa. */
export interface TerminalCapabilities {
  /** Indica si se pueden utilizar colores ANSI. */
  color: boolean
  /** Permite redibujar una línea, requisito para el indicador de actividad. */
  animate: boolean
  /** Ancho disponible para ajustar texto y tablas. */
  width: number
}

const MINIMUM_WIDTH = 48
const MAXIMUM_WIDTH = 110

export interface CapabilitySources {
  isTTY?: boolean | undefined
  columns?: number | undefined
  env?: Record<string, string | undefined>
}

/**
 * Detecta las capacidades a partir de la salida y las variables de entorno.
 * El color se desactiva cuando la salida se redirige o se define `NO_COLOR`.
 */
export function detectCapabilities(sources: CapabilitySources = {}): TerminalCapabilities {
  const env = sources.env ?? process.env
  const isTTY = sources.isTTY ?? process.stdout.isTTY ?? false
  const columns = sources.columns ?? process.stdout.columns

  // Según https://no-color.org, cualquier valor desactiva el color.
  const disabled = env.NO_COLOR !== undefined || env.TERM === 'dumb'
  const forced = env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0'
  const color = forced || (isTTY && !disabled)

  return {
    color,
    animate: isTTY && !disabled,
    width: clampWidth(columns),
  }
}

function clampWidth(columns: number | undefined): number {
  if (columns === undefined || !Number.isFinite(columns)) return 80
  return Math.min(MAXIMUM_WIDTH, Math.max(MINIMUM_WIDTH, Math.floor(columns)))
}
