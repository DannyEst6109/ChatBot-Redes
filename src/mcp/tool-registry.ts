import type { JsonObject } from '../shared/json.js'
import type { McpCallToolResult, McpTool } from './protocol.js'

export interface ToolDefinition {
  tool: McpTool
  execute(argumentsValue: JsonObject): Promise<McpCallToolResult> | McpCallToolResult
}

export class ToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>()

  register(definition: ToolDefinition): this {
    if (this.definitions.has(definition.tool.name)) {
      throw new Error(`Tool ${definition.tool.name} is already registered.`)
    }
    this.definitions.set(definition.tool.name, definition)
    return this
  }

  list(): McpTool[] {
    return [...this.definitions.values()].map((definition) => definition.tool)
  }

  async call(name: string, argumentsValue: JsonObject): Promise<McpCallToolResult> {
    const definition = this.definitions.get(name)
    if (!definition) throw new Error(`Unknown tool: ${name}`)
    return definition.execute(argumentsValue)
  }
}

