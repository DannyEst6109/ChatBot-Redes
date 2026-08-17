import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCapabilities } from '../src/ui/capabilities.js'
import { Spinner, type SpinnerOutput } from '../src/ui/spinner.js'

class Recorder implements SpinnerOutput {
  readonly writes: string[] = []
  write(text: string): void {
    this.writes.push(text)
  }
  get joined(): string {
    return this.writes.join('')
  }
}

const interactive = detectCapabilities({ isTTY: true, columns: 80, env: {} })
const redirected = detectCapabilities({ isTTY: false, columns: 80, env: {} })

test('animates and reports the current activity', () => {
  const output = new Recorder()
  const spinner = new Spinner(interactive, output)

  spinner.start('consultando el modelo')
  assert.equal(spinner.running, true)
  assert.match(output.joined, /consultando el modelo/u)

  const framesBefore = output.writes.length
  spinner.advance()
  assert.ok(output.writes.length > framesBefore, 'debe redibujar al avanzar')

  spinner.stop()
  assert.equal(spinner.running, false)
})

test('changes the label without restarting the animation', () => {
  const output = new Recorder()
  const spinner = new Spinner(interactive, output)
  spinner.start('consultando el modelo')
  spinner.setLabel('supply · list_inventory_risks')
  spinner.stop()
  assert.match(output.joined, /supply · list_inventory_risks/u)
})

test('erases itself around other output so lines never collide', () => {
  const output = new Recorder()
  const spinner = new Spinner(interactive, output)
  spinner.start('trabajando')

  let printedWhileClear = false
  spinner.around(() => {
    // The last write before this callback must have cleared the line.
    printedWhileClear = output.writes.at(-1)?.includes('[2K') ?? false
  })
  spinner.stop()

  assert.equal(printedWhileClear, true)
})

test('degrades to a single plain line when the output is redirected', () => {
  const output = new Recorder()
  const spinner = new Spinner(redirected, output)

  spinner.start('consultando el modelo')
  spinner.advance()
  spinner.advance()
  spinner.stop()

  assert.equal(output.writes.length, 1)
  assert.equal(output.joined, 'consultando el modelo\n')
  assert.ok(!output.joined.includes(''))
})
