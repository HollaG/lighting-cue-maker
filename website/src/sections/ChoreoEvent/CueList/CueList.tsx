import { memo, useState } from "react";
import { Stack } from "@mantine/core";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useGetEvent } from "../../../query/useGetEvent";
import { useAppStore } from "../../../store/appStore";

export const CueList = memo(({ itemId }: { itemId: string }) => {
  const { cues, isCuesLoading } = useGetCues({ itemId });
  const code = useAppStore((s) => s.code);
  const { event } = useGetEvent({ code });
  const cueOrder = useAppStore((s) => s.cueOrder);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  const [offset, setOffset] = useState(0);
  const calculatedOffset = currentlySelectedCueId ? offset : 0;
  console.log({ calculatedOffset });

  if (!itemId || !cues || !cues.length) return null;

  // return null;
  return (
    <Stack
      style={{
        transition: "all 0.3s ease-in-out",
        transform: `translateY(${calculatedOffset}px)`,
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
                fixtureGroups={event?.fixtureGroups}
                setOffset={setOffset}
              />
            );
          })}
    </Stack>
  );
});
