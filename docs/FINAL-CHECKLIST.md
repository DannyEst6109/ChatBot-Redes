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

## Servidores MCP, primera parte — 30% (15% each)

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 4 | Official local Filesystem and Git MCP servers | Configuration plus the disposable repository scenario in `npm run demo:scenario` | Implemented and demonstrable |
| 5 | Custom industrial local MCP server | Supply planning server over stdio, five tools, use case agreed with the lecturer | Implemented and tested |

## Servidores MCP, segunda parte — 50% (25% each)

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 6 | Same custom server running remotely | Live authenticated Render service; HTTP server, client transport, Dockerfile, Blueprint, Cloud Run alternative | Complete and verified |
| 7 | Wireshark analysis classifying JSON-RPC messages | See below | **Re-capture required** |

Requirement 7 asks which captured messages are synchronization, which are
requests, and which are responses. The capture currently in `evidence/` is real
and correctly labelled, but it is HTTPS, so the JSON-RPC bodies are encrypted
and the classification table in `FINAL-REPORT.md` is conceptual rather than
read off the packets.

`npm run capture:remote` closes this. It exercises the same remote Render
service and writes the TLS session secrets to `tmp/tls-keys.log`; loading that
file in Wireshark decrypts the stream and shows every JSON-RPC envelope by frame
number. The capture must be re-recorded this way, and the observed frame numbers
written back into section 4 of `FINAL-REPORT.md`.

## Reporte — 10%

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 8 | Server specification, parameters, endpoints | README tool contracts plus the local and remote interface tables | Complete |
| 9 | Link, network, transport, and application layer analysis | `FINAL-REPORT.md` section 5, with observed addresses and packet numbers | Complete for layers 2-4; application layer pending the decrypted re-capture |
| 10 | Conclusions and project commentary | `FINAL-REPORT.md` section 7 | Complete |

## Documentación y control de versiones — 15%

| Item | Evidence | Status |
|---|---|---|
| README in English covering features, install and use | `README.md` | Complete |
| Code comments and documentation | Protocol, transport, and service layers are commented | Complete |
| Repository private, course staff invited | Must be confirmed in the GitHub settings before delivery | **To confirm** |
| Gradual commit history | 21 commits, but clustered: 11 on 2026-08-16, four spread across late August, seven from 2026-09-13 onwards | **Partially met** |

The commit distribution is the weakest point of the submission and cannot be
corrected retroactively without falsifying history. Remaining work should be
committed as several coherent commits rather than one, and the gaps should be
acknowledged honestly in the presentation.

## Extra — 15%

| Item | Evidence | Status |
|---|---|---|
| Terminal UI informed by HCI | Semantic colour, hierarchy, compact traffic, activity indicator, tables, no-colour mode | Implemented and tested |
| Responsive web console | React operations console with a navigable JSON-RPC evidence drawer; `DESIGN.md` records the colour, hierarchy and usability decisions | Implemented and tested |

## Verification

`npm run check` builds the server and the web interface and runs 64 tests, all
passing.
