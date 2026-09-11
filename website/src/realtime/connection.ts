import type { ClientMessage, ServerMessage } from "../types/realtime";

export type RealtimeTransportKind = "webtransport" | "websocket";

/** The transport-neutral connection used by the realtime provider. */
export interface RealtimeConnection {
  kind: RealtimeTransportKind;
  send(message: ClientMessage): Promise<void>;
  close(): void;
}

export interface RealtimeConnectionOptions {
  signal: AbortSignal;
  onMessage: (message: ServerMessage) => void;
  onClose: () => void;
  onError: (error: unknown) => void;
}
