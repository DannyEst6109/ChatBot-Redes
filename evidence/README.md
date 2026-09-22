# Remote MCP packet-capture evidence

The canonical capture is `remote-mcp.pcapng`. It was recorded on the active
Wi-Fi interface while the authenticated Render deployment completed an MCP
handshake, `tools/list`, and repeated `tools/call` requests.

Use this Wireshark display filter to isolate the evidence:

```text
dns.qry.name contains "supply-control-mcp.onrender.com" || tcp.stream == 16
```

Verified endpoints and frames in the canonical capture:

- Client: `10.100.4.45`
- Render edge: `216.24.57.16:443`
- DNS query/response: frames 627 and 652
- TCP SYN/SYN-ACK: frames 729 and 747; the following ACK completes the handshake
- TLS ClientHello/ServerHello: frames 755 and 769
- `initialize` request/response: frames 880 and 911
- `notifications/initialized` / HTTP 202: frames 914 and 943
- `tools/list` request/response: frames 945 and 986
- `tools/call(get_supply_data_status)` request/response: frames 988 and 1020
- HTTPS connection close: frames 1025 and 1042
- Total capture: 9,474 packets

`remote-mcp-analysis.png` is a presentation-ready figure derived from Wireshark
and TShark using the session secrets generated during the same capture. It shows
the decoded JSON-RPC bodies while deliberately omitting the Authorization
header. The key log remains in ignored `tmp/tls-keys.log` for local verification
and must not be published while its credential is active.
