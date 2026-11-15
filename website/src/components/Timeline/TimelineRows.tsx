import { useTimelineContext } from "dnd-timeline";
import { Box } from "@mantine/core";
import { getSectionLengthMs, type Timeline } from "../../types-v2/timeline";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { TimelineItem, TimelineRow } from "./TimelineRow";
import { TimelineRowId } from "../../utils/timeline";

/** Must be inside TimelineContext: useTimelineContext gives the container's ref and style. */
export const TimelineRows = ({ timeline, audioFiles }: { timeline: Timeline; audioFiles: AudioFileWithUrl[] }) => {
  const { setTimelineRef, style } = useTimelineContext();
  const fileName = new Map(audioFiles.map((f) => [f.id, f.fileName]));

  return (
    <Box ref={setTimelineRef} style={style}>
      <TimelineRow id={TimelineRowId.AUDIO} sidebar="Audio clips">
        {timeline.audios.map((clip) => (
          <TimelineItem
            key={clip.id}
            id={clip.id}
            rowId={TimelineRowId.AUDIO}
            span={{ start: clip.startTime, end: clip.startTime + clip.duration }}
          >
            {fileName.get(clip.audioFileId) ?? "Missing file"}
          </TimelineItem>
        ))}
      </TimelineRow>

      <TimelineRow
        id={TimelineRowId.SECTIONS}
        sidebar="Timed sections (Cue markers)"
        styles={{
          height: 128,
        }}
      >
        {timeline.sections.map((section) => (
          <TimelineItem
            key={section.id}
            id={section.id}
            rowId={TimelineRowId.SECTIONS}
            span={{ start: section.sectionStartTime, end: section.sectionStartTime + getSectionLengthMs(section) }}
          >
            {section.name || "Untitled"}
          </TimelineItem>
        ))}
      </TimelineRow>
    </Box>
  );
};
