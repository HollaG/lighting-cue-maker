import {
  Box,
  Button,
  Center,
  Code,
  Divider,
  FileButton,
  Group,
  Loader,
  Scroller,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useUpsertTimeline } from "../../query-v2/timeline/useUpsertTimeline";
import { makeGetTimelineQueryKey, useGetTimeline } from "../../query-v2/timeline/useGetTimeline";
import { useUploadAudioFile } from "../../query-v2/audio-files/useUploadAudioFile";
import { useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { runWithLimit } from "../../utils/runWithLimit";
import { useGetAudioFiles } from "../../query-v2/audio-files/useGetAudioFiles";
import { TimelineWrapper } from "./TimelineWrapper";
import { useQueryClient } from "@tanstack/react-query";
import type { Timeline, TimelineAudio } from "../../types-v2/timeline";

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

export const TimelineDrawerContainer = ({ eventId, itemId }: { eventId: string; itemId: string }) => {
  // if no timeline, ask to create
  const { timeline, isTimelineLoading } = useGetTimeline(eventId, itemId);
  const { audioFiles } = useGetAudioFiles(eventId, itemId);
  const { mutateAsync: upsertTimeline, saveTimeline } = useUpsertTimeline(eventId, itemId);
  const { mutateAsync: uploadAudioFile } = useUploadAudioFile(eventId, itemId);

  const [isUploading, setIsUploading] = useState(false);
  // Clears the file input, so choosing the same file again still fires onChange.
  const resetFileButtonRef = useRef<() => void>(null);
  const isLoading = isTimelineLoading;

  const queryClient = useQueryClient();

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
      const current = queryClient.getQueryData<Timeline | null>(makeGetTimelineQueryKey(eventId, itemId));
      if (!current) return;
      const audios = current?.audios.length ? [...current.audios] : [];
      if (!audios) return;
      let startTime = current.audios.length ? Math.max(...audios.map((a) => a.startTime + a.duration)) + 1000 : 0;
      const newClips: TimelineAudio[] = uploadedFiles.map((file) => {
        const clip: TimelineAudio = {
          id: crypto.randomUUID(),
          audioFileId: file.id,
          startTime,
          offset: 0,
          duration: file.durationMs, // the whole file
        };
        startTime += file.durationMs; // the next one starts where this one ends (touching is allowed)
        return clip;
      });

      await upsertTimeline({ audios: [...audios, ...newClips] });
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
    >
      <Group style={{ flexWrap: "nowrap", alignItems: "center" }}>
        <Scroller>
          <Tabs.List style={{ flexWrap: "nowrap" }}>
            <Tabs.Tab value="main">Main timeline</Tabs.Tab>
            <Divider orientation="vertical" />
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
            <Tabs.Tab value="alternate1">Alternate 1</Tabs.Tab>
          </Tabs.List>
        </Scroller>
        <Divider orientation="vertical" />
        <Group>
          {/* <Button size="xs" variant="light">
            Upload audio tracks
          </Button> */}
          <FileButton onChange={onFilesChosen} accept={AUDIO_ACCEPT} multiple resetRef={resetFileButtonRef}>
            {(props) => (
              <Button variant="light" size="xs" loading={isUploading} {...props}>
                Upload audio
              </Button>
            )}
          </FileButton>
        </Group>
      </Group>
      <Tabs.Panel value="main">
        <TimelineWrapper
          timeline={timeline}
          audioFiles={audioFiles}
          // A rejected save shows a notification and refetches.
          onSave={(patch) => void saveTimeline(patch)}
        />
      </Tabs.Panel>
    </Tabs>
  );
};
