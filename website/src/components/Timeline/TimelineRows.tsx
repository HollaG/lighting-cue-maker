import { useTimelineContext } from "dnd-timeline";
import { Box } from "@mantine/core";
import { getSectionLengthMs, TimelineSectionType, type Timeline } from "../../types-v2/timeline";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { TimelineRow } from "./TimelineRow";
import { TimelineRowId } from "../../utils/timeline";
import { TimelineSectionItem } from "./TimelineSectionItem";
import { TimelineAudioItem } from "./TimelineAudioItem";

/** Must be inside TimelineContext: useTimelineContext gives the container's ref and style. */
export const TimelineRows = ({
  eventId,
  itemId,
  timeline,
  audioFiles,
  onSelect,
  onDelete,
}: {
  eventId: string;
  itemId: string;
  timeline: Timeline;
  audioFiles: AudioFileWithUrl[];
  onSelect: (type: TimelineRowId, ids: Set<string>) => void;
  onDelete: (type: TimelineRowId, id: string) => void;
}) => {
  const { setTimelineRef, style } = useTimelineContext();
  const fileName = new Map(audioFiles.map((f) => [f.id, f.fileName]));

  return (
    <Box ref={setTimelineRef} style={style}>
      <TimelineRow id={TimelineRowId.AUDIO} sidebar="Audio clips">
        {timeline.audios.map((clip) => (
          <TimelineAudioItem
            key={clip.id}
            id={clip.id}
            rowId={TimelineRowId.AUDIO}
            span={{ start: clip.startTime, end: clip.startTime + clip.duration }}
            onDelete={(id) => onDelete(TimelineRowId.AUDIO, id)}
          >
            {fileName.get(clip.audioFileId) ?? "Missing file"}
          </TimelineAudioItem>
        ))}
      </TimelineRow>

      <TimelineRow
        id={TimelineRowId.SECTIONS}
        sidebar="Timed sections (Cue markers)"
        styles={
          {
            // height: 128,
          }
        }
      >
        {timeline.sections.map((section) => (
          <TimelineSectionItem
            key={section.id}
            eventId={eventId}
            itemId={itemId}
            id={section.id}
            rowId={TimelineRowId.SECTIONS}
            span={{ start: section.sectionStartTime, end: section.sectionStartTime + getSectionLengthMs(section) }}
            onDelete={(id) => onDelete(TimelineRowId.SECTIONS, id)}
            section={section}
            sections={timeline.sections}
          />
        ))}
      </TimelineRow>
    </Box>
  );
};
