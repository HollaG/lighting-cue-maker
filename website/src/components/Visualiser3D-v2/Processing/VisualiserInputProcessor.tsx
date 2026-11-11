// Renders the visualiser for the currently selected cue. The DMX resolving lives in useResolvedDmx /
// utils/visualiser-v2-resolver.ts.

import { useResolvedDmx } from "../../../hooks/useResolvedDmx";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { Visualiser } from "../../../types-v2/visualiser";
import { StaticVisualiser3D } from "../Visualiser3D";

export const VisualiserInputProcessor = ({
  visualiser,
  eventId,
  fixtures,
  dmxValues,
}: {
  // Visualiser-required stuff
  visualiser: Visualiser;
  eventId: string;
  fixtures: PatchedFixture[];
  dmxValues?: ReturnType<typeof useResolvedDmx>["dmxValues"];
}) => {
  return (
    <StaticVisualiser3D
      key={visualiser.id}
      visualiser={visualiser}
      eventId={eventId}
      fixtures={fixtures}
      dmxValuesByFixtureId={dmxValues ?? undefined}
    />
  );
};
