// Renders the visualiser for the currently selected cue. The DMX resolving lives in useResolvedDmx /
// utils/visualiser-v2-resolver.ts.

import { useResolvedDmx } from "../../../hooks/useResolvedDmx";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { Visualiser } from "../../../types-v2/visualiser";
import { StaticVisualiser3D } from "../Visualiser3D";
import type { PatternEffectPlayback } from "../PatternEffectRunner";
import type { CueFade } from "../CueFadeRunner";

export const VisualiserInputProcessor = ({
  visualiser,
  eventId,
  fixtures,
  dmxValues,
  effectPlayback,
  cueFade,
  onFixtureSelect,
  selectedFixtureIds,
}: {
  // Visualiser-required stuff
  visualiser: Visualiser;
  eventId: string;
  fixtures: PatchedFixture[];
  /** Static values with overrides. */
  dmxValues?: ReturnType<typeof useResolvedDmx>["dmxValues"];
  effectPlayback?: PatternEffectPlayback | null;
  /** The last change of cue, faded over in the canvas. */
  cueFade?: CueFade | null;
  onFixtureSelect?: (fixtureId: string, additive: boolean) => void;
  selectedFixtureIds?: string[];
}) => {
  return (
    <StaticVisualiser3D
      key={visualiser.id}
      visualiser={visualiser}
      eventId={eventId}
      fixtures={fixtures}
      dmxValuesByFixtureId={dmxValues ?? undefined}
      effectPlayback={effectPlayback}
      cueFade={cueFade}
      onFixtureSelect={onFixtureSelect}
      selectedFixtureIds={selectedFixtureIds}
    />
  );
};
