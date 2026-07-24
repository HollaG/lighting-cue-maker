import { memo } from "react";
import { Stack } from "@mantine/core";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useGetItem } from "../../../query/useGetItem";
import { useAppStore } from "../../../store/appStore";

export const CueList = memo(({ eventId, itemId }: { eventId?: string; itemId: string }) => {
  const { cues, isCuesLoading } = useGetCues({ eventId, itemId });
  const { cueOrder } = useGetItem({ eventId, itemId });
  const currrentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  if (!eventId || !itemId || !cues || !cues.length) return;

  // return <></>;
  return (
    <Stack style={{ position: "relative" }}>
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
                isCueSelected={currrentlySelectedCueId === cue.id}
              />
            );
          })}
    </Stack>
  );
});
