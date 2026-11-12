import { Group, Select, Stack /* , Text */ } from "@mantine/core";
import { useState, type ReactNode } from "react";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { CardBase } from "../../../Cues/CardBase";
import { useUpsertPatchedFixtures } from "../../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";

export const FixtureItem = ({
  fixture,
  rightSection,
  index,
}: {
  fixture: PatchedFixture;
  rightSection?: ReactNode;
  index?: number;
}) => {
  const { mutateAsync: upsertPatchedFixture } = useUpsertPatchedFixtures(fixture.eventId);
  const { event } = useGetEvent(fixture.eventId);
  const modes = event?.fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId)?.modes ?? [];

  // Local draft so typing doesn't save every keystroke (the server trims names, which ate spaces mid-typing).
  // Saved on blur or Enter.
  const [name, setName] = useState(fixture.name);
  const [isEditingName, setIsEditingName] = useState(false);

  // Pick up changes made elsewhere (e.g. after a save), but never while the user is typing.
  // Adjusting state during render, as React recommends instead of an effect.
  const [lastSeenName, setLastSeenName] = useState(fixture.name);
  if (fixture.name !== lastSeenName) {
    setLastSeenName(fixture.name);
    if (!isEditingName) setName(fixture.name);
  }

  const saveName = () => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setName(fixture.name); // required: an empty name goes back to the saved one
      return;
    }
    setName(trimmed);
    if (trimmed !== fixture.name) {
      upsertPatchedFixture([{ ...fixture, name: trimmed }]).catch(() => {
        // api errors handled by api.ts; show the saved name again
        setName(fixture.name);
      });
    }
  };

  return (
    <CardBase isActive={false}>
      <Stack>
        <Group>
          {/* <Text fw="semibold" flex={1}>
            {fixture.name}
          </Text> */}
          <CustomTextInput
            value={name}
            onFocus={() => setIsEditingName(true)}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // don't submit the step form
                e.currentTarget.blur(); // blur triggers saveName
              }
            }}
            flex={1}

            label={index !== undefined ? `Fixture ${index + 1} name` : "Fixture name"}
            required
          />
          {rightSection}
        </Group>

        <Select
          data={modes.map((mode) => ({ value: mode.id, label: mode.name }))}
          value={fixture.modeId}
          allowDeselect={false}
          onChange={(value) => (value ? upsertPatchedFixture([{ ...fixture, modeId: value }]) : null)}
        />
      </Stack>
    </CardBase>
  );
};
