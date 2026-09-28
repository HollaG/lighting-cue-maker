import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { useRealtimeStore } from "../../store/realtimeStore";
import { ClientMessageType, ServerMessageType } from "../../types/realtime/realtime";

/** Share the version being viewed and follow version changes for this cue. */
export function useActiveVersionTracking({
  cueId,
  selectedVersionId,
  setFollowedVersionId,
}: {
  cueId: string;
  selectedVersionId: string;
  setFollowedVersionId: (versionId: string) => void;
}) {
  const { sendMessage, status, registerListener } = useRealtime();
  const followingUserId = useRealtimeStore((state) => state.followingUserId);

  useEffect(() => {
    if (status !== "connected" || followingUserId) return;
    sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
      selectedVersion: { [cueId]: { id: selectedVersionId } },
    });
  }, [cueId, selectedVersionId, followingUserId, sendMessage, status]);

  useEffect(() => {
    return registerListener(ServerMessageType.ServerMessagePresenceUpdate, (data) => {
      if (!followingUserId || data.userId !== followingUserId) return;
      const versionId = data.selectedVersion?.[cueId]?.id;
      if (typeof versionId === "string") setFollowedVersionId(versionId);
    });
  }, [cueId, followingUserId, registerListener, setFollowedVersionId]);
}
