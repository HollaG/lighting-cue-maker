import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime";
import { CURSOR_UPDATE_INTERVAL_MS, PRESENCE_HEARTBEAT_MS, type CursorPoint } from "../../types/cursors";
import { captureCursorAnchor } from "../../utils/cursorAnchors";

/** One event-driven publisher for all marked cursor surfaces. */
export function useCursorTracking(itemId: string | undefined) {
  const { sendMessage, status } = useRealtime();

  useEffect(() => {
    if (!itemId || status !== "connected") return;
    let pointer: CursorPoint | null = null;
    let frame = 0;
    let timer = 0;
    let lastPublishedAt = 0;
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

    const schedulePublish = () => {
      if (frame || timer) return;

      const delay = Math.max(0, CURSOR_UPDATE_INTERVAL_MS - (performance.now() - lastPublishedAt));
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame((now) => {
          frame = 0;
          lastPublishedAt = now;
          publish();
        });
      }, delay);
    };

    const move = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      pointer = [event.clientX, event.clientY];
      schedulePublish();
    };
    const layoutChanged = () => {
      if (pointer) schedulePublish();
    };
    const hide = () => {
      pointer = null;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      frame = 0;
      timer = 0;
      lastPublishedAt = performance.now();
      publish();
    };
    const visibilityChanged = () => {
      if (document.hidden) hide();
    };

    // Heartbeats let receivers remove disconnected peers without expiring a still cursor.
    const heartbeat = window.setInterval(() => publish(true), PRESENCE_HEARTBEAT_MS);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("scroll", layoutChanged, true);
    document.addEventListener("pointercancel", hide, true);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("resize", layoutChanged);
    window.addEventListener("blur", hide);
    publish();

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearInterval(heartbeat);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("scroll", layoutChanged, true);
      document.removeEventListener("pointercancel", hide, true);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("resize", layoutChanged);
      window.removeEventListener("blur", hide);
      sendMessage(ClientMessageType.ClientMessagePresenceUpdate, { cursor: null });
    };
  }, [itemId, sendMessage, status]);
}
