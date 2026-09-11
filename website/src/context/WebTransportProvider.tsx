import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { WebTransportContext, type WebTransportContextValue, type WebTransportSession } from "./webtransport";
import { useAppStore } from "../store/appStore";
import {
  ClientMessageType,
  type ServerMessage,
  type ServerMessageHistory,
  type ServerMessageType,
} from "../types/realtime";

const REALTIME_URL = import.meta.env.VITE_PUBLIC_WEBTRANSPORT_URL ?? "https://localhost:6121/api/v1/realtime";

type WebTransportConnectionState = Omit<WebTransportContextValue, "history" | "registerListener" | "sendMessage">;

/** Owns one realtime connection and control stream for the mounted event page. */
export function WebTransportProvider({ eventId, children }: { eventId: string; children: ReactNode }) {
  const itemId = useAppStore((s) => s.activeItemId);
  const [history, setHistory] = useState<ServerMessageHistory>({});

  // subscription listeners to notify when a server message is received
  const listenersRef = useRef(new Map<ServerMessageType, Set<(data: unknown) => void>>());

  /**
   * Child components can register a listener for a specific event.
   */
  const registerListener = useCallback((type: ServerMessageType, listener: (data: unknown) => void) => {
    const listeners = listenersRef.current.get(type) ?? new Set();
    listeners.add(listener);
    listenersRef.current.set(type, listeners);

    // Used by React effect cleanup.
    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  }, []);

  const [value, setValue] = useState<WebTransportConnectionState>({
    eventId,
    status: "connecting",
    session: null,
    error: null,
  });

  const sendMessage = useCallback(
    (type: ClientMessageType, data: unknown) => {
      // directly forward this to the server if the connection is ready
      if (value.status === "connected" && value.session) {
        void writeMessage(value.session, { type, data });
      }
    },
    [value.status, value.session],
  );

  /**
   * Internal function only, called by the read loop to:
   *   1. update the message history
   *   2. notify any registered listeners for the message type
   */
  const dispatchMessage = useCallback((message: ServerMessage) => {
    setHistory((current) => ({
      ...current,
      [message.type]: [...(current[message.type] ?? []), message.data],
    }));
    listenersRef.current.get(message.type)?.forEach((listener) => listener(message.data));
  }, []);

  console.log({ history });

  // Automatically join the room of the itemId when the connection is ready
  useEffect(() => {
    if (!itemId || value.status !== "connected" || !value.session) return;

    writeMessage(value.session, {
      type: ClientMessageType.ClientMessageRoomJoin,
      data: { itemId },
    }).catch((error) => {
      console.error("Failed to join room:", error);
    });

    return () => {
      writeMessage(value.session!, {
        type: ClientMessageType.ClientMessageRoomLeave,
        data: { itemId },
      }).catch((error) => {
        console.error("Failed to leave room:", error);
      });
    };
  }, [itemId, value.session, value.status]);

  // Begin connecting to the WebTransport server
  useEffect(() => {
    let disposed = false;
    let failed = false;
    let transport: WebTransport | undefined;
    let session: WebTransportSession | undefined;

    const close = () => {
      if (session) {
        void session.reader.cancel().catch(() => {});
        void session.writer.abort().catch(() => {});
        session = undefined;
      }
      // Some browsers cannot close a connecting transport; connect() retries after ready.
      try {
        transport?.close();
      } catch {
        /* Closed again after the pending handshake. */
      }
    };

    const fail = (reason: unknown) => {
      if (disposed) return;
      failed = true;
      setValue({
        eventId,
        status: "error",
        session: null,
        error: reason instanceof Error ? reason : new Error(String(reason)),
      });
    };

    async function connect() {
      setValue({ eventId, status: "connecting", session: null, error: null });
      try {
        if (typeof WebTransport === "undefined") throw new Error("This browser does not support WebTransport");
        transport = new WebTransport(REALTIME_URL, { protocols: ["lighting-realtime-v1"] });
        // Observe closed immediately, including handshake failures, to handle its rejection.
        void transport.closed.then(() => {
          if (!disposed && !failed) setValue({ eventId, status: "closed", session: null, error: null });
        }, fail);
        await transport.ready;
        if (disposed) {
          close();
          return;
        }

        const controlStream = await transport.createBidirectionalStream();
        if (disposed) {
          close();
          return;
        }
        session = {
          transport,
          controlStream,
          writer: controlStream.writable.getWriter(),
          reader: controlStream.readable.getReader(),
        };
        // The provider owns the only read loop and dispatches messages to subscribers.
        void readMessages(session.reader, (message) => {
          console.log("Received message:", message);
          if (!disposed) dispatchMessage(message);
        }).catch(fail);
        void session.writer.closed.catch(fail);
        // The negotiated protocol property is newer than the installed DOM typings.
        console.info("Connected using:", (transport as WebTransport & { protocol?: string }).protocol);
        setValue({ eventId, status: "connected", session, error: null });
      } catch (error) {
        fail(error);
        close();
      }
    }

    void connect();
    return () => {
      disposed = true;
      close();
    };
  }, [dispatchMessage, eventId]);

  // Never expose the previous event's session during an event change.
  const currentValue: WebTransportConnectionState =
    value.eventId === eventId
      ? value
      : {
          eventId,
          status: "connecting",
          session: null,
          error: null,
        };
  return (
    <WebTransportContext.Provider value={{ ...currentValue, history, registerListener, sendMessage }}>
      {children}
    </WebTransportContext.Provider>
  );
}

/** Reads the server's newline-delimited JSON without assuming transport chunk boundaries. */
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

async function writeMessage(session: WebTransportSession, data: unknown) {
  const json = JSON.stringify(data);
  console.log("Sending message:", json);
  await session.writer.write(new TextEncoder().encode(json + "\n"));
}
