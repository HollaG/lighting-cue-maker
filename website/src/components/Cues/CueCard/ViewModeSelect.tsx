import { SegmentedControl, type SegmentedControlProps } from "@mantine/core";

export type ViewMode = "Table" | "2D View" | "3D View";
const data: ViewMode[] = ["Table", "2D View"];

export const ViewModeSelect = ({
  props,
  viewMode,
  setViewMode,
}: {
  props?: Omit<SegmentedControlProps<ViewMode>, "data" | "value" | "onChange">;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}) => {
  return <SegmentedControl {...props} data={data} value={viewMode} onChange={(value) => setViewMode(value)} />;
};
