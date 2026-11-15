/**
 * Measurement for the visualiser bench (optimization plan, step 1). Dev tool: only the bench page mounts it.
 *
 * `BenchProbe` goes inside the <Canvas>. It patches the renderer to count shader builds, shadow-map redraws and render
 * passes, and pushes one sample per frame into every running `Collector`. The page outside the canvas reads collectors
 * to show a live readout and to produce a recorded report.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** The parts of three's WebGPURenderer we read or patch. Underscored fields are internal to three 0.186. */
type ProbedRenderer = {
  render: (scene: { name: string }, camera: unknown) => unknown;
  resolveTimestampsAsync: (type?: string) => Promise<number | undefined>;
  debug: { onNodeBuilderCreated: ((...args: unknown[]) => void) | null };
  info: {
    render: { drawCalls: number };
    memory: { geometries: number; textures: number };
  };
  backend: { trackTimestamp?: boolean };
  domElement: HTMLCanvasElement;
  _pipelines?: { caches?: Map<unknown, unknown> };
};

/** Everything measured between `start` and `end`. Arrays hold one value per frame. */
export class Collector {
  readonly startedAt = performance.now();
  endedAt: number | null = null;

  /** Time between browser animation frames (ms). Long gaps are visible stutter, rendered or not. */
  browserFrameGaps: number[] = [];
  /** Time between frames R3F actually rendered (ms). */
  renderedFrameGaps: number[] = [];
  /** CPU time of one R3F frame: all useFrame callbacks plus submitting the render (ms). Not GPU time. */
  cpuFrameMs: number[] = [];
  /** GPU time of one frame from timestamp queries (ms). Empty when the browser has no timestamp queries. */
  gpuFrameMs: number[] = [];
  drawCalls: number[] = [];
  /** renderer.render() calls per frame that are not shadow maps (scene pass, haze pass, blur, output). */
  renderPasses: number[] = [];

  renderedFrames = 0;
  shadowRedraws = 0;
  shaderBuilds = 0;
  pipelinesCreated = 0;
  /** React commits of the scene tree (the old effect path re-renders it per effect tick). */
  sceneCommits = 0;
  /** Worst CPU frame time among frames that built shaders. */
  worstCpuFrameWithBuilds = 0;
  framesWithBuilds = 0;

  // Read at the end, so the report shows where the counts finished.
  textures = 0;
  geometries = 0;
  pipelines = 0;
  canvasSize: [number, number] = [0, 0];

  get durationMs() {
    return (this.endedAt ?? performance.now()) - this.startedAt;
  }
}

const collectors = new Set<Collector>();

export const startCollector = () => {
  const collector = new Collector();
  collectors.add(collector);
  return collector;
};

export const stopCollector = (collector: Collector) => {
  collector.endedAt = performance.now();
  collectors.delete(collector);
};

/**
 * Counts commits of the canvas tree that carry a new `value` (the DMX object). A layout effect, because React's
 * <Profiler> callback does nothing in production builds. Put it inside the <Canvas>, next to the scene.
 */
export const BenchCommitCounter = ({ value }: { value: unknown }) => {
  useLayoutEffect(() => {
    collectors.forEach((c) => c.sceneCommits++);
  }, [value]);
  return null;
};

/** Running totals since the probe mounted; frame callbacks diff them. */
const counters = { shaderBuilds: 0, shadowRedraws: 0, renderPasses: 0 };

/** How long the current scene took to show its first frame. Most shader builds happen in that frame. */
const sceneLoad = { startedAt: 0, firstFrameAt: null as number | null, firstFrameCpuMs: 0, firstFrameBuilds: 0 };

/** Call when a new scene (canvas) starts mounting. */
export const markSceneStart = () => {
  sceneLoad.startedAt = performance.now();
  sceneLoad.firstFrameAt = null;
};

export const describeSceneLoad = () =>
  sceneLoad.firstFrameAt === null
    ? `Scene load: no frame yet after ${((performance.now() - sceneLoad.startedAt) / 1000).toFixed(1)} s`
    : `Scene load: first frame after ${((sceneLoad.firstFrameAt - sceneLoad.startedAt) / 1000).toFixed(2)} s ` +
      `(that frame: ${sceneLoad.firstFrameCpuMs.toFixed(0)} ms CPU, ${sceneLoad.firstFrameBuilds} shader builds)`;

export const BenchProbe = () => {
  const gl = useThree((state) => state.gl) as unknown as ProbedRenderer;
  const frameStartedAt = useRef(0);
  const lastRenderedAt = useRef<number | null>(null);
  const atFrameStart = useRef({ shaderBuilds: 0, shadowRedraws: 0, renderPasses: 0, pipelines: 0 });
  const resolvingGpu = useRef(false);

  useEffect(() => {
    // Count shader builds: three creates one node builder per new material/object/pass variant.
    const previousOnBuild = gl.debug.onNodeBuilderCreated;
    gl.debug.onNodeBuilderCreated = (...args) => {
      counters.shaderBuilds++;
      previousOnBuild?.(...args);
    };

    // Count render() calls. ShadowNode renames the scene to "Shadow Map [...]" while it renders a shadow map.
    const originalRender = gl.render;
    gl.render = function (this: ProbedRenderer, scene, camera) {
      if (scene.name.startsWith("Shadow Map")) counters.shadowRedraws++;
      else counters.renderPasses++;
      return originalRender.call(this, scene, camera);
    };

    // Browser frame gaps, independent of whether R3F renders.
    let last = performance.now();
    let rafId = requestAnimationFrame(function onFrame(now) {
      const gap = now - last;
      last = now;
      collectors.forEach((c) => c.browserFrameGaps.push(gap));
      rafId = requestAnimationFrame(onFrame);
    });

    return () => {
      cancelAnimationFrame(rafId);
      gl.render = originalRender;
      gl.debug.onNodeBuilderCreated = previousOnBuild;
    };
  }, [gl]);

  // Runs before every other frame callback.
  useFrame(() => {
    frameStartedAt.current = performance.now();
    atFrameStart.current = { ...counters, pipelines: gl._pipelines?.caches?.size ?? 0 };
  }, -1000);

  // Runs after the haze pipeline's draw (priority 1).
  useFrame(() => {
    const now = performance.now();
    const cpu = now - frameStartedAt.current;
    const start = atFrameStart.current;
    const builds = counters.shaderBuilds - start.shaderBuilds;
    const pipelines = gl._pipelines?.caches?.size ?? 0;
    const gap = lastRenderedAt.current === null ? null : now - lastRenderedAt.current;
    lastRenderedAt.current = now;

    if (sceneLoad.firstFrameAt === null) {
      sceneLoad.firstFrameAt = now;
      sceneLoad.firstFrameCpuMs = cpu;
      sceneLoad.firstFrameBuilds = builds;
    }

    for (const c of collectors) {
      c.renderedFrames++;
      if (gap !== null) c.renderedFrameGaps.push(gap);
      c.cpuFrameMs.push(cpu);
      c.drawCalls.push(gl.info.render.drawCalls);
      c.renderPasses.push(counters.renderPasses - start.renderPasses);
      c.shadowRedraws += counters.shadowRedraws - start.shadowRedraws;
      c.shaderBuilds += builds;
      c.pipelinesCreated += Math.max(0, pipelines - start.pipelines);
      if (builds > 0) {
        c.framesWithBuilds++;
        c.worstCpuFrameWithBuilds = Math.max(c.worstCpuFrameWithBuilds, cpu);
      }
      c.textures = gl.info.memory.textures;
      c.geometries = gl.info.memory.geometries;
      c.pipelines = pipelines;
      c.canvasSize = [gl.domElement.width, gl.domElement.height];
    }

    // GPU time of the latest finished frame. One resolve at a time, so a pending one isn't counted twice.
    if (gl.backend.trackTimestamp && !resolvingGpu.current) {
      resolvingGpu.current = true;
      gl.resolveTimestampsAsync("render")
        .then((ms) => {
          if (ms && ms > 0) collectors.forEach((c) => c.gpuFrameMs.push(ms));
        })
        .catch(() => {})
        .finally(() => {
          resolvingGpu.current = false;
        });
    }
  }, 1000);

  return null;
};

// --- Reporting ---

export const percentile = (values: number[], p: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const average = (values: number[]) => (values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length);

const ms = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : "n/a");

const distribution = (values: number[]) =>
  values.length === 0
    ? "n/a"
    : `p50 ${ms(percentile(values, 50))}  p95 ${ms(percentile(values, 95))}  p99 ${ms(percentile(values, 99))}  max ${ms(Math.max(...values))}`;

/** A frame gap longer than this counts as a stall (60 Hz ≈ 16.7 ms). */
export const STALL_MS = 25;

/** Report lines for one collector. The page adds the scene and machine lines on top. */
export const describeCollector = (c: Collector): string[] => {
  const seconds = c.durationMs / 1000;
  const stalls = c.browserFrameGaps.filter((gap) => gap > STALL_MS).length;
  const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
  return [
    `Duration ${seconds.toFixed(1)} s, rendered ${c.renderedFrames} frames (${(c.renderedFrames / seconds).toFixed(1)}/s), browser frames ${c.browserFrameGaps.length}`,
    `Browser frame gap ms: ${distribution(c.browserFrameGaps)}  stalls >${STALL_MS} ms: ${stalls}`,
    `Rendered frame gap ms: ${distribution(c.renderedFrameGaps)}`,
    `CPU frame ms: ${distribution(c.cpuFrameMs)}`,
    `GPU frame ms: ${c.gpuFrameMs.length > 0 ? distribution(c.gpuFrameMs) : "n/a (no timestamp queries)"}`,
    `Per frame: ${ms(average(c.drawCalls))} draw calls, ${ms(average(c.renderPasses))} render passes, ${ms(c.renderedFrames ? c.shadowRedraws / c.renderedFrames : NaN)} shadow redraws`,
    `Shader builds: ${c.shaderBuilds} in ${c.framesWithBuilds} frames (worst CPU frame with builds ${ms(c.worstCpuFrameWithBuilds)} ms), pipelines created ${c.pipelinesCreated}`,
    `Scene commits: ${c.sceneCommits} (${(c.sceneCommits / seconds).toFixed(1)}/s)`,
    `At end: canvas ${c.canvasSize[0]}×${c.canvasSize[1]}, textures ${c.textures}, geometries ${c.geometries}, pipelines ${c.pipelines}${heap ? `, JS heap ${(heap / 1024 / 1024).toFixed(0)} MB` : ""}`,
  ];
};
