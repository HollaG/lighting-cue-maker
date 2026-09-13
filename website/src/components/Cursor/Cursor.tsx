// feature[class=Realtime] Cursor component

import * as React from "react";
import { usePerfectCursor } from "../../hooks/usePerfectCursor";
import type { CursorAnchor, CursorPoint } from "../../types/realtime/cursors";
import { resolveCursorAnchor } from "../../utils/presence/cursorAnchors";
import type { CURSOR_COLORS } from "../../utils/presence/cursorColors";
import { Badge, Box } from "@mantine/core";
import { useRealtimeStore } from "../../store/realtimeStore";
import { useInViewport, useMergedRef } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

export function Cursor({
  anchor,
  color,
  label,
  userId,
}: {
  anchor: CursorAnchor | null | undefined;
  color: (typeof CURSOR_COLORS)[number];
  label?: string;
  userId: string;
}) {
  const cursorRef = React.useRef<HTMLDivElement>(null);
  const { ref, inViewport } = useInViewport();
  const rCursor = useMergedRef<HTMLDivElement>(cursorRef, ref);
  const targetedElement = React.useRef<HTMLElement | null>(null);

  const bottomIndicatorRef = React.useRef<HTMLDivElement>(null);
  const topIndicatorRef = React.useRef<HTMLDivElement>(null);

  const followingUserId = useRealtimeStore((state) => state.followingUserId);

  const animateCursor = React.useCallback((point: number[]) => {
    const element = cursorRef.current;
    if (!element) return;
    element.style.setProperty("transform", `translate(${point[0]}px, ${point[1]}px)`);
  }, []);

  const onPointMove = usePerfectCursor(animateCursor);

  React.useLayoutEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let previous: CursorPoint | null = null;
    const updatePoint = () => {
      const info = anchor ? resolveCursorAnchor(anchor) : null;
      const point = info?.point ?? null;
      cursor.style.visibility = info?.visible ? "visible" : "hidden";
      targetedElement.current = info?.element ?? null;

      if (point && (!previous || point[0] !== previous[0] || point[1] !== previous[1])) {
        onPointMove(point);
      }
      previous = point;

      const isAboveViewport = point !== null && point[1] < 0;
      const isBelowViewport = point !== null && point[1] > window.innerHeight;

      // only if the cursor is out of frame AND we're not following this cursor
      if (!info?.visible && followingUserId !== userId) {
        if (isAboveViewport) {
          bottomIndicatorRef.current?.style.setProperty("visibility", "hidden");
          topIndicatorRef.current?.style.setProperty("visibility", "visible");

          topIndicatorRef.current?.style.setProperty("transform", `translateX(${point?.[0] ?? 0}px)`);
        } else if (isBelowViewport) {
          bottomIndicatorRef.current?.style.setProperty("visibility", "visible");
          topIndicatorRef.current?.style.setProperty("visibility", "hidden");

          bottomIndicatorRef.current?.style.setProperty("transform", `translateX(${point?.[0] ?? 0}px)`);
        }
      } else {
        topIndicatorRef.current?.style.setProperty("visibility", "hidden");
        bottomIndicatorRef.current?.style.setProperty("visibility", "hidden");
      }

      // bottomIndicatorRef.current?.style.setProperty("visibility", info?.visible ? "hidden" : "visible");
      // topIndicatorRef.current?.style.setProperty("visibility", info?.visible ? "hidden" : "visible");
    };

    updatePoint();
    // document.addEventListener("scroll", updatePoint, true);
    document.addEventListener("scrollend", updatePoint, true);
    window.addEventListener("resize", updatePoint);

    return () => {
      // document.removeEventListener("scroll", updatePoint, true);
      document.removeEventListener("scrollend", updatePoint, true);
      window.removeEventListener("resize", updatePoint);
    };
  }, [anchor, onPointMove]);

  // for scroll tracking only
  React.useEffect(() => {
    // only follow if the user is following this user
    if (followingUserId === userId && targetedElement.current) {
      // Native scrollIntoView may move both nested scrollers and the main page.
      targetedElement.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [targetedElement.current, followingUserId]);

  // if cursor is not in viewport, return a little arrow to indicate where
  if (!inViewport) {
  }

  return (
    <>
      {/* <Group gap="xs">
        <Box>
          <IconChevronDown />
        </Box>
      </Group> */}
      <Badge
        ref={bottomIndicatorRef}
        color={color}
        size="sm"
        style={{
          position: "fixed",
          bottom: 10,
          display: "flex",
          alignItems: "center",
          visibility: "hidden",
        }}
        leftSection={<IconChevronDown size="0.6rem" />}
      >
        {label}
      </Badge>
      <Badge
        ref={topIndicatorRef}
        color={color}
        size="sm"
        style={{
          position: "fixed",
          top: 10,
          display: "flex",
          alignItems: "center",
          // visibility: inViewport ? "hidden" : "visible",
          visibility: "hidden",
        }}
        leftSection={<IconChevronUp size="0.6rem" />}
      >
        {label}
      </Badge>
      <Box
        ref={rCursor}
        style={{
          position: "absolute",
          top: -15,
          left: -15,
          pointerEvents: "none",
        }}
      >
        <svg
          style={{
            display: "block",
            width: 35,
            height: 35,
            pointerEvents: "none",
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 35 35"
          fill="none"
          fillRule="evenodd"
        >
          <g fill="rgba(0,0,0,.2)" transform="translate(1,1)">
            <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
            <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
          </g>
          <g fill="white">
            <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
            <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
          </g>
          <g fill={`var(--mantine-color-${color}-5)`}>
            <path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
            <path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
          </g>
        </svg>

        {label && (
          // <div
          //   style={{
          //     position: "absolute",
          //     top: 25,
          //     left: 24,
          //     padding: "2px 6px",
          //     borderRadius: 4,
          //     backgroundColor: color,
          //     color: "white",
          //     fontSize: 12,
          //     whiteSpace: "nowrap",
          //   }}
          // >
          //   {label}
          // </div>
          <Badge
            color={color}
            size="xs"
            style={{
              position: "absolute",
              top: 25,
              left: 24,
              display: "block",
            }}
          >
            {label}
          </Badge>
        )}
      </Box>
    </>
  );
}
