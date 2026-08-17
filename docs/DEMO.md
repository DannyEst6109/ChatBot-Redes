# Part 1 Demonstration Script

## Preparation

1. Run `npm install`.
2. Run `npm test`.
3. Run `npm run demo` to prove the manual MCP exchange without an API key.
4. Configure `.env` and run `npm run chatbot` for the live LLM demonstration.
5. Keep `logs/mcp-interactions.jsonl` visible in a second terminal.

## Demonstration sequence

1. Explain the host, client, and server processes.
2. Show the `initialize` request and response in the log.
3. Show `notifications/initialized` and `tools/list`.
4. Ask: "Which DC-PROD materials may run out in the next seven days?"
5. Ask: "Why is the flour material critical?"
6. Ask: "How much should be purchased?"
7. Ask: "Does that purchase eliminate every stockout?"
8. Ask: "Are all data sources current?"
9. Show that a follow-up refers to the previous material, proving session context.
10. Call a material that does not exist and show the controlled MCP tool error.

## Official server scenario

After installing the official servers, enable `filesystem` and `git` in
`config/mcp-servers.json`, restart the chatbot, and verify `/servers` and
`/tools`. Use a temporary directory inside this repository for the scenario:

1. Ask Filesystem to create `official-server-demo/README.md`.
2. Ask Git for the repository status.
3. Ask Git to stage only that demonstration file.
4. Review the staged diff before asking Git to commit it.
5. Ask Git for the latest commit log.

Do not run this scenario with confidential paths. The Filesystem server is
restricted to the academic repository by configuration.

## Business explanation

- Calculations happen in the deterministic supply server, not in the LLM.
- Data is synthetic and isolated from external systems.
- Recommendations are read-only and cannot create purchase orders.
- Missing parameters are reported instead of guessed.
- A stockout before lead time triggers a contingency warning.

## Technical explanation

- JSON-RPC 2.0 messages are newline-delimited UTF-8 over stdio.
- stdout is reserved for protocol messages.
- stderr carries server diagnostics.
- Request IDs correlate concurrent responses.
- The client discovers tools dynamically and can connect to multiple servers.
- The official Filesystem and Git servers use the same generic client.

## Difficulties and lessons learned

- stdout contamination breaks stdio protocols, so diagnostics must use stderr.
- Request correlation must be registered before writing to avoid a fast-response race.
- The LLM must not calculate inventory because deterministic rules are auditable.
- Synthetic adapters protect confidential operational information and improve repeatability.
