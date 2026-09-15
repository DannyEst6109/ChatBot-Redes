# Remote MCP packet-capture evidence

The canonical capture is `remote-mcp.pcapng`. It was recorded on the active
Wi-Fi interface while the authenticated Render deployment completed an MCP
handshake, `tools/list`, and repeated `tools/call` requests.

Use this Wireshark display filter to isolate the evidence:

```text
dns.qry.name contains "supply-control-mcp.onrender.com" || ip.addr == 216.24.57.7
```

Verified endpoints and frames in the canonical capture:

- Client: `192.168.0.18`
- Render edge: `216.24.57.7:443`
- DNS query/response: frames 43-44
- TCP three-way handshake: frames 45-47
- TLS ClientHello/ServerHello: frames 49 and 51
- Encrypted MCP request/response traffic: frames 73-101
- Complete HTTPS connection close shown by frames 22, 24, and 25

`remote-mcp-analysis.png` is a presentation-ready figure derived from these
packet numbers. HTTPS protects the Authorization header and JSON-RPC bodies, so
the capture honestly labels them as encrypted application data.
