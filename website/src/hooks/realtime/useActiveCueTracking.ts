import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { useAppStore } from "../../store/appStore";
import { ClientMessageType, ServerMessageType } from "../../types/realtime/realtime";
import { useRealtimeStore } from "../../store/realtimeStore";

// feature[class=Realtime] Track the active cue changing and update
//                         Also handle setting the active cue.
// do not send updates if we're currently following someone
export function useActiveCueTracking({ isFollowing }: { isFollowing: boolean }) {
  const { sendMessage, status, registerListener } = useRealtime();
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const setCurrentlySelectedCueId = useAppStore((state) => state.setCurrentlySelectedCueId);
  const followingUserId = useRealtimeStore((state) => state.followingUserId);

  // Whenever the active cue changes, send a message to the server
  // Note that in some cases, such as when a new cue is added,
  // the cueId will actually be transmitted BEFORE the instruction to add a new cue.
  // However, this is fine because it will reconcile itself once the new cue is added.
  useEffect(() => {
    if (status !== "connected" || isFollowing) return;

    sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
      currentlySelectedCueId: currentlySelectedCueId ?? null,
    });

    // return () => {
    // unselect the cue?
    // }
  }, [isFollowing, currentlySelectedCueId, sendMessage, status]);

  // Register a listener to update
  useEffect(() => {
    const unregister = registerListener(ServerMessageType.ServerMessagePresenceUpdate, (data) => {
      if (data.userId === followingUserId) {
        // we want to listen to updates from this person
        if (data.currentlySelectedCueId !== undefined) {
          // undefined=no update, null = unselect
          // this update did change the currently selected cue
          setCurrentlySelectedCueId(data.currentlySelectedCueId ?? undefined);
        }
      }
    });
    return unregister;
  }, [followingUserId, registerListener, setCurrentlySelectedCueId]);
}
