/**
 * TEMPORARY dev-only instrumentation for the "effect starts smooth, then lags" investigation. Remove when done.
 *
 * Collects timings and prints one summary line every few seconds, only while something is being recorded
 * (i.e. while an effect is running on the event page):
 *   - clock late:    how much later than scheduled each effect-clock tick fired
 *   - commit:        how long React (r3f's renderer) took to re-render the 3D scene for a tick
 *   - frame gap:     longest time between two animation frames (main-thread stalls, e.g. GC or long tasks)
 *   - heap:          JS heap in use (Chrome only), to see whether memory keeps growing
 */
import { Logger } from "./logger";

/** Off by default, in dev and production. To turn on: run `localStorage.perfProbe = "1"` in the console, then reload. */
const ENABLED = readFlag();

function readFlag(): boolean {
  try {
    return localStorage.getItem("perfProbe") === "1";
  } catch {
    return false; // storage blocked
  }
}
const REPORT_EVERY_MS = 3000;
/** A frame gap longer than this counts as a stall (60 Hz ≈ 16.7 ms per frame). */
const STALL_MS = 25;

const logger = new Logger("perf", "orange");

type Stat = { count: number; total: number; max: number };
const stats = new Map<string, Stat>();

/** Read once per report, e.g. renderer counters: each returns name → current value. */
const samplers = new Set<() => Record<string, number>>();

/** Adds values read at report time (e.g. cache sizes). Returns a function that removes it. */
export const registerPerfSampler = (sampler: () => Record<string, number>) => {
  if (!ENABLED) return () => {};
  samplers.add(sampler);
  return () => samplers.delete(sampler);
};

let frameGapMax = 0;
let stalls = 0;
let reporting = false;

/** Adds one timing (ms) under `name`. Starts the reporter on first use. */
export const recordPerf = (name: string, ms: number) => {
  if (!ENABLED) return;
  const stat = stats.get(name) ?? { count: 0, total: 0, max: 0 };
  stat.count++;
  stat.total += ms;
  stat.max = Math.max(stat.max, ms);
  stats.set(name, stat);
  startReporter();
};

/** For React's <Profiler onRender>: records the commit's actual render time. */
export const onProfilerRender = (id: string, _phase: string, actualDuration: number) =>
  recordPerf(`commit ${id}`, actualDuration);

const startReporter = () => {
  if (reporting) return;
  reporting = true;

  // Frame gaps, measured the whole time the reporter runs.
  let last = performance.now();
  const onFrame = (now: number) => {
    const gap = now - last;
    last = now;
    frameGapMax = Math.max(frameGapMax, gap);
    if (gap > STALL_MS) stalls++;
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  window.setInterval(() => {
    if (stats.size === 0) return; // nothing ran (e.g. no effect): stay quiet
    const parts = [...stats.entries()].map(
      ([name, s]) => `${name}: avg ${(s.total / s.count).toFixed(1)} max ${s.max.toFixed(1)} ms (n=${s.count})`,
    );
    parts.push(`frame gap max ${frameGapMax.toFixed(1)} ms, stalls >${STALL_MS}ms: ${stalls}`);
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    if (memory) parts.push(`heap ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(0)} MB`);
    for (const sampler of samplers) {
      try {
        const values = Object.entries(sampler()).map(([name, value]) => `${name}=${Math.round(value)}`);
        if (values.length > 0) parts.push(values.join(" "));
      } catch {
        // a probe must never break the app
      }
    }
    logger.info(parts.join(" | "));

    stats.clear();
    frameGapMax = 0;
    stalls = 0;
  }, REPORT_EVERY_MS);
};
