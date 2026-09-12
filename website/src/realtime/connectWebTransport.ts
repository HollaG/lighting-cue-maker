import type { ClientMessage, ServerMessage } from "../types/realtime/realtime";
import type { RealtimeConnection, RealtimeConnectionOptions } from "./connection";

/** Opens a WebTransport connection and hides its stream details from React. */
export async function connectWebTransport(
  url: string,
  { signal, onMessage, onClose, onError }: RealtimeConnectionOptions,
): Promise<RealtimeConnection> {
  const transport = new WebTransport(url, { protocols: ["lighting-realtime-v1"] });
  let connected = false;
  let closed = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;

  const close = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", close);
    void reader?.cancel().catch(() => {});
    void writer?.abort().catch(() => {});

    try {
      transport.close();
    } catch {
      // Some browsers cannot close a WebTransport connection during its handshake.
    }
  };

  signal.addEventListener("abort", close, { once: true });

  // Observe this immediately so a failed handshake never creates an unhandled rejection.
  void transport.closed.then(
    () => {
      if (connected && !closed) onClose();
    },
    (error) => {
      if (connected && !closed) onError(error);
    },
  );

  try {
    await transport.ready;
    if (signal.aborted) throw signal.reason;

    const controlStream = await transport.createBidirectionalStream();
    if (signal.aborted) throw signal.reason;

    reader = controlStream.readable.getReader();
    writer = controlStream.writable.getWriter();
    connected = true;

    void readMessages(reader, onMessage).catch((error) => {
      if (!closed) onError(error);
    });
    void writer.closed.catch((error) => {
      if (!closed) onError(error);
    });

    console.info("Connected using:", (transport as WebTransport & { protocol?: string }).protocol);

    return {
      kind: "webtransport",
      send: async (message: ClientMessage) => {
        if (!writer) throw new Error("WebTransport writer is not available");
        const json = JSON.stringify(message);
        // console.log("Sending message:", json);
        await writer.write(new TextEncoder().encode(json + "\n"));
      },
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}

/** Reads newline-delimited JSON without assuming transport chunk boundaries. */
async function readMessages(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onMessage: (message: ServerMessage) => void,
) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");

    for (const line of lines) {
      if (line.trim()) onMessage(JSON.parse(line) as ServerMessage);
    }

    if (done) {
      if (buffer.trim()) onMessage(JSON.parse(buffer) as ServerMessage);
      return;
    }
  }
}
