import { Group, Select, Stack /* , Text */ } from "@mantine/core";
import type { ReactNode } from "react";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { CardBase } from "../../../Cues/CardBase";
import { useUpsertPatchedFixtures } from "../../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";

export const FixtureItem = ({ fixture, rightSection }: { fixture: PatchedFixture; rightSection?: ReactNode }) => {
  const { mutateAsync: upsertPatchedFixture } = useUpsertPatchedFixtures(fixture.eventId);
  const { event } = useGetEvent(fixture.eventId);
  const modes = event?.fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId)?.modes ?? [];
  return (
    <CardBase isActive={false}>
      <Stack>
        <Group>
          {/* <Text fw="semibold" flex={1}>
            {fixture.name}
          </Text> */}
          <CustomTextInput
            value={fixture.name}
            onChange={(e) => upsertPatchedFixture([{ ...fixture, name: e.target.value }])}
            flex={1}
            label="Fixture name"
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
