import { isRecord } from '../shared/json.js'
import type { LlmAssistantBlock, LlmCompletion, LlmGateway, LlmMessage, LlmTool } from './types.js'

export interface AnthropicGatewayOptions {
  apiKey: string
  model: string
  maxTokens?: number
  fetchImplementation?: typeof fetch
}

export class AnthropicGateway implements LlmGateway {
  private readonly fetchImplementation: typeof fetch
  private readonly maxTokens: number

  constructor(private readonly options: AnthropicGatewayOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch
    this.maxTokens = options.maxTokens ?? 1200
  }

  async complete(messages: readonly LlmMessage[], tools: readonly LlmTool[]): Promise<LlmCompletion> {
    const response = await this.fetchImplementation('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: this.maxTokens,
        system:
          'You are a supply planning assistant. Use MCP tools for operational facts. ' +
          'Never invent inventory values or purchase quantities. State that all data is synthetic. ' +
          'Answer in the language used by the user and keep recommendations auditable.',
        messages,
        tools,
        tool_choice: { type: 'auto' },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Anthropic API returned HTTP ${response.status}: ${body.slice(0, 500)}`)
    }
    const parsed = await response.json() as unknown
    if (!isRecord(parsed) || !Array.isArray(parsed.content) || typeof parsed.stop_reason !== 'string') {
      throw new Error('Anthropic API returned an unexpected response format.')
    }
    return {
      content: parsed.content as LlmAssistantBlock[],
      stopReason: parsed.stop_reason,
    }
  }
}

