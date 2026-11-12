import { useEffect, useRef, useState } from "react";

/**
 * Milliseconds since the effects started, for animating effects in the preview.
 *
 * Only re-renders when something can change: `getNextDelay(timeMs)` says how long until then
 * (`Infinity` = nothing animates, stop ticking). That keeps re-renders to one per step unless a fade is running.
 *
 * @param enabled false = no timer, returns 0
 * @param resetKey restarts the clock from 0 when it changes (e.g. the cue id)
 * @param getNextDelay ms until the output can next change, given the current time
 */
export const useEffectClock = (
  enabled: boolean,
  resetKey: string | null | undefined,
  getNextDelay: (timeMs: number) => number,
): number => {
  const [timeMs, setTimeMs] = useState(0);

  // Read through a ref so a new function each render doesn't restart the clock.
  const getNextDelayRef = useRef(getNextDelay);
  useEffect(() => {
    getNextDelayRef.current = getNextDelay;
  }, [getNextDelay]);

  useEffect(() => {
    if (!enabled) return;

    const start = performance.now();
    let timer: number | undefined;

    const schedule = (now: number) => {
      const delay = getNextDelayRef.current(now);
      if (!Number.isFinite(delay)) return;
      // +1 ms so we land just inside the next step, not just before it.
      timer = window.setTimeout(tick, Math.max(1, delay + 1));
    };
    const tick = () => {
      const now = performance.now() - start;
      setTimeMs(now);
      schedule(now);
    };

    timer = window.setTimeout(() => {
      setTimeMs(0);
      schedule(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, resetKey]);

  return enabled ? timeMs : 0;
};
