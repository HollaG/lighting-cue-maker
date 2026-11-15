import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { GUI } from "lil-gui";

/**
 * The editor's lil-gui panels move three objects directly (no React update), so with frameloop="demand" nothing would
 * redraw. The root GUI's onChange hears every controller in every folder. Put inside the <Canvas>.
 */
export const InvalidateOnGuiChange = ({ gui }: { gui: GUI | null }) => {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!gui) return;
    gui.onChange(() => invalidate());
    return () => {
      gui.onChange(() => {});
    };
  }, [gui, invalidate]);
  return null;
};
