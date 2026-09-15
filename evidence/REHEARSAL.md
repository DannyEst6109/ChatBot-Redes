# Final demonstration rehearsal

Rehearsal completed on 2026-09-14 after the Render deployment and packet
capture were finalized.

## Verified results

- `npm run check`: 58 of 58 tests passed.
- `npm run demo:remote`: authenticated initialization, five tools discovered,
  and `get_supply_data_status` completed successfully over HTTPS.
- `npm run demo:scenario`: the official Filesystem and Git MCP servers created,
  staged, reviewed, and committed the disposable scenario README.
- `npm run chatbot`: four servers connected and 36 tools were discovered.
- Claude answered the Alan Turing follow-up with `1912`, confirming session
  context.
- Claude invoked `supply-remote__get_supply_data_status`; the remote tool call
  completed successfully and reported the synthetic, isolated data sources and
  both quality warnings.
- Render commit `5b4d23d` was observed in the `Live` state before this rehearsal.

No credential values are recorded in this file. The local `.env` is ignored by
Git and contains the configuration required for the live demonstration.
