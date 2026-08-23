import { Box, Button, Flex, Scroller } from "@mantine/core";
import type { Cue } from "../../types/cues";
import { IconCaretLeft, IconCaretRight } from "@tabler/icons-react";

export const CueControls = ({
  cues,
  currentCueIndex,
  cueOrder,

  onSelectCue,
}: {
  cues: Cue[];
  currentCueIndex: number;
  cueOrder: string[];

  onSelectCue: (cueIndex: number) => void;
}) => {
  const isCurrentCue = (cueIndex: number) => cueIndex === currentCueIndex;

  const onCueNext = () => {
    const newIndex = currentCueIndex === cueOrder.length - 1 ? 0 : currentCueIndex + 1;
    onSelectCue(newIndex);
  };

  const onCuePrevious = () => {
    const newIndex = currentCueIndex === 0 ? cueOrder.length - 1 : currentCueIndex - 1;
    onSelectCue(newIndex);
  };

  return (
    <Flex style={{ width: "100%", minWidth: 0, gap: "1rem", flexDirection: "row", overflow: "hidden" }}>
      <Box style={{ flexShrink: 0, flexGrow: 0, width: "125px" }}>
        <Button leftSection={<IconCaretLeft width="1rem" />} variant="subtle" color="gray" onClick={onCuePrevious}>
          Previous
        </Button>
      </Box>
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
      <Box style={{ flexShrink: 0, flexGrow: 0, width: "150px", display: "flex", justifyContent: "flex-end" }}>
        <Button leftSection={<IconCaretRight width="1rem" />} variant="subtle" color="gray" onClick={onCueNext}>
          Next
        </Button>
      </Box>
    </Flex>
  );
};
