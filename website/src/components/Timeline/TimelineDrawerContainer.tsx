import {
  Box,
  Button,
  Center,
  Code,
  Divider,
  FileButton,
  Group,
  Loader,
  Popover,
  ScrollArea,
  Scroller,
  Stack,
  Tabs,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { formatDate } from "../../utils/recentEvents";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { useUpsertTimeline } from "../../query-v2/timeline/useUpsertTimeline";
import { makeGetTimelineQueryKey, useGetTimeline } from "../../query-v2/timeline/useGetTimeline";
import { useUploadAudioFile } from "../../query-v2/audio-files/useUploadAudioFile";
import { useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { runWithLimit } from "../../utils/runWithLimit";
import { useGetAudioFiles } from "../../query-v2/audio-files/useGetAudioFiles";
import { TimelineWrapper } from "./TimelineWrapper";
import { useQueryClient } from "@tanstack/react-query";
import type { Timeline, TimelineAudio, TimelineBeatSection, TimelineSection } from "../../types-v2/timeline";
import type { Range } from "dnd-timeline";
import { makeDefaultTimelineSection } from "../../utils/timeline";

const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac"];
const AUDIO_ACCEPT = [
  ...AUDIO_EXTENSIONS,
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
].join(",");

/** Uploads at the same time. More would compete for the connection with large WAVs. */
const UPLOAD_CONCURRENCY = 2;

/** By type or extension: some systems report no type (or an odd one) for .m4a / .flac. The server checks the bytes. */
const isAudioFile = (file: File) =>
  file.type.startsWith("audio/") || AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

/** 185000 → "3:05" */
const formatDuration = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

export const TimelineDrawerContainer = ({ eventId, itemId }: { eventId: string; itemId: string }) => {
  // if no timeline, ask to create
  const { timeline, isTimelineLoading } = useGetTimeline(eventId, itemId);
  const { audioFiles } = useGetAudioFiles(eventId, itemId);
  const { mutateAsync: upsertTimeline, saveTimeline, isPending } = useUpsertTimeline(eventId, itemId);
  const { mutateAsync: uploadAudioFile } = useUploadAudioFile(eventId, itemId);

  const [isUploading, setIsUploading] = useState(false);
  // Clears the file input, so choosing the same file again still fires onChange.
  const resetFileButtonRef = useRef<() => void>(null);
  const isLoading = isTimelineLoading;

  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();

  const [range, setRange] = useState<Range>({ start: 0, end: 60_000 });

  // Music library popover
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const search = librarySearch.trim().toLowerCase();
  const filteredAudioFiles = audioFiles.filter((f) => f.fileName.toLowerCase().includes(search));

  /** Helper function to add audio files with the new sections to the timeline. */
  const addToTimeline: (files: AudioFileWithUrl[]) => void = async (files) => {
    const current = queryClient.getQueryData<Timeline | null>(makeGetTimelineQueryKey(eventId, itemId));
    if (!current) return;
    const audios = current?.audios.length ? [...current.audios] : [];
    const sections = current?.sections.length ? [...current.sections] : [];
    if (!audios) return;

    // add 1 second between clips

    // this is the start time of the first clip
    let startTime = current.audios.length ? Math.max(...audios.map((a) => a.startTime + a.duration)) + 1000 : 0;
    let firstClipStartTime = startTime;
    const newAudios: TimelineAudio[] = [];
    const newSections: TimelineSection[] = [];
    for (const file of files) {
      const clip: TimelineAudio = {
        id: crypto.randomUUID(),
        audioFileId: file.id,
        startTime,
        offset: 0,
        duration: file.durationMs, // the whole file
      };

      // Default: 4/4 120 BPM snap to each beat
      const bpm = 120;
      const beatMs = 60000 / bpm;
      const beats = Math.max(1, Math.ceil(file.durationMs / beatMs));
      // round up to multiple of 4
      const roundedBeats = Math.ceil(beats / 4) * 4;
      const section: TimelineBeatSection = {
        ...makeDefaultTimelineSection(),
        name: `${file.fileName}`,
        sectionStartTime: startTime,

        // Calculate how many beats fit in the clips duration, and add 1 if there's a remainder.
        beats: roundedBeats,
      };

      newAudios.push(clip);
      newSections.push(section);

      startTime += file.durationMs + 1000; // the next one starts where this one ends (touching is allowed)
    }

    await upsertTimeline({ audios: [...audios, ...newAudios], sections: [...sections, ...newSections] });

    // move the view at the current time to the start of the first new clip
    const currentViewRange = range.end - range.start;
    const newRange = {
      start: firstClipStartTime - currentViewRange / 2,
      end: firstClipStartTime + currentViewRange / 2,
    };

    if (newRange.start < 0) {
      newRange.start = 0;
      newRange.end = currentViewRange;
    }

    setRange(newRange);
  };

  /** same logic as onFilesChosen, we will add the selected file 1s after the LAST clips, and also the section */
  const onSelectAudioFile = (file: AudioFileWithUrl) => {
    console.log("Selected audio file", file);

    addToTimeline([file]);
  };

  /** Uploads the chosen files to the item's library, each on its own (one failing doesn't stop the rest). */
  const onFilesChosen = async (chosenFiles: File[]) => {
    resetFileButtonRef.current?.();

    const uploadFiles = chosenFiles.filter(isAudioFile);
    const skipped = chosenFiles.filter((file) => !isAudioFile(file));
    if (skipped.length > 0) {
      notifications.show({
        color: "yellow",
        title: "Skipped files that aren't audio",
        message: skipped.map((f) => f.name).join(", "),
      });
    }
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    const results = await runWithLimit(uploadFiles, UPLOAD_CONCURRENCY, (file) => uploadAudioFile(file));
    setIsUploading(false);
    const failed = results.flatMap((result, i) =>
      result.status === "rejected"
        ? [`${uploadFiles[i].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
        : [],
    );
    const uploaded = uploadFiles.length - failed.length;
    if (failed.length === 0) {
      notifications.show({
        color: "green",
        title: "Upload complete",
        message: uploaded === 1 ? `Uploaded ${uploadFiles[0].name}` : `Uploaded ${uploaded} files`,
      });
    } else {
      // Server errors also get their own notification from the api helper; this one says which file it was.
      notifications.show({
        color: "red",
        title: uploaded > 0 ? `Uploaded ${uploaded} of ${uploadFiles.length} files` : "Upload failed",
        message: failed.join("\n"),
        style: { whiteSpace: "pre-line" },
        autoClose: false,
      });
    }

    // still, we wanna place the files that have succeeded in the timeline
    const uploadedFiles = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

    if (uploadedFiles.length > 0) {
      await addToTimeline(uploadedFiles);
    }
  };

  if (isLoading) {
    return (
      <Center h="100%" w="100%">
        <Loader type="bars" />
      </Center>
    );
  }

  if (!timeline) {
    return (
      <Center h="80%" w="100%">
        <Stack gap="xs" style={{ maxWidth: "40rem" }}>
          <Title order={4}>Timeline mode</Title>
          <Text>
            Enable timeline mode, letting you lay out your cues on a visual Timeline. The <Code>Hold Time</Code> setting
            in each Cue will be ignored.
          </Text>
          <Box mt="xs">
            <Button
              variant="light"
              onClick={() =>
                upsertTimeline({
                  snapEnabled: true,
                })
              }
              loading={isPending}
            >
              Enable
            </Button>
          </Box>
        </Stack>
      </Center>
    );
  }

  // return the timeline
  return (
    <>
      <Tabs
        variant="pills"
        defaultValue="main"
        vars={() => ({
          root: {
            "--tabs-color": "var(--mantine-primary-color-light)",
            "--tabs-text-color": "var(--mantine-primary-color-light-color)",
          },
        })}
        px={"md"}

        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <Group style={{ flexWrap: "nowrap", alignItems: "center" }}>
          <Scroller flex={1}>
            <Tabs.List style={{ flexWrap: "nowrap" }}>
              <Tabs.Tab value="main">Main timeline</Tabs.Tab>
              <Divider orientation="vertical" />
              <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
              <Tabs.Tab value="alternate1">Alternate 2</Tabs.Tab>
              <Tabs.Tab value="alternate1">Alternate 3</Tabs.Tab>
            </Tabs.List>
          </Scroller>
          <Divider orientation="vertical" />
          <Group>
            {/* <Button size="xs" variant="light">
            Upload audio tracks
          </Button> */}
            {/* <Menu>
            <Menu.Target>
              <Button size="xs" variant="light">
                {" "}
                Music library{" "}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Audio files</Menu.Label>
              {audioFiles.length === 0 ? (
                <Menu.Item disabled>No audio files</Menu.Item>
              ) : (
                audioFiles.map((f) => (
                  <Menu.Item key={f.id} onClick={() => void navigator.clipboard.writeText(f.id)}>
                    {f.fileName}
                  </Menu.Item>
                ))
              )}
            </Menu.Dropdown>
          </Menu> */}
            <Popover
              position="top"
              withArrow
              shadow="md"
              withOverlay
              width={500}
              opened={isLibraryOpen}
              onChange={setIsLibraryOpen}
            >
              <Popover.Target>
                <Button size="xs" variant="light" onClick={() => setIsLibraryOpen((o) => !o)}>
                  Music library
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack>
                  <CustomTextInput
                    label="File name"
                    placeholder="Search for a file"
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    data-autofocus
                  />

                  <Text fz="sm" fw="600">
                    Audio files
                  </Text>
                  {filteredAudioFiles.length === 0 ? (
                    <Text fz="sm" c="dimmed">
                      {audioFiles.length === 0 ? "No audio files uploaded yet" : "No files match your search"}
                    </Text>
                  ) : (
                    <ScrollArea.Autosize mah={320}>
                      <Stack gap={0}>
                        {filteredAudioFiles.map((file) => (
                          <Button
                            key={file.id}
                            display="flex"
                            style={{ height: "fit-content" }}
                            styles={{ inner: { width: "stretch", justifyContent: "space-between" } }}
                            w="full"
                            color={colorScheme !== "dark" ? "black" : "white"}
                            variant="subtle"
                            rightSection={
                              <Text fz="sm" c="dimmed">
                                {formatDuration(file.durationMs)}
                              </Text>
                            }
                            onClick={() => {
                              onSelectAudioFile(file);
                              setIsLibraryOpen(false);
                            }}
                          >
                            <Stack align="start" flex={1} style={{ width: "100%", minWidth: 0 }} py="xs" gap={0}>
                              <Text fw="600" truncate maw="100%">
                                {file.fileName}
                              </Text>
                              <Text c="dimmed" fz="xs">
                                Uploaded {formatDate(Date.parse(file.createdAt)).toLowerCase()}
                              </Text>
                            </Stack>
                          </Button>
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <FileButton onChange={onFilesChosen} accept={AUDIO_ACCEPT} multiple resetRef={resetFileButtonRef}>
              {(props) => (
                <Button variant="outline" size="xs" loading={isUploading} {...props}>
                  Upload audio
                </Button>
              )}
            </FileButton>
          </Group>
        </Group>
        <Tabs.Panel value="main" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <TimelineWrapper
            eventId={eventId}
            itemId={itemId}
            timeline={timeline}
            audioFiles={audioFiles}
            // A rejected save shows a notification and refetches.
            onSave={(patch) => void saveTimeline(patch)}

            range={range}
            onRangeChange={setRange}
          />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};
