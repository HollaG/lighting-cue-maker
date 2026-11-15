import { useLocalStorage } from "@mantine/hooks";
import type { CSSProperties } from "react";

export type SizeLimits = { min: number; max: number };

/**
 * A drawer size in viewport percent (vh for top/bottom drawers, vw for left/right ones), kept in local storage.
 * Returns the size and a setter that clamps to `min`..`max`.
 */
export const useDrawerSize = (key: string, defaultValue: number, { min, max }: SizeLimits) => {
  const [size, setSize] = useLocalStorage<number>({
    key,
    defaultValue,
    getInitialValueInEffect: false, // read storage on the first render, so the drawer doesn't open at the default first
  });
  const resize = (next: number) => setSize(Math.min(max, Math.max(min, next)));
  return [size, resize] as const;
};

/**
 * `styles` for a resizable Drawer: the handle is absolute inside `content`, and `body` scrolls instead of `content`,
 * so the handle stays put while the drawer's content scrolls (its containing block is outside the scroller).
 */
export const resizableDrawerStyles: { content: CSSProperties; body: CSSProperties } = {
  content: { position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" },
  body: { flex: 1, minHeight: 0, overflowY: "auto" },
};
