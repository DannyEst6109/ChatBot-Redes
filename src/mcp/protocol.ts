import type { JsonObject, JsonValue } from '../shared/json.js'

export const MCP_PROTOCOL_VERSION = '2025-11-25'

export type RequestId = string | number

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: RequestId
  method: string
  params?: JsonObject
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: JsonObject
}

export interface JsonRpcSuccess {
  jsonrpc: '2.0'
  id: RequestId
  result: JsonValue
}

export interface JsonRpcFailure {
  jsonrpc: '2.0'
  id: RequestId | null
  error: {
    code: number
    message: string
    data?: JsonValue
  }
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcSuccess | JsonRpcFailure

export interface McpTool {
  name: string
  description: string
  inputSchema: JsonObject
}

export interface McpTextContent {
  type: 'text'
  text: string
}

export interface McpCallToolResult {
  content: McpTextContent[]
  structuredContent?: JsonObject
  isError?: boolean
}

export interface McpServerInfo {
  name: string
  version: string
}

export interface McpServerConfig {
  enabled: boolean
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export interface McpConfigFile {
  servers: Record<string, McpServerConfig>
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Partial<JsonRpcRequest>
  return candidate.jsonrpc === '2.0' &&
    (typeof candidate.id === 'string' || typeof candidate.id === 'number') &&
    typeof candidate.method === 'string'
}

export function isJsonRpcNotification(value: unknown): value is JsonRpcNotification {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Partial<JsonRpcNotification> & { id?: unknown }
  return candidate.jsonrpc === '2.0' && candidate.id === undefined && typeof candidate.method === 'string'
}

export function success(id: RequestId, result: JsonValue): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result }
}

export function failure(
  id: RequestId | null,
  code: number,
  message: string,
  data?: JsonValue,
): JsonRpcFailure {
  const error: JsonRpcFailure['error'] = data === undefined ? { code, message } : { code, message, data }
  return { jsonrpc: '2.0', id, error }
}

