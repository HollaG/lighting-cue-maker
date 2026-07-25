import React, { useCallback } from "react";
import { Group, Flex, Stack } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { convertUuidForDatabase } from "../../utils/convertUuid";
import { useGetItem } from "../../query/useGetItem";
import { useGetCues } from "../../query/useGetCues";
import { RichWord } from "./RichWord";
import { useCreateCue } from "../../query/useCreateCue";
import { useUpdateCue } from "../../query/useUpdateCue";
import { useUpdateItem } from "../../query/useUpdateItem";
import { insertCueInRichContent } from "../../utils/cueUtils";
import { generateRaw } from "../../utils/convertText";

export const RichContent = ({ itemId }: { itemId: string }) => {
  const onAddBump = useAppStore((s) => s.onAddBump);
  const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);
  const inputMode = useAppStore((s) => s.inputMode);
  const instantAddBumpMode = useAppStore((s) => s.instantAddBumpMode);

  const { content } = useGetItem({ itemId });
  const { mutateAsync: createCue } = useCreateCue();
  const { mutate: updateItem } = useUpdateItem();

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;

      const action = target.dataset.action;

      if (action === "select-cue") {
        const cueId = target.dataset.cueId;
        if (cueId) {
          setCurrentlySelectedCueId(currentlySelectedCueId === cueId ? undefined : cueId);
        }
      } else if (action === "add") {
        const lineIndex = Number(target.dataset.lineIndex);
        const wordIndex = Number(target.dataset.wordIndex);
        const isSpace = target.dataset.isSpace === "true";

        if (inputMode === "rich") {
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
        }
      }
    },
    [currentlySelectedCueId, setCurrentlySelectedCueId, content],
  );

  return (
    <Stack gap={0} onClick={handleContainerClick} style={{ position: "relative" }}>
      {(() => {
        let cueCount = 0;
        return content.map((line, index1) => (
          <Group key={index1} gap="0px">
            {line.map((word, index2) => {
              let cueNumber: number | undefined = undefined;
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

              const isSelected = !!cueId && currentlySelectedCueId === cueId;

              return (
                <Flex key={index2} style={{ flexDirection: "row" }}>
                  <RichWord word={word} index1={index1} index2={index2} cueNumber={cueNumber} isSelected={isSelected} />
                </Flex>
              );
            })}
          </Group>
        ));
      })()}
    </Stack>
  );
};
