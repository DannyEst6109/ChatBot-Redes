#!/usr/bin/env node
import { resolve } from 'node:path'

import { runHttpServer } from './http-server.js'
import { ManualMcpServer } from './json-rpc-server.js'
import { createSupplyToolRegistry } from './supply-tools.js'
import { SyntheticSupplyRepository } from '../supply/repository.js'
import { SupplyService } from '../supply/service.js'
import { WebAppController } from '../web/app-controller.js'
import { createWebAppHandler } from '../web/http-web-app.js'
import { McpWebBridge } from '../web/mcp-web-bridge.js'

const dataDirectory = process.env.SUPPLY_DATA_DIR
  ? resolve(process.env.SUPPLY_DATA_DIR)
  : resolve(process.cwd(), 'data')
const dataset = await new SyntheticSupplyRepository(dataDirectory).load()
const service = new SupplyService(dataset)
const createSession = () => new ManualMcpServer(
  { name: 'synthetic-supply-control', version: '1.0.0' },
  createSupplyToolRegistry(service),
)
const webBridge = new McpWebBridge(createSession())
await webBridge.connect()
const webHandler = createWebAppHandler(
  new WebAppController(webBridge),
  resolve(process.cwd(), 'dist-web'),
)

const port = process.env.PORT ? Number(process.env.PORT) : 8080
const apiKey = process.env.MCP_API_KEY

if (!apiKey) {
  console.error('[supply-mcp-http] Warning: MCP_API_KEY is not set. The endpoint will accept unauthenticated requests.')
}

await runHttpServer(
  createSession,
  { port, ...(apiKey ? { apiKey } : {}), fallback: webHandler },
)
