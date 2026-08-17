import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

import type { McpConfigFile, McpServerConfig } from '../mcp/protocol.js'
import { isRecord } from '../shared/json.js'

function replaceWorkspace(value: string, workspaceRoot: string): string {
  return value.replaceAll('${workspaceRoot}', workspaceRoot)
}

function validateServer(name: string, value: unknown, workspaceRoot: string): McpServerConfig {
  if (!isRecord(value)) throw new Error(`MCP server ${name} must be an object.`)
  if (typeof value.enabled !== 'boolean') throw new Error(`MCP server ${name}.enabled must be boolean.`)
  if (typeof value.command !== 'string' || value.command.trim() === '') throw new Error(`MCP server ${name}.command is required.`)
  if (!Array.isArray(value.args) || value.args.some((entry) => typeof entry !== 'string')) {
    throw new Error(`MCP server ${name}.args must be an array of strings.`)
  }
  if (value.cwd !== undefined && typeof value.cwd !== 'string') throw new Error(`MCP server ${name}.cwd must be a string.`)
  if (value.env !== undefined && (!isRecord(value.env) || Object.values(value.env).some((entry) => typeof entry !== 'string'))) {
    throw new Error(`MCP server ${name}.env must contain only strings.`)
  }

  const cwdValue = value.cwd === undefined ? workspaceRoot : replaceWorkspace(value.cwd, workspaceRoot)
  const cwd = isAbsolute(cwdValue) ? cwdValue : resolve(workspaceRoot, cwdValue)
  const env = value.env === undefined
    ? undefined
    : Object.fromEntries(Object.entries(value.env).map(([key, entry]) => [key, replaceWorkspace(entry as string, workspaceRoot)]))
  return {
    enabled: value.enabled,
    command: replaceWorkspace(value.command, workspaceRoot),
    args: value.args.map((entry) => replaceWorkspace(entry as string, workspaceRoot)),
    cwd,
    ...(env === undefined ? {} : { env }),
  }
}

export async function loadMcpConfiguration(
  path = 'config/mcp-servers.json',
  workspaceRoot = process.cwd(),
): Promise<McpConfigFile> {
  const fullPath = isAbsolute(path) ? path : resolve(workspaceRoot, path)
  const parsed = JSON.parse(await readFile(fullPath, 'utf8')) as unknown
  if (!isRecord(parsed) || !isRecord(parsed.servers)) throw new Error('MCP configuration must contain a servers object.')

  return {
    servers: Object.fromEntries(
      Object.entries(parsed.servers).map(([name, value]) => [name, validateServer(name, value, workspaceRoot)]),
    ),
  }
}

