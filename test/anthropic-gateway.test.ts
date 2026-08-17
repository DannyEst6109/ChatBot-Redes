import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AnthropicGateway } from '../src/chatbot/anthropic-gateway.js'

test('calls the Anthropic Messages API directly without an SDK', async () => {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const gateway = new AnthropicGateway({
    apiKey: 'synthetic-test-key',
    model: 'synthetic-test-model',
    fetchImplementation: async (input, init) => {
      capturedUrl = String(input)
      capturedInit = init
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: 'Synthetic response' }],
        stop_reason: 'end_turn',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  const result = await gateway.complete([{ role: 'user', content: 'Hello' }], [])
  assert.equal(capturedUrl, 'https://api.anthropic.com/v1/messages')
  assert.equal((capturedInit?.headers as Record<string, string>)['x-api-key'], 'synthetic-test-key')
  const body = JSON.parse(String(capturedInit?.body))
  assert.equal(body.model, 'synthetic-test-model')
  assert.equal(body.messages[0].content, 'Hello')
  assert.equal(result.content[0]?.type, 'text')
})

test('reports actionable HTTP errors from the LLM API', async () => {
  const gateway = new AnthropicGateway({
    apiKey: 'bad-key',
    model: 'test-model',
    fetchImplementation: async () => new Response('{"error":"unauthorized"}', { status: 401 }),
  })
  await assert.rejects(() => gateway.complete([], []), /HTTP 401/)
})

