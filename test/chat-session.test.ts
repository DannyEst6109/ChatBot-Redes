import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ChatSession } from '../src/chatbot/chat-session.js'
import type { LlmCompletion, LlmGateway, LlmMessage, LlmTool } from '../src/chatbot/types.js'
import type { JsonObject } from '../src/shared/json.js'

class ScriptedGateway implements LlmGateway {
  calls: readonly LlmMessage[][] = []
  private index = 0

  constructor(private readonly script: LlmCompletion[]) {}

  async complete(messages: readonly LlmMessage[], _tools: readonly LlmTool[]): Promise<LlmCompletion> {
    this.calls = [...this.calls, [...messages]]
    const response = this.script[this.index++]
    if (!response) throw new Error('Unexpected LLM call')
    return response
  }
}

test('executes a tool and preserves the complete conversation context', async () => {
  const gateway = new ScriptedGateway([
    { stopReason: 'tool_use', content: [{ type: 'tool_use', id: 'tool-1', name: 'supply__get_material_status', input: { center: 'DC-PROD', material_code: 'SYN-PROD-001' } }] },
    { stopReason: 'end_turn', content: [{ type: 'text', text: 'The synthetic material is critical.' }] },
    { stopReason: 'end_turn', content: [{ type: 'text', text: 'It refers to SYN-PROD-001.' }] },
  ])
  const executed: { name: string; input: JsonObject }[] = []
  const session = new ChatSession(gateway, [], {
    async execute(name, input) {
      executed.push({ name, input })
      return '{"status":"CRITICO"}'
    },
  })

  assert.equal(await session.ask('Check SYN-PROD-001'), 'The synthetic material is critical.')
  assert.equal(await session.ask('Which material was that?'), 'It refers to SYN-PROD-001.')
  assert.equal(executed.length, 1)
  assert.equal(session.messages().length, 6)
  assert.ok(gateway.calls[2] && gateway.calls[2].length >= 4)
})

test('clear removes conversation context', async () => {
  const gateway = new ScriptedGateway([
    { stopReason: 'end_turn', content: [{ type: 'text', text: 'ok' }] },
  ])
  const session = new ChatSession(gateway, [], { execute: async () => 'unused' })
  await session.ask('hello')
  session.clear()
  assert.equal(session.messages().length, 0)
})
