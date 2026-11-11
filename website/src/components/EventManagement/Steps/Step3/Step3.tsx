import { Box, Button, Group, Loader, MultiSelect, NumberInput, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { useUpdateEvent } from "../../../../query-v2/events/useUpdateEvent";
import { useGetFixtureTemplates } from "../../../../query-v2/fixture-templates/useGetFixtureTemplates";
import { useUpsertPatchedFixtures } from "../../../../query-v2/patched-fixtures/useUpsertPatchedFixtures";
import type { UpsertPatchedFixture } from "../../../../types-v2/patchedFixture";
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

  // --- Add fixtures (saved straight away) ---------
  // Picks from the global library; the server copies a template into the event the first time it's used.
  const { fixtureTemplates: libraryTemplates, isFixtureTemplatesLoading } = useGetFixtureTemplates();
  const { mutateAsync: updateEvent, isPending: isUpdateEventPending } = useUpdateEvent();
  const { mutateAsync: upsertPatchedFixtures, isPending: isUpsertFixturesPending } = useUpsertPatchedFixtures(eventId);

  const librarySelectData = Object.entries(
    libraryTemplates.reduce(
      (acc, template) => {
        (acc[template.manufacturer] ??= []).push({ label: template.name, value: template.id });
        return acc;
      },
      {} as Record<string, { label: string; value: string }[]>,
    ),
  ).map(([manufacturer, items]) => ({ group: manufacturer, items }));

  const [newTemplateId, setNewTemplateId] = useState<string | null>(null);
  const newTemplate = libraryTemplates.find((t) => t.id === newTemplateId);
  const [newModeId, setNewModeId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState<number>(1);

  const onAddFixtures = async () => {
    if (!newTemplate || !newModeId || newCount < 1) return;
    try {
      // Copy the template into the event first, so the new fixtures' fixtureTemplateId/modeId resolve.
      // The server only adds templates the event doesn't have yet, so this is safe to send every time.
      await updateEvent({ eventId, req: { fixtureTemplateIds: [newTemplate.id] } });

      const fixture: UpsertPatchedFixture = {
        eventId,
        name: `${newTemplate.manufacturer} ${newTemplate.name}`,
        fixtureTemplateId: newTemplate.id,
        modeId: newModeId,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
      };
      await upsertPatchedFixtures(Array.from({ length: newCount }, () => ({ ...fixture })));

      setNewCount(1); // keep the template and mode picked, so adding more of the same is quick
    } catch {
      // api errors handled by api.ts
    }
  };

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
            <Group gap="xs" mb="md" wrap="nowrap" align="flex-end">
              <Select
                disabled={isFixtureTemplatesLoading}
                placeholder="Select a fixture model"
                data={librarySelectData}
                searchable
                flex={1}
                rightSection={isFixtureTemplatesLoading ? <Loader size="xs" type="bars" /> : undefined}
                value={newTemplateId}
                onChange={(id) => {
                  setNewTemplateId(id);
                  // the old mode belongs to the previous template; default to the new one's first mode
                  setNewModeId(libraryTemplates.find((t) => t.id === id)?.modes[0]?.id ?? null);
                }}
              />
              <Select
                w="8rem"
                data={newTemplate ? newTemplate.modes.map((mode) => ({ value: mode.id, label: mode.name })) : []}
                placeholder="Mode"
                disabled={!newTemplate}
                allowDeselect={false}
                value={newModeId}
                onChange={setNewModeId}
              />
              <NumberInput w="4rem" value={newCount} onChange={(v) => setNewCount(Number(v) || 1)} min={1} />
              <Button
                variant="light"
                onClick={onAddFixtures}
                disabled={!newTemplate || !newModeId}
                loading={isUpdateEventPending || isUpsertFixturesPending}
              >
                Add
              </Button>
            </Group>
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
