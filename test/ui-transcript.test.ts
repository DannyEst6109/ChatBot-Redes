import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCapabilities } from '../src/ui/capabilities.js'
import { count } from '../src/ui/protocol-format.js'
import { displayWidth } from '../src/ui/theme.js'
import { assistantTurn, errorTurn, plainify, userTurn } from '../src/ui/transcript.js'

const plain = detectCapabilities({ isTTY: false, columns: 60, env: {} })

test('labels each turn in a fixed gutter and aligns the continuation', () => {
  const lines = assistantTurn(plain, 'una respuesta larga '.repeat(6))
  assert.match(lines[0] ?? '', /^ IA {3}\S/u)
  assert.match(lines[1] ?? '', /^ {6}\S/u)
  for (const line of lines) assert.ok(displayWidth(line) <= 60)
})

test('keeps the user turn distinguishable from the assistant turn', () => {
  assert.match(userTurn(plain, 'hola')[0] ?? '', /^ Tú {3}hola/u)
  assert.match(errorTurn(plain, 'fallo')[0] ?? '', /^ ! {4}fallo/u)
})

test('removes markdown a terminal cannot render', () => {
  assert.equal(plainify('**SYN-PROD-004** está *agotado*'), 'SYN-PROD-004 está agotado')
  assert.equal(plainify('## Situación actual'), 'Situación actual')
  assert.equal(plainify('- primero\n- segundo'), '• primero\n• segundo')
})

test('leaves ordinary asterisks and arithmetic alone', () => {
  assert.equal(plainify('stock * precio'), 'stock * precio')
  assert.equal(plainify('2 * 3 = 6'), '2 * 3 = 6')
})

test('agrees the noun with the number', () => {
  assert.equal(count(1, 'registro', 'registros'), '1 registro')
  assert.equal(count(3, 'registro', 'registros'), '3 registros')
  assert.equal(count(0, 'registro', 'registros'), '0 registros')
})
