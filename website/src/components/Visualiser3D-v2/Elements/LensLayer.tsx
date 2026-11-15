import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useFrameGate } from "../frameGate";
import type { LensInstances } from "./LensInstances";

/**
 * Draws every fixture lens of the canvas (two instanced meshes) and keeps them up to date: once per drawn frame,
 * after the effect player, before the draw.
 */
export const LensLayer = ({ lenses }: { lenses: LensInstances }) => {
  const gate = useFrameGate();
  useFrame(() => {
    if (gate.draw) lenses.update();
  }, 0.6);
  useEffect(() => () => lenses.dispose(), [lenses]);
  return <primitive object={lenses.group} />;
};
