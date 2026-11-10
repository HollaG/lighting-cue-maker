// feature[class=Realtime] Lyrics with word-level cursor anchors

import React from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query-v2/items/useGetItem";
import { useUpsertItem } from "../../query-v2/items/useUpsertItem";
import { useUpsertCue } from "../../query-v2/cues/useUpsertCue";
import { RichWord } from "./RichWord";
import { insertCueInRichContent, removeCueFromRawLyrics } from "../../utils/cue/cueForm";
import { generateRaw, generateRich } from "../../utils/convertText";
import { insertTimingMarkerInRichContent, removeTimingMarkerFromContent } from "../../utils/timingUtils";
import type { IndicatorTimingMode } from "../../store/slices/timingSlice";
import type { InputMode } from "../../store/slices/lyricsSlice";
import { useAppStore } from "../../store/appStore";

interface RichContentInternalProps {
  itemId: string;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;
  currentlySelectedCueId: string | undefined;
  content: string[][];
  eventId: string;
  inputMode: InputMode | "disabled"; // for RUN mode
  indicatorNumber: number;
  inputTimingMode: IndicatorTimingMode;
}

const RichContentInternal = ({
  itemId,
  setCurrentlySelectedCueId,
  currentlySelectedCueId,
  content,
  eventId,
  inputMode,
  indicatorNumber,
  inputTimingMode,
}: RichContentInternalProps) => {
  const { item } = useGetItem(eventId, itemId);
  const { mutateAsync: upsertCue } = useUpsertCue(eventId, itemId);
  const { mutateAsync: upsertItem } = useUpsertItem(eventId);

  /** Every edit here is a rewrite of the item's lyrics (cue and timing markers live inside them). */
  const saveRawLyrics = (rawLyrics: string) => upsertItem({ id: itemId, rawLyrics });

  const isMovingCue = useAppStore((state) => state.isMovingCue);
  const setIsMovingCue = useAppStore((state) => state.setIsMovingCue);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!item) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const lineIndex = Number(target.dataset.lineIndex);
    const wordIndex = Number(target.dataset.wordIndex);
    const isSpace = target.dataset.isSpace === "true";

    if (inputMode === "disabled") {
      // only enable selection of cues
      if (action === "select-cue") {
        const cueId = target.dataset.cueId;
        if (cueId) {
          setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
          setIsMovingCue(false); // stop moving cue if we clicked on another cue
        }
      }
    }

    if (action === "select-cue") {
      // ignore if not in Cue mode
      if (inputMode === "timing") {
        toggleTiming(lineIndex, wordIndex, isSpace, indicatorNumber, inputTimingMode);
        return;
      }
      if (inputMode !== "cue") return;

      const cueId = target.dataset.cueId;
      if (cueId) {
        setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
        setIsMovingCue(false); // stop moving cue if we clicked on another cue
      }
    } else if (action === "select-timing") {
      const updatedContent = removeTimingMarkerFromContent(content, lineIndex, wordIndex, inputTimingMode);

      void saveRawLyrics(generateRaw(updatedContent)).catch(console.error);
    } else if (action === "add") {
      if (inputMode === "cue") {
        if (isMovingCue && currentlySelectedCueId) {
          // If we're moving the cue, first we need to remove it, then re-add it at the new location
          const newRawLyrics = removeCueFromRawLyrics(item.rawLyrics, currentlySelectedCueId!);
          const newContent = generateRich(newRawLyrics);
          const updatedContent = insertCueInRichContent(
            currentlySelectedCueId!,
            lineIndex,
            wordIndex,
            isSpace,
            newContent,
          );
          const updatedRawLyrics = generateRaw(updatedContent);

          saveRawLyrics(updatedRawLyrics)
            .then(() => {
              setIsMovingCue(false);

              setCurrentlySelectedCueId(undefined);
              // wait for react to propagate this update
              setTimeout(() => {
                setCurrentlySelectedCueId(currentlySelectedCueId);
              }, 0);
            })
            .catch(console.error);
          return;
        }

        // Create an empty cue (every field has a server default), then put its marker into the lyrics.
        upsertCue({})
          .then((res) => {
            const id = res.cue.id;
            const updatedContent = insertCueInRichContent(id, lineIndex, wordIndex, isSpace, content);
            const updatedRawLyrics = generateRaw(updatedContent);

            // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query
            void saveRawLyrics(updatedRawLyrics).catch(console.error);

            // Set the currently active cue id to this
            setCurrentlySelectedCueId(id);
          })
          .catch(console.error);
      } else if (inputMode === "timing") {
        // main beats are superscripts, subbeats are subscripts
        toggleTiming(lineIndex, wordIndex, isSpace, indicatorNumber, inputTimingMode);
      }
    }
  };

  const toggleTiming = (
    lineIndex: number,
    wordIndex: number,
    isSpace: boolean,
    indicatorNumber: number,
    indicatorTimingMode: IndicatorTimingMode,
  ) => {
    const updatedContent = insertTimingMarkerInRichContent(
      indicatorNumber,
      indicatorTimingMode,
      lineIndex,
      wordIndex,
      isSpace,
      content,
    );
    const updatedRawLyrics = generateRaw(updatedContent);

    void saveRawLyrics(updatedRawLyrics).catch(console.error);
  };

  return (
    <Stack gap={0} onClick={handleContainerClick} data-cursor-surface="lyrics" data-cursor-item-id={itemId}>
      {(() => {
        let cueCount = 0;
        return content.map((line, index1) => (
          <Group key={index1} gap="0px" align="end">
            {line.map((word, index2) => {
              let cueNumber: number | undefined = 0;
              let cueId: string | undefined = undefined;

              if (word.startsWith("{cueId=") || word.startsWith("<cueId=")) {
                cueCount++;
                cueNumber = cueCount;
                if (word.endsWith("=cueId}") || word.endsWith("=cueId>")) {
                  const rawId = word.split(/[{<]cueId=/)[1].split(/=cueId[}>]/)[0];
                  cueId = convertUuidForDatabase(rawId);
                } else {
                  cueId = convertUuidForDatabase(word.match(/[{<]cueId=(.*?)=cueId[}>]/)?.[1] || "");
                }
              }

              // TODO: support selection for non-cues
              const isSelected = !!cueId && currentlySelectedCueId === cueId;

              return (
                <Flex key={index2} data-cursor-anchor={`${index1}:${index2}`}>
                  <RichWord
                    word={word}
                    index1={index1}
                    index2={index2}
                    cueNumber={cueNumber}
                    isSelected={isSelected}
                    inputMode={inputMode}
                  />
                </Flex>
              );
            })}
          </Group>
        ));
      })()}
    </Stack>
  );
};

export const RichContent = React.memo(RichContentInternal);
