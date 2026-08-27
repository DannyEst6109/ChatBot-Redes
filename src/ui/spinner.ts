import type { TerminalCapabilities } from './capabilities.js'
import { paint } from './theme.js'
import { truncate } from './render.js'

/** Salida mínima que también permite probar el indicador. */
export interface SpinnerOutput {
  write(text: string): void
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

/** Intervalo de actualización del indicador de actividad. */
const FRAME_MS = 80

const CLEAR_LINE = '\r[2K'

/**
 * Indica que el modelo o una herramienta sigue trabajando. En una salida no
 * interactiva se reemplaza por una sola línea de texto.
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
    // El temporizador no debe mantener vivo el proceso por sí solo.
    this.timer.unref?.()
  }

  /** Cambia el mensaje sin reiniciar la animación. */
  setLabel(label: string): void {
    if (this.label === label) return
    this.label = label
    if (this.active && this.capabilities.animate) this.draw()
  }

  /** Avanza un cuadro de la animación. */
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

  /** Borra temporalmente el indicador para escribir otra salida sin mezclar líneas. */
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
