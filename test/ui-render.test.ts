import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCapabilities } from '../src/ui/capabilities.js'
import { header, indent, padEnd, rule, truncate, wrap } from '../src/ui/render.js'
import { displayWidth } from '../src/ui/theme.js'

const plain = detectCapabilities({ isTTY: false, columns: 60, env: {} })

test('wraps text without exceeding the available width', () => {
  const text = 'El material SYN-PROD-004 se agota el 17 de agosto y no tiene existencias disponibles.'
  const lines = wrap(text, 30)
  for (const line of lines) assert.ok(displayWidth(line) <= 30, `linea larga: ${line}`)
  assert.equal(lines.join(' '), text)
})

test('preserves the blank lines an answer already contains', () => {
  const lines = wrap('Primero\n\nSegundo', 40)
  assert.deepEqual(lines, ['Primero', '', 'Segundo'])
})

test('breaks a word that cannot fit instead of overflowing', () => {
  const lines = wrap('SYN-PROD-0000000000000001', 10)
  for (const line of lines) assert.ok(displayWidth(line) <= 10)
  assert.equal(lines.join(''), 'SYN-PROD-0000000000000001')
})

test('indents continuation lines to align under the first', () => {
  const lines = indent(['uno', 'dos', 'tres'], ' IA   ')
  assert.equal(lines[0], ' IA   uno')
  assert.equal(lines[1], '      dos')
  assert.equal(lines[2], '      tres')
})

test('truncates with an ellipsis and never exceeds the width', () => {
  assert.equal(truncate('Chocolate cobertura', 8), 'Chocola…')
  assert.equal(truncate('corto', 20), 'corto')
  assert.equal(displayWidth(truncate('Decoración estacional', 10)), 10)
})

test('pads accented text to the requested visible width', () => {
  assert.equal(displayWidth(padEnd('Azúcar', 10)), 10)
  assert.equal(displayWidth(padEnd('Decoración estacional', 5)), 21)
})

test('draws a rule that matches the terminal width', () => {
  assert.equal(displayWidth(rule(plain)), 60)
})

test('never renders narrower than the readable minimum', () => {
  const narrow = detectCapabilities({ isTTY: false, columns: 20, env: {} })
  assert.equal(displayWidth(rule(narrow)), 48)
})

test('reports connected servers and unavailable ones in the header', () => {
  const lines = header(plain, {
    model: 'claude-haiku-4-5',
    servers: ['supply', 'filesystem'],
    toolCount: 19,
    unavailable: ['git'],
  })
  assert.match(lines[0] ?? '', /Supply Control MCP · claude-haiku-4-5/u)
  assert.match(lines[1] ?? '', /supply · filesystem · 19 herramientas/u)
  assert.match(lines[2] ?? '', /no disponible: git/u)
})
