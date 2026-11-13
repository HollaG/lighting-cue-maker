/**
 * TEMPORARY dev-only probe (see utils/perfProbe.ts). Put inside a <Canvas>. Adds the renderer's counters to the
 * [perf] line, to see what grows while an effect runs: if a number keeps climbing between a "good" line and a
 * "lagging" line, that's what's piling up.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Object3D } from "three";
import { registerPerfSampler } from "../../utils/perfProbe";

/** The parts of three's WebGPURenderer we read. Internal fields (underscored) may be missing in other versions. */
type ProbedRenderer = {
  info: {
    render: { calls: number; drawCalls: number };
    memory: { geometries: number; textures: number; programs?: number };
  };
  _pipelines?: { caches?: Map<unknown, unknown>; programs?: { vertex?: Map<unknown, unknown>; fragment?: Map<unknown, unknown> } };
  _nodes?: { nodeBuilderCache?: Map<unknown, unknown> };
};

export const CanvasPerfProbe = () => {
  const gl = useThree((state) => state.gl) as unknown as ProbedRenderer;
  const scene = useThree((state) => state.scene);
  const frames = useRef(0);

  useFrame(() => {
    frames.current++;
  });

  useEffect(() => {
    let lastCalls = gl.info.render.calls;
    let lastFrames = frames.current;

    return registerPerfSampler(() => {
      const frameCount = frames.current - lastFrames;
      const calls = gl.info.render.calls - lastCalls;
      lastCalls = gl.info.render.calls;
      lastFrames = frames.current;

      let objects = 0;
      let lights = 0;
      scene.traverse((object: Object3D) => {
        objects++;
        if ((object as Object3D & { isLight?: boolean }).isLight) lights++;
      });

      return {
        fps: frameCount / 3,
        renderCallsPerFrame: frameCount > 0 ? calls / frameCount : 0,
        drawCalls: gl.info.render.drawCalls,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.memory.programs ?? -1,
        pipelines: gl._pipelines?.caches?.size ?? -1,
        vertexShaders: gl._pipelines?.programs?.vertex?.size ?? -1,
        fragmentShaders: gl._pipelines?.programs?.fragment?.size ?? -1,
        nodeBuilders: gl._nodes?.nodeBuilderCache?.size ?? -1,
        sceneObjects: objects,
        lights,
      };
    });
  }, [gl, scene]);

  return null;
};
