import { Box, Button, Center, ColorInput, Group, Menu, Stack } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useState } from "react";
import {
  SelectableType,
  type Colour,
  type ColourSelectable,
  type OptionSet,
  type UpsertOptionSet,
} from "../../../../../types-v2/optionSet";
import { ColourIndicator } from "../../../../ColourIndicator/ColourIndicator";
import { CustomTextInput } from "../../../../CustomTextInput/CustomTextInput";

type QuickAddType = "whiteamber" | "rgb" | "cmy" | "limeuv" | "all";

const WHITE: Colour = {
  hex: "#ffffff",
  name: "White",
  mix: {
    white: 255,
  },
};
const AMBER: Colour = {
  hex: "#ffbf00",
  name: "Amber",
  mix: {
    amber: 255,
  },
};
const RED: Colour = { hex: "#ff0000", name: "Red", mix: { r: 255 } };
const GREEN: Colour = { hex: "#00ff00", name: "Green", mix: { g: 255 } };
const BLUE: Colour = { hex: "#0000ff", name: "Blue", mix: { b: 255 } };
const CYAN: Colour = { hex: "#00ffff", name: "Cyan" };
const MAGENTA: Colour = { hex: "#ff00ff", name: "Magenta" };
const YELLOW: Colour = { hex: "#ffff00", name: "Yellow" };
const LIME: Colour = { hex: "#BFFF00", name: "Lime", mix: { lime: 255 } };
const UV: Colour = { hex: "#7F00FF", name: "UV / Purple", mix: { uv: 255 } };

const QUICK_ADD_COLOURS: Record<QuickAddType, Colour[]> = {
  whiteamber: [WHITE, AMBER],
  rgb: [RED, GREEN, BLUE],
  cmy: [CYAN, MAGENTA, YELLOW],
  limeuv: [LIME, UV],
  all: [WHITE, AMBER, RED, GREEN, BLUE, CYAN, MAGENTA, YELLOW, UV],
};

const SWATCHES = [
  "#ffffff",
  "#ffbf00",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#00ffff",
  "#ff00ff",
  "#ffff00",
  "#7F00FF",
  "#FFC0CB",
  "#fd7e14",
];

/**
 * One editable row. `id` is the selectable's id, so a saved row keeps its identity (cues reference it).
 * Rows live in local state so half-filled ones can exist; only complete rows are saved.
 */
type ColourRow = { id: string; name: string; hex: string; mix?: Colour["mix"] };

const newRow = (colour?: Colour): ColourRow => ({
  id: crypto.randomUUID(),
  name: colour?.name ?? "",
  hex: colour?.hex ?? "",
  mix: colour?.mix,
});

const isCompleteRow = (row: ColourRow) => row.name.trim() !== "" && /^#[0-9a-f]{6}$/i.test(row.hex);

/** Option set for Colour Type */
export const ColourOptionSet = ({
  optionSet,
  upsertOptionSets,
}: {
  optionSet: OptionSet;
  upsertOptionSets: (optionSets: UpsertOptionSet[]) => Promise<unknown>;
}) => {
  // Note that for a Colour option set, all selectables must be of type ColourSelectable
  const colourSelectables = optionSet.selectables.filter(
    (s): s is ColourSelectable => s.type === SelectableType.COLOUR,
  );

  // Start with one empty row if there is nothing saved yet, so there is something to fill in.
  const [rows, setRows] = useState<ColourRow[]>(() =>
    colourSelectables.length > 0
      ? colourSelectables.map((s) => ({ id: s.id, name: s.colour.name, hex: s.colour.hex, mix: s.colour.mix }))
      : [newRow()],
  );

  const saveRows = useDebouncedCallback(
    (rowsToSave: ColourRow[]) => {
      const selectables: ColourSelectable[] = rowsToSave.filter(isCompleteRow).map((row) => {
        const existing = colourSelectables.find((s) => s.id === row.id);
        return {
          // keep the fixtureIds of a saved selectable
          fixtureIds: "all",
          ...existing,
          id: row.id,
          name: row.name,
          type: SelectableType.COLOUR,
          colour: { name: row.name, hex: row.hex, ...(row.mix && { mix: row.mix }) },
        };
      });
      void upsertOptionSets([{ ...optionSet, selectables }]);
    },
    { delay: 600, flushOnUnmount: true }, // leaving the step mid-typing still saves
  );

  const updateRows = (next: ColourRow[]) => {
    setRows(next);
    saveRows(next);
  };

  const onChangeRow = (id: string, patch: Partial<ColourRow>) =>
    updateRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const onAddRow = () => setRows((prev) => [...prev, newRow()]); // empty rows aren't saved, so no save yet

  const onDeleteRow = (id: string) => updateRows(rows.filter((row) => row.id !== id));

  const onQuickAdd = (type: QuickAddType) => {
    // If the only row is still empty, replace it instead of adding after it
    const base = rows.length === 1 && rows[0].name === "" && rows[0].hex === "" ? [] : rows;
    updateRows([...base, ...QUICK_ADD_COLOURS[type].map((colour) => newRow(colour))]);
  };

  return (
    <Stack>
      {rows.map((row) => (
        <Group key={row.id}>
          <Box flex={5}>
            <ColorInput
              variant="unstyled"
              label="Colour"
              withAsterisk
              placeholder="Input placeholder"
              value={row.hex}
              // A different colour no longer matches its old `mix` recipe, so drop it.
              // (Compare first: the input can fire onChange with the same value when it reformats on blur.)
              onChange={(hex) =>
                onChangeRow(row.id, hex.toLowerCase() === row.hex.toLowerCase() ? {} : { hex, mix: undefined })
              }
              onBlur={() => saveRows.flush()}
              withEyeDropper={false}
              swatches={SWATCHES}
            />
          </Box>
          <Box flex={5}>
            <CustomTextInput
              label="Colour name"
              placeholder="e.g. Red"
              withAsterisk
              value={row.name}
              onChange={(e) => onChangeRow(row.id, { name: e.currentTarget.value })}
              onBlur={() => saveRows.flush()}
            />
          </Box>
          <Box flex={1}>
            <Button type="button" variant="transparent" size="xs" color="red" onClick={() => onDeleteRow(row.id)}>
              {" "}
              Remove option
            </Button>
          </Box>
        </Group>
      ))}
      <Center>
        <Group>
          <Button type="button" variant="subtle" size="xs" onClick={onAddRow}>
            {" "}
            Add another colour
          </Button>
          <Menu>
            <Menu.Target>
              <Button type="button" variant="subtle" size="xs">
                Quick add{" "}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => onQuickAdd("all")}>Add all</Menu.Item>
              <Menu.Divider />
              <Menu.Item
                onClick={() => onQuickAdd("whiteamber")}
                leftSection={
                  <Group gap={0}>
                    <Box style={{ width: "1rem", height: "1rem" }}></Box>
                    <ColourIndicator hex={WHITE.hex} />
                    <ColourIndicator hex={AMBER.hex} />
                  </Group>
                }
              >
                White Amber
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAdd("rgb")}
                leftSection={
                  <Group gap={0}>
                    <ColourIndicator hex={RED.hex} />
                    <ColourIndicator hex={GREEN.hex} />
                    <ColourIndicator hex={BLUE.hex} />
                  </Group>
                }
              >
                Red Green Blue
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAdd("cmy")}
                leftSection={
                  <Group gap={0}>
                    <ColourIndicator hex={CYAN.hex} />
                    <ColourIndicator hex={MAGENTA.hex} />
                    <ColourIndicator hex={YELLOW.hex} />
                  </Group>
                }
              >
                Cyan Magenta Yellow
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAdd("limeuv")}
                leftSection={
                  <Group gap={0}>
                    <Box style={{ width: "1rem", height: "1rem" }}></Box>
                    <ColourIndicator hex={LIME.hex} />
                    <ColourIndicator hex={UV.hex} />
                  </Group>
                }
              >
                Lime UV
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Center>
    </Stack>
  );
};
