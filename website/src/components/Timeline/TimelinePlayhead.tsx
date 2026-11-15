import { useTimelineContext } from "dnd-timeline";
import { SIDEBAR_WIDTH } from "../../utils/timeline";
import { useRef, useEffect } from "react";
import { getDefaultZIndex } from "@mantine/core";

export const TimelinePlayhead = ({ getPositionMs }: { getPositionMs: () => number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { range, valueToPixels } = useTimelineContext();
  const latest = useRef({ range, valueToPixels });
  latest.current = { range, valueToPixels }; // the loop reads the current zoom/pan

  // use requestAnimationFrame to update the playhead's position (translateX), so that we don't re-render state (heavy)
  useEffect(() => {
    let id = requestAnimationFrame(function tick() {
      const { range, valueToPixels } = latest.current;

      // The playhead position is actually stored in a Ref.
      // normally, refs wouldn't update the UI, but since we basically use
      // reqestAnimationFrame to 'spam' request the UI and then update it imperatively, it works out.
      const x = SIDEBAR_WIDTH + valueToPixels(getPositionMs() - range.start);
      ref.current!.style.transform = `translateX(${x}px)`;
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [getPositionMs]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 2,
        background: "light-dark(var(--mantine-color-red-4), var(--mantine-color-red-9))",
        pointerEvents: "none",
        zIndex: getDefaultZIndex("modal") + 1,
      }}
    />
  );
};
