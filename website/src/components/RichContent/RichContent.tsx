import React, { useCallback } from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query/useGetItem";
import { RichWord } from "./RichWord";
import { useCreateCue } from "../../query/useCreateCue";
import { useUpdateItem } from "../../query/useUpdateItem";
import { insertCueInRichContent } from "../../utils/cueUtils";
import { generateRaw } from "../../utils/convertText";
import { useCreateBump } from "../../query/useCreateBump";
import { insertBumpInRichContent, removeBumpFromRawLyrics } from "../../utils/bumpUtils";
import { useGetEvent } from "../../query/useGetEvent";
import { useDeleteBump } from "../../query/useDeleteBump";

export const RichContent = ({ itemId }: { itemId: string }) => {
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);
  const inputMode = useAppStore((s) => s.inputMode);
  const instantAddBumpMode = useAppStore((s) => s.instantAddBumpMode);
  // const code = useAppStore((s) => s.code);

  const { content, item } = useGetItem({ itemId });
  // const { event } = useGetEvent({ code });
  const { mutateAsync: createCue } = useCreateCue();
  const { mutateAsync: createBump } = useCreateBump();
  const { mutateAsync: deleteBump } = useDeleteBump();
  const { mutate: updateItem } = useUpdateItem();

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;

      const action = target.dataset.action;

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
          }).then((res) => {
            const updatedRawLyrics = removeBumpFromRawLyrics(item.rawLyrics, bumpId);

            // update Item to remove from rawlyrics
            // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query

            updateItem({
              itemId: item.id,
              requestBody: {
                rawLyrics: updatedRawLyrics,
              },
            });
          });
        }
      } else if (action === "add") {
        const lineIndex = Number(target.dataset.lineIndex);
        const wordIndex = Number(target.dataset.wordIndex);
        const isSpace = target.dataset.isSpace === "true";

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
            })
            .catch(console.error);
        } else if (inputMode === "bump") {
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
        }
      }
    },
    [currentlySelectedCueId, setCurrentlySelectedCueId, content, createCue, updateItem, itemId, inputMode],
  );

  return (
    <Stack gap={0} onClick={handleContainerClick} style={{ position: "relative" }}>
      {(() => {
        let cueCount = 0;
        let bumpCount = 0;
        return content.map((line, index1) => (
          <Group key={index1} gap="0px">
            {line.map((word, index2) => {
              let cueNumber: number | undefined = undefined;
              let bumpNumber: number | undefined = undefined;
              let cueId: string | undefined = undefined;

              if (word.startsWith("<cueId=")) {
                cueCount++;
                cueNumber = cueCount;
                if (word.endsWith("=cueId>")) {
                  cueId = convertUuidForDatabase(word.split("<cueId=")[1].split("=cueId>")[0]);
                } else {
                  cueId = convertUuidForDatabase(word.match(/<cueId=(.*?)=cueId>/)?.[1] || "");
                }
              }

              if (word.startsWith("<bumpId=")) {
                bumpCount++;
                bumpNumber = bumpCount;
              }

              // TODO: support selection for non-cues
              const isSelected = !!cueId && currentlySelectedCueId === cueId;

              return (
                <Flex key={index2} style={{ flexDirection: "row" }}>
                  <RichWord
                    word={word}
                    index1={index1}
                    index2={index2}
                    order={{
                      cue: cueNumber,
                      bump: bumpNumber,
                    }}
                    isSelected={isSelected}
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
