import { createContext, useContext } from "react";

/** The visualiser never draws more often than this, so a 165 Hz screen doesn't cost 2.75× a 60 Hz one. */
export const MAX_FPS = 60;

/**
 * Says whether to draw on this animation frame. On screens faster than `maxFps` it skips frames so draws average
 * `maxFps` (on 165 Hz: every 2nd or 3rd frame). On a screen at or below `maxFps` it draws every frame.
 * After an idle period the first request draws at once.
 */
export const createFrameLimiter = (maxFps = MAX_FPS) => {
  const interval = 1000 / maxFps;
  /** A frame this close to the due time counts as on time (frame times jitter by a millisecond or two). */
  const tolerance = 2;
  let nextDueAt = -Infinity;
  return (now: number): boolean => {
    if (now < nextDueAt - tolerance) return false;
    // Keep a steady average by stepping from the due time, unless we fell behind (idle, or a slow frame).
    nextDueAt = now - nextDueAt > interval ? now + interval : nextDueAt + interval;
    return true;
  };
};

/** Whether the current frame draws. Decided once at the start of each frame by <FrameGateUpdater>. */
export type FrameGate = { draw: boolean };

export const FrameGateContext = createContext<FrameGate>({ draw: true });

/** Per-frame work that only matters if the frame draws (the draw itself, effect updates) checks this. */
export const useFrameGate = () => useContext(FrameGateContext);
