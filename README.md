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
/servers   Show connected MCP servers and their transport
/tools     Show discovered MCP tools, grouped by server
/verbose   Toggle between one-line and full JSON-RPC envelopes
/plain     Toggle colour off and on
/log       Show the current audit log location
/clear     Clear the conversation context
/exit      Close all MCP servers and exit
```

Every MCP request and response is shown in the terminal and appended to
`logs/mcp-interactions.jsonl`.

## Terminal interface

The chatbot renders a terminal user interface with no additional dependencies:
colour is emitted as ANSI escape sequences written by `src/ui/`. The design
decisions below are deliberate rather than decorative.

**Colour carries meaning.** The palette is defined by semantic name, never by
hue: `SIN_STOCK` is red, `CRITICO` amber, `DSI_IDEAL` green, following the
traffic-light convention a reader already knows. Colour is never the only
signal — every status prints its label as well, so the information survives
colour blindness and redirected output.

**Three levels of hierarchy.** A fixed header holds the persistent context
(model, connected servers, tool count). The dialogue is the primary reading
surface at full width and high contrast. MCP traffic is subordinate: indented
and dimmed, present but never competing with the conversation it explains.

**One line per protocol message.** Raw envelopes run to thousands of characters
per call and bury the answer. The default view states what happened and how long
it took; `/verbose` restores the complete envelopes. The JSONL file always
records the full envelope, so no evidence is lost in either mode.

**Immediate feedback.** An activity indicator appears as soon as a question is
sent and names the tool currently running, so a multi-second wait reads as
progress instead of a frozen terminal.

**Structured results are tabulated.** Tool results carry `structuredContent`,
which the interface renders as an aligned table rather than leaving the model to
describe the records in prose.

**It degrades cleanly.** With `NO_COLOR` set, on a terminal that declares itself
incapable, or when output is redirected to a file, no escape sequence is
emitted, the activity indicator collapses to a single line, and the transcript
prints each question so a captured session still reads correctly.

Widths adapt to the terminal and are measured in visible characters, so accented
text such as `Decoración estacional` stays aligned.

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

### Official server scenario

The complete demonstration required by the course creates a repository, writes a
README, stages it, and commits it:

```bash
npm run demo:scenario
```

It runs against a disposable repository in `demo-workspace/`, which is recreated
on every run and excluded from version control, so the academic history is never
modified. The directory is prepared with a local `git init` because the official
Git MCP server exposes no repository-creation tool; every later step — writing
the file, staging, reviewing the staged diff, committing, and reading the log —
is a JSON-RPC `tools/call` through the generic MCP client.

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

### Protocol and transport layers

The client separates the two concerns:

- `McpClient` owns the protocol: message envelopes, the initialization
  handshake, correlation of responses by request id, and timeouts.
- `McpTransport` moves bytes. `StdioTransport` runs the server as a child
  process and exchanges newline-delimited JSON over its standard streams.

`McpClient` never learns which transport it is using, so a second transport can
be added without changing how messages are built or correlated. The automated
tests exercise the protocol over a scripted in-memory transport to prove this.

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
