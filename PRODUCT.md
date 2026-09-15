# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript frontend with a Node.js backend intermediary. The backend
reuses the existing manual MCP/JSON-RPC implementation and keeps Anthropic and
Render credentials out of the browser.

## Users

The primary audience combines a supply-planning operator with an academic
evaluator. The operator needs to identify inventory risk, inspect a material,
understand recommendations, and act with confidence. The evaluator needs to
see that the same custom MCP server works locally and remotely and that the
protocol lifecycle is genuine.

## Product Purpose

Supply Control MCP turns synthetic food-supply planning data into an
explainable operational conversation. Success means a user can discover a
risk, inspect its inputs, obtain a deterministic purchase recommendation, and
trace the MCP interaction that produced it.

## Positioning

The product makes the protocol itself inspectable: one interface connects an
LLM conversation, deterministic supply calculations, live local and remote MCP
servers, and the JSON-RPC evidence behind every tool-assisted answer.

## Operating Context

The application is used in a desktop browser for an operations workflow and a
live university demonstration. It works with synthetic inventory, demand,
scheduled receipts, material-master data, audit logs, a Render deployment, and
Wireshark evidence. A responsive layout must remain usable on smaller screens.

## Capabilities and Constraints

- Preserve the manually implemented MCP client and JSON-RPC 2.0 transport.
- Expose chat, inventory risks, material status, purchase recommendations,
  explanations, data freshness, server state, tool discovery, and protocol log.
- Keep all operational data synthetic and explicitly labelled as such.
- Support the local `supply`, remote `supply-remote`, official `filesystem`, and
  official `git` servers without implying they are identical services.
- Never expose API keys or bearer tokens to browser code, logs, or screenshots.
- Render remains the remote deployment target and may cold-start on the free
  plan.
- HTTPS-encrypted JSON-RPC must not be presented as readable packet payload in
  Wireshark.

## Evidence on Hand

- Real remote deployment: `https://supply-control-mcp.onrender.com/mcp`.
- Verified test suite with 64 passing tests.
- Real filtered capture: `evidence/remote-mcp.pcapng`.
- Capture analysis figure: `evidence/remote-mcp-analysis.png`.
- Final report and exact frame mapping: `docs/FINAL-REPORT.md`.
- Demonstration guide and rehearsal record: `docs/DEMO.md` and
  `evidence/REHEARSAL.md`.
- No real customer, production inventory, commercial benchmark, or testimonial
  exists and none may be fabricated.

## Product Principles

- Make every operational conclusion explainable and traceable.
- Separate synthetic demonstration data from real-world claims.
- Show system state and uncertainty instead of hiding them.
- Keep the common workflow fast while making protocol depth available on
  demand.
- Protect credentials by architecture, not by visual concealment alone.

## Accessibility & Inclusion

Meet WCAG AA fundamentals: keyboard operation, visible focus, semantic heading
order, announced async/error states, minimum 4.5:1 body-text contrast, and text
or icon labels in addition to status color.
