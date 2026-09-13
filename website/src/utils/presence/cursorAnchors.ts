// feature[class=Realtime] Capture and resolve cursor anchors against local elements

import { CURSOR_SURFACES, type CursorAnchor, type CursorPoint } from "../../types/realtime/cursors";

const SURFACE_SELECTOR = "[data-cursor-surface][data-cursor-item-id]";
const ANCHOR_SELECTOR = "[data-cursor-anchor]";

export function isCursorAnchor(value: unknown): value is CursorAnchor {
  if (!value || typeof value !== "object") return false;
  const anchor = value as Record<string, unknown>;
  return (
    typeof anchor.itemId === "string" &&
    typeof anchor.anchorId === "string" &&
    CURSOR_SURFACES.some((surface) => surface === anchor.surface) &&
    typeof anchor.xRatio === "number" &&
    Number.isFinite(anchor.xRatio) &&
    typeof anchor.yRatio === "number" &&
    Number.isFinite(anchor.yRatio) &&
    anchor.xRatio >= 0 &&
    anchor.xRatio <= 1 &&
    anchor.yRatio >= 0 &&
    anchor.yRatio <= 1
  );
}

/** Capture the nearest marked element; the surrounding surface supplies its scope. */
export function captureCursorAnchor(target: Element | null, point: CursorPoint, itemId: string): CursorAnchor | null {
  const element = target?.closest<HTMLElement>(ANCHOR_SELECTOR);
  const surface = element?.closest<HTMLElement>(SURFACE_SELECTOR);
  if (!element || !surface || surface.dataset.cursorItemId !== itemId) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const anchor = {
    itemId,
    surface: surface.dataset.cursorSurface,
    anchorId: element.dataset.cursorAnchor,
    xRatio: Math.max(0, Math.min(1, (point[0] - rect.left) / rect.width)),
    yRatio: Math.max(0, Math.min(1, (point[1] - rect.top) / rect.height)),
  };
  return isCursorAnchor(anchor) ? anchor : null;
}

export type ResolvedCursorAnchor = {
  point: CursorPoint | null;
  visible: boolean;
  element: HTMLElement;
};

/**
 * Find an anchor in this client's layout
 * The element and point remain available when clipped or covered; `visible`
 * controls whether the cursor itself is shown. Smooth scrolling is asynchronous,
 * so resolve again on scroll events.
 * Request scrolling only when the followed anchor changes, not on every sample.
 */
export function resolveCursorAnchor(
  anchor: CursorAnchor,
  {
    root = document,
  }: {
    root?: Document;
  } = {},
): ResolvedCursorAnchor | null {
  if (!isCursorAnchor(anchor)) return null;
  const surface = root.querySelector<HTMLElement>(
    `[data-cursor-surface="${CSS.escape(anchor.surface)}"]` + `[data-cursor-item-id="${CSS.escape(anchor.itemId)}"]`,
  );
  const element = surface?.querySelector<HTMLElement>(`[data-cursor-anchor="${CSS.escape(anchor.anchorId)}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { point: null, visible: false, element };
  const point: CursorPoint = [rect.left + rect.width * anchor.xRatio, rect.top + rect.height * anchor.yRatio];
  const hit = root.elementFromPoint(point[0], point[1]);
  return { point, visible: Boolean(hit && element.contains(hit)), element };
}
