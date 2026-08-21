import React, { useMemo } from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query/useGetItem";
import { useGetEvent } from "../../query/useGetEvent";
import { RichWord } from "./RichWord";
import { useCreateCue } from "../../query/useCreateCue";
import { useUpdateItem } from "../../query/useUpdateItem";
import { insertCueInRichContent } from "../../utils/cue/cueForm";
import { generateRaw } from "../../utils/convertText";
import { useCreateBump } from "../../query/useCreateBump";
import { insertBumpInRichContent, removeBumpFromRawLyrics } from "../../utils/bumpUtils";
import { useDeleteBump } from "../../query/useDeleteBump";
import { insertTimingMarkerInRichContent, removeTimingMarkerFromContent } from "../../utils/timingUtils";
import type { IndicatorTimingMode } from "../../store/slices/timingSlice";

const RichContentInternal = ({ itemId }: { itemId: string }) => {
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);
  const content = useAppStore((s) => s.content);
  const code = useAppStore((s) => s.code);
  const inputMode = useAppStore((s) => s.inputMode);
  const showCues = useAppStore((s) => s.showCues);

  const { item } = useGetItem({ itemId });
  const { event } = useGetEvent({ eventId: code });
  const { mutateAsync: createCue } = useCreateCue();
  const { mutateAsync: createBump } = useCreateBump();
  const { mutateAsync: deleteBump } = useDeleteBump();
  const { mutate: updateItem } = useUpdateItem();

  const bumpNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (item?.bumps && event?.bumpConfigurations) {
      for (const bump of item.bumps) {
        const config = event.bumpConfigurations.find((c) => c.id === bump.bumpConfigurationId);
        if (config) {
          map[bump.id] = config.name;
        }
      }
    }
    return map;
  }, [item?.bumps, event?.bumpConfigurations]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showCues) return;
    if (!item) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const lineIndex = Number(target.dataset.lineIndex);
    const wordIndex = Number(target.dataset.wordIndex);
    const isSpace = target.dataset.isSpace === "true";

    const {
      inputMode,
      instantAddBumpMode,
      indicatorNumber,
      inputTimingMode: indicatorTimingMode,
    } = useAppStore.getState();

    if (action === "select-cue") {
      // ignore if not in Cue mode
      if (inputMode === "timing") {
        toggleTiming(lineIndex, wordIndex, isSpace, indicatorNumber, indicatorTimingMode);
        return;
      }
      if (inputMode !== "cue") return;

      const cueId = target.dataset.cueId;
      if (cueId) {
        setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
      }
    } else if (action === "select-bump") {
      // ignore if not in bump mode
      if (inputMode === "timing") {
        toggleTiming(lineIndex, wordIndex, isSpace, indicatorNumber, indicatorTimingMode);
        return;
      }

      if (inputMode !== "bump") return;

      const bumpId = target.dataset.bumpId;
      if (!bumpId) return;

      const confirmDeleteBump = confirm(`Are you sure you want to delete bump "${target.dataset.bumpName}"?`);

      if (confirmDeleteBump) {
        deleteBump({
          bumpId,
        })
          .then(() => {
            const updatedRawLyrics = removeBumpFromRawLyrics(item?.rawLyrics, bumpId);

            // update Item to remove from rawlyrics
            // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query

            updateItem({
              itemId: item.id,
              requestBody: {
                rawLyrics: updatedRawLyrics,
              },
            });
          })
          .catch(console.error);
      }
    } else if (action === "select-timing") {
      const { inputTimingMode: indicatorTimingMode } = useAppStore.getState();
      const updatedContent = removeTimingMarkerFromContent(content, lineIndex, wordIndex, indicatorTimingMode);

      updateItem({
        itemId: item.id,
        requestBody: {
          rawLyrics: generateRaw(updatedContent),
        },
      });
    } else if (action === "add") {
      if (inputMode === "cue") {
        createCue({
          itemId,
        })
          .then((res) => {
            const id = res.cue.id;
            const updatedContent = insertCueInRichContent(id, lineIndex, wordIndex, isSpace, content);
            const updatedRawLyrics = generateRaw(updatedContent);

            // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query
            updateItem({
              itemId,
              requestBody: {
                rawLyrics: updatedRawLyrics,
              },
            });

            // Set the currently active cue id to this
            setCurrentlySelectedCueId(id);
          })
          .catch(console.error);
      } else if (inputMode === "bump") {
        if (!instantAddBumpMode) return;
        createBump({
          itemId,
          bumpConfigurationId: instantAddBumpMode.id,
        })
          .then((res) => {
            const id = res.bump.id;
            const updatedContent = insertBumpInRichContent(id, lineIndex, wordIndex, isSpace, content);
            const updatedRawLyrics = generateRaw(updatedContent);

            // TODO @combine-updates: can probably calculate insertBumpInRichContent in the backend, so we can save one query
            updateItem({
              itemId,
              requestBody: {
                rawLyrics: updatedRawLyrics,
              },
            });
          })
          .catch(console.error);
      } else if (inputMode === "timing") {
        // main beats are superscripts, subbeats are subscripts
        toggleTiming(lineIndex, wordIndex, isSpace, indicatorNumber, indicatorTimingMode);
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

    updateItem({
      itemId,
      requestBody: {
        rawLyrics: updatedRawLyrics,
      },
    });
  };

  return (
    <Stack gap={0} onClick={handleContainerClick}>
      {(() => {
        let cueCount = 0;
        let bumpCount = 0;
        return content.map((line, index1) => (
          <Group key={index1} gap="0px" align="end">
            {line.map((word, index2) => {
              let cueNumber: number | undefined = 0;
              let bumpNumber: number | undefined = 0;
              let cueId: string | undefined = undefined;

              if (word.startsWith("{cueId=") || word.startsWith("<cueId=")) {
                cueCount++;
                cueNumber = cueCount;
                if (word.endsWith("=cueId}") || word.endsWith("=cueId>")) {
                  const rawId = word.split(/[\{<]cueId=/)[1].split(/=cueId[\}>]/)[0];
                  cueId = convertUuidForDatabase(rawId);
                } else {
                  cueId = convertUuidForDatabase(word.match(/[\{<]cueId=(.*?)=cueId[\}>]/)?.[1] || "");
                }
              }

              if (word.startsWith("{bumpId=") || word.startsWith("<bumpId=")) {
                bumpCount++;
                bumpNumber = bumpCount;
              }

              // TODO: support selection for non-cues
              const isSelected = !!cueId && currentlySelectedCueId === cueId;

              return (
                <Flex key={index2}>
                  <RichWord
                    word={word}
                    index1={index1}
                    index2={index2}
                    order={{
                      cue: cueNumber,
                      bump: bumpNumber,
                    }}
                    isSelected={isSelected}
                    inputMode={inputMode}
                    bumpNameMap={bumpNameMap}
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
