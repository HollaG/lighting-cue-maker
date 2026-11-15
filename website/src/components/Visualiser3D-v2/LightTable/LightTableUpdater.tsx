import { useFrame, useThree } from "@react-three/fiber";
import type { WebGPURenderer } from "three/webgpu";
import { useFrameGate } from "../frameGate";
import type { LightTable } from "./LightTable";

/**
 * Once per drawn frame, after the effect player and before the draw: packs the lit lights into the table and redraws
 * the shadow layers that need it. Put inside the <Canvas> when the renderer has a light table.
 */
export const LightTableUpdater = ({ table }: { table: LightTable }) => {
  const invalidate = useThree((state) => state.invalidate);
  const gate = useFrameGate();

  // After the effect player (-1), before the haze pipeline's draw (1).
  useFrame(({ gl, scene }) => {
    if (!gate.draw) return;
    // Gizmos move objects without a render in between, so bring world matrices up to date first.
    scene.updateMatrixWorld();
    table.shadows.beginFrame();
    table.update();
    table.shadows.checkCasters(scene);
    const waiting = table.shadows.render(gl as unknown as WebGPURenderer, scene);
    if (waiting > 0) invalidate(); // over this frame's shadow budget: finish on the next frames
  }, 0.5);

  return null;
};
