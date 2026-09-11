import type { RealtimeConnection, RealtimeConnectionOptions } from "./connection";
import { connectWebTransport } from "./connectWebTransport";

const WEBTRANSPORT_URL = import.meta.env.VITE_PUBLIC_WEBTRANSPORT_URL ?? "https://localhost:6121/api/v1/realtime";

/** Chooses the realtime transport. A WebSocket fallback can be added here later. */
export function connectRealtime(options: RealtimeConnectionOptions): Promise<RealtimeConnection> {
  if (typeof WebTransport === "undefined") {
    return Promise.reject(new Error("This browser does not support WebTransport"));
  }

  return connectWebTransport(WEBTRANSPORT_URL, options);
}
