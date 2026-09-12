export type CursorPoint = [x: number, y: number];

export const CURSOR_SURFACES = ["lyrics", "cueCard"] as const;
export type CursorSurface = (typeof CURSOR_SURFACES)[number];

/** An anchor ID is unique within a surface and item (lyrics use "line:word"). */
export type CursorAnchor = {
  itemId: string;
  surface: CursorSurface;
  anchorId: string;
  xRatio: number;
  yRatio: number;
};

export const CURSOR_UPDATE_INTERVAL_MS = 1000 / 24;
