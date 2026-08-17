import type { TerminalCapabilities } from './capabilities.js'
import { paint } from './theme.js'
import { truncate } from './render.js'

/** Minimal sink so the spinner can be driven and inspected in tests. */
export interface SpinnerOutput {
  write(text: string): void
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

/**
 * A fast frame rate is deliberate: perceived waiting time drops when the
 * indicator moves quickly, even though the request takes exactly as long.
 */
const FRAME_MS = 80

const CLEAR_LINE = '\r[2K'

/**
 * Shows that the program is working while the model or a tool responds.
 *
 * Without it the terminal stays silent for seconds and looks frozen. The
 * spinner also names the tool currently running, turning an opaque wait into
 * legible progress. On a non-interactive stream it degrades to a single
 * printed line, so redirected output stays clean.
 */
export class Spinner {
  private index = 0
  private timer: NodeJS.Timeout | null = null
  private label = ''
  private active = false

  constructor(
    private readonly capabilities: TerminalCapabilities,
    private readonly output: SpinnerOutput = process.stdout,
  ) {}

  get running(): boolean {
    return this.active
  }

  start(label: string): void {
    this.label = label
    this.active = true
    if (!this.capabilities.animate) {
      this.output.write(`${label}\n`)
      return
    }
    this.draw()
    this.timer = setInterval(() => this.advance(), FRAME_MS)
    // Never keep the process alive just to spin.
    this.timer.unref?.()
  }

  /** Replaces the message without interrupting the animation. */
  setLabel(label: string): void {
    if (this.label === label) return
    this.label = label
    if (this.active && this.capabilities.animate) this.draw()
  }

  /** Advances one frame. Called by the timer, and directly by tests. */
  advance(): void {
    this.index = (this.index + 1) % FRAMES.length
    if (this.active && this.capabilities.animate) this.draw()
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.active && this.capabilities.animate) this.output.write(CLEAR_LINE)
    this.active = false
  }

  /**
   * Erases the spinner, runs `write`, then restores it.
   *
   * MCP traffic arrives while the spinner is running; without this the two
   * would overwrite each other on the same line.
   */
  around(write: () => void): void {
    const wasActive = this.active && this.capabilities.animate
    if (wasActive) this.output.write(CLEAR_LINE)
    write()
    if (wasActive) this.draw()
  }

  private draw(): void {
    const frame = FRAMES[this.index] ?? FRAMES[0]
    const text = truncate(`${frame} ${this.label}`, this.capabilities.width - 1)
    this.output.write(`${CLEAR_LINE}${paint(this.capabilities, 'muted', text)}`)
  }
}
