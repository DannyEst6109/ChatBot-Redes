import type { JsonObject } from '../shared/json.js'
import type {
  LlmGateway,
  LlmMessage,
  LlmTool,
  LlmToolResultBlock,
  ToolExecutor,
} from './types.js'

export class ChatSession {
  private readonly history: LlmMessage[] = []

  constructor(
    private readonly gateway: LlmGateway,
    private readonly tools: readonly LlmTool[],
    private readonly executor: ToolExecutor,
    private readonly maxToolRounds = 8,
  ) {}

  messages(): readonly LlmMessage[] {
    return this.history
  }

  clear(): void {
    this.history.length = 0
  }

  async ask(userText: string): Promise<string> {
    this.history.push({ role: 'user', content: userText })
    const collectedText: string[] = []

    for (let round = 0; round < this.maxToolRounds; round++) {
      const completion = await this.gateway.complete(this.history, this.tools)
      this.history.push({ role: 'assistant', content: completion.content })
      collectedText.push(...completion.content.filter((block) => block.type === 'text').map((block) => block.text))

      const toolUses = completion.content.filter((block) => block.type === 'tool_use')
      if (toolUses.length === 0) return collectedText.join('\n').trim()

      const results: LlmToolResultBlock[] = []
      for (const toolUse of toolUses) {
        try {
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: await this.executor.execute(toolUse.name, toolUse.input as JsonObject),
          })
        } catch (error) {
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: error instanceof Error ? error.message : String(error),
            is_error: true,
          })
        }
      }
      this.history.push({ role: 'user', content: results })
    }

    throw new Error(`The LLM exceeded the maximum of ${this.maxToolRounds} tool-use rounds.`)
  }
}

