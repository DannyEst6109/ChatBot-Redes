import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCapabilities } from '../src/ui/capabilities.js'
import { displayWidth, paint, statusToken, stripAnsi } from '../src/ui/theme.js'

test('suppresses colour when the output is not a terminal', () => {
  const capabilities = detectCapabilities({ isTTY: false, env: {} })
  assert.equal(capabilities.color, false)
  assert.equal(capabilities.animate, false)
})

test('honours NO_COLOR even on a terminal', () => {
  const capabilities = detectCapabilities({ isTTY: true, env: { NO_COLOR: '' } })
  assert.equal(capabilities.color, false)
})

test('clamps the width to a readable range', () => {
  assert.equal(detectCapabilities({ columns: 300, env: {} }).width, 110)
  assert.equal(detectCapabilities({ columns: 10, env: {} }).width, 48)
  assert.equal(detectCapabilities({ columns: undefined, env: {} }).width, 80)
})

test('emits no escape sequences when colour is unavailable', () => {
  const plain = detectCapabilities({ isTTY: false, env: {} })
  const painted = paint(plain, 'sinStock', 'SIN_STOCK')
  assert.equal(painted, 'SIN_STOCK')
  assert.ok(!painted.includes(''))
})

test('maps each operational status to a distinct meaning', () => {
  assert.equal(statusToken('SIN_STOCK'), 'sinStock')
  assert.equal(statusToken('CRITICO'), 'critico')
  assert.equal(statusToken('DSI_IDEAL'), 'ideal')
  assert.equal(statusToken('SIN_PARAMETROS'), 'sinDatos')
})

test('measures visible width without counting escapes', () => {
  const colored = detectCapabilities({ isTTY: true, env: {} })
  const painted = paint(colored, 'critico', 'Decoración')
  assert.ok(painted.includes(''))
  assert.equal(stripAnsi(painted), 'Decoración')
  assert.equal(displayWidth(painted), 10)
})
