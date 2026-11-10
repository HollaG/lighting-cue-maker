import { useMemo } from "react";
import { useGetItem } from "../../query-v2/items/useGetItem";
import { useAppStore } from "../../store/appStore";
import { generateRich } from "../../utils/convertText";
import { sanitize } from "../../utils/sanitize";
import { RichContent } from "./RichContent";

export const RichContentWrapper = ({ itemId, eventId }: { itemId: string; eventId: string }) => {
  const setCurrentlySelectedCueId = useAppStore((state) => state.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const inputMode = useAppStore((state) => state.inputMode);
  const indicatorNumber = useAppStore((state) => state.indicatorNumber);
  const inputTimingMode = useAppStore((state) => state.inputTimingMode);

  // The lyrics as lines of words, derived from the item's rawLyrics (the source of truth) instead of the store.
  const { item } = useGetItem(eventId, itemId);
  const rawLyrics = item?.rawLyrics ?? "";
  const content = useMemo(() => generateRich(sanitize(rawLyrics)), [rawLyrics]);

  return (
    <RichContent
      itemId={itemId}
      setCurrentlySelectedCueId={setCurrentlySelectedCueId}
      currentlySelectedCueId={currentlySelectedCueId}
      content={content}
      eventId={eventId}
      inputMode={inputMode}
      indicatorNumber={indicatorNumber}
      inputTimingMode={inputTimingMode}
    />
  );
};
