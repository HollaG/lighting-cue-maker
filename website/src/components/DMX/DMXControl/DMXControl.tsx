import { Box, Checkbox, NumberInput, Slider, Stack /* , Text */ } from "@mantine/core";
// import type { useResolvedDmx } from "../../../hooks/useResolvedDmx";
import { ChannelType, type Channel } from "../../../types-v2/fixtureTemplates";
// import type { PatchedFixture } from "../../../types-v2/patchedFixture";
// import { Logger } from "../../../utils/logger";
import { IconBulb, IconQuestionMark } from "@tabler/icons-react";
import { useEffect, useState } from "react";

// const logger = new Logger("DMXControl", "green");

export const DMXControl = ({
  // eventId,
  dmxValue,
  channel,

  overrideValue,
  onCommit,
  onClear,
}: {
  // eventId: string;
  dmxValue: number | null;
  channel: Channel;

  overrideValue: number | undefined; // cue.overrides[fixtureId]?.[channel.id]
  onCommit: (channelId: string, value: number) => void;
  onClear: (channelId: string) => void;
}) => {
  // 4-layer component:
  // 1. button to enable or not
  // 2. representation of the channel type
  // 3. vertical slider
  // 4. manual text input

  const shownValue = overrideValue ?? dmxValue ?? channel.defaultValue ?? 0;
  const [draft, setDraft] = useState(shownValue);

  useEffect(() => setDraft(shownValue), [shownValue]); // follow saves, other users, cue switches

  const isOverridden = overrideValue !== undefined;

  return (
    <Stack
      style={{
        width: "2.7rem",
        alignItems: "center",
      }}
      gap="0.5rem"
    >
      {/* This checkbox determines if we're saving the override. */}
      <Checkbox
        size="xs"
        checked={isOverridden}
        onChange={(e) => (e.currentTarget.checked ? onCommit(channel.id, draft) : onClear(channel.id))}
      />

      <HeaderIcon channel={channel} key={channel.id} />
      <Slider
        orientation="vertical"
        onChange={setDraft}
        value={draft}
        min={0}
        max={255}
        onChangeEnd={(v) => onCommit(channel.id, v)}
      />
      <Box w="100%">
        <NumberInput
          hideControls
          size="xs"
          value={draft}
          onChange={(v) => setDraft(Number(v) || 0)}
          min={0}
          max={255}
          step={1}
          onBlur={() => {
            if (draft !== shownValue) onCommit(channel.id, draft);
          }}
        />
      </Box>
    </Stack>
  );
};

/** 20 x 20 icon depending on the channel */
const HeaderIcon = ({ channel }: { channel: Channel }) => {
  switch (channel.type) {
    case ChannelType.DIMMER:
    case ChannelType.MASTER_DIMMER:
      return (
        <IconBulb
          style={{
            width: "1rem",
            height: "1rem",
            minWidth: "1rem",
            minHeight: "1rem",
          }}
        />
      );
    case ChannelType.RED:
    case ChannelType.GREEN:
    case ChannelType.BLUE:
    case ChannelType.WHITE:
    case ChannelType.AMBER:
    case ChannelType.UV:
    case ChannelType.LIME:
    case ChannelType.INDIGO:
    case ChannelType.CYAN:
    case ChannelType.MAGENTA:
    case ChannelType.YELLOW:
      return <ColorBox color={ColorChannelToColor(channel) ?? "#000000"} />;
    default:
      return (
        <IconQuestionMark
          style={{
            width: "1rem",
            height: "1rem",
            minWidth: "1rem",
            minHeight: "1rem",
          }}
        />
      );
  }
};

/** Swatch colour for a colour-mixing channel, or null for every other channel type. */
const ColorChannelToColor = (channel: Channel): string | null => {
  switch (channel.type) {
    case ChannelType.RED:
      return "#ff0000";
    case ChannelType.GREEN:
      return "#00ff00";
    case ChannelType.BLUE:
      return "#0000ff";
    case ChannelType.WHITE:
      return "#ffffff";
    case ChannelType.AMBER:
      return "#ffbf00";
    case ChannelType.UV:
      return "#7f00ff"; // violet: UV itself has no visible colour
    case ChannelType.LIME:
      return "#bfff00";
    case ChannelType.INDIGO:
      return "#4b0082";
    case ChannelType.CYAN:
      return "#00ffff";
    case ChannelType.MAGENTA:
      return "#ff00ff";
    case ChannelType.YELLOW:
      return "#ffff00";
    default:
      return null;
  }
};

const ColorBox = ({ color }: { color: string }) => {
  return (
    <Box
      style={{
        width: "1rem",
        height: "1rem",
        minWidth: "1rem",
        minHeight: "1rem",
        backgroundColor: color,
        borderRadius: "0.2rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: color === "#ffffff" ? "#000000" : color, // white swatch gets a black border, every other colour gets no border
      }}
    />
  );
};
