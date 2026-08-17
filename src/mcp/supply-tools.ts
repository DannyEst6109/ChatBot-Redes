import {
  ensureNoUnknownFields,
  optionalBoolean,
  optionalInteger,
  optionalString,
  optionalStringArray,
  requiredString,
  toJsonValue,
  type JsonObject,
} from '../shared/json.js'
import type { SupplyService } from '../supply/service.js'
import type { McpCallToolResult } from './protocol.js'
import { ToolRegistry } from './tool-registry.js'

function result(value: unknown): McpCallToolResult {
  const serialized = toJsonValue(value)
  const structuredContent = typeof serialized === 'object' && serialized !== null && !Array.isArray(serialized)
    ? serialized
    : { value: serialized }
  return {
    content: [{ type: 'text', text: JSON.stringify(serialized, null, 2) }],
    structuredContent,
  }
}

export function createSupplyToolRegistry(service: SupplyService): ToolRegistry {
  return new ToolRegistry()
    .register({
      tool: {
        name: 'list_inventory_risks',
        description: 'List synthetic food-supply materials ordered by stockout and coverage risk.',
        inputSchema: {
          type: 'object',
          properties: {
            center: { type: 'string', enum: [...service.centers()] },
            horizon_days: { type: 'integer', minimum: 1, maximum: 30, default: 7 },
            statuses: { type: 'array', items: { type: 'string', enum: [...service.statuses()] } },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          additionalProperties: false,
        },
      },
      execute(argumentsValue) {
        ensureNoUnknownFields(argumentsValue, ['center', 'horizon_days', 'statuses', 'limit'])
        return result(service.listInventoryRisks({
          center: optionalString(argumentsValue, 'center'),
          horizonDays: optionalInteger(argumentsValue, 'horizon_days', 1, 30),
          statuses: optionalStringArray(argumentsValue, 'statuses'),
          limit: optionalInteger(argumentsValue, 'limit', 1, 100),
        }))
      },
    })
    .register({
      tool: {
        name: 'get_material_status',
        description: 'Get inventory, coverage, projected demand, receipts, stockout date, and master parameters for one synthetic material.',
        inputSchema: {
          type: 'object',
          properties: {
            center: { type: 'string', enum: [...service.centers()] },
            material_code: { type: 'string', minLength: 1 },
          },
          required: ['center', 'material_code'],
          additionalProperties: false,
        },
      },
      execute(argumentsValue) {
        ensureNoUnknownFields(argumentsValue, ['center', 'material_code'])
        return result(service.getMaterialStatus(
          requiredString(argumentsValue, 'center'),
          requiredString(argumentsValue, 'material_code'),
        ))
      },
    })
    .register({
      tool: {
        name: 'get_purchase_recommendations',
        description: 'Calculate deterministic synthetic purchase recommendations using target DSI, demand, lead time, receipts, conversion, and purchase minimum.',
        inputSchema: {
          type: 'object',
          properties: {
            center: { type: 'string', enum: [...service.centers()] },
            only_with_order: { type: 'boolean', default: false },
            only_with_residual_shortage: { type: 'boolean', default: false },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          additionalProperties: false,
        },
      },
      execute(argumentsValue) {
        ensureNoUnknownFields(argumentsValue, ['center', 'only_with_order', 'only_with_residual_shortage', 'limit'])
        return result(service.getPurchaseRecommendations({
          center: optionalString(argumentsValue, 'center'),
          onlyWithOrder: optionalBoolean(argumentsValue, 'only_with_order'),
          onlyWithResidualShortage: optionalBoolean(argumentsValue, 'only_with_residual_shortage'),
          limit: optionalInteger(argumentsValue, 'limit', 1, 100),
        }))
      },
    })
    .register({
      tool: {
        name: 'explain_purchase_recommendation',
        description: 'Explain every input, formula, rounding rule, and residual risk behind one synthetic purchase recommendation.',
        inputSchema: {
          type: 'object',
          properties: {
            center: { type: 'string', enum: [...service.centers()] },
            material_code: { type: 'string', minLength: 1 },
          },
          required: ['center', 'material_code'],
          additionalProperties: false,
        },
      },
      execute(argumentsValue) {
        ensureNoUnknownFields(argumentsValue, ['center', 'material_code'])
        return result(service.explainPurchaseRecommendation(
          requiredString(argumentsValue, 'center'),
          requiredString(argumentsValue, 'material_code'),
        ))
      },
    })
    .register({
      tool: {
        name: 'get_supply_data_status',
        description: 'Report freshness, counts, isolation, and quality warnings for every synthetic supply data source.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      execute(argumentsValue: JsonObject) {
        ensureNoUnknownFields(argumentsValue, [])
        return result(service.getSupplyDataStatus())
      },
    })
}

