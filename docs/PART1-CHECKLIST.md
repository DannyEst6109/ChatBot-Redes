# Part 1 Requirements Checklist

This document maps the implementation to the project instructions and is limited
to the first milestone.

| Requirement | Evidence | Status |
|---|---|---|
| Connect to an LLM through its API | Native HTTPS implementation in `AnthropicGateway` | Implemented; API key required at runtime |
| Preserve context in one session | `ChatSession` retains user, assistant, tool-use, and tool-result messages | Implemented and tested |
| Show and retain every MCP interaction | Terminal output plus `logs/mcp-interactions.jsonl` | Implemented and demonstrated |
| Use official Filesystem MCP server | Official npm command plus `npm run demo:filesystem` | Integrated, verified, and enabled by default |
| Use official Git MCP server | Compatible official `mcp-server-git` command plus `npm run demo:git` | Integrated, verified, and enabled by default |
| Create an industrial local MCP server | Synthetic food-supply planning server | Implemented |
| Chatbot uses the local server | Generic process client performs initialize, discovery, and calls | Implemented and tested |
| Implement MCP manually | JSON-RPC envelopes, lifecycle, tool discovery, and invocation are local code | Implemented without an MCP SDK |
| Server specification and parameters | Full tool reference in `README.md` | Complete |
| Installation and usage instructions in English | `README.md` | Complete |
| Gradual version control | Repository is ready; commit cadence remains the student's responsibility | Student action required |
| Private repository with staff access | Hosting permission is outside the application | Student action required |
| Partial presentation/demo | `npm run demo` and `docs/DEMO.md` | Ready |

## Deliberately excluded

- Remote MCP transport.
- Cloud deployment.
- Wireshark capture and JSON-RPC network classification.
- OSI/TCP-IP report.
- Production integration or company data.

Those items belong to the second milestone or final report.
