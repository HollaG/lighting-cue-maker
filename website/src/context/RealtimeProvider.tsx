import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAppStore } from "../store/appStore";
import { connectRealtime } from "../realtime/connectRealtime";
import type { RealtimeConnection, RealtimeTransportKind } from "../realtime/connection";
import {
  ClientMessageType,
  ServerMessageType,
  type ClientMessageDataMap,
  type ServerMessage,
  type ServerMessageDataMap,
  type ServerMessageHistory,
} from "../types/realtime";
import { RealtimeContext, type RealtimeContextValue } from "./realtime";
import { isCursorAnchor } from "../utils/presence/cursorAnchors";
import { usePresenceStore } from "../store/presenceStore";
import { convertServerPresenceInformation } from "../utils/presence/presence";

type RealtimeConnectionState = Pick<RealtimeContextValue, "eventId" | "status" | "transport" | "error"> & {
  connection: RealtimeConnection | null;
};

/** Owns one realtime connection for the mounted event page. */
export function RealtimeProvider({ eventId, children }: { eventId: string; children: ReactNode }) {
  const itemId = useAppStore((state) => state.activeItemId);

  // History is only used for persistent stuff, such as the chat history.
  const [history, setHistory] = useState<ServerMessageHistory>({});

  const listenersRef = useRef(
    new Map<ServerMessageType, Set<(data: ServerMessageDataMap[ServerMessageType]) => void>>(),
  );
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    eventId,
    status: "connecting",
    transport: null,
    error: null,
    connection: null,
  });

  const registerListener = useCallback(
    (type: ServerMessageType, listener: (data: ServerMessageDataMap[ServerMessageType]) => void) => {
      const listeners = listenersRef.current.get(type) ?? new Set();
      listeners.add(listener);
      listenersRef.current.set(type, listeners);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) listenersRef.current.delete(type);
      };
    },
    [],
  );

  const dispatchMessage = useCallback((message: ServerMessage) => {
    listenersRef.current.get(message.type)?.forEach((listener) => listener(message.data));

    const { type, data } = message;
    switch (type) {
      case ServerMessageType.ServerMessagePresenceUpdate:
        if (typeof data.id !== "string" || (data.cursor != null && !isCursorAnchor(data.cursor))) break;
        usePresenceStore.getState().mergePresence(convertServerPresenceInformation(data));
        break;

      default:
        setHistory((current) => ({
          ...current,
          [message.type]: [...(current[message.type] ?? []), message.data],
        }));
    }
  }, []);

  const sendMessage = useCallback(
    (type: ClientMessageType, data: ClientMessageDataMap[ClientMessageType]) => {
      if (connectionState.status !== "connected" || !connectionState.connection) return;
      console.log(`Sending message of type ${type} at timestamp ${Date.now()}`, data);
      void connectionState.connection.send({ type, data, timestamp: Date.now() }).catch((error) => {
        console.error("Failed to send realtime message:", error);
      });
    },
    [connectionState.connection, connectionState.status],
  );

  useEffect(() => {
    usePresenceStore.getState().clearPresence();
    if (!itemId || connectionState.status !== "connected" || !connectionState.connection) return;

    sendMessage(ClientMessageType.ClientMessageRoomJoin, { itemId });

    return () => {
      sendMessage(ClientMessageType.ClientMessageRoomLeave, { itemId });
    };
  }, [sendMessage, itemId]);

  useEffect(() => {
    const abortController = new AbortController();
    let connection: RealtimeConnection | undefined;
    let failed = false;

    const updateDisconnectedState = (
      status: "closed" | "error",
      transport: RealtimeTransportKind | null,
      error: Error | null,
    ) => {
      if (abortController.signal.aborted) return;
      setConnectionState({ eventId, status, transport, error, connection: null });
    };

    const fail = (reason: unknown) => {
      failed = true;
      connection?.close();
      updateDisconnectedState(
        "error",
        connection?.kind ?? null,
        reason instanceof Error ? reason : new Error(String(reason)),
      );
    };

    async function connect() {
      setConnectionState({ eventId, status: "connecting", transport: null, error: null, connection: null });

      try {
        connection = await connectRealtime({
          signal: abortController.signal,
          onMessage: (message) => {
            console.log(`Received message at timestamp ${message.timestamp}`, message);
            dispatchMessage(message);
          },
          onClose: () => {
            if (!failed) updateDisconnectedState("closed", connection?.kind ?? null, null);
          },
          onError: fail,
        });

        if (!abortController.signal.aborted) {
          setConnectionState({
            eventId,
            status: "connected",
            transport: connection.kind,
            error: null,
            connection,
          });
        }
      } catch (error) {
        fail(error);
      }
    }

    void connect();
    return () => {
      abortController.abort();
      connection?.close();
    };
  }, [dispatchMessage, eventId]);

  // Never expose the previous event's connection during an event change.
  const currentState: RealtimeConnectionState =
    connectionState.eventId === eventId
      ? connectionState
      : { eventId, status: "connecting", transport: null, error: null, connection: null };

  return (
    <RealtimeContext.Provider
      value={{
        eventId: currentState.eventId,
        status: currentState.status,
        transport: currentState.transport,
        error: currentState.error,
        history,
        registerListener,
        sendMessage,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
