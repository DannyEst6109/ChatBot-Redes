# Final Requirements Checklist

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | LLM API connection | `AnthropicGateway` calls Messages API directly | Implemented and tested |
| 2 | Session context | `ChatSession` retains user, assistant, tool-use, and tool-result turns | Implemented and tested |
| 3 | Visible and persistent MCP log | Terminal protocol formatter plus JSONL audit logger | Implemented and tested |
| 4 | Official local Filesystem and Git MCP servers | Configuration and disposable repository scenario | Implemented and demonstrable |
| 5 | Custom industrial local MCP server | Supply planning server over stdio, five tools | Implemented and tested |
| 6 | Same custom server remotely | HTTP server, client transport, Dockerfile, Render Blueprint, Cloud Run alternative, remote demo | Implementation complete; authenticated deployment pending |
| 7 | Wireshark communication analysis | Capture procedure and honest JSON-RPC/TLS correlation in `FINAL-REPORT.md` | Procedure complete; real capture pending |
| 8 | Server specification, parameters, endpoints | README tool contracts and local/remote interface tables | Complete |
| 9 | Link, network, transport, and application analysis | `FINAL-REPORT.md` | Complete; capture-specific values pending |
| 10 | Conclusions and project commentary | `FINAL-REPORT.md` | Complete |
| Extra | Terminal UI informed by HCI | Semantic colour, hierarchy, compact traffic, spinner, tables, no-colour mode | Implemented and tested |

The two pending items require state that must not be fabricated or committed as
if it were evidence: a successful deployment in the student's cloud account and
packet numbers/IP addresses from an actual Wireshark capture. All repository
code, tests, scripts, and report structure needed to produce that evidence are
present.
