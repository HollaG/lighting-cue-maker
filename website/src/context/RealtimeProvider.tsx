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
} from "../types/realtime/realtime";
import { RealtimeContext, type RealtimeContextValue } from "./realtime";
import { isCursorAnchor } from "../utils/presence/cursorAnchors";
import { usePresenceStore } from "../store/presenceStore";
import { convertServerPresenceInformation } from "../utils/presence/presence";
import { useRealtimeStore } from "../store/realtimeStore";

type RealtimeConnectionState = Pick<RealtimeContextValue, "eventId" | "status" | "transport" | "error"> & {
  connection: RealtimeConnection | null;
};

/** Owns one realtime connection for the mounted event page.
 *  Do NOT store any business data in this Provider.
 *  as it causes all components who called `useRealtime()` to re-render on every change.
 *
 */
export function RealtimeProvider({ eventId, children }: { eventId: string; children: ReactNode }) {
  const itemId = useAppStore((state) => state.activeItemId);

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
      case ServerMessageType.ServerMessageClientHelloAck:
        const { userId, name } = data;
        console.log("settng current user to ", data);
        useRealtimeStore.getState().setCurrentUser({ userId, name });

        break;

      // do NOT store presence data in the Provider! It causes updates to all components.
      case ServerMessageType.ServerMessagePresenceUpdate:
        if (
          typeof data.userId !== "string" ||
          typeof data.connectionId !== "string" ||
          (data.cursor != null && !isCursorAnchor(data.cursor))
        )
          break;

        usePresenceStore.getState().mergePresence(convertServerPresenceInformation(data));
        break;

      case ServerMessageType.ServerMessageChatMessage:
        useRealtimeStore.getState().onMessageReceived(data);
        break;
      case ServerMessageType.ServerMessageSyncRoomMessagesData:
        useRealtimeStore.getState().setMessageHistory(data.messages);
        break;

      case ServerMessageType.ServerMessageRoomUsersUpdate:
        if (!Array.isArray(data.users)) break;
        useRealtimeStore.getState().setConnectedUsers(data.users);
        useRealtimeStore
          .getState()
          .setCurrentUser(data.users.find((user) => user.userId === useRealtimeStore.getState().user?.userId) ?? null);
        break;
      default:
    }
  }, []);

  /** Send a message to the server */
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

        if (abortController.signal.aborted || failed) return;

        const store = useRealtimeStore.getState();
        const user = store.user ?? { userId: crypto.randomUUID(), name: "" };

        // manually send a hello message, no need to wait for state to be re-rendered and updated.
        await connection.send({
          type: ClientMessageType.ClientMessageHello,
          data: user,
          timestamp: Date.now(),
        });

        if (!abortController.signal.aborted && !failed) {
          console.log("Realtime connection established:", connection.kind);
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
        registerListener,
        sendMessage,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
