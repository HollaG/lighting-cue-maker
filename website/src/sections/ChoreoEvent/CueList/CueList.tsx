import { memo } from "react";
import { Stack } from "@mantine/core";
import { useAppStore } from "../../../store/appStore";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";

export const CueList = memo(() => {
  const cueOrder = useAppStore((s) => s.cueOrder);
  const cues = useAppStore((s) => s.cues);

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

