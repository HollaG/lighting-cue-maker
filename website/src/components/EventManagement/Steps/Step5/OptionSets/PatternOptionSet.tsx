import {
  Box,
  Button,
  Center,
  Group,
  Input,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tooltip,
} from "@mantine/core";
import { upperFirst, useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import {
  BlendMode,
  ColourMode,
  SelectableType,
  type OptionSet,
  type PatternEffect,
  type PatternSelectable,
  type UpsertOptionSet,
} from "../../../../../types-v2/optionSet";
import { listPatternEffects } from "../../../../../effects/pattern/registry";
import { CustomTextInput } from "../../../../CustomTextInput/CustomTextInput";
import { IconHelpCircle, IconPlayerPlay } from "@tabler/icons-react";
import type { FixtureGroup, Grid } from "../../../../../types-v2/fixtureGroups";
import type { PatchedFixture } from "../../../../../types-v2/patchedFixture";
import { useGetPatchedFixtures } from "../../../../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { PatternPreview } from "./PatternPreview";

const EFFECT_OPTIONS = listPatternEffects().map((effect) => ({ value: effect.id, label: effect.name }));

/** Step duration (ms) for each speed shortcut. Shared by the step duration presets and the clone buttons. */
const SPEED_PRESETS = [
  { label: "Slow", stepDuration: 600 },
  { label: "Medium", stepDuration: 250 },
  { label: "Fast", stepDuration: 100 },
] as const;

// for dynamic RGB patterns
export const PatternOptionSet = ({
  optionSet,
  fixtureGroup,
  upsertOptionSets,
}: {
  optionSet: OptionSet;
  /** For the preview: its grid (step 2). */
  fixtureGroup: FixtureGroup;
  upsertOptionSets: (optionSets: UpsertOptionSet[]) => Promise<unknown>;
}) => {
  const { patchedFixtures } = useGetPatchedFixtures(fixtureGroup.eventId);

  // for a Pattern option set, all selectables must be of type PatternSelectable
  const options = optionSet.selectables.filter((s): s is PatternSelectable => s.type === SelectableType.EFFECT_PATTERN);

  // Local copy, so inputs update on every keystroke while the save waits for the debounce.
  const [rows, setRows] = useState<PatternSelectable[]>(options);

  const saveRows = useDebouncedCallback(
    (rowsToSave: PatternSelectable[]) => void upsertOptionSets([{ ...optionSet, selectables: rowsToSave }]),
    { delay: 600, flushOnUnmount: true }, // leaving the step mid-typing still saves
  );

  const onChangeRow = (id: string, patch: Partial<PatternSelectable>) => {
    const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
    setRows(next);
    saveRows(next);
  };

  /** Inserts a copy of the row straight after it, with a new id, the given step duration and the speed in its name. */
  const onCloneRow = (id: string, stepDuration: number, speedLabel: string) => {
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return;
    const source = rows[index];
    const clone: PatternSelectable = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (${speedLabel})`,
      stepDuration,
    };
    const next = [...rows.slice(0, index + 1), clone, ...rows.slice(index + 1)];
    setRows(next);
    saveRows(next);
  };

  const onAddRow = () => {
    const newRow: PatternSelectable = {
      id: crypto.randomUUID(),
      name: upperFirst(EFFECT_OPTIONS[0].label),
      fixtureIds: "all",
      type: SelectableType.EFFECT_PATTERN,
      effect: EFFECT_OPTIONS[0].value,
      colours: [],

      // NOTE: since the main use case is QLC+, we default to MASK,
      // so that we can have stacking-style of building.
      blendMode: BlendMode.MASK,
      colourMode: ColourMode.RGB,
      stepDuration: 500,
      fadeInDuration: 0,
      fadeOutDuration: 0,
    };
    const next = [...rows, newRow];
    setRows(next);
    saveRows(next);
  };

  return (
    <Stack>
      {rows.map((row) => (
        <PatternOptionRow
          key={row.id}
          row={row}
          onChangeRow={onChangeRow}
          onCloneRow={onCloneRow}
          onBlur={() => saveRows.flush()}
          grid={fixtureGroup.grid}
          fixtures={patchedFixtures}
        />
      ))}
      <Center>
        <Button variant="subtle" size="xs" onClick={onAddRow}>
          {" "}
          Add another effect option
        </Button>
      </Center>
    </Stack>
  );
};

const PatternOptionRow = ({
  row,
  onChangeRow,
  onCloneRow,
  onBlur,
  grid,
  fixtures,
}: {
  row: PatternSelectable;
  onChangeRow: (id: string, patch: Partial<PatternSelectable>) => void;
  onCloneRow: (id: string, stepDuration: number, speedLabel: string) => void;
  /** Saves straight away instead of waiting for the debounce. */
  onBlur: () => void;
  grid: Grid | null;
  fixtures: PatchedFixture[];
}) => {
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);

  return (
    <Stack>
      <Group align="end">
        <Box flex={1}>
          <CustomTextInput
            label="Effect name"
            placeholder="Enter / describe effect"
            withAsterisk
            value={row.name}
            onChange={(e) => onChangeRow(row.id, { name: e.currentTarget.value })}
            onBlur={onBlur}
          />
        </Box>
        <Button variant="light" onClick={openPreview} leftSection={<IconPlayerPlay size={16} />}>
          Preview
        </Button>
      </Group>
      <PatternRowControls row={row} onChangeRow={onChangeRow} onCloneRow={onCloneRow} />

      <Modal opened={previewOpened} onClose={closePreview} title={`Preview: ${row.name}`} size="xl" centered>
        <Stack>
          <PatternPreview selectable={row} grid={grid} fixtures={fixtures} />
          <PatternRowControls row={row} onChangeRow={onChangeRow} onCloneRow={onCloneRow} />
        </Stack>
      </Modal>
    </Stack>
  );
};

/** The effect's settings. Shown under the row and again in the preview modal, so the LD can tweak while watching. */
const PatternRowControls = ({
  row,
  onChangeRow,
  onCloneRow,
}: {
  row: PatternSelectable;
  onChangeRow: (id: string, patch: Partial<PatternSelectable>) => void;
  onCloneRow: (id: string, stepDuration: number, speedLabel: string) => void;
}) => {
  const onEffectSelect = (effect: PatternEffect) => {
    // if the name is still empty, default it to the effect name
    // if (row.name === "") {
    //   const effectName = EFFECT_OPTIONS.find((o) => o.value === effect)?.label ?? "";
    //   onChangeRow(row.id, { effect, name: effectName });
    // } else {
    //   onChangeRow(row.id, { effect });
    // }

    // nvm, actually, always change the name
    const effectName = EFFECT_OPTIONS.find((o) => o.value === effect)?.label ?? "";
    onChangeRow(row.id, { effect, name: effectName });
  };

  return (
    <>
      <SimpleGrid cols={3} spacing="xs">
        <Select
          label="Effect"
          placeholder="Select effect"
          data={EFFECT_OPTIONS}
          value={row.effect}
          onChange={(value) => (value ? onEffectSelect(value) : null)}
          withAsterisk
        />
        <Select
          label="Blend mode"
          placeholder="Select blend mode"
          data={Object.values(BlendMode).map((mode) => ({ value: mode, label: upperFirst(mode) }))}
          value={row.blendMode}
          onChange={(value) => (value ? onChangeRow(row.id, { blendMode: value as BlendMode }) : null)}
          withAsterisk
        />
        <Select
          label="Colour mode"
          placeholder="Select colour mode"
          data={Object.values(ColourMode).map((mode) => ({ value: mode, label: upperFirst(mode) }))}
          value={row.colourMode}
          onChange={(value) => (value ? onChangeRow(row.id, { colourMode: value as ColourMode }) : null)}
          withAsterisk
        />
      </SimpleGrid>
      <SimpleGrid cols={3} spacing="xs">
        <Box>
          <SimpleGrid cols={2}>
            <NumberInput
              label="Fade In"
              placeholder="0"
              value={row.fadeInDuration}
              min={0}
              onChange={(value) => (value ? onChangeRow(row.id, { fadeInDuration: value as number }) : null)}
              withAsterisk
            />
            <NumberInput
              label="Fade Out"
              placeholder="0"
              value={row.fadeOutDuration}
              min={0}
              onChange={(value) => (value ? onChangeRow(row.id, { fadeOutDuration: value as number }) : null)}
              withAsterisk
            />
          </SimpleGrid>
        </Box>
        <Box>
          <NumberInput
            label="Step Duration (ms)"
            placeholder="How long to hold this effect"
            value={row.stepDuration}
            min={1}
            onChange={(value) => (value ? onChangeRow(row.id, { stepDuration: value as number }) : null)}
            withAsterisk
          />
          <Group gap="xs" ml="xs">
            {SPEED_PRESETS.map((speed) => (
              <Button
                key={speed.label}
                variant="transparent"
                size="xs"
                styles={{
                  root: { padding: 0 },
                }}
                onClick={() => onChangeRow(row.id, { stepDuration: speed.stepDuration })}
              >
                {speed.label}
              </Button>
            ))}
          </Group>
        </Box>
        <Box w="100%">
          <Input.Wrapper
            label={
              <Tooltip
                label={"Duplicate the current effect with the selected step duration / speed."}
                position="top"
                withArrow
              >
                {/* inline-flex so the label's required asterisk (added after this by the input) stays on the same row */}
                <Group align="center" gap={4} style={{ display: "inline-flex" }}>
                  Clone <IconHelpCircle width="1rem" />
                </Group>
              </Tooltip>
            }
          >
            <Button.Group w="100%">
              {SPEED_PRESETS.map((speed) => (
                <Button
                  key={speed.label}
                  flex={1}
                  variant="default"
                  styles={{
                    root: { padding: "var(--mantine-spacing-xs)" },
                  }}
                  onClick={() => onCloneRow(row.id, speed.stepDuration, speed.label)}
                >
                  {speed.label}
                </Button>
              ))}
            </Button.Group>
          </Input.Wrapper>
        </Box>
      </SimpleGrid>
    </>
  );
};
