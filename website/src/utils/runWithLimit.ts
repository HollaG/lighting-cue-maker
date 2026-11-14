/**
 * Runs `task` for every item, at most `limit` at a time, and waits for all of them.
 * Settles like Promise.allSettled: one failure doesn't stop the others. Results are in the same order as `items`.
 */
export const runWithLimit = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  // Each worker takes the next item until none are left.
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await task(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
