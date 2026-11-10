import { Box, Button, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import type { SelectedRow } from "../fixtureSelection";

export const SelectedFixtureRow = ({
  groupKey,
  fixtures,
  onCountChange,
  onDelete,
}: {
  groupKey: string;
  fixtures: SelectedRow[];
  onCountChange: (templateId: string, modeId: string, newCount: number) => void;
  onDelete: (templateId: string, modeId: string) => void;
}) => {
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
            <NumberInput
              value={fixture.count}
              onChange={(e) => onCountChange(fixture.template.id, fixture.modeId, Number(e))}
              min={1}
            />
          </Box>
          <Button color="red" variant="subtle" onClick={() => onDelete(fixture.template.id, fixture.modeId)}>
            Delete
          </Button>
        </Group>
      ))}
    </Stack>
  );
};
