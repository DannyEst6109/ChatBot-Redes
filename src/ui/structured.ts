import { isRecord, type JsonObject, type JsonValue } from '../shared/json.js'
import type { TerminalCapabilities } from './capabilities.js'
import { count } from './protocol-format.js'
import { renderTable, type TableCell, type TableColumn } from './table.js'
import { statusToken } from './theme.js'

const MAXIMUM_COLUMNS = 6
const MAXIMUM_ROWS = 12

/** Columns that add noise rather than meaning in a terminal table. */
const HIDDEN = new Set(['warnings', 'baseUnit'])

/**
 * Spanish headers for the fields this server returns.
 *
 * The wire format stays in English, as a protocol should; only the label a
 * person reads is translated, so the table matches the rest of the interface
 * instead of mixing languages within one line. Unknown fields fall back to the
 * derived heading, so a new tool still renders sensibly.
 */
const LABELS: Record<string, string> = {
  availableStock: 'Disponible',
  averageDailyDemand: 'Demanda diaria',
  center: 'Centro',
  closingStock: 'Stock final',
  coverageDays: 'Cobertura',
  date: 'Fecha',
  deliveryDate: 'Entrega',
  demand: 'Demanda',
  description: 'Descripción',
  factorUmcToUmb: 'Factor',
  horizonDays: 'Horizonte',
  leadTimeDays: 'Lead time',
  materialCode: 'Material',
  minimumPurchaseUmc: 'Compra mínima',
  onHand: 'Stock físico',
  openingStock: 'Stock inicial',
  operationalDate: 'Fecha',
  projectedStockoutDate: 'Agotamiento',
  purchaseUnit: 'Unidad',
  quantity: 'Cantidad',
  recommendedQuantityUmc: 'Comprar',
  reserved: 'Reservado',
  residualStockoutDate: 'Quiebre residual',
  sourceStatus: 'Estado fuente',
  status: 'Estado',
  stockoutBeforeLeadTime: 'Quiebre previo',
  supplierCount: 'Proveedores',
  targetDsi: 'DSI objetivo',
  updatedAt: 'Actualizado',
  warehouse: 'Almacén',
}

/** The reader's label for a field, falling back to a derived heading. */
export function label(key: string): string {
  return LABELS[key] ?? humanize(key)
}

/**
 * Turns the structured payload of a tool result into a table.
 *
 * The supply server returns `structuredContent` alongside its text, so the
 * interface can present the records itself instead of depending on how the
 * model chose to describe them. Detection is generic: the first array of
 * objects becomes the table, so any tool benefits without special cases.
 */
export function tableFromStructured(
  capabilities: TerminalCapabilities,
  structured: JsonValue | undefined,
): string[] | null {
  if (!isRecord(structured)) return null

  const rows = Object.values(structured).find(
    (value): value is JsonObject[] => Array.isArray(value) && value.length > 0 && value.every(isRecord),
  )
  if (rows === undefined) return null

  const first = rows[0]
  if (first === undefined) return null

  const keys = Object.keys(first)
    .filter((key) => !HIDDEN.has(key) && isScalar(first[key]))
    .slice(0, MAXIMUM_COLUMNS)
  if (keys.length === 0) return null

  const columns: TableColumn[] = keys.map((key) => ({
    header: label(key),
    ...(typeof first[key] === 'number' ? { align: 'right' as const } : {}),
  }))

  const visible = rows.slice(0, MAXIMUM_ROWS)
  const cells = visible.map((row) => keys.map((key): TableCell => toCell(key, row[key])))

  const lines = renderTable(capabilities, columns, cells)
  const hidden = rows.length - visible.length
  if (hidden > 0) lines.push(`  … ${count(hidden, 'registro más', 'registros más')}`)
  return lines
}

function toCell(key: string, value: JsonValue | undefined): TableCell {
  const text = format(value)
  // Status is the one field whose value carries urgency, so it is coloured.
  // Every other cell stays neutral to keep colour meaningful.
  return key === 'status' ? { text, token: statusToken(text) } : { text }
}

function isScalar(value: JsonValue | undefined): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

function format(value: JsonValue | undefined): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

/** `materialCode` becomes `Material code`, which reads better as a header. */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replace(/[_-]/gu, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
