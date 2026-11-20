import { Center, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { useGetCues } from "../../query-v2/cues/useGetCues";
import { useGetItem } from "../../query-v2/items/useGetItem";
import type { Cue } from "../../types-v2/cue";
import { getCueOrder } from "../../utils/cue/cueForm";
import { sanitize } from "../../utils/sanitize";
import { useAppStore } from "../../store/appStore";
import { CueCard } from "./CueCard/CueCard";

export const Cues = ({ eventId, itemId }: { eventId: string; itemId: string }) => {
  const { cues, isCuesLoading } = useGetCues(eventId, itemId);
  const { item } = useGetItem(eventId, itemId);
  // Read here, not in each card: this list re-renders (cheap), and the memoized cards skip unless their
  // `isSelected` flips (or their other props change).
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  // The server returns cues oldest first; their real order is where their markers sit in the lyrics.
  // Cues without a marker (e.g. removed by hand in lyric mode) are not shown.
  const orderedCues = useMemo(() => {
    const byId = new Map(cues.map((cue) => [cue.id, cue]));
    return getCueOrder(sanitize(item?.rawLyrics ?? ""))
      .map((id) => byId.get(id))
      .filter((cue): cue is Cue => !!cue);
  }, [cues, item?.rawLyrics]);

  // previously in each cue
  // caused every cue to re render when the cues changed
  // - prevously we passed orderedCues down
  const orderKey = orderedCues.map((c) => c.id).join(",");
  const copyOptions = useMemo(
    () => (orderKey ? orderKey.split(",") : []).map((id, i) => ({ value: id, label: `Cue ${i + 1}` })),
    [orderKey],
  );

  if (isCuesLoading) {
    return (
      <Center h={200}>
        <Loader type="bars" />
      </Center>
    );
  }

  return (
    <Stack>
      <Title order={4}>Cues ({orderedCues.length})</Title>
      {orderedCues.length === 0 && (
        <Text c="dimmed" size="sm">
          No cues yet. Switch the lyrics to cue mode and click a word or space to add one.
        </Text>
      )}
      {orderedCues.map((cue, index) => (
        <CueCard
          key={cue.id}
          eventId={eventId}
          cue={cue}
          cueNumber={index + 1}
          copyOptions={copyOptions}
          isSelected={currentlySelectedCueId === cue.id}
        />
      ))}
    </Stack>
  );
};
