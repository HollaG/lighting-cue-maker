import { useEffect } from "react";
import type { ViewMode } from "../../components/Cues/CueCard/ViewModeSelect";
import { useRealtime } from "../../context/realtime";
import { ClientMessageType, ServerMessageType } from "../../types/realtime/realtime";
import { useRealtimeStore } from "../../store/realtimeStore";

export function useCueViewModeTracking({
  cueId,
  viewMode,
  activeFixtureGroupId,
  setViewMode,
  setActiveFixtureGroupId,
}: {
  cueId: string;
  viewMode: ViewMode;
  activeFixtureGroupId: string | null;
  setViewMode: (newViewMode: ViewMode) => void;
  setActiveFixtureGroupId: (newActiveFixtureGroupId: string | null) => void;
}) {
  const { sendMessage, status, registerListener } = useRealtime();
  const followingUserId = useRealtimeStore((state) => state.followingUserId);
  const isFollowing = !!followingUserId;

  // updating others on our
  useEffect(() => {
    if (status !== "connected" || isFollowing) return; // do NOT update others when we're following someone
    sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
      viewConfig: {
        [cueId]: { viewMode, activeFixtureGroupIds: activeFixtureGroupId ? [activeFixtureGroupId] : [] },
      },
    });
  }, [viewMode, activeFixtureGroupId, isFollowing, sendMessage, status]);

  // updating our state from others
  useEffect(() => {
    const unregister = registerListener(ServerMessageType.ServerMessagePresenceUpdate, (data) => {
      if (data.userId === followingUserId) {
        // we want to listen to updates from this person
        if (data.viewConfig && data.viewConfig[cueId]) {
          const { viewMode: newViewMode, activeFixtureGroupIds } = data.viewConfig[cueId];
          setViewMode(newViewMode);
          setActiveFixtureGroupId(activeFixtureGroupIds.length > 0 ? activeFixtureGroupIds[0] : null);
        }
      }
    });

    return unregister;
  }, [followingUserId, registerListener, setViewMode, setActiveFixtureGroupId]);
}
