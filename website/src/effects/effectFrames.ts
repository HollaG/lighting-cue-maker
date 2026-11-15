/**
 * Drives an effect outside a 3D canvas (e.g. the LD's pattern preview): calls `onFrame` on animation frames while the
 * output changes every frame (a fade), and sleeps until the next change otherwise. The timing itself comes from the
 * compiled effect (`getDelay`), so there is no second copy of the step/fade rules here.
 *
 * @param getDelay ms until the output can next change at `timeMs`: 0 = next frame, `Infinity` = stop
 * @param onFrame draws the state at `timeMs` (ms since `startedAt`)
 * @returns stops the loop
 */
export const runEffectFrames = (
  getDelay: (timeMs: number) => number,
  onFrame: (timeMs: number) => void,
  startedAt = performance.now(),
): (() => void) => {
  let frameId: number | undefined;
  let timerId: number | undefined;

  const frame = () => {
    const timeMs = performance.now() - startedAt;
    onFrame(timeMs);
    const delay = getDelay(timeMs);
    if (!Number.isFinite(delay)) return;
    if (delay <= 0) frameId = requestAnimationFrame(frame);
    // Sleep, then draw on the next frame after the change.
    else timerId = window.setTimeout(() => (frameId = requestAnimationFrame(frame)), delay);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    window.clearTimeout(timerId);
  };
};
