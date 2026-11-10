import { Divider, Group, SimpleGrid, Stack, Title, Tooltip } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import { useGetOptionSets } from "../../../../../query-v2/option-sets/useGetOptionSets";
import { useUpsertOptionSets } from "../../../../../query-v2/option-sets/useUpsertOptionSets";
import type { FixtureGroup } from "../../../../../types-v2/fixtureGroups";
import { OptionSetSelectionType, OptionSetType, type UpsertOptionSet } from "../../../../../types-v2/optionSet";
import {
  getPremadeSelectablesForOptionSetType,
  optionSetTypeRequired,
  optionSetTypeToDescription,
  optionSetTypeToName,
  shouldDisableAdding,
} from "../../../../../utils/optionSets";
import { OptionSetContainer } from "./OptionSetContainer";
import { OptionSetCreateOption } from "./OptionSetCreateOption";

export const OptionSetsContainer = ({ fixtureGroup }: { fixtureGroup: FixtureGroup }) => {
  const { optionSets } = useGetOptionSets(fixtureGroup.eventId, fixtureGroup.id);
  const { mutateAsync: upsertOptionSets } = useUpsertOptionSets(fixtureGroup.eventId, fixtureGroup.id);

  const onAddOptionSet = async (type: OptionSetType) => {
    // todo isAllowedOptionSetType
    const optionSet: UpsertOptionSet = {
      name: optionSetTypeToName(type),
      description: optionSetTypeToDescription(type),
      sortOrder: optionSets.length,
      priority: 0,
      selectionType: OptionSetSelectionType.SINGLE,
      type,
      selectables: getPremadeSelectablesForOptionSetType(type),
      defaultSelectableIds: [],
      required: optionSetTypeRequired(type), // remmeber, this is a soft require not hard
    };

    await upsertOptionSets([optionSet]);
  };

  return (
    <Stack>
      <Group>
        <Title order={5}> Add new option sets</Title>
        <Tooltip
          multiline
          w={400}
          withArrow
          transitionProps={{ transition: "pop", duration: 100 }}

          label="Users can select one (or multiple) options from these sets when configuring. For example, a colour option set can have red, green, and blue as options."
        >
          <IconHelpCircle size={16} />
        </Tooltip>
      </Group>
      <SimpleGrid cols={3}>
        <OptionSetCreateOption
          header="Intensity"
          description="Allow adjusting intensity of the lights in the group"
          onClick={() => onAddOptionSet(OptionSetType.INTENSITY)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.INTENSITY)}
        />
        <OptionSetCreateOption
          header="Colour (fixed)"
          description="Allow choosing from a fixed set of colours"
          onClick={() => onAddOptionSet(OptionSetType.COLOUR)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.COLOUR)}
        />
        <OptionSetCreateOption
          header="Positions"
          description="Allow choosing a fixed set of positions"
          onClick={() => onAddOptionSet(OptionSetType.POSITION)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.POSITION)}
        />
        <OptionSetCreateOption
          header="Custom"
          description="Set any value directly using DMX values"
          onClick={() => onAddOptionSet(OptionSetType.CUSTOM)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.CUSTOM)}
        />
      </SimpleGrid>
      <Divider />
      <Stack>
        {optionSets.map((optionSet) => (
          <OptionSetContainer
            key={optionSet.id}
            optionSet={optionSet}
            eventId={fixtureGroup.eventId}
            fixtureGroupId={fixtureGroup.id}
          />
        ))}
      </Stack>
    </Stack>
  );
};
