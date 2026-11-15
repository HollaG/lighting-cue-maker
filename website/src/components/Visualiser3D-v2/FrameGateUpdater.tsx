import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createFrameLimiter, type FrameGate } from "./frameGate";

/** Runs first in every frame: applies the frame cap, and asks for another frame when it skips this one. */
export const FrameGateUpdater = ({ gate }: { gate: FrameGate }) => {
  const invalidate = useThree((state) => state.invalidate);
  const shouldDraw = useMemo(() => createFrameLimiter(), []);
  useFrame(() => {
    gate.draw = shouldDraw(performance.now());
    if (!gate.draw) invalidate();
  }, -2000);
  return null;
};
