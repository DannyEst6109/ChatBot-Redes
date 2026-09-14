# Graph Report - ChatBot-Redes  (2026-09-13)

## Corpus Check
- 58 files · ~99,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 415 nodes · 987 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Protocolo y Servidores MCP
- CLI, Configuración e Interfaz
- Dominio de Abastecimiento
- Documentación y Demostración
- Orquestación y Escenarios Demo
- Sesión Chatbot y Anthropic
- Proyecto Node y Scripts
- Cliente MCP y Transporte
- Spinner de Terminal
- Configuración TypeScript
- Auditoría y Formato JSON-RPC
- Diagrama de Arquitectura MCP
- Secuencia de Consulta

## God Nodes (most connected - your core abstractions)
1. `JsonObject` - 34 edges
2. `SupplyService` - 22 edges
3. `isRecord()` - 21 edges
4. `paint()` - 17 edges
5. `ValidationError` - 16 edges
6. `McpClient` - 15 edges
7. `compilerOptions` - 15 edges
8. `AuditLogger` - 13 edges
9. `JsonValue` - 13 edges
10. `displayWidth()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Deliberately Excluded Scope` --semantically_similar_to--> `Part 1 Scope`  [INFERRED] [semantically similar]
  docs/PART1-CHECKLIST.md → README.md
- `Official Server Scenario` --semantically_similar_to--> `Disposable Repository Scenario`  [INFERRED] [semantically similar]
  docs/DEMO (1).md → README.md
- `silentLogger()` --calls--> `AuditLogger`  [EXTRACTED]
  test/mcp-client.test.ts → src/logging/audit-logger.ts
- `createServer()` --calls--> `ManualMcpServer`  [EXTRACTED]
  test/mcp-server.test.ts → src/mcp/json-rpc-server.ts
- `Implemented Requirements` --references--> `Anthropic Messages API`  [EXTRACTED]
  docs/PART1-CHECKLIST.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Part 1 Acceptance Demonstration** — readme_supply_control_mcp_chatbot, docs_demo_1_part_1_demonstration_script, docs_demo_live_demonstration_part_1, docs_part1_checklist_part_1_requirements_checklist [INFERRED 0.95]
- **Three MCP Server Integration** — readme_custom_supply_control_mcp_server, readme_official_filesystem_mcp_server, readme_official_git_mcp_server, docs_demo_three_server_initialization [EXTRACTED 1.00]
- **Auditable Deterministic Supply Flow** — readme_deterministic_purchase_recommendations, readme_inventory_business_rules, readme_mcp_interaction_audit_log, docs_demo_syn_prod_001_purchase_recommendation [INFERRED 0.85]

## Communities (13 total, 1 thin omitted)

### Community 0 - "Protocolo y Servidores MCP"
Cohesion: 0.07
Nodes (44): handleLine(), ManualMcpServer, ServerResponse, UnknownMethodError, QualifiedTool, ToolResultObserver, failure(), HttpServerConfig (+36 more)

### Community 1 - "CLI, Configuración e Interfaz"
Cohesion: 0.09
Nodes (51): apiKey, ask(), capabilities, commandHelp(), serverTable(), write(), loadEnvironmentFile(), CapabilitySources (+43 more)

### Community 2 - "Dominio de Abastecimiento"
Cohesion: 0.10
Nodes (26): server, service, createSupplyToolRegistry(), readJson(), SyntheticSupplyRepository, addDays(), key(), STATUS_PRIORITY (+18 more)

### Community 3 - "Documentación y Demostración"
Cohesion: 0.06
Nodes (44): Demonstration Sequence, Deterministic Server Calculations, Official Server Scenario, Part 1 Demonstration Script, Request Correlation Race Prevention, stdio Protocol Diagnostics, Conversational Context Demonstration, Demonstration Contingencies (+36 more)

### Community 4 - "Orquestación y Escenarios Demo"
Cohesion: 0.10
Nodes (19): toolList(), loadMcpConfiguration(), replaceWorkspace(), validateServer(), logger, manager, manager, manager (+11 more)

### Community 5 - "Sesión Chatbot y Anthropic"
Cohesion: 0.14
Nodes (14): AnthropicGateway, AnthropicGatewayOptions, ChatSession, LlmAssistantBlock, LlmCompletion, LlmGateway, LlmMessage, LlmTextBlock (+6 more)

### Community 6 - "Proyecto Node y Scripts"
Cohesion: 0.09
Nodes (22): description, devDependencies, @types/node, typescript, engines, node, name, private (+14 more)

### Community 8 - "Spinner de Terminal"
Cohesion: 0.19
Nodes (5): Spinner, SpinnerOutput, interactive, Recorder, redirected

### Community 9 - "Configuración TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess (+8 more)

### Community 10 - "Auditoría y Formato JSON-RPC"
Cohesion: 0.26
Nodes (3): AuditRecord, ProtocolFormatter, plain

### Community 11 - "Diagrama de Arquitectura MCP"
Cohesion: 0.19
Nodes (13): API de Anthropic, Arquitectura del chatbot MCP, Chatbot anfitrión, Claude, Cliente MCP manual, Datos sintéticos JSON, Filesystem MCP, Git MCP (+5 more)

### Community 12 - "Secuencia de Consulta"
Cohesion: 0.20
Nodes (12): HTTPS API de Anthropic, Chatbot anfitrión, Claude, Cliente MCP, Datos JSON, Secuencia de una consulta de abastecimiento, JSON-RPC 2.0 sobre stdio, Registro JSONL de solicitudes y respuestas (+4 more)

## Knowledge Gaps
- **95 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+90 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 121 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JsonObject` connect `Protocolo y Servidores MCP` to `CLI, Configuración e Interfaz`, `Sesión Chatbot y Anthropic`, `Cliente MCP y Transporte`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `isRecord()` connect `Orquestación y Escenarios Demo` to `Protocolo y Servidores MCP`, `CLI, Configuración e Interfaz`, `Sesión Chatbot y Anthropic`, `Cliente MCP y Transporte`, `Auditoría y Formato JSON-RPC`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SupplyService` connect `Dominio de Abastecimiento` to `Protocolo y Servidores MCP`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _95 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Protocolo y Servidores MCP` be split into smaller, more focused modules?**
  _Cohesion score 0.07298245614035087 - nodes in this community are weakly interconnected._
- **Should `CLI, Configuración e Interfaz` be split into smaller, more focused modules?**
  _Cohesion score 0.09137529137529138 - nodes in this community are weakly interconnected._
- **Should `Dominio de Abastecimiento` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._