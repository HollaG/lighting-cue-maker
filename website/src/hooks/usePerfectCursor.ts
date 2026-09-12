import { PerfectCursor } from "perfect-cursors";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { CursorPoint } from "../types/cursors";

/** Pass a stable callback; the animator is created and disposed with the owning cursor. */
export function usePerfectCursor(callback: (point: number[]) => void) {
  const animatorRef = useRef<PerfectCursor | null>(null);

  useLayoutEffect(() => {
    // Creating it in the effect also handles React StrictMode's setup/cleanup replay.
    const animator = new PerfectCursor(callback);
    animatorRef.current = animator;
    return () => {
      // perfect-cursors 1.0.5 only clears its timeout in dispose().
      cancelAnimationFrame(animator.lastRequestId);
      animator.dispose();
      animatorRef.current = null;
    };
  }, [callback]);

  return useCallback((point: CursorPoint) => animatorRef.current?.addPoint(point), []);
}
