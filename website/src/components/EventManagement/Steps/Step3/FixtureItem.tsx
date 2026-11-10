import { Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { CardBase } from "../../../Cues/CardBase";

export const FixtureItem = ({ fixture, rightSection }: { fixture: PatchedFixture; rightSection?: ReactNode }) => {
  return (
    <CardBase isActive={false}>
      <Stack>
        <Group>
          <Text fw="semibold" flex={1}>
            {fixture.name}
          </Text>
          {rightSection}
        </Group>
      </Stack>
    </CardBase>
  );
};
