import { useMemo, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import { StatsGl } from "@react-three/drei";
import classes from "./VisualiserStats.module.css";

declare global {
  interface Window {
    /** Dev console toggle: `window.stats = true` shows the FPS overlay on the 3D visualiser, `false` hides it. */
    stats?: boolean;
  }
}

// A setter on `window.stats`, so React hears about the change (a plain property can't notify anyone).
// Resets to off on a full reload or when this file hot-reloads.
let statsEnabled = false;
const listeners = new Set<() => void>();
Object.defineProperty(window, "stats", {
  configurable: true,
  get: () => statsEnabled,
  set: (value: unknown) => {
    statsEnabled = !!value;
    listeners.forEach((listener) => listener());
  },
});
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * FPS + frame-time overlay on the middle of the visualiser's right edge, off until `window.stats = true`.
 * Must be rendered inside the <Canvas>.
 */
export const VisualiserStats = () => {
  const enabled = useSyncExternalStore(subscribe, () => statsEnabled);

  // Mount into R3F's wrapper around the canvas (position: relative), so the overlay sits on this visualiser,
  // not the page, and goes away with it.
  const container = useThree((state) => state.gl.domElement.parentElement);
  const parent = useMemo(() => ({ current: container as HTMLElement }), [container]);

  if (!enabled || !container) return null;
  return <StatsGl className={classes.stats} parent={parent} />;
};
