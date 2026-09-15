export type SupplyStatus = 'SIN_STOCK' | 'CRITICO' | 'EN_RIESGO' | 'DSI_IDEAL' | 'EXCESO' | 'SIN_CONSUMO' | 'SIN_PARAMETROS'

export interface RiskRow {
  center: string
  materialCode: string
  description: string
  status: SupplyStatus
  availableStock: number
  baseUnit: string
  coverageDays: number | null
  projectedStockoutDate: string | null
  supplierCount: number
  warnings: string[]
}

export interface RiskList {
  operationalDate: string
  count: number
  risks: RiskRow[]
}

export interface MaterialStatus {
  operationalDate: string
  material: {
    center: string
    materialCode: string
    description: string
    warehouse: string
    baseUnit: string
    purchaseUnit: string
    targetDsi: number | null
    leadTimeDays: number | null
    supplierCount: number
  }
  inventory: {
    onHand: number
    reserved: number
    averageDailyDemand: number
  }
  availableStock: number
  coverageDays: number | null
  criticalCoverageDays: number | null
  status: SupplyStatus
  projectedStockoutDate: string | null
  warnings: string[]
}

export interface RecommendationExplanation {
  operationalDate: string
  material: { center: string; materialCode: string; description: string }
  calculation: {
    targetInventoryUmb: number | null
    projectedStockAtDeliveryUmb: number | null
    netRequirementUmb: number | null
    unitConversionFormula: string | null
    recommendedQuantityUmc: number
    recommendedQuantityUmb: number
  }
  riskAssessment: {
    status: SupplyStatus
    projectedStockoutDate: string | null
    stockoutBeforeLeadTime: boolean
    residualStockoutDate: string | null
  }
  explanation: string
  warnings: string[]
}

export interface DataStatus {
  operationalDate: string
  synthetic: true
  isolatedFromExternalSystems: true
  totals: { materials: number; inventoryRecords: number; demandOverrides: number; scheduledReceipts: number }
  warnings: string[]
}

export interface McpTool {
  name: string
  description: string
}

export interface ProtocolTrace {
  id: number
  method: string
  request: Record<string, unknown>
  response: Record<string, unknown> | null
  durationMs: number
  timestamp: string
}

export interface AnalysisPayload {
  selected: MaterialStatus
  recommendation: RecommendationExplanation
  traces: ProtocolTrace[]
}

export interface BootstrapPayload extends AnalysisPayload {
  synthetic: true
  risks: RiskList
  dataStatus: DataStatus
  tools: McpTool[]
}

export interface ChatPayload extends AnalysisPayload {
  answer: string
}

export interface ConversationMessage {
  id: string
  role: 'operator' | 'assistant'
  text: string
}
