import { useAppStore } from "../../store/appStore";
import { RichContent } from "./RichContent";

export const RichContentWrapper = ({ itemId }: { itemId: string }) => {
  const setCurrentlySelectedCueId = useAppStore((state) => state.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((state) => state.currentlySelectedCueId);
  const content = useAppStore((state) => state.content);
  const code = useAppStore((state) => state.code);
  const inputMode = useAppStore((state) => state.inputMode);
  const showCues = useAppStore((state) => state.showCues);
  const instantAddBumpMode = useAppStore((state) => state.instantAddBumpMode);
  const indicatorNumber = useAppStore((state) => state.indicatorNumber);
  const inputTimingMode = useAppStore((state) => state.inputTimingMode);

  return (
    <RichContent
      itemId={itemId}
      setCurrentlySelectedCueId={setCurrentlySelectedCueId}
      currentlySelectedCueId={currentlySelectedCueId}
      content={content}
      eventId={code}
      inputMode={inputMode}
      showCues={showCues}
      instantAddBumpMode={instantAddBumpMode}
      indicatorNumber={indicatorNumber}
      inputTimingMode={inputTimingMode}
    />
  );
};
