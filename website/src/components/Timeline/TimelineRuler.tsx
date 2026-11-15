import { useTimelineContext } from "dnd-timeline";
import { Box, Text } from "@mantine/core";
import { getTicks, msToTimeString, SIDEBAR_WIDTH } from "../../utils/timeline";
import { Logger } from "../../utils/logger";

const TARGET_LABEL_GAP = 100;

const logger = new Logger("TimelineRuler", "purple");

export const TimelineRuler = ({ onClickPos }: { onClickPos: (timeMs: number) => void }) => {
  const { range, pixelsToValue } = useTimelineContext();

  const minStepMs = pixelsToValue(TARGET_LABEL_GAP);
  const { stepMs, ticks } = getTicks(range, minStepMs);

  return (
    <div
      style={{
        position: "relative",
        height: 28,
        marginLeft: SIDEBAR_WIDTH,
        borderBottom: "1px solid var(--mantine-color-default-border)",
        cursor: "text",
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timeMs = pixelsToValue(x) + range.start;
        onClickPos(timeMs);
        logger.debug(`TimelineRuler clicked at x=${x}, timeMs=${timeMs}`);
      }}
    >
      {ticks.map((t) => (
        <TimelineTick key={t} timeMs={t} />
      ))}
    </div>
  );
};

const TimelineTick = ({ timeMs }: { timeMs: number }) => {
  const { valueToPixels, range } = useTimelineContext();
  const left = valueToPixels(timeMs - range.start);

  return (
    <Box
      style={{
        position: "absolute",
        left: left,
        top: 0,
        height: "100%",
        // borderLeftWidth: "1px",
        borderWidth: "0 0 0 2px",
        borderStyle: "solid",
        borderColor: "var(--mantine-color-default-border)",
        paddingLeft: "0.2rem",
        paddingBottom: "0.2rem",
      }}
    >
      {" "}
      <Text c="dimmed" size="xs" ff="monospace">
        {msToTimeString(timeMs)}{" "}
      </Text>
    </Box>
  );
};
