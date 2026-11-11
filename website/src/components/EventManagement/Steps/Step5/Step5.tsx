import { Center, Container, Grid, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useGetEvent } from "../../../../query-v2/events/useGetEvent";
import { useGetFixtureGroups } from "../../../../query-v2/fixture-groups/useGetFixtureGroups";
import { useUpsertFixtureGroups } from "../../../../query-v2/fixture-groups/useUpsertFixtureGroups";
import { FixtureGroupSelector } from "./FixtureGroupSelector";
import { OptionSetsContainer } from "./OptionSets/OptionSetsContainer";

/** Presets */
export const Step5 = ({ eventId, onDone }: { eventId: string; onDone: () => void }) => {
  const { fixtureGroups, isFixtureGroupsLoading } = useGetFixtureGroups(eventId);
  // const { patchedFixtures, isPatchedFixturesLoading } = useGetPatchedFixtures(eventId);
  const { event } = useGetEvent(eventId);
  const { mutateAsync: upsertFixtureGroups } = useUpsertFixtureGroups(eventId);

  const isLoading = isFixtureGroupsLoading;

  const [selectedFixtureGroupId, setSelectedFixtureGroupId] = useState<string | null>(fixtureGroups[0]?.id ?? null);
  useEffect(() => {
    if (!selectedFixtureGroupId && fixtureGroups.length) {
      setSelectedFixtureGroupId(fixtureGroups[0].id);
    }
  }, [fixtureGroups]);

  // --- This section is controlling the logic for adding new fixture groups. ---------
  // TODO: Decide if we want to stop allowing this functionality here.
  // const fixtureTemplates = event?.fixtureTemplates ?? [];

  // const patchedFixturesGroupedByManufacturer = patchedFixtures.reduce(
  //   (acc, fixture) => {
  //     const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
  //     if (!template) return acc;
  //     (acc[template.manufacturer] ??= []).push(fixture);
  //     return acc;
  //   },
  //   {} as Record<string, PatchedFixture[]>,
  // );

  // const multiselectData = Object.entries(patchedFixturesGroupedByManufacturer).map(([manufacturer, fixtures]) => ({
  //   group: manufacturer,
  //   items: fixtures.map((fixture) => ({ value: fixture.id, label: fixture.name })),
  // }));

  // const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);

  // const onAddGroup = async () => {
  //   if (selectedFixtureIds.length === 0) return;
  //   const group: UpsertFixtureGroup = {
  //     name: "New Group",
  //     fixtureIds: selectedFixtureIds,
  //   };
  //   await upsertFixtureGroups(group);
  //   setSelectedFixtureIds([]);
  // };

  // --- END SECTION ---------
  const fixtureGroup = fixtureGroups.find((g) => g.id === selectedFixtureGroupId);

  if (isLoading)
    return (
      <Center>
        {" "}
        <Loader type="bars" />{" "}
      </Center>
    );
  return (
    <Container>
      <Stack>
        <Title order={4} flex={1}>
          Configure presets
        </Title>
        <Text> Here, you can set up your presets for users to easily configure cues.</Text>

        <Grid>
          <Grid.Col span={3}>
            <Stack>
              {fixtureGroups.map((group) => (
                <FixtureGroupSelector
                  key={group.id}
                  fixtureGroup={group}
                  isGroupSelected={selectedFixtureGroupId === group.id}
                  setIsSelected={() => setSelectedFixtureGroupId(group.id)}
                />
              ))}

              {/* <Divider />
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
              </Group> */}
            </Stack>
          </Grid.Col>
          <Grid.Col span={9}>
            {fixtureGroup ? <OptionSetsContainer fixtureGroup={fixtureGroup} /> : <Text> Not Found </Text>}
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};
