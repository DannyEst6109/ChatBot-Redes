import type { JsonObject } from '../shared/json.js'

/** Funciones utilizadas por el transporte para entregar datos al protocolo. */
export interface TransportHandlers {
  /** Mensaje JSON-RPC decodificado recibido del servidor. */
  message(payload: unknown): void
  /** Diagnóstico que no forma parte del intercambio JSON-RPC. */
  diagnostic(origin: 'server' | 'client', detail: JsonObject): void
  /** Informa que el transporte ya no puede entregar mensajes. */
  failure(error: Error): void
}

/**
 * Transporta mensajes JSON-RPC entre el anfitrión y un servidor MCP sin exponer
 * los detalles de la conexión a la capa de protocolo.
 */
export interface McpTransport {
  /** Nombre del transporte utilizado en registros y diagnósticos. */
  readonly kind: string
  /** Abre la conexión y comienza a entregar mensajes. */
  start(handlers: TransportHandlers): Promise<void>
  /** Envía un mensaje JSON-RPC al servidor. */
  send(message: JsonObject): Promise<void>
  /** Libera los recursos utilizados por el transporte. */
  close(): Promise<void>
}
