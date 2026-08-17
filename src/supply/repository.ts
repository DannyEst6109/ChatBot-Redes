import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type {
  DemandPlan,
  InventoryRecord,
  MaterialMaster,
  ScheduledReceipt,
  SourceStatusFile,
  SupplyDataset,
} from './types.js'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

export class SyntheticSupplyRepository {
  constructor(private readonly dataDirectory = resolve(process.cwd(), 'data')) {}

  async load(): Promise<SupplyDataset> {
    const [materials, inventory, demandPlan, receipts, sourceStatus] = await Promise.all([
      readJson<MaterialMaster[]>(resolve(this.dataDirectory, 'materials.json')),
      readJson<InventoryRecord[]>(resolve(this.dataDirectory, 'inventory.json')),
      readJson<DemandPlan>(resolve(this.dataDirectory, 'demand-plan.json')),
      readJson<ScheduledReceipt[]>(resolve(this.dataDirectory, 'scheduled-receipts.json')),
      readJson<SourceStatusFile>(resolve(this.dataDirectory, 'source-status.json')),
    ])
    return { materials, inventory, demandPlan, receipts, sourceStatus }
  }
}

