import type { JsonObject } from '../shared/json.js'

export interface LlmTextBlock {
  type: 'text'
  text: string
}

export interface LlmToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: JsonObject
}

export interface LlmToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type LlmAssistantBlock = LlmTextBlock | LlmToolUseBlock
export type LlmUserBlock = LlmTextBlock | LlmToolResultBlock

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string | LlmAssistantBlock[] | LlmUserBlock[]
}

export interface LlmTool {
  name: string
  description: string
  input_schema: JsonObject
}

export interface LlmCompletion {
  content: LlmAssistantBlock[]
  stopReason: string
}

export interface LlmGateway {
  complete(messages: readonly LlmMessage[], tools: readonly LlmTool[]): Promise<LlmCompletion>
}

export interface ToolExecutor {
  execute(name: string, input: JsonObject): Promise<string>
}

