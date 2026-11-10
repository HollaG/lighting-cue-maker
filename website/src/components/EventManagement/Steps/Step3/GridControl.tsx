import { Box, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import { CardBase } from "../../../Cues/CardBase";

// TODO: come back here once done with the main flow
export const GridControl = () => {
  return (
    <CardBase isActive={false}>
      <Stack gap="xs">
        <Group>
          <Title order={5} flex={1}>
            Grid{" "}
          </Title>
          <Group gap="xs">
            <Text> Rows </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput defaultValue={1} min={1} />
            </Box>
            <Text> x Cols </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput defaultValue={1} min={1} />
            </Box>
          </Group>
        </Group>
        <Text c="dimmed" fz="sm">
          Used to apply effect patterns. Don't bother if you don't need accurate visualisations for dynamic
          effects.{" "}
        </Text>
      </Stack>
    </CardBase>
  );
};
