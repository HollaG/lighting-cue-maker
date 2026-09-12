import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime";
import { CURSOR_UPDATE_INTERVAL_MS, PRESENCE_HEARTBEAT_MS, type CursorPoint } from "../../types/cursors";
import { captureCursorAnchor } from "../../utils/cursorAnchors";

/**
 * One publisher for all marked surfaces. Sample the last viewport point again as
 * content moves underneath it, including scrolling, reflow and CSS transitions.
 * A shared throttle prevents a trailing update from an old surface winning a race.
 */
export function useCursorTracking(itemId: string | undefined) {
  const { sendMessage, status } = useRealtime();

  useEffect(() => {
    if (!itemId || status !== "connected") return;
    let pointer: CursorPoint | null = null;
    let frame = 0;
    let lastSample = 0;
    let lastSent = "";

    const publish = (heartbeat = false) => {
      const cursor =
        pointer && !document.hidden
          ? captureCursorAnchor(document.elementFromPoint(...pointer), pointer, itemId)
          : null;
      const serialized = JSON.stringify(cursor);
      if (!heartbeat && serialized === lastSent) return;
      lastSent = serialized;
      sendMessage(ClientMessageType.ClientMessagePresenceUpdate, { cursor });
    };

    /** Sample at the refresh rate of the page.
     *  TODO: this function may cause lag, not sure.
     */
    const sample = (now: number) => {
      if (now - lastSample >= CURSOR_UPDATE_INTERVAL_MS) {
        lastSample = now;
        publish();
      }
      frame = requestAnimationFrame(sample);
    };

    const move = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      pointer = [event.clientX, event.clientY];
      if (!frame) frame = requestAnimationFrame(sample);
    };
    const hide = () => {
      pointer = null;
      cancelAnimationFrame(frame);
      frame = 0;
      publish();
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };
    const visibilityChanged = () => {
      if (document.hidden) hide();
    };

    // Heartbeats let receivers remove disconnected peers without expiring a still cursor.
    const heartbeat = window.setInterval(() => publish(true), PRESENCE_HEARTBEAT_MS);
    document.addEventListener("pointermove", move, true);
    // document.addEventListener("pointerout", leave, true);
    document.addEventListener("pointercancel", hide, true);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("blur", hide);
    publish();

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(heartbeat);
      document.removeEventListener("pointermove", move, true);
      // document.removeEventListener("pointerout", leave, true);
      document.removeEventListener("pointercancel", hide, true);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("blur", hide);
      sendMessage(ClientMessageType.ClientMessagePresenceUpdate, { cursor: null });
    };
  }, [itemId, sendMessage, status]);
}
