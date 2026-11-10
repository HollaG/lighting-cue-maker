import { Box, Button, Group, MultiSelect, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { useGetFixtureGroups } from "../../../../query-v2/fixture-groups/useGetFixtureGroups";
import { useUpsertFixtureGroups } from "../../../../query-v2/fixture-groups/useUpsertFixtureGroups";
import { useDeletePatchedFixture } from "../../../../query-v2/patched-fixtures/useDeletePatchedFixture";
import { useGetPatchedFixtures } from "../../../../query-v2/patched-fixtures/useGetPatchedFixtures";
import type { UpsertFixtureGroup } from "../../../../types-v2/fixtureGroups";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { STEP_FORM_ID } from "../StepForm";
import { FixtureItem } from "./FixtureItem";
import { GridControl } from "./GridControl";
import { GroupItem } from "./GroupItem";

/** Fixture grouping and arrangement */
export const Step3 = ({ eventId, onDone }: { onDone: () => void; eventId: string }) => {
  const { patchedFixtures, isPatchedFixturesLoading } = useGetPatchedFixtures(eventId);
  const { event } = useGetEvent(eventId);
  const { fixtureGroups, isFixtureGroupsLoading } = useGetFixtureGroups(eventId);
  const [lastDeletedFixtureId, setLastDeletedFixtureId] = useState<string | null>(null);
  const { mutateAsync: deleteFixture, isPending: isDeleteFixturePending } = useDeletePatchedFixture(eventId);

  const { mutateAsync: upsertFixtureGroups } = useUpsertFixtureGroups(eventId);

  const fixtureTemplates = event?.fixtureTemplates ?? [];

  const patchedFixturesGroupedByManufacturer = patchedFixtures.reduce(
    (acc, fixture) => {
      const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
      if (!template) return acc;
      (acc[template.manufacturer] ??= []).push(fixture);
      return acc;
    },
    {} as Record<string, PatchedFixture[]>,
  );

  const multiselectData = Object.entries(patchedFixturesGroupedByManufacturer).map(([manufacturer, fixtures]) => ({
    group: manufacturer,
    items: fixtures.map((fixture) => ({ value: fixture.id, label: fixture.name })),
  }));

  // const [groups, setGroups] = useState<UpsertFixtureGroup[]>([]);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);
  const onAddGroup = async () => {
    if (selectedFixtureIds.length === 0) return;
    let group: UpsertFixtureGroup = {
      name: `Group ${fixtureGroups.length + 1}`,
      description: "",
      fixtureIds: selectedFixtureIds,
      grid: null,
      sortOrder: fixtureGroups.length,
    };

    const result = await upsertFixtureGroups([group]);

    // clear the selection so the user can add another group
    setSelectedFixtureIds([]);
    setSelectedFixtureGroupId(result.fixtureGroups[0].id); // deselect any group when a new one is added
  };

  // For the Grid
  const [selectedFixtureGroupId, setSelectedFixtureGroupId] = useState<string | null>(null);
  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <Stack gap="sm">
        <Title order={4} flex={1}>
          Configure fixture groups
        </Title>
        <Text>
          {" "}
          Group your fixtures into logical sets for easier management. Don't think about the technical details.
        </Text>

        <SimpleGrid cols={3} mt="lg" spacing="xl">
          {/* List of all fixtures */}
          <Box>
            <Title mb="lg" order={5}>
              {" "}
              Fixture list{" "}
            </Title>
            <Stack gap="xs">
              {patchedFixtures.map((fixture) => (
                <FixtureItem
                  key={fixture.id}
                  fixture={fixture}
                  rightSection={
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => {
                        setLastDeletedFixtureId(fixture.id);
                        deleteFixture(fixture.id);
                      }}
                      loading={isDeleteFixturePending && lastDeletedFixtureId === fixture.id}
                    >
                      Delete
                    </Button>
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* List of groups */}
          <Stack gap="xs">
            <Group>
              <Title flex={1} order={5}>
                Groups
              </Title>
            </Group>
            <Group>
              <MultiSelect
                data={multiselectData}
                disabled={isPatchedFixturesLoading}
                placeholder="Pick fixtures"
                searchable
                value={selectedFixtureIds}
                onChange={setSelectedFixtureIds}
                flex={1}
              />
              <Button variant="light" onClick={onAddGroup} disabled={selectedFixtureIds.length === 0}>
                Add group
              </Button>
            </Group>
            <Stack mt="md">
              {fixtureGroups.map((group, index) => (
                <GroupItem
                  fixtures={patchedFixtures.filter((f) => group.fixtureIds.includes(f.id))}
                  key={index}
                  group={group}
                  multiselectData={multiselectData}
                  eventId={eventId}

                  isSelected={selectedFixtureGroupId === group.id}
                  setIsSelected={() => setSelectedFixtureGroupId(group.id)}
                />
              ))}
            </Stack>
          </Stack>

          {/* Grid */}
          <GridControl />
        </SimpleGrid>
      </Stack>
    </form>
  );
};
