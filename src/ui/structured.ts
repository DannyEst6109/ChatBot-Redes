import { isRecord, type JsonObject, type JsonValue } from '../shared/json.js'
import type { TerminalCapabilities } from './capabilities.js'
import { count } from './protocol-format.js'
import { renderTable, type TableCell, type TableColumn } from './table.js'
import { statusToken } from './theme.js'

const MAXIMUM_COLUMNS = 6
const MAXIMUM_ROWS = 12

/** Campos que no aportan información útil en la tabla de terminal. */
const HIDDEN = new Set(['warnings', 'baseUnit'])

/** Etiquetas en español para los campos más comunes del servidor. */
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

/** Obtiene la etiqueta de un campo o genera una a partir de su nombre. */
export function label(key: string): string {
  return LABELS[key] ?? humanize(key)
}

/** Convierte el primer arreglo de objetos de `structuredContent` en una tabla. */
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
  // Solo el estado utiliza color porque representa el nivel de urgencia.
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

/** Convierte `materialCode` en un encabezado legible. */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replace(/[_-]/gu, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
