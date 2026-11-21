import { useTimelineContext, type Range } from "dnd-timeline";
import { Box } from "@mantine/core";
import { getSectionLengthMs, type Timeline } from "../../types-v2/timeline";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { TimelineRow } from "./TimelineRow";
import { TimelineRowId } from "../../utils/timeline";
import { TimelineSectionItem } from "./TimelineSectionItem";
import { TimelineAudioItem } from "./TimelineAudioItem";
import { TimelineWaveform } from "./TimelineWaveform";
import type { Peaks } from "../../utils/waveform";

/** Must be inside TimelineContext: useTimelineContext gives the container's ref and style. */
export const TimelineRows = ({
  eventId,
  itemId,
  timeline,
  audioFiles,
  peaksByFileId,
  // onSelect: still in the props for the selection WIP, not used yet
  onDelete,
  onCreate,
  disabled = false,
}: {
  eventId: string;
  itemId: string;
  timeline: Timeline;
  audioFiles: AudioFileWithUrl[];
  /** Waveform peaks per audio file; a clip shows no waveform until its file has decoded. */
  peaksByFileId: ReadonlyMap<string, Peaks>;
  onSelect: (type: TimelineRowId, ids: Set<string>) => void;
  onDelete: (type: TimelineRowId, id: string) => void;
  onCreate: (range: Range) => void;
  disabled?: boolean;
}) => {
  const { setTimelineRef, style } = useTimelineContext();
  const fileName = new Map(audioFiles.map((f) => [f.id, f.fileName]));

  return (
    <Box ref={setTimelineRef} style={style}>
      {/* Explicity no creation for Audio */}
      <TimelineRow id={TimelineRowId.AUDIO} sidebar="Audio clips">
        {timeline.audios.map((clip) => {
          const peaks = peaksByFileId.get(clip.audioFileId);
          return (
            <TimelineAudioItem
              key={clip.id}
              id={clip.id}
              rowId={TimelineRowId.AUDIO}
              span={{ start: clip.startTime, end: clip.startTime + clip.duration }}
              onDelete={(id) => onDelete(TimelineRowId.AUDIO, id)}
              disabled={disabled}
              waveform={
                peaks && (
                  <TimelineWaveform
                    peaks={peaks}
                    startTime={clip.startTime}
                    duration={clip.duration}
                    offset={clip.offset}
                  />
                )
              }
            >
              {fileName.get(clip.audioFileId) ?? "Missing file"}
            </TimelineAudioItem>
          );
        })}
      </TimelineRow>

      <TimelineRow
        id={TimelineRowId.SECTIONS}
        sidebar="Timed sections (Cue markers)"

        onCreate={onCreate}
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
            disabled={disabled}
          />
        ))}
      </TimelineRow>
    </Box>
  );
};
