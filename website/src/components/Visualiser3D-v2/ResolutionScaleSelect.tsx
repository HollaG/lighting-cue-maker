import { Select, type SelectProps } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

/** Fraction of the screen's native resolution the 3D visualiser renders at. Lower = blurrier but much cheaper. */
const RESOLUTION_SCALES = [
  { value: "1", label: "Full" },
  { value: "0.5", label: "1/2" },
  { value: "0.333", label: "1/3" },
  { value: "0.25", label: "1/4" },
  { value: "0.125", label: "1/8" },
];

/**
 * The chosen resolution scale, remembered per browser. Every caller shares it: Mantine syncs hooks with the same key
 * within the tab, so the select and the canvas can live in different components.
 */
const useResolutionScale = () =>
  useLocalStorage<string>({
    key: "visualiser-resolution-scale",
    defaultValue: "1",
    // Read straight away (client-only app), so the canvas doesn't mount at Full and then resize.
    getInitialValueInEffect: false,
  });

/**
 * Device pixel ratio for a visualiser <Canvas>: the screen's native ratio × the chosen scale. The cost of every light
 * and the haze is per pixel, so this is the main performance dial.
 */
export const useVisualiserDpr = () => {
  const [scale] = useResolutionScale();
  return window.devicePixelRatio * (Number(scale) || 1);
};

/** Picks the visualiser's resolution scale. Position it yourself through `style` / layout props. */
export const ResolutionScaleSelect = (props: Omit<SelectProps, "data" | "value" | "onChange">) => {
  const [scale, setScale] = useResolutionScale();
  return (
    <Select
      size="xs"
      w="6rem"
      label="Resolution scale"
      data={RESOLUTION_SCALES}
      value={scale}
      onChange={(value) => value && setScale(value)}
      allowDeselect={false}
      {...props}
    />
  );
};
