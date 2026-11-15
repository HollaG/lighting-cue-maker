import classes from "./DrawerResizeHandle.module.css";
import type { SizeLimits } from "./useDrawerSize";

/** Which edge of the drawer the handle sits on (the edge facing the page, opposite the one the drawer is docked to). */
export type DrawerResizeEdge = "top" | "left" | "right";

/**
 * Drag (or arrow keys when focused) to resize a drawer. Put it anywhere inside the Drawer and give the Drawer
 * `size={`${size}vh`}` or `vw` from useDrawerSize, plus `resizableDrawerStyles` (or at least content: position relative).
 */
export const DrawerResizeHandle = ({
  edge,
  size,
  onResize,
  min,
  max,
  label,
}: {
  edge: DrawerResizeEdge;
  size: number;
  onResize: (size: number) => void;
} & SizeLimits & { label: string }) => {
  const isVertical = edge === "top";

  /** The drawer size (viewport percent) that puts its edge at the pointer. */
  const sizeAt = (clientX: number, clientY: number) => {
    if (edge === "top") return ((window.innerHeight - clientY) / window.innerHeight) * 100; // bottom drawer grows upwards
    if (edge === "right") return (clientX / window.innerWidth) * 100; // left drawer grows rightwards
    return ((window.innerWidth - clientX) / window.innerWidth) * 100; // right drawer grows leftwards
  };

  return (
    <div
      className={`${classes.handle} ${classes[`edge-${edge}`]}`}
      role="separator"
      aria-label={label}
      aria-orientation={isVertical ? "horizontal" : "vertical"}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(size)}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation(); // keep drags and pans underneath out of it
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        onResize(sizeAt(event.clientX, event.clientY));
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={(event) => {
        // the arrow pointing away from the docked edge grows the drawer
        const grow = { top: "ArrowUp", right: "ArrowRight", left: "ArrowLeft" }[edge];
        const shrink = { top: "ArrowDown", right: "ArrowLeft", left: "ArrowRight" }[edge];
        if (event.key !== grow && event.key !== shrink) return;
        event.preventDefault();
        onResize(size + (event.key === grow ? 2 : -2));
      }}
    />
  );
};
