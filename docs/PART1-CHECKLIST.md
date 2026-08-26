# Part 1 Requirements Checklist

Audit date: 2026-08-26. This document maps the implementation to the project
instructions and rubric and is limited to the first milestone.

| PDF item | Requirement | Evidence | Audit result |
|---|---|---|---|
| 1 | Connect to an LLM through its API | Native HTTPS `AnthropicGateway`; live Claude response on 2026-08-26 | Verified |
| 2 | Preserve context in one session | Live Alan Turing follow-up returned `1912`; automated `ChatSession` tests | Verified |
| 3 | Display and retain every MCP request and response | Terminal protocol view and `logs/mcp-interactions.jsonl` | Verified |
| 4 | Use the official local Filesystem and Git MCP servers | Both enabled by default; `npm run demo:scenario` wrote, staged, reviewed, committed, and read the log through MCP | Verified |
| 5 | Create and use a local industrial MCP server | Five synthetic supply-planning tools; custom server used by the generic client | Verified |
| 5 | Publish the server specification, parameters, usage, and examples | Complete English contract and tool reference in `README.md` | Verified locally; remote sync confirmed |
| 5 | Industry use case approved before implementation | Approval is not technical evidence and must be confirmed by the student | Student confirmation required |
| 3.1 | Implement the protocol manually without MCP libraries or SDKs | Local JSON-RPC envelopes, lifecycle, client, server, and transport; no runtime dependency | Verified |
| 3.1 | Work from a terminal or command line | Terminal chatbot and independent server/demo scripts | Verified |
| 3.2 | Document the code and provide a detailed English README | Source comments plus installation, operation, architecture, contract, and examples | Verified |
| 3.2 | Use a private repository and grant course staff access | `main` matches `origin/main`; privacy and collaborator access cannot be inferred from local Git | GitHub confirmation required |
| 3.2 | Show gradual version-control development | 11 focused commits exist, but all current commits are dated 2026-08-16 | Continue honest commits over time |
| 3.3 | Present features, difficulties and resolutions, and lessons learned | Reproducible commands and presentation script in `docs/DEMO.md` | Ready; oral delivery required |
| Extra | Add a usable terminal UI | Semantic colour, hierarchy, progress, tables, plain fallback, and UI tests | Implemented |

## Verification record

- `npm run check`: 55 of 55 tests passed.
- `npm run demo`: the custom server and all three configured servers initialized.
- `npm run demo:scenario`: Filesystem wrote the README and Git staged, diffed,
  committed, and read the log in the isolated `demo-workspace/` repository.
- Live chatbot: Claude answered a general question and resolved a contextual
  pronoun in the next question.
- `main` is zero commits ahead of and zero commits behind `origin/main` before
  this audit update.

## Before submitting

1. Confirm the GitHub repository is private.
2. Confirm the professor and teaching assistants have access.
3. Confirm or document the professor's approval of the industrial use case.
4. Commit and push this audit update with a truthful message.
5. Rehearse `docs/DEMO.md`; presentation delivery cannot be automated.

## Deliberately excluded

- Remote MCP transport.
- Cloud deployment.
- Wireshark capture and JSON-RPC network classification.
- OSI/TCP-IP report.
- Production integration or company data.

Those items belong to the second milestone or final report.
