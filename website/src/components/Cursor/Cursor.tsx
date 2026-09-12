import * as React from "react";
import { usePerfectCursor } from "../../hooks/usePerfectCursor";
import type { CursorAnchor, CursorPoint } from "../../types/realtime/cursors";
import { resolveCursorAnchor } from "../../utils/presence/cursorAnchors";
import type { CURSOR_COLORS } from "../../utils/presence/cursorColors";
import { Badge, Box } from "@mantine/core";

export function Cursor({
  anchor,
  color,
  label,
}: {
  anchor: CursorAnchor | null | undefined;
  color: (typeof CURSOR_COLORS)[number];
  label?: string;
}) {
  const rCursor = React.useRef<HTMLDivElement>(null);

  const animateCursor = React.useCallback((point: number[]) => {
    const element = rCursor.current;
    if (!element) return;
    element.style.setProperty("transform", `translate(${point[0]}px, ${point[1]}px)`);
  }, []);

  const onPointMove = usePerfectCursor(animateCursor);

  React.useLayoutEffect(() => {
    const cursor = rCursor.current;
    if (!cursor) return;

    let previous: CursorPoint | null = null;
    const updatePoint = () => {
      const point = anchor ? resolveCursorAnchor(anchor) : null;
      cursor.style.visibility = point ? "visible" : "hidden";

      if (point && (!previous || point[0] !== previous[0] || point[1] !== previous[1])) {
        onPointMove(point);
      }
      previous = point;
    };

    updatePoint();
    document.addEventListener("scroll", updatePoint, true);
    window.addEventListener("resize", updatePoint);

    return () => {
      document.removeEventListener("scroll", updatePoint, true);
      window.removeEventListener("resize", updatePoint);
    };
  }, [anchor, onPointMove]);

  return (
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
  );
}
