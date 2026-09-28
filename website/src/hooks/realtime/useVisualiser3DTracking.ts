import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { useRealtimeStore } from "../../store/realtimeStore";
import { ClientMessageType, ServerMessageType } from "../../types/realtime/realtime";
import type { Visualiser3DCameraView } from "../../types/visualiser3d";

export const useVisualiser3DTracking = ({
  cueId,
  setCameraPosition,
}: {
  cueId: string;
  setCameraPosition: (newCameraPosition: Visualiser3DCameraView) => void;
}) => {
  const { sendMessage, status, registerListener } = useRealtime();
  const followingUserId = useRealtimeStore((state) => state.followingUserId);
  const isFollowing = !!followingUserId;

  // updating others on our camera position
  // useEffect(() => {
  //   if (status !== "connected" || isFollowing) return; // do NOT update others when we're following someone
  //   sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
  //     visualiser3DCameraPosition: {
  //       [cueId]: cameraPosition,
  //     },
  //   });
  // }, [cameraPosition, isFollowing, sendMessage, status]);

  const onCameraMove = (position: Visualiser3DCameraView) => {
    if (status !== "connected" || isFollowing) return; // do NOT update others when we're following someone
    sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
      visualiser3DCameraPosition: {
        [cueId]: position,
      },
    });
  };

  // updating our camera position from others
  useEffect(() => {
    const unregister = registerListener(ServerMessageType.ServerMessagePresenceUpdate, (data) => {
      if (data.userId === followingUserId) {
        // we want to listen to updates from this person
        if (data.visualiser3DCameraPosition && data.visualiser3DCameraPosition[cueId]) {
          setCameraPosition(data.visualiser3DCameraPosition[cueId]);
        }
      }
    });
    return () => {
      unregister();
    };
  }, [followingUserId, registerListener, setCameraPosition]);

  return {
    onCameraMove,
  };
};
