import { ActionIcon, Box, Button, Center, Flex, Scroller, Stack, Tooltip } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { Cue } from "../../types/cues";
import { IconArrowNarrowLeftDashed, IconArrowNarrowRightDashed, IconArrowNarrowUpDashed } from "@tabler/icons-react";

export const CueControls = ({
  mode = "horizontal",
  cues,
  currentCueIndex,
  cueOrder,

  onSelectCue,
}: {
  mode: "horizontal" | "vertical";
  cues: Cue[];
  currentCueIndex: number;
  cueOrder: string[];

  onSelectCue: (cueIndex: number) => void;
}) => {
  const cueButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const currentCueId = cueOrder[currentCueIndex];

  useEffect(() => {
    if (mode !== "horizontal" || !currentCueId) return;

    cueButtonRefs.current[currentCueId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentCueId, mode]);

  const isCurrentCue = (cueIndex: number) => cueIndex === currentCueIndex;

  const onCueNext = () => {
    const newIndex = currentCueIndex === cueOrder.length - 1 ? 0 : currentCueIndex + 1;
    onSelectCue(newIndex);
  };

  const onCuePrevious = () => {
    const newIndex = currentCueIndex === 0 ? cueOrder.length - 1 : currentCueIndex - 1;
    onSelectCue(newIndex);
  };

  if (mode === "vertical") {
    return (
      <Stack>
        <Box style={{ flexShrink: 0, flexGrow: 0, justifyContent: "center" }}>
          <Tooltip label="Keyboard shortcut: press Up Arrow to go to previous cue">
            <Button
              style={{ width: "45px" }}
              leftSection={<IconArrowNarrowUpDashed width="1rem" />}
              onClick={onCuePrevious}
            >
              {/* Previous */}
            </Button>
          </Tooltip>
        </Box>
        {cueOrder.map((cueId, index) => {
          const cue = cues.find((c) => c.id === cueId);
          if (!cue) return null;
          return (
            <Box key={cue.id} style={{ flexShrink: 0, flexGrow: 0 }}>
              <Button
                variant={isCurrentCue(index) ? "light" : "subtle"}
                color={isCurrentCue(index) ? "lime" : "gray"}
                onClick={() => onSelectCue(index)}
              >
                Cue {index + 1}
              </Button>
            </Box>
          );
        })}

        <Box style={{ flexShrink: 0, flexGrow: 0, display: "flex", justifyContent: "center" }}>
          <Tooltip label="Keyboard shortcut: press Down Arrow to go to next cue">
            <Button
              style={{ width: "125px" }}
              rightSection={<IconArrowNarrowRightDashed width="1rem" />}
              onClick={onCueNext}
            >
              Next
            </Button>
          </Tooltip>
        </Box>
      </Stack>
    );
  }

  return (
    <Flex style={{ width: "100%", minWidth: 0, gap: "1rem", flexDirection: "row", alignItems: "center" }}>
      <Center style={{ flexShrink: 0, flexGrow: 0 }}>
        <Tooltip label="Keyboard shortcut: press Left Arrow to go to previous cue">
          {/* <Button
            style={{ width: "45px" }}
            leftSection={<IconArrowNarrowLeftDashed width="1rem" />}
            onClick={onCuePrevious}
          >
             Previous *
          </Button> */}
          <ActionIcon size="xl" color="gray" variant="light" onClick={onCuePrevious}>
            <IconArrowNarrowLeftDashed width="1rem" />
          </ActionIcon>
        </Tooltip>
      </Center>
      <Flex style={{ flex: "1 1 0", minWidth: 0, width: 0 }}>
        <Scroller style={{ width: "100%" }}>
          <Flex
            style={{
              flexWrap: "nowrap",
              gap: "0.5rem",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {cueOrder.map((cueId, index) => {
              const cue = cues.find((c) => c.id === cueId);
              if (!cue) return null;
              return (
                <Box key={cue.id} style={{ flexShrink: 0, flexGrow: 0 }}>
                  <Button
                    ref={(node) => {
                      cueButtonRefs.current[cue.id] = node;
                    }}
                    variant={isCurrentCue(index) ? "light" : "subtle"}
                    color={isCurrentCue(index) ? "lime" : "gray"}
                    onClick={() => onSelectCue(index)}
                  >
                    Cue {index + 1}
                  </Button>
                </Box>
              );
            })}
          </Flex>
        </Scroller>
      </Flex>
      <Center style={{ flexShrink: 0, flexGrow: 0, display: "flex", justifyContent: "flex-end" }}>
        <Tooltip label="Keyboard shortcut: press Right Arrow to go to next cue">
          {/* <Button
            style={{ width: "125px" }}
            rightSection={<IconArrowNarrowRightDashed width="1rem" />}
            onClick={onCueNext}
          >
            Next
          </Button> */}
          <ActionIcon size="xl" color="gray" variant="light" onClick={onCueNext}>
            <IconArrowNarrowRightDashed width="1rem" />
          </ActionIcon>
        </Tooltip>
      </Center>
    </Flex>
  );
};
