import { createPortal } from "react-dom";
import { useRealtime } from "../../context/realtime";
import { useCursorTracking } from "../../hooks/realtime/useCursorTracking";
import { Cursor } from "./Cursor";

/** Owns the sole Cursor instance for each peer, across every tracked surface. */
export function RemoteCursorOverlay({ itemId }: { itemId: string | undefined }) {
  const { presenceInformationMap } = useRealtime();
  useCursorTracking(itemId);

  return createPortal(
    <div
      aria-hidden="true"
      data-remote-cursor-overlay
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000, overflow: "hidden" }}
    >
      {Object.values(presenceInformationMap).map((presence) => (
        <Cursor
          key={presence.id}
          anchor={presence.cursor?.itemId === itemId ? presence.cursor : null}
        />
      ))}
    </div>,
    document.body,
  );
}
