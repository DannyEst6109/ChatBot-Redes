import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SyntheticSupplyRepository } from '../src/supply/repository.js'
import { SupplyService } from '../src/supply/service.js'

const service = new SupplyService(await new SyntheticSupplyRepository().load())

test('classifies a material with no available inventory as SIN_STOCK', () => {
  const result = service.getMaterialStatus('DC-PROD', 'SYN-PROD-004', 7)
  assert.equal(result.status, 'SIN_STOCK')
  assert.equal(result.availableStock, 0)
  assert.equal(result.projectedStockoutDay, 1)
})

test('calculates a deterministic, rounded purchase recommendation', () => {
  const result = service.getPurchaseRecommendation('DC-PROD', 'SYN-PROD-001')
  assert.equal(result.targetInventoryUmb, 660)
  assert.equal(result.netRequirementUmb, 660)
  assert.equal(result.recommendedQuantityUmc, 27)
  assert.equal(result.recommendedQuantityUmb, 675)
  assert.equal(result.stockoutBeforeLeadTime, true)
  assert.equal(result.residualStockoutDate, '2026-09-10')
})

test('does not invent a recommendation when planning parameters are missing', () => {
  const result = service.getPurchaseRecommendation('DC-PROD', 'SYN-PROD-007')
  assert.equal(result.status, 'SIN_PARAMETROS')
  assert.equal(result.recommendedQuantityUmc, 0)
  assert.match(result.reason, /missing/i)
})

test('reports that the dataset is synthetic and isolated', () => {
  const result = service.getSupplyDataStatus()
  assert.equal(result.synthetic, true)
  assert.equal(result.isolatedFromExternalSystems, true)
  assert.equal(result.totals.materials, 16)
  assert.ok(result.warnings.some((warning) => warning.includes('stale')))
})

test('rejects unknown centers and materials', () => {
  assert.throws(() => service.getMaterialStatus('REAL-CENTER', 'SECRET'), /center must be one of/i)
  assert.throws(() => service.getMaterialStatus('DC-PROD', 'UNKNOWN'), /was not found/i)
})
