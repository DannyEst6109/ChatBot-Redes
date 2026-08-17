#!/usr/bin/env node
import { resolve } from 'node:path'

import { ManualMcpServer } from './json-rpc-server.js'
import { runStdioServer } from './stdio-server.js'
import { createSupplyToolRegistry } from './supply-tools.js'
import { SyntheticSupplyRepository } from '../supply/repository.js'
import { SupplyService } from '../supply/service.js'

const dataDirectory = process.env.SUPPLY_DATA_DIR
  ? resolve(process.env.SUPPLY_DATA_DIR)
  : resolve(process.cwd(), 'data')
const dataset = await new SyntheticSupplyRepository(dataDirectory).load()
const service = new SupplyService(dataset)
const server = new ManualMcpServer(
  { name: 'synthetic-supply-control', version: '1.0.0' },
  createSupplyToolRegistry(service),
)

await runStdioServer(server)

