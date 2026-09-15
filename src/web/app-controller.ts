import { isRecord, type JsonObject } from '../shared/json.js'
import type { McpTool } from '../mcp/protocol.js'
import { McpWebBridge, type ProtocolTrace, type ToolInvocation } from './mcp-web-bridge.js'

interface MaterialReference {
  center: string
  materialCode: string
}

export interface BootstrapPayload {
  synthetic: true
  risks: JsonObject
  selected: JsonObject
  recommendation: JsonObject
  dataStatus: JsonObject
  tools: McpTool[]
  traces: ProtocolTrace[]
}

export interface AnalysisPayload {
  selected: JsonObject
  recommendation: JsonObject
  traces: ProtocolTrace[]
}

export interface ChatPayload extends AnalysisPayload {
  answer: string
}

export class WebAppController {
  constructor(private readonly bridge: McpWebBridge) {}

  async bootstrap(): Promise<BootstrapPayload> {
    const traces: ProtocolTrace[] = []
    const risksCall = await this.call('list_inventory_risks', { limit: 12 }, traces)
    const risks = structured(risksCall)
    const selectedReference = firstRisk(risks)
    const selectedCall = await this.call('get_material_status', {
      center: selectedReference.center,
      material_code: selectedReference.materialCode,
    }, traces)
    const recommendationCall = await this.call('explain_purchase_recommendation', {
      center: selectedReference.center,
      material_code: selectedReference.materialCode,
    }, traces)
    const dataStatusCall = await this.call('get_supply_data_status', {}, traces)
    const toolsResult = await this.bridge.listTools()
    traces.push(toolsResult.trace)

    return {
      synthetic: true,
      risks,
      selected: structured(selectedCall),
      recommendation: structured(recommendationCall),
      dataStatus: structured(dataStatusCall),
      tools: toolsResult.tools,
      traces,
    }
  }

  async analyze(reference: MaterialReference): Promise<AnalysisPayload> {
    const traces: ProtocolTrace[] = []
    const selectedCall = await this.call('get_material_status', {
      center: reference.center,
      material_code: reference.materialCode,
    }, traces)
    const recommendationCall = await this.call('explain_purchase_recommendation', {
      center: reference.center,
      material_code: reference.materialCode,
    }, traces)
    return {
      selected: structured(selectedCall),
      recommendation: structured(recommendationCall),
      traces,
    }
  }

  async chat(message: string, reference?: MaterialReference): Promise<ChatPayload> {
    const normalized = message.toLocaleLowerCase('es')
    const traces: ProtocolTrace[] = []

    if (normalized.includes('herramienta')) {
      const fallback = reference ?? await this.topRiskReference(traces)
      const analysis = await this.analyzeWithTraces(fallback, traces)
      const listed = await this.bridge.listTools()
      traces.push(listed.trace)
      return {
        ...analysis,
        answer: `El servidor publica ${listed.tools.length} herramientas MCP: ${listed.tools.map((tool) => tool.name).join(', ')}. La evidencia inferior contiene el intercambio tools/list real.`,
      }
    }

    if (normalized.includes('fuente') || normalized.includes('calidad') || normalized.includes('dato')) {
      const fallback = reference ?? await this.topRiskReference(traces)
      const analysis = await this.analyzeWithTraces(fallback, traces)
      const statusCall = await this.call('get_supply_data_status', {}, traces)
      const status = structured(statusCall)
      const totals = isRecord(status.totals) ? status.totals : {}
      return {
        ...analysis,
        answer: `Las fuentes están aisladas de sistemas externos y contienen ${numberValue(totals.materials)} materiales sintéticos. Revisa la traza get_supply_data_status para auditar frescura y advertencias.`,
      }
    }

    if (!reference && (normalized.includes('riesgo') || normalized.includes('urgente'))) {
      const risksCall = await this.call('list_inventory_risks', { limit: 12 }, traces)
      const risks = structured(risksCall)
      const fallback = firstRisk(risks)
      const analysis = await this.analyzeWithTraces(fallback, traces)
      return {
        ...analysis,
        answer: `Encontré ${numberValue(risks.count)} registros ordenados por prioridad. Seleccioné ${materialDescription(analysis.selected)} porque encabeza la cola de riesgo; los datos son sintéticos y la clasificación es determinística.`,
      }
    }

    const fallback = reference ?? await this.topRiskReference(traces)
    const analysis = await this.analyzeWithTraces(fallback, traces)
    return {
      ...analysis,
      answer: materialAnswer(analysis.selected, analysis.recommendation),
    }
  }

  private async topRiskReference(traces: ProtocolTrace[]): Promise<MaterialReference> {
    const call = await this.call('list_inventory_risks', { limit: 1 }, traces)
    return firstRisk(structured(call))
  }

  private async analyzeWithTraces(reference: MaterialReference, traces: ProtocolTrace[]): Promise<AnalysisPayload> {
    const selectedCall = await this.call('get_material_status', {
      center: reference.center,
      material_code: reference.materialCode,
    }, traces)
    const recommendationCall = await this.call('explain_purchase_recommendation', {
      center: reference.center,
      material_code: reference.materialCode,
    }, traces)
    return {
      selected: structured(selectedCall),
      recommendation: structured(recommendationCall),
      traces,
    }
  }

  private async call(name: string, input: JsonObject, traces: ProtocolTrace[]): Promise<ToolInvocation> {
    const invocation = await this.bridge.callTool(name, input)
    traces.push(invocation.trace)
    if (invocation.result.isError) {
      const detail = invocation.result.content.map((block) => block.text).join('\n')
      throw new Error(detail || `La herramienta ${name} devolvió un error.`)
    }
    return invocation
  }
}

function structured(invocation: ToolInvocation): JsonObject {
  if (!invocation.result.structuredContent) throw new Error('La herramienta MCP no devolvió structuredContent.')
  return invocation.result.structuredContent
}

function firstRisk(risks: JsonObject): MaterialReference {
  const rows = Array.isArray(risks.risks) ? risks.risks : []
  const first = rows[0]
  if (!isRecord(first) || typeof first.center !== 'string' || typeof first.materialCode !== 'string') {
    throw new Error('No hay materiales disponibles en la cola de riesgos.')
  }
  return { center: first.center, materialCode: first.materialCode }
}

function materialDescription(selected: JsonObject): string {
  return isRecord(selected.material) && typeof selected.material.description === 'string'
    ? selected.material.description
    : 'el material seleccionado'
}

function materialAnswer(selected: JsonObject, recommendation: JsonObject): string {
  const description = materialDescription(selected)
  const coverage = typeof selected.coverageDays === 'number' ? `${selected.coverageDays} días de cobertura` : 'cobertura no calculable'
  const status = typeof selected.status === 'string' ? selected.status.replaceAll('_', ' ').toLocaleLowerCase('es') : 'sin estado'
  const calculation = isRecord(recommendation.calculation) ? recommendation.calculation : {}
  const quantity = numberValue(calculation.recommendedQuantityUmc)
  const material = isRecord(selected.material) ? selected.material : {}
  const purchaseUnit = typeof material.purchaseUnit === 'string' ? material.purchaseUnit : 'unidades de compra'
  const action = quantity > 0
    ? `La recomendación determinística es solicitar ${quantity.toLocaleString('es-GT')} ${purchaseUnit}.`
    : 'La proyección no requiere una compra nueva en el primer día factible.'
  return `${description} tiene ${coverage} y estado ${status}. ${action} Todos los valores provienen de datos sintéticos y la traza MCP queda disponible abajo.`
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
