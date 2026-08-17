/** What the current output device supports, resolved once at startup. */
export interface TerminalCapabilities {
  /** ANSI colour may be emitted. */
  color: boolean
  /** Text may be redrawn in place, which spinners require. */
  animate: boolean
  /** Usable width in columns for wrapping and tables. */
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
 * Resolves terminal capabilities from the output stream and the environment.
 *
 * Colour is suppressed when the output is redirected to a file or pipe, when
 * NO_COLOR is set, and on terminals that declare themselves incapable. This
 * keeps captured output readable as plain text, which matters because the
 * course demonstration redirects this program's output.
 */
export function detectCapabilities(sources: CapabilitySources = {}): TerminalCapabilities {
  const env = sources.env ?? process.env
  const isTTY = sources.isTTY ?? process.stdout.isTTY ?? false
  const columns = sources.columns ?? process.stdout.columns

  // https://no-color.org: any value, including an empty one, disables colour.
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
