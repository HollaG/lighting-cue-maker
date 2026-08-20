import { memo, useState } from "react";
import { Stack } from "@mantine/core";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useAppStore } from "../../../store/appStore";
import type { LightEventConfiguration } from "../../../types/types";
import { useGetOrCreateVisualiser } from "../../../query/useGetOrCreateVisualiser";
import { useGetFixturesByEventId } from "../../../query/useGetFixtures";

export const CueList = memo(({ itemId, event }: { itemId: string; event: LightEventConfiguration }) => {
  const { cues, isCuesLoading } = useGetCues({ itemId });

  const cueOrder = useAppStore((s) => s.cueOrder);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  const [offset, setOffset] = useState(0);
  const calculatedOffset = currentlySelectedCueId ? offset : 0;

  // Handle visualisers
  const { visualiser } = useGetOrCreateVisualiser({ eventId: event.id });
  const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

  if (!itemId || !cues || !cues.length) return null;

  return (
    <Stack
      style={{
        transition: "all 0.3s ease-in-out",
        transform: `translateY(${calculatedOffset}px)`,
        zIndex: 10,
      }}
    >
      {isCuesLoading
        ? "Loading cues..."
        : cueOrder.map((cueId, index) => {
            const cue = cues.find((c) => c.id === cueId);
            if (!cue) return null;
            return (
              <CueCard
                key={cue.id}
                cue={cue}
                cueNumber={index + 1}
                isCueSelected={currentlySelectedCueId === cue.id}
                fixtureGroups={event.fixtureGroups}
                setOffset={setOffset}

                visualiser={visualiser}
                fixtures={fixtures}
                eventId={event.id}
              />
            );
          })}
    </Stack>
  );
});
