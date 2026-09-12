import { createPortal } from "react-dom";
import { useCursorTracking } from "../../hooks/realtime/useCursorTracking";
import { usePresenceStore } from "../../store/presenceStore";
import { Cursor } from "./Cursor";
import { getColorFromId } from "../../utils/presence/cursorColors";

/** Owns the sole Cursor instance for each peer, across every tracked surface. */
export function RemoteCursorOverlay({ itemId }: { itemId: string | undefined }) {
  const presenceInformationMap = usePresenceStore((state) => state.presenceInformationMap);
  useCursorTracking(itemId);

  return createPortal(
    <div
      aria-hidden="true"
      data-remote-cursor-overlay
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000, overflow: "hidden" }}
    >
      {Object.values(presenceInformationMap).map((presence) => (
        <Cursor
          key={presence.userId}
          anchor={presence.cursor?.itemId === itemId ? presence.cursor : null}
          color={getColorFromId(presence.userId)}
          label={presence.name}
        />
      ))}
    </div>,
    document.body,
  );
}
