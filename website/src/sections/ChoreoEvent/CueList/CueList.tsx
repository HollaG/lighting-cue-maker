import { memo } from "react";
import { Stack } from "@mantine/core";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useAppStore } from "../../../store/appStore";

export const CueList = memo(({ itemId }: { itemId: string }) => {
  const { cues, isCuesLoading } = useGetCues({ itemId });
  const cueOrder = useAppStore((s) => s.cueOrder);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  if (!itemId || !cues || !cues.length) return null;

  // return null;
  return (
    <Stack style={{ position: "relative" }}>
      {isCuesLoading
        ? "Loading cues..."
        : cueOrder.map((cueId, index) => {
            const cue = cues.find((c) => c.id === cueId);
            if (!cue) return null;
            return (
              <CueCard key={cue.id} cue={cue} cueNumber={index + 1} isCueSelected={currentlySelectedCueId === cue.id} />
            );
          })}
    </Stack>
  );
});
