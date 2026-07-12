/**
 * Wait for the next frame (guaranteed)
 *
 * @returns void
 */
export const waitNextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
