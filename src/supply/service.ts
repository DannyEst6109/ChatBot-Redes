import { ValidationError } from '../shared/json.js'
import {
  CENTERS,
  SUPPLY_STATUSES,
  type Center,
  type InventoryRecord,
  type MaterialMaster,
  type MaterialStatusResult,
  type ProjectionDay,
  type PurchaseRecommendation,
  type ScheduledReceipt,
  type SupplyDataset,
  type SupplyStatus,
} from './types.js'

const EPSILON = 1e-9
const STATUS_PRIORITY: Record<SupplyStatus, number> = {
  SIN_STOCK: 0,
  CRITICO: 1,
  EN_RIESGO: 2,
  SIN_PARAMETROS: 3,
  DSI_IDEAL: 4,
  EXCESO: 5,
  SIN_CONSUMO: 6,
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function key(center: string, materialCode: string): string {
  return `${center}|${materialCode}`
}

export class SupplyService {
  private readonly materialByKey = new Map<string, MaterialMaster>()
  private readonly inventoryByKey = new Map<string, InventoryRecord>()
  private readonly overridesByKey = new Map<string, Map<number, number>>()
  private readonly receiptsByKey = new Map<string, ScheduledReceipt[]>()

  constructor(readonly dataset: SupplyDataset) {
    for (const material of dataset.materials) this.materialByKey.set(key(material.center, material.materialCode), material)
    for (const inventory of dataset.inventory) this.inventoryByKey.set(key(inventory.center, inventory.materialCode), inventory)
    for (const override of dataset.demandPlan.overrides) {
      const materialKey = key(override.center, override.materialCode)
      const values = this.overridesByKey.get(materialKey) ?? new Map<number, number>()
      values.set(override.dayOffset, override.quantity)
      this.overridesByKey.set(materialKey, values)
    }
    for (const receipt of dataset.receipts) {
      const materialKey = key(receipt.center, receipt.materialCode)
      const values = this.receiptsByKey.get(materialKey) ?? []
      values.push(receipt)
      this.receiptsByKey.set(materialKey, values)
    }
  }

  centers(): readonly Center[] {
    return CENTERS
  }

  statuses(): readonly SupplyStatus[] {
    return SUPPLY_STATUSES
  }

  getMaterialStatus(center: string, materialCode: string, horizonDays = 30): MaterialStatusResult {
    const normalizedCenter = this.validateCenter(center)
    const normalizedCode = materialCode.trim().toUpperCase()
    const materialKey = key(normalizedCenter, normalizedCode)
    const material = this.materialByKey.get(materialKey)
    const inventory = this.inventoryByKey.get(materialKey)
    if (!material || !inventory) {
      throw new ValidationError(`material ${normalizedCenter}|${normalizedCode} was not found`)
    }

    const availableStock = Math.max(0, inventory.onHand - inventory.reserved)
    const coverageDays = inventory.averageDailyDemand > EPSILON
      ? round(availableStock / inventory.averageDailyDemand, 2)
      : null
    const criticalCoverageDays = material.leadTimeDays === null ? null : Math.max(1, material.leadTimeDays)
    const status = this.classify(material, inventory, availableStock, coverageDays, criticalCoverageDays)
    const projection = this.project(material, inventory, horizonDays)
    const stockout = projection.find((day) => day.closingStock <= EPSILON)
    const warnings = this.warnings(material, inventory)

    return {
      operationalDate: this.dataset.sourceStatus.operationalDate,
      material,
      inventory,
      availableStock: round(availableStock),
      coverageDays,
      criticalCoverageDays,
      status,
      projectedStockoutDate: stockout?.date ?? null,
      projectedStockoutDay: stockout?.dayOffset ?? null,
      scheduledReceipts: [...(this.receiptsByKey.get(materialKey) ?? [])].sort((a, b) => a.dayOffset - b.dayOffset),
      projection,
      warnings,
    }
  }

  listInventoryRisks(options: {
    center?: string | undefined
    horizonDays?: number | undefined
    statuses?: string[] | undefined
    limit?: number | undefined
  } = {}) {
    const center = options.center === undefined ? undefined : this.validateCenter(options.center)
    const horizonDays = options.horizonDays ?? 7
    const limit = options.limit ?? 20
    const requestedStatuses = options.statuses?.map((status) => this.validateStatus(status))
    const rows = this.dataset.materials
      .filter((material) => center === undefined || material.center === center)
      .map((material) => this.getMaterialStatus(material.center, material.materialCode, horizonDays))
      .filter((row) => requestedStatuses === undefined || requestedStatuses.includes(row.status))
      .sort((a, b) => {
        const byStatus = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
        if (byStatus !== 0) return byStatus
        const aStockout = a.projectedStockoutDay ?? Number.POSITIVE_INFINITY
        const bStockout = b.projectedStockoutDay ?? Number.POSITIVE_INFINITY
        return aStockout - bStockout || a.material.materialCode.localeCompare(b.material.materialCode)
      })
      .slice(0, limit)
      .map((row) => ({
        center: row.material.center,
        materialCode: row.material.materialCode,
        description: row.material.description,
        status: row.status,
        availableStock: row.availableStock,
        baseUnit: row.material.baseUnit,
        coverageDays: row.coverageDays,
        projectedStockoutDate: row.projectedStockoutDate,
        supplierCount: row.material.supplierCount,
        warnings: row.warnings,
      }))

    return {
      operationalDate: this.dataset.sourceStatus.operationalDate,
      horizonDays,
      filters: { center: center ?? null, statuses: requestedStatuses ?? [] },
      count: rows.length,
      risks: rows,
    }
  }

  getPurchaseRecommendation(center: string, materialCode: string): PurchaseRecommendation {
    const status = this.getMaterialStatus(center, materialCode)
    const { material, inventory } = status
    const warnings = [...status.warnings]

    if (!material.purchaseEnabled) {
      return this.noRecommendation(status, 'Purchase is disabled in the synthetic material master.')
    }
    if (material.targetDsi === null || material.leadTimeDays === null || material.factorUmcToUmb === null) {
      return this.noRecommendation(status, 'Required planning parameters are missing.')
    }
    if (inventory.averageDailyDemand <= EPSILON) {
      return this.noRecommendation(status, 'Average daily demand is zero; no purchase target can be calculated.')
    }

    const deliveryDayOffset = Math.max(0, Math.ceil(material.leadTimeDays))
    const projectionToDelivery = this.project(material, inventory, deliveryDayOffset)
    const projectedStockAtDeliveryUmb = deliveryDayOffset === 0
      ? status.availableStock
      : projectionToDelivery.at(-1)?.closingStock ?? status.availableStock
    const targetInventoryUmb = inventory.averageDailyDemand * material.targetDsi
    const netRequirementUmb = Math.max(0, targetInventoryUmb - projectedStockAtDeliveryUmb)
    const rawQuantityUmc = Math.ceil(netRequirementUmb / material.factorUmcToUmb)
    const recommendedQuantityUmc = rawQuantityUmc > 0
      ? Math.max(rawQuantityUmc, Math.ceil(material.minimumPurchaseUmc))
      : 0
    const recommendedQuantityUmb = recommendedQuantityUmc * material.factorUmcToUmb
    const stockoutBeforeLeadTime = status.projectedStockoutDay !== null && status.projectedStockoutDay < deliveryDayOffset

    if (stockoutBeforeLeadTime) {
      warnings.push('Projected stockout occurs before a new purchase can arrive; operational contingency is required.')
    }

    const residualStockoutDate = this.projectWithPurchase(
      material,
      inventory,
      deliveryDayOffset,
      recommendedQuantityUmb,
      this.dataset.demandPlan.horizonDays,
    ).find((day) => day.dayOffset >= deliveryDayOffset && day.closingStock <= EPSILON)?.date ?? null

    return {
      center: material.center,
      materialCode: material.materialCode,
      description: material.description,
      status: status.status,
      deliveryDate: addDays(this.dataset.sourceStatus.operationalDate, deliveryDayOffset),
      deliveryDayOffset,
      targetInventoryUmb: round(targetInventoryUmb),
      projectedStockAtDeliveryUmb: round(projectedStockAtDeliveryUmb),
      netRequirementUmb: round(netRequirementUmb),
      recommendedQuantityUmc,
      recommendedQuantityUmb: round(recommendedQuantityUmb),
      purchaseUnit: material.purchaseUnit,
      baseUnit: material.baseUnit,
      minimumPurchaseUmc: material.minimumPurchaseUmc,
      stockoutBeforeLeadTime,
      residualStockoutDate,
      reason: recommendedQuantityUmc > 0
        ? 'Replenish projected stock at the first feasible delivery to the configured target DSI.'
        : 'Projected stock and scheduled receipts already cover the target DSI at the first feasible delivery.',
      warnings,
    }
  }

  getPurchaseRecommendations(options: {
    center?: string | undefined
    onlyWithOrder?: boolean | undefined
    onlyWithResidualShortage?: boolean | undefined
    limit?: number | undefined
  } = {}) {
    const center = options.center === undefined ? undefined : this.validateCenter(options.center)
    const limit = options.limit ?? 20
    const recommendations = this.dataset.materials
      .filter((material) => center === undefined || material.center === center)
      .map((material) => this.getPurchaseRecommendation(material.center, material.materialCode))
      .filter((row) => options.onlyWithOrder !== true || row.recommendedQuantityUmc > 0)
      .filter((row) => options.onlyWithResidualShortage !== true || row.stockoutBeforeLeadTime || row.residualStockoutDate !== null)
      .sort((a, b) => {
        const byRisk = Number(b.stockoutBeforeLeadTime) - Number(a.stockoutBeforeLeadTime)
        return byRisk || b.recommendedQuantityUmb - a.recommendedQuantityUmb || a.materialCode.localeCompare(b.materialCode)
      })
      .slice(0, limit)

    return {
      operationalDate: this.dataset.sourceStatus.operationalDate,
      count: recommendations.length,
      recommendations,
    }
  }

  explainPurchaseRecommendation(center: string, materialCode: string) {
    const status = this.getMaterialStatus(center, materialCode)
    const recommendation = this.getPurchaseRecommendation(center, materialCode)
    const factor = status.material.factorUmcToUmb
    const formula = factor === null || recommendation.netRequirementUmb === null
      ? null
      : `ceil(${recommendation.netRequirementUmb} ${recommendation.baseUnit} / ${factor} ${recommendation.baseUnit} per ${recommendation.purchaseUnit})`

    return {
      operationalDate: status.operationalDate,
      material: {
        center: status.material.center,
        materialCode: status.material.materialCode,
        description: status.material.description,
      },
      observedInputs: {
        onHand: status.inventory.onHand,
        reserved: status.inventory.reserved,
        availableStock: status.availableStock,
        averageDailyDemand: status.inventory.averageDailyDemand,
        coverageDays: status.coverageDays,
        targetDsi: status.material.targetDsi,
        leadTimeDays: status.material.leadTimeDays,
        factorUmcToUmb: status.material.factorUmcToUmb,
        minimumPurchaseUmc: status.material.minimumPurchaseUmc,
        scheduledReceipts: status.scheduledReceipts,
      },
      calculation: {
        targetInventoryUmb: recommendation.targetInventoryUmb,
        projectedStockAtDeliveryUmb: recommendation.projectedStockAtDeliveryUmb,
        netRequirementUmb: recommendation.netRequirementUmb,
        unitConversionFormula: formula,
        minimumRule: 'The minimum is a floor per order, not a multiple.',
        recommendedQuantityUmc: recommendation.recommendedQuantityUmc,
        recommendedQuantityUmb: recommendation.recommendedQuantityUmb,
      },
      riskAssessment: {
        status: status.status,
        projectedStockoutDate: status.projectedStockoutDate,
        stockoutBeforeLeadTime: recommendation.stockoutBeforeLeadTime,
        residualStockoutDate: recommendation.residualStockoutDate,
      },
      explanation: recommendation.reason,
      warnings: recommendation.warnings,
    }
  }

  getSupplyDataStatus() {
    const warnings = this.dataset.sourceStatus.sources
      .filter((source) => source.status !== 'CURRENT')
      .map((source) => `${source.name} is ${source.status.toLowerCase()}.`)
    const missingParameters = this.dataset.materials.filter((material) =>
      material.targetDsi === null || material.leadTimeDays === null || material.factorUmcToUmb === null,
    ).length
    if (missingParameters > 0) warnings.push(`${missingParameters} material(s) have missing planning parameters.`)

    return {
      operationalDate: this.dataset.sourceStatus.operationalDate,
      synthetic: true,
      isolatedFromExternalSystems: true,
      sources: this.dataset.sourceStatus.sources,
      totals: {
        materials: this.dataset.materials.length,
        inventoryRecords: this.dataset.inventory.length,
        demandOverrides: this.dataset.demandPlan.overrides.length,
        scheduledReceipts: this.dataset.receipts.length,
      },
      warnings,
    }
  }

  private validateCenter(value: string): Center {
    const normalized = value.trim().toUpperCase()
    if (!CENTERS.includes(normalized as Center)) {
      throw new ValidationError(`center must be one of: ${CENTERS.join(', ')}`)
    }
    return normalized as Center
  }

  private validateStatus(value: string): SupplyStatus {
    const normalized = value.trim().toUpperCase()
    if (!SUPPLY_STATUSES.includes(normalized as SupplyStatus)) {
      throw new ValidationError(`status must be one of: ${SUPPLY_STATUSES.join(', ')}`)
    }
    return normalized as SupplyStatus
  }

  private classify(
    material: MaterialMaster,
    inventory: InventoryRecord,
    availableStock: number,
    coverageDays: number | null,
    criticalCoverageDays: number | null,
  ): SupplyStatus {
    if (material.targetDsi === null || material.leadTimeDays === null || material.factorUmcToUmb === null) return 'SIN_PARAMETROS'
    if (inventory.averageDailyDemand <= EPSILON) return 'SIN_CONSUMO'
    if (availableStock <= EPSILON) return 'SIN_STOCK'
    if (coverageDays !== null && criticalCoverageDays !== null && coverageDays <= criticalCoverageDays) return 'CRITICO'
    if (coverageDays !== null && coverageDays < material.targetDsi) return 'EN_RIESGO'
    if (coverageDays !== null && coverageDays > material.targetDsi * 1.5) return 'EXCESO'
    return 'DSI_IDEAL'
  }

  private warnings(material: MaterialMaster, inventory: InventoryRecord): string[] {
    const warnings: string[] = []
    if (material.targetDsi === null) warnings.push('Target DSI is missing.')
    if (material.leadTimeDays === null) warnings.push('Lead time is missing.')
    if (material.factorUmcToUmb === null || material.factorUmcToUmb <= 0) warnings.push('Purchase-to-base unit conversion is missing.')
    if (!material.purchaseEnabled) warnings.push('Purchasing is disabled for this material.')
    if (inventory.averageDailyDemand <= EPSILON) warnings.push('No average demand is available.')
    if (material.supplierCount <= 1) warnings.push('Single-source supplier dependency.')
    return warnings
  }

  private project(material: MaterialMaster, inventory: InventoryRecord, horizonDays: number): ProjectionDay[] {
    return this.projectWithPurchase(material, inventory, -1, 0, horizonDays)
  }

  private projectWithPurchase(
    material: MaterialMaster,
    inventory: InventoryRecord,
    purchaseDayOffset: number,
    purchaseQuantityUmb: number,
    horizonDays: number,
  ): ProjectionDay[] {
    const materialKey = key(material.center, material.materialCode)
    const overrides = this.overridesByKey.get(materialKey) ?? new Map<number, number>()
    const receipts = this.receiptsByKey.get(materialKey) ?? []
    let stock = Math.max(0, inventory.onHand - inventory.reserved)
    const days: ProjectionDay[] = []

    for (let dayOffset = 1; dayOffset <= horizonDays; dayOffset++) {
      const openingStock = stock
      const scheduledReceipt = receipts
        .filter((receipt) => receipt.dayOffset === dayOffset)
        .reduce((sum, receipt) => sum + receipt.quantityUmb, 0) +
        (purchaseDayOffset === dayOffset ? purchaseQuantityUmb : 0)
      const demand = overrides.get(dayOffset) ?? inventory.averageDailyDemand
      const rawClosing = openingStock + scheduledReceipt - demand
      const shortage = Math.max(0, -rawClosing)
      stock = Math.max(0, rawClosing)
      days.push({
        dayOffset,
        date: addDays(this.dataset.sourceStatus.operationalDate, dayOffset),
        openingStock: round(openingStock),
        scheduledReceipt: round(scheduledReceipt),
        demand: round(demand),
        closingStock: round(stock),
        shortage: round(shortage),
      })
    }
    return days
  }

  private noRecommendation(status: MaterialStatusResult, reason: string): PurchaseRecommendation {
    return {
      center: status.material.center,
      materialCode: status.material.materialCode,
      description: status.material.description,
      status: status.status,
      deliveryDate: null,
      deliveryDayOffset: null,
      targetInventoryUmb: null,
      projectedStockAtDeliveryUmb: null,
      netRequirementUmb: null,
      recommendedQuantityUmc: 0,
      recommendedQuantityUmb: 0,
      purchaseUnit: status.material.purchaseUnit,
      baseUnit: status.material.baseUnit,
      minimumPurchaseUmc: status.material.minimumPurchaseUmc,
      stockoutBeforeLeadTime: false,
      residualStockoutDate: status.projectedStockoutDate,
      reason,
      warnings: status.warnings,
    }
  }
}
