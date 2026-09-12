import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerMessageType, type ServerMessageInvalidateQueryData } from "../../types/realtime/realtime";
import { useRealtime } from "../../context/realtime";

/** Listens for realtime messages that invalidate entries in the React Query cache. */
export function useLiveQueryUpdates() {
  const queryClient = useQueryClient();
  const { registerListener } = useRealtime();

  useEffect(() => {
    return registerListener(ServerMessageType.ServerMessageInvalidateQuery, (data) => {
      const { queryKey } = data as ServerMessageInvalidateQueryData;

      void queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient, registerListener]);
}
