import { Box, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import type { SelectedRow } from "../fixtureSelection";

/** Fixtures already saved in the event: same layout as SelectedFixtureRow, but read-only (add-only step). */
export const AlreadySelectedFixtureRow = ({ groupKey, fixtures }: { groupKey: string; fixtures: SelectedRow[] }) => {
  return (
    <Stack gap={"xs"}>
      <Title order={5}>{groupKey}</Title>
      {fixtures.map((fixture) => (
        <Group key={`${fixture.template.id}:${fixture.modeId}`} align="center">
          <Text
            style={{
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            flex={1}
          >
            {fixture.template.name}{" "}
          </Text>
          <Text span c="dimmed">
            {fixture.modeName}
          </Text>
          <Box style={{ width: "4rem" }}>
            <NumberInput value={fixture.count} disabled />
          </Box>
        </Group>
      ))}
    </Stack>
  );
};
