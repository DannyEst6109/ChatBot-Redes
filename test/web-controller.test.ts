import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'

import { ManualMcpServer } from '../src/mcp/json-rpc-server.js'
import { createSupplyToolRegistry } from '../src/mcp/supply-tools.js'
import { SyntheticSupplyRepository } from '../src/supply/repository.js'
import { SupplyService } from '../src/supply/service.js'
import { isRecord } from '../src/shared/json.js'
import { WebAppController } from '../src/web/app-controller.js'
import { McpWebBridge } from '../src/web/mcp-web-bridge.js'

async function createController(): Promise<WebAppController> {
  const dataset = await new SyntheticSupplyRepository(resolve(process.cwd(), 'data')).load()
  const service = new SupplyService(dataset)
  const bridge = new McpWebBridge(new ManualMcpServer(
    { name: 'web-test', version: '1.0.0' },
    createSupplyToolRegistry(service),
  ))
  await bridge.connect()
  return new WebAppController(bridge)
}

test('web bootstrap is built from real MCP calls', async () => {
  const controller = await createController()
  const payload = await controller.bootstrap()

  assert.equal(payload.synthetic, true)
  assert.equal(payload.tools.length, 5)
  assert.ok(Array.isArray(payload.risks.risks) && payload.risks.risks.length > 0)
  const material = payload.selected.material
  const firstRisk = Array.isArray(payload.risks.risks) ? payload.risks.risks[0] : undefined
  assert.ok(isRecord(material) && isRecord(firstRisk))
  assert.equal(material.materialCode, firstRisk.materialCode)
  assert.equal(payload.traces.at(-1)?.method, 'tools/list')
})

test('guided chat leaves the requested MCP evidence visible last', async () => {
  const controller = await createController()
  const bootstrap = await controller.bootstrap()
  const material = bootstrap.selected.material
  assert.ok(isRecord(material))
  const reference = { center: String(material.center), materialCode: String(material.materialCode) }

  const toolsAnswer = await controller.chat('¿Qué herramientas MCP hay?', reference)
  assert.match(toolsAnswer.answer, /5 herramientas MCP/u)
  assert.equal(toolsAnswer.traces.at(-1)?.method, 'tools/list')

  const dataAnswer = await controller.chat('¿Cuál es el estado de las fuentes de datos?', reference)
  assert.match(dataAnswer.answer, /materiales sintéticos/u)
  const finalRequest = dataAnswer.traces.at(-1)?.request
  assert.equal(finalRequest && 'params' in finalRequest && typeof finalRequest.params === 'object' && finalRequest.params !== null && 'name' in finalRequest.params
    ? finalRequest.params.name
    : undefined, 'get_supply_data_status')
})
