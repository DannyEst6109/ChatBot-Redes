# Supply Control MCP Chatbot

Course project for CC3067 Networks. This repository contains a terminal chatbot,
a manually implemented MCP client, and a local industrial MCP server for supply
planning. See the complete installation, protocol, tool, and demonstration guide
in the sections below.

> Status: Part 1 implementation. Remote MCP transport, cloud deployment, and
> Wireshark analysis are intentionally outside this milestone.

## Project scope

The chatbot can:

- Connect to an LLM through the Anthropic Messages API.
- Preserve conversational context during one terminal session.
- Discover and invoke tools from multiple MCP servers.
- Log and display every MCP request and response.
- Connect to the official Filesystem and Git MCP servers through configuration.
- Use the custom local Supply Control MCP server included in this repository.

The MCP protocol layer is implemented manually with JSON-RPC 2.0. The project
does not use an MCP SDK, FastMCP, or an Anthropic SDK.

## Requirements

- Node.js 22 or newer (Node.js 24 LTS is recommended).
- npm 10 or newer.
- An Anthropic API key for the live chatbot.
- Optional: `uvx` for the official Git MCP server.

## Installation

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and set your API key:

```text
ANTHROPIC_API_KEY=your-key
```

`ANTHROPIC_MODEL` is optional. It defaults to `claude-haiku-4-5`, the lowest-cost
model that supports tool use, which keeps the free API credit available for many
runs. Set `ANTHROPIC_MODEL=claude-sonnet-5` for stronger multi-step tool
reasoning at a higher cost per run.

Never commit `.env` or real company information.

## Run the custom MCP server

```bash
npm run mcp:supply
```

The process uses MCP over standard input/output. Each input line must contain one
JSON-RPC message. Protocol responses are written to stdout and diagnostics to
stderr.

## Run the terminal chatbot

```bash
npm run chatbot
```

Useful commands inside the chatbot:

```text
/help      Show available commands
/servers   Show connected MCP servers
/tools     Show discovered MCP tools
/log       Show the current audit log location
/clear     Clear the conversation context
/exit      Close all MCP servers and exit
```

Every MCP request and response is shown in the terminal and appended to
`logs/mcp-interactions.jsonl`.

## Run without an API key

The protocol and custom server can be verified without an LLM:

```bash
npm run demo
```

The demo starts the MCP server as a subprocess, performs initialization, lists
its tools, and executes representative supply queries.

## MCP server configuration

`config/mcp-servers.json` defines every external process. The custom supply
server and both official reference servers are enabled by default. A server whose
runtime is missing is reported under `/servers` as a connection error; the
chatbot keeps running with the servers that did connect.

### Official Filesystem MCP server

The configuration uses the official npm package:

```text
@modelcontextprotocol/server-filesystem
```

On Windows it is launched through `cmd /c npx`, so `npx` must be on the path.
Its allowed directory is limited to this repository.

### Official Git MCP server

Install `uv` and verify that `uvx` is available. The configuration runs:

```text
uvx --with "mcp<2" mcp-server-git --repository <workspace>
```

The upper bound keeps the current Git server on the compatible MCP Python 1.x
API instead of resolving the incompatible 2.x API.

The generic MCP process client does not contain server-specific shortcuts; it
discovers both official servers through `initialize` and `tools/list` and invokes
them through `tools/call`.

Read-only connectivity checks are available after `npm run build`:

```bash
npm run demo:filesystem
npm run demo:git
```

These checks list the allowed academic workspace and show Git status. They do
not create, stage, commit, or delete files.

## Custom Supply Control MCP server

### Industrial use case

The server supports purchasing planners who supply a food distribution and
production center. It identifies stockout risks and produces deterministic,
auditable purchase recommendations from inventory, demand, lead time, purchase
minimums, conversion factors, and scheduled receipts.

All included records are synthetic. They do not contain company prices,
suppliers, credentials, SAP extracts, or confidential identifiers.

### Tools

#### `list_inventory_risks`

Lists materials ordered by supply risk.

Parameters:

- `center` (optional): `DC-PROD` or `DC-STORES`.
- `horizon_days` (optional): integer from 1 to 30; default is 7.
- `statuses` (optional): list of operational statuses.
- `limit` (optional): integer from 1 to 100; default is 20.

#### `get_material_status`

Returns stock, demand, coverage, projected stockout, scheduled receipts, and
master-data parameters for one material.

Parameters:

- `center` (required): `DC-PROD` or `DC-STORES`.
- `material_code` (required): synthetic material identifier.

#### `get_purchase_recommendations`

Returns deterministic purchase suggestions, optionally filtered by center.

Parameters:

- `center` (optional): `DC-PROD` or `DC-STORES`.
- `only_with_order` (optional): return only positive recommendations.
- `only_with_residual_shortage` (optional): return only recommendations that
  cannot prevent a stockout before lead time.
- `limit` (optional): integer from 1 to 100.

#### `explain_purchase_recommendation`

Explains the inputs, formula, rounding, and remaining risk for one recommended
purchase.

Parameters:

- `center` (required): `DC-PROD` or `DC-STORES`.
- `material_code` (required).

#### `get_supply_data_status`

Reports the operational date, source freshness, row counts, and data-quality
warnings for all synthetic sources. It has no parameters.

## Example prompts

```text
Which DC-PROD materials may run out during the next seven days?
Why is SYN-PROD-001 at risk?
How much should be purchased for that material?
Does the recommendation prevent the stockout before lead time?
Are all supply data sources current?
```

These prompts also exercise conversational context: after asking about one
material, a follow-up such as "Why is it at risk?" should preserve the reference.

## JSON-RPC and MCP implementation

The custom server supports:

- `initialize`
- `notifications/initialized`
- `ping`
- `tools/list`
- `tools/call`

Requests, notifications, successful results, and protocol errors use JSON-RPC
2.0 envelopes. The server negotiates MCP revision `2025-11-25`. Messages in the
stdio transport are UTF-8 JSON objects delimited by newlines.

## Business rules

- Available stock is on-hand stock minus reserved stock.
- Daily simulation applies scheduled receipts before projected consumption.
- A stockout occurs when projected closing stock is zero or negative.
- Coverage is available stock divided by average daily demand.
- Purchase quantity targets the configured DSI at the first feasible delivery.
- Recommendations are rounded up to complete purchase units.
- Purchase minimum is a floor, not a multiple.
- A stockout before the first feasible delivery is explicitly reported.
- Missing parameters never produce an invented recommendation.
- The LLM explains results but never performs inventory calculations.

## Testing and verification

```bash
npm test
npm run check
```

The automated tests cover business calculations, validation, MCP initialization,
tool discovery, tool execution, protocol errors, context handling, and audit logs.

## Repository and academic integrity

- Keep the repository private and grant access only to course staff.
- Commit gradually as features are developed; do not create all commits at the
  end of the project.
- Cite third-party references in source comments and documentation.
- The official Filesystem and Git servers are external reference servers; their
  code is not copied into this repository.
- Generative AI use must follow the university policy.

## Known Part 1 limitations

- Data is synthetic and loaded from local JSON files.
- Recommendations are read-only and do not create real purchase orders.
- The custom server is local and uses stdio only.
- Remote Streamable HTTP, cloud deployment, packet capture, and OSI-layer
  analysis belong to Part 2.
