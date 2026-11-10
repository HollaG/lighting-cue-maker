import { Button } from "@mantine/core";
import type { FixtureGroup } from "../../../../types-v2/fixtureGroups";

/** Helper component to render the left list of fixture groups */
export const FixtureGroupSelector = ({
  fixtureGroup,
  isGroupSelected,
  setIsSelected,
}: {
  fixtureGroup: FixtureGroup;
  isGroupSelected: boolean;
  setIsSelected: () => void;
}) => {
  return (
    <Button variant={isGroupSelected ? "light" : "subtle"} onClick={setIsSelected} justify="flex-start" fullWidth>
      {fixtureGroup.name} ({fixtureGroup.fixtureIds.length} fixtures)
    </Button>
  );
};
