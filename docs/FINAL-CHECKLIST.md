# Final Requirements Checklist

Weighting follows the project brief: functionality is 70% of the grade and is
itself split 10% / 30% / 50% / 10% across the four blocks below. Documentation
and version control are 15%, the presentation is 15%, and a UI is worth 15%
extra.

## Funcionamiento general del chatbot — 10% (3.33% each)

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | LLM API connection | `AnthropicGateway` calls the Messages API directly | Implemented and tested |
| 2 | Session context | `ChatSession` retains user, assistant, tool-use, and tool-result turns | Implemented and tested |
| 3 | Visible and persistent MCP log | Terminal protocol formatter plus JSONL audit logger | Implemented and tested |

## Servidores MCP locales — 30% (15% each)

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 4 | Official local Filesystem and Git MCP servers | Configuration plus the disposable repository scenario in `npm run demo:scenario` | Implemented and demonstrable |
| 5 | Custom industrial local MCP server | Supply planning server over stdio, five tools, use case agreed with the lecturer | Implemented and tested |

## Servidor MCP remoto y análisis de red — 50% (25% each)

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 6 | Same custom server running remotely | Live authenticated Render service; HTTP server, client transport, Dockerfile, Blueprint, Cloud Run alternative | Complete and verified |
| 7 | Wireshark analysis classifying JSON-RPC messages | Decrypted canonical capture, exact frame table, and `remote-mcp-analysis.png` | Complete and verified |

Requirement 7 is closed with the capture recorded on 2026-09-21. Wireshark
decrypts stream 16 using the TLS secrets from the same client execution. The
observed frames are 880/911 for `initialize`, 914/943 for
`notifications/initialized`, 945/986 for `tools/list`, and 988/1020 for
`tools/call`. The evidence figure omits the Authorization header.

## Reporte — 10%

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 8 | Server specification, parameters, endpoints | README tool contracts plus the local and remote interface tables | Complete |
| 9 | Link, network, transport, and application layer analysis | `FINAL-REPORT.md` section 5, with observed addresses and packet numbers | Complete and verified |
| 10 | Conclusions and project commentary | `FINAL-REPORT.md` section 7 | Complete |

## Documentación y control de versiones — 15%

| Item | Evidence | Status |
|---|---|---|
| README in English covering features, install and use | `README.md` | Complete |
| Code comments and documentation | Protocol, transport, and service layers are commented | Complete |
| Repository private, course staff invited | GitHub administration | **Excluded from this evaluation by request** |
| Gradual commit history | Git history | **Excluded from this evaluation by request** |

Repository privacy, invitations, pushes, and commit-history distribution are
intentionally outside this final project evaluation. No technical or
documentary requirement remains open in the evaluated scope.

## Extra — 15%

| Item | Evidence | Status |
|---|---|---|
| Terminal UI informed by HCI | Semantic colour, hierarchy, compact traffic, activity indicator, tables, no-colour mode | Implemented and tested |
| Responsive web console | React operations console with a navigable JSON-RPC evidence drawer; `DESIGN.md` records the colour, hierarchy and usability decisions | Implemented and tested |

## Verification

`npm run check` builds the server and the web interface and runs 64 tests, all
passing.
