import { useEffect } from "react";
import { useRealtime } from "../../context/realtime";
import { ClientMessageType } from "../../types/realtime";
import { CURSOR_UPDATE_INTERVAL_MS, type CursorPoint } from "../../types/cursors";
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

    const publish = () => {
      if (!pointer || document.hidden) return;

      const cursor = captureCursorAnchor(document.elementFromPoint(...pointer), pointer, itemId);

      if (cursor === null) {
        // no anchor found, but we don't want to hide the cursor.
        // so we don't send anything
        return;
      }

      const serialized = JSON.stringify(cursor);
      if (serialized === lastSent) return;
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
      console.log("hide is running");
      pointer = null;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      frame = 0;
      timer = 0;
      lastPublishedAt = performance.now();
      lastSent = "null";

      sendMessage(ClientMessageType.ClientMessagePresenceUpdate, {
        cursor: null,
      });
    };
    const visibilityChanged = () => {
      if (document.hidden) hide();
    };

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
