import { useThree } from "@react-three/fiber";
import type { LightTable } from "./LightTable";
import { LightTableLighting } from "./LightTableNode";

/**
 * The canvas's light table, or null when the renderer was created with `lightTable: false` (the old per-light path).
 * The table belongs to the renderer: see `lightTable` in makeVisualiser3DRenderer.
 */
export const useLightTable = (): LightTable | null => {
  const lighting = useThree((state) => (state.gl as unknown as { lighting?: unknown }).lighting);
  return lighting instanceof LightTableLighting ? lighting.table : null;
};
