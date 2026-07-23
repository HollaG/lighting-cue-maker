import { memo } from "react";
import { Stack } from "@mantine/core";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useGetItem } from "../../../query/useGetItem";

export const CueList = memo(({ eventId, itemId }: { eventId?: string; itemId: string }) => {
  const { cues } = useGetCues({ eventId, itemId });
  const { cueOrder } = useGetItem({ eventId, itemId });

  if (!eventId || !itemId || !cues || !cues.length) return;
  return (
    <Stack style={{ position: "relative" }}>
      {cueOrder.map((cueId, index) => {
        const cue = cues.find((c) => c.id === cueId);
        if (!cue) return null;
        return <CueCard key={cue.id} cue={cue} cueNumber={index + 1} />;
      })}
    </Stack>
  );
});
