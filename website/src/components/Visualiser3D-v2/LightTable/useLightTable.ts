import { useThree } from "@react-three/fiber";
import type { LightTable } from "./LightTable";
import { LightTableLighting } from "./LightTableNode";

/**
 * The canvas's light table, or null when the renderer uses ordinary three.js lights (the default).
 * The table belongs to the renderer: see `lightTable` in makeVisualiser3DRenderer.
 */
export const useLightTable = (): LightTable | null => {
  const lighting = useThree((state) => (state.gl as unknown as { lighting?: unknown }).lighting);
  return lighting instanceof LightTableLighting ? lighting.table : null;
};
