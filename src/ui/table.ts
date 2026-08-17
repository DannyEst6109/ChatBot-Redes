import type { TerminalCapabilities } from './capabilities.js'
import { padEnd, truncate } from './render.js'
import { displayWidth, paint, type Token } from './theme.js'

export interface TableCell {
  text: string
  /** Optional meaning, used to colour the cell. */
  token?: Token
}

export interface TableColumn {
  header: string
  align?: 'left' | 'right'
}

const GAP = '  '
const MINIMUM_COLUMN = 6

/**
 * Renders aligned columns.
 *
 * Tabular data is scanned far faster in columns than in prose, and the supply
 * server already returns structured records, so the interface presents them
 * directly instead of relying on the model to describe them.
 */
export function renderTable(
  capabilities: TerminalCapabilities,
  columns: readonly TableColumn[],
  rows: readonly (readonly TableCell[])[],
): string[] {
  if (columns.length === 0) return []

  const widths = columns.map((column, index) => {
    const cells = rows.map((row) => displayWidth(row[index]?.text ?? ''))
    return Math.max(displayWidth(column.header), ...cells, MINIMUM_COLUMN)
  })

  shrinkToFit(widths, capabilities.width - 2)

  const headerLine = columns
    .map((column, index) => align(column, truncate(column.header, widths[index] ?? 0), widths[index] ?? 0))
    .join(GAP)
    .trimEnd()

  const lines = [paint(capabilities, 'heading', `  ${headerLine}`)]

  for (const row of rows) {
    const cells = columns.map((column, index) => {
      const width = widths[index] ?? 0
      const cell = row[index] ?? { text: '' }
      const text = align(column, truncate(cell.text, width), width)
      return cell.token === undefined ? text : paint(capabilities, cell.token, text)
    })
    lines.push(`  ${cells.join(GAP).trimEnd()}`)
  }

  return lines
}

function align(column: TableColumn, text: string, width: number): string {
  if (column.align !== 'right') return padEnd(text, width)
  const missing = width - displayWidth(text)
  return missing > 0 ? `${' '.repeat(missing)}${text}` : text
}

/** Narrows the widest columns until the table fits the terminal. */
function shrinkToFit(widths: number[], available: number): void {
  const gaps = GAP.length * Math.max(0, widths.length - 1)
  let total = widths.reduce((sum, width) => sum + width, 0) + gaps

  while (total > available) {
    let widest = 0
    for (let index = 1; index < widths.length; index++) {
      if ((widths[index] ?? 0) > (widths[widest] ?? 0)) widest = index
    }
    if ((widths[widest] ?? 0) <= MINIMUM_COLUMN) return
    widths[widest] = (widths[widest] ?? 0) - 1
    total -= 1
  }
}
