import React, { useMemo } from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query/useGetItem";
import { useGetEvent } from "../../query/useGetEvent";
import { RichWord } from "./RichWord";
import { useCreateCue } from "../../query/useCreateCue";
import { useUpdateItem } from "../../query/useUpdateItem";
import { insertCueInRichContent } from "../../utils/cueUtils";
import { generateRaw } from "../../utils/convertText";
import { useCreateBump } from "../../query/useCreateBump";
import { insertBumpInRichContent, removeBumpFromRawLyrics } from "../../utils/bumpUtils";
import { useDeleteBump } from "../../query/useDeleteBump";
import { insertTimingMarkerInRichContent, removeTimingMarkerFromContent } from "../../utils/timingUtils";

const RichContentInternal = ({ itemId }: { itemId: string }) => {
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);
  const content = useAppStore((s) => s.content);
  const code = useAppStore((s) => s.code);
  const inputMode = useAppStore((s) => s.inputMode);

  const { item } = useGetItem({ itemId });
  const { event } = useGetEvent({ code });
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
    if (!item) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const lineIndex = Number(target.dataset.lineIndex);
    const wordIndex = Number(target.dataset.wordIndex);
    const isSpace = target.dataset.isSpace === "true";

    console.log(target);

    if (action === "select-cue") {
      console.log(target.dataset);
      const cueId = target.dataset.cueId;
      if (cueId) {
        console.log(cueId);
        setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
      }
    } else if (action === "select-bump") {
      // TODO: current action is to delete it.
      // Can change in future
      const bumpId = target.dataset.bumpId;
      if (!bumpId) return;
      // const bump = item.bumps.find((b) => (b.id = bumpId));

      // let bumpName = "";
      // if (bump) {
      //   const bumpConfig = event.bumpConfigurations.find((b) => b.id === bump.bumpConfigurationId);
      //   bumpName = bumpConfig?.name;
      // }

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
      const { inputMode, instantAddBumpMode, indicatorNumber, inputTimingMode: indicatorTimingMode } =
        useAppStore.getState();

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
      }
    }
  };

  return (
    <Stack gap={0} onClick={handleContainerClick} style={{ position: "relative" }}>
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
