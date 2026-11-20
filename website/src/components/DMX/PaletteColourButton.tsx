import {
  ActionIcon,
  Box,
  Button,
  ColorPicker,
  Divider,
  getDefaultZIndex,
  Group,
  Input,
  Modal,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import type { PaletteApplicable } from "../../utils/visualiser-v2-decoder";
import { ChannelType } from "../../types-v2/fixtureTemplates";

const RAINBOW = "linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)";

/** The 8 base hues of the swatch grid: red, orange, yellow, green, cyan, blue, purple, magenta. */
const SWATCH_HUES: [number, number, number][] = [
  [255, 0, 0],
  [255, 153, 0],
  [255, 255, 0],
  [0, 255, 0],
  [0, 255, 255],
  [0, 0, 255],
  [153, 0, 255],
  [255, 0, 255],
];

const toSwatchHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * 8 x 8 swatches, row by row:
 * 1. greys, black → white
 * 2. the pure hues
 * 3–5. tints: the hues mixed towards white (60%, 40%, 20% white)
 * 6–8. shades: the hues darkened (60%, 40%, 30% brightness)
 */
const SWATCHES: string[] = [
  Array.from({ length: 8 }, (_, i) => toSwatchHex([1, 1, 1].map(() => (i * 255) / 7))),
  SWATCH_HUES.map(toSwatchHex),
  ...[0.6, 0.4, 0.2].map((white) => SWATCH_HUES.map((rgb) => toSwatchHex(rgb.map((v) => v + (255 - v) * white)))),
  ...[0.6, 0.4, 0.3].map((brightness) => SWATCH_HUES.map((rgb) => toSwatchHex(rgb.map((v) => v * brightness)))),
].flat();

/**
 * A square rainbow button that opens a colour picker in a modal.
 * `onPick` gets the hex when the user lets go of the picker (not on every drag step).
 * Clicking a head writes the picked colour to that head's colour channels through `onApply`.
 */
export const PaletteColourButton = ({
  title = "Pick a colour",
  onPick,
  colourHeads,
  whiteHeads,
  onApply,

  headGrid,
}: {
  title?: string;
  onPick?: (hex: string) => void;
  /** One entry per head (PaletteApplicable is already an array). */
  colourHeads: PaletteApplicable;
  /** Each head's white channel, same heads in the same order as `colourHeads`. Omit for no white slider. */
  whiteHeads?: PaletteApplicable;
  /** The values to write, by slot (0-based index in the fixture's mode). Saved together, as one change. */
  onApply: (valuesBySlot: Map<number, number>) => void;

  headGrid: {
    columns: number;
    rows: number;
  };
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [colour, setColour] = useState("#ffffff");
  const [mode, setMode] = useState<"full" | "swatches">("swatches");

  const [white, setWhite] = useState(0);

  const hasWhite = !!whiteHeads?.some((head) => head.has);

  /** The head's colour channels, plus its white channel if it has one. */
  const getHeadValues = (headIndex: number) => {
    const values = getHeadColourValues(colourHeads[headIndex].channels, colour);
    const whiteSlot = whiteHeads?.[headIndex]?.channels[ChannelType.WHITE];
    if (whiteSlot !== undefined) values.set(whiteSlot, white);
    return values;
  };

  return (
    <>
      <ActionIcon
        size="lg"
        radius="sm"
        aria-label={title}
        title={title}
        onClick={open}
        // Inline background beats the variant's colour (also on hover).
        style={{ background: RAINBOW, border: "1px solid var(--mantine-color-default-border)" }}
      />

      <Modal
        opened={opened}
        onClose={close}
        title={title}
        centered
        size="xl"
        // Centred between the top and bottom padding, so 40vh more at the bottom moves it 20vh up.
        // (Not a transform on the content: the open/close transition animates that.)
        styles={{ inner: { paddingBottom: "calc(var(--modal-y-offset) + 40vh)" } }}
        zIndex={getDefaultZIndex("modal") + 2} // above dmx drawer (+1)
      >
        <Group align="start">
          <Stack flex={4}>
            <TextInput label="Hex" value={colour} onChange={(e) => setColour(e.currentTarget.value)} />

            <ColorPicker
              format="hex"
              value={colour}
              onChange={setColour}
              onChangeEnd={onPick}
              swatches={mode === "swatches" ? SWATCHES : undefined}
              swatchesPerRow={8}

              withPicker={mode === "full"}
              fullWidth={mode !== "full"}
            />
            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as "full" | "swatches")}
              data={[
                { label: "Full", value: "full" },
                { label: "Swatches", value: "swatches" },
              ]}
            />
            {hasWhite && (
              <Input.Wrapper label={`White (${white})`}>
                <Slider value={white} onChange={setWhite} min={0} max={255} label={null} />
              </Input.Wrapper>
            )}
          </Stack>
          <Divider />
          <Stack flex={8} miw={0}>
            <Text>Apply selected colour to head:</Text>
            <Box style={{ overflowX: "auto" }}>
              <Box
                style={{
                  display: "grid",
                  // Fills the width when there are few columns; scrolls when they'd be narrower than 2.25rem.
                  gridTemplateColumns: `repeat(${headGrid.columns}, minmax(2.25rem, 1fr))`,
                  gap: 4,
                }}
              >
                {colourHeads.map((head, i) => (
                  // Heads without colour stay as disabled cells, so the others keep their place in the grid.
                  <Button
                    key={i}
                    size="xs"
                    px={0}
                    variant="default"
                    disabled={!head.has}
                    onClick={() => onApply(getHeadValues(i))}
                  >
                    {i + 1}
                  </Button>
                ))}
              </Box>
            </Box>
          </Stack>
        </Group>
      </Modal>
    </>
  );
};

/**
 * Get the RGB/CMY values:
 * RGB: derive from hex
 * CMY: invert RGB (255 - value)
 *
 * NOTE: white comes from its own slider (see `getHeadValues`), not from the hex. Other special channels
 *       (WW, amber, UV...) aren't supported here. This aligns with QLC+ behaviour.
 */
const getHeadColourValues = (channels: PaletteApplicable[number]["channels"], hex: string): Map<number, number> => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const valueByType: [slot: number | undefined, value: number][] = [
    [channels[ChannelType.RED], r],
    [channels[ChannelType.GREEN], g],
    [channels[ChannelType.BLUE], b],
    [channels[ChannelType.CYAN], 255 - r],
    [channels[ChannelType.MAGENTA], 255 - g],
    [channels[ChannelType.YELLOW], 255 - b],
  ];

  const values = new Map<number, number>();
  for (const [slot, value] of valueByType) {
    if (slot !== undefined) values.set(slot, value);
  }
  return values;
};
