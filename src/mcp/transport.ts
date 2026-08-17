import type { JsonObject } from '../shared/json.js'

/** Callbacks a transport uses to hand data back to the protocol layer. */
export interface TransportHandlers {
  /** One decoded JSON-RPC message received from the server. */
  message(payload: unknown): void
  /**
   * Activity that is not part of the protocol. `server` reports output the
   * peer produced outside the message channel; `client` reports a violation
   * this host detected, such as malformed data on the protocol channel.
   */
  diagnostic(origin: 'server' | 'client', detail: JsonObject): void
  /** The transport failed and cannot deliver further messages. */
  failure(error: Error): void
}

/**
 * Carries JSON-RPC messages between this host and one MCP server.
 *
 * The protocol layer never learns whether the peer is a local child process or
 * a remote endpoint, so a second transport can be added without changing how
 * requests, notifications, and responses are built or correlated.
 */
export interface McpTransport {
  /** Identifies the transport in logs and diagnostics, such as `stdio`. */
  readonly kind: string
  /** Opens the connection and begins delivering messages to the handlers. */
  start(handlers: TransportHandlers): Promise<void>
  /** Delivers one JSON-RPC message to the server. */
  send(message: JsonObject): Promise<void>
  /** Releases every resource held by the transport. */
  close(): Promise<void>
}
