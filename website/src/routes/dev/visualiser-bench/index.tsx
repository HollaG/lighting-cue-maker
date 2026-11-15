/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
import { createFileRoute } from "@tanstack/react-router";
import { VisualiserBench } from "../../../components/Visualiser3D-v2/Bench/VisualiserBench";

/** Fixed test scenes and measurements for the visualiser. Not dev-only: it ships in production builds, as a demo. */
export const Route = createFileRoute("/dev/visualiser-bench/")({
  component: VisualiserBench,
});
