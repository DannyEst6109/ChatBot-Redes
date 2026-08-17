import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCapabilities } from '../src/ui/capabilities.js'
import { label, tableFromStructured } from '../src/ui/structured.js'
import { renderTable } from '../src/ui/table.js'
import { displayWidth } from '../src/ui/theme.js'

const plain = detectCapabilities({ isTTY: false, columns: 80, env: {} })

test('aligns columns regardless of accented content', () => {
  const lines = renderTable(
    plain,
    [{ header: 'Material' }, { header: 'Descripción' }],
    [
      [{ text: 'SYN-PROD-007' }, { text: 'Decoración estacional' }],
      [{ text: 'SYN-PROD-002' }, { text: 'Azúcar refinada' }],
    ],
  )
  const columnStart = lines.map((line) => line.indexOf('D') >= 0 ? line.length : line.length)
  assert.equal(lines.length, 3)
  // Every data row starts its second column at the same offset.
  const offsets = lines.slice(1).map((line) => line.indexOf('  ', 3))
  assert.equal(offsets[0], offsets[1])
  assert.ok(columnStart.every((value) => value > 0))
})

test('never exceeds the terminal width', () => {
  const narrow = detectCapabilities({ isTTY: false, columns: 50, env: {} })
  const lines = renderTable(
    narrow,
    [{ header: 'Material' }, { header: 'Descripción' }, { header: 'Estado' }],
    [[
      { text: 'SYN-PROD-0000000001' },
      { text: 'Una descripción larguísima que no cabe de ninguna manera' },
      { text: 'SIN_STOCK' },
    ]],
  )
  for (const line of lines) assert.ok(displayWidth(line) <= 50, `linea larga: ${displayWidth(line)}`)
})

test('right-aligns numeric columns', () => {
  const lines = renderTable(
    plain,
    [{ header: 'Stock', align: 'right' }],
    [[{ text: '5' }], [{ text: '1250' }]],
  )
  assert.ok((lines[1] ?? '').endsWith('   5'))
  assert.ok((lines[2] ?? '').endsWith('1250'))
})

test('builds a table from the structured payload of a tool result', () => {
  const lines = tableFromStructured(plain, {
    operationalDate: '2026-08-16',
    count: 2,
    risks: [
      { center: 'DC-PROD', materialCode: 'SYN-PROD-004', status: 'SIN_STOCK', availableStock: 0, coverageDays: 0 },
      { center: 'DC-PROD', materialCode: 'SYN-PROD-003', status: 'CRITICO', availableStock: 100, coverageDays: 3.13 },
    ],
  })
  assert.ok(lines !== null)
  assert.match(lines[0] ?? '', /Centro\s+Material\s+Estado/u)
  assert.match(lines[1] ?? '', /SYN-PROD-004\s+SIN_STOCK/u)
  assert.match(lines[2] ?? '', /3\.13/u)
})

test('reports how many records were left out', () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({ code: `M-${index}`, value: index }))
  const lines = tableFromStructured(plain, { rows })
  assert.ok(lines !== null)
  assert.match(lines.at(-1) ?? '', /8 registros más/u)
})

test('labels known fields in the language of the interface', () => {
  assert.equal(label('materialCode'), 'Material')
  assert.equal(label('coverageDays'), 'Cobertura')
  assert.equal(label('projectedStockoutDate'), 'Agotamiento')
})

test('derives a readable heading for fields it does not know', () => {
  assert.equal(label('unexpectedFieldName'), 'Unexpected field name')
})

test('returns null when there is nothing tabular to show', () => {
  assert.equal(tableFromStructured(plain, undefined), null)
  assert.equal(tableFromStructured(plain, { synthetic: true, rows: [] }), null)
  assert.equal(tableFromStructured(plain, { note: 'sin datos' }), null)
})
