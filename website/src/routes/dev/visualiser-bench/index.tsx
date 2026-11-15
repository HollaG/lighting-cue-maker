/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
import { createFileRoute } from "@tanstack/react-router";
import { VisualiserBench } from "../../../components/Visualiser3D-v2/Bench/VisualiserBench";

/** Dev tool: fixed test scenes and measurements for the visualiser optimization work. */
export const Route = createFileRoute("/dev/visualiser-bench/")({
  component: VisualiserBench,
});
