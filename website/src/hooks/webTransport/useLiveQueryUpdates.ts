import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerMessageType, useWebTransport, type ServerMessageInvalidateQueryData } from "../../context/webtransport";

/**
 * This hook listens for server messages indicating that a query should be invalidated.
 * When such a message is received, it invalidates the corresponding query in the React Query cache.
 *
 * Use this hook in pages that have WebTransport query invalidation.
 * This should only be called once per page.
 *
 *
 */
export function useLiveQueryUpdates() {
  const queryClient = useQueryClient();
  const { registerListener } = useWebTransport();

  useEffect(() => {
    return registerListener(ServerMessageType.ServerMessageInvalidateQuery, (data) => {
      const { queryKey } = data as ServerMessageInvalidateQueryData;

      void queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient, registerListener]);
}
