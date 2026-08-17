export const CENTERS = ['DC-PROD', 'DC-STORES'] as const
export type Center = (typeof CENTERS)[number]

export const SUPPLY_STATUSES = [
  'SIN_STOCK',
  'CRITICO',
  'EN_RIESGO',
  'DSI_IDEAL',
  'EXCESO',
  'SIN_CONSUMO',
  'SIN_PARAMETROS',
] as const
export type SupplyStatus = (typeof SUPPLY_STATUSES)[number]

export interface MaterialMaster {
  center: Center
  materialCode: string
  description: string
  warehouse: string
  baseUnit: string
  purchaseUnit: string
  factorUmcToUmb: number | null
  targetDsi: number | null
  leadTimeDays: number | null
  minimumPurchaseUmc: number
  supplierCount: number
  purchaseEnabled: boolean
}

export interface InventoryRecord {
  center: Center
  materialCode: string
  onHand: number
  reserved: number
  averageDailyDemand: number
}

export interface DemandOverride {
  center: Center
  materialCode: string
  dayOffset: number
  quantity: number
}

export interface DemandPlan {
  baseDate: string
  horizonDays: number
  overrides: DemandOverride[]
}

export interface ScheduledReceipt {
  center: Center
  materialCode: string
  dayOffset: number
  quantityUmb: number
  reference: string
}

export interface SourceStatus {
  name: string
  updatedAt: string
  status: 'CURRENT' | 'STALE' | 'ERROR'
  records: number
}

export interface SourceStatusFile {
  operationalDate: string
  sources: SourceStatus[]
}

export interface SupplyDataset {
  materials: MaterialMaster[]
  inventory: InventoryRecord[]
  demandPlan: DemandPlan
  receipts: ScheduledReceipt[]
  sourceStatus: SourceStatusFile
}

export interface ProjectionDay {
  dayOffset: number
  date: string
  openingStock: number
  scheduledReceipt: number
  demand: number
  closingStock: number
  shortage: number
}

export interface MaterialStatusResult {
  operationalDate: string
  material: MaterialMaster
  inventory: InventoryRecord
  availableStock: number
  coverageDays: number | null
  criticalCoverageDays: number | null
  status: SupplyStatus
  projectedStockoutDate: string | null
  projectedStockoutDay: number | null
  scheduledReceipts: ScheduledReceipt[]
  projection: ProjectionDay[]
  warnings: string[]
}

export interface PurchaseRecommendation {
  center: Center
  materialCode: string
  description: string
  status: SupplyStatus
  deliveryDate: string | null
  deliveryDayOffset: number | null
  targetInventoryUmb: number | null
  projectedStockAtDeliveryUmb: number | null
  netRequirementUmb: number | null
  recommendedQuantityUmc: number
  recommendedQuantityUmb: number
  purchaseUnit: string
  baseUnit: string
  minimumPurchaseUmc: number
  stockoutBeforeLeadTime: boolean
  residualStockoutDate: string | null
  reason: string
  warnings: string[]
}

