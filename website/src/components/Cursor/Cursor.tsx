import * as React from "react";
import { usePerfectCursor } from "../../hooks/usePerfectCursor";
import type { CursorAnchor, CursorPoint } from "../../types/cursors";
import { resolveCursorAnchor } from "../../utils/cursorAnchors";

/** Remains mounted when hidden or when its user moves to a different surface. */
export function Cursor({ anchor }: { anchor: CursorAnchor | null | undefined }) {
  const rCursor = React.useRef<SVGSVGElement>(null);

  const animateCursor = React.useCallback((point: number[]) => {
    const elm = rCursor.current;
    if (!elm) return;
    elm.style.setProperty("transform", `translate(${point[0]}px, ${point[1]}px)`);
  }, []);

  const onPointMove = usePerfectCursor(animateCursor);

  React.useLayoutEffect(() => {
    const element = rCursor.current;
    if (!element) return;
    if (!anchor) {
      element.style.visibility = "hidden";
      return;
    }

    let frame = 0;
    let previous: CursorPoint | null = null;
    const update = () => {
      const point = resolveCursorAnchor(anchor);
      element.style.visibility = point ? "visible" : "hidden";
      if (point && (!previous || point[0] !== previous[0] || point[1] !== previous[1])) {
        onPointMove(point);
      }
      previous = point;
      // DOM measurements follow nested scrolling, wrapping and animated card expansion.
      // They do not update React state or send network traffic.
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [anchor, onPointMove]);

  return (
    <svg
      ref={rCursor}
      style={{
        position: "absolute",
        top: -15,
        left: -15,
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
      <g fill={"red"}>
        <path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
        <path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
      </g>
    </svg>
  );
}
