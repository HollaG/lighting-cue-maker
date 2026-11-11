import { Box, Divider, Group, SimpleGrid, Stack, Title, Tooltip } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import { useGetOptionSets } from "../../../../../query-v2/option-sets/useGetOptionSets";
import { useUpsertOptionSets } from "../../../../../query-v2/option-sets/useUpsertOptionSets";
import type { FixtureGroup } from "../../../../../types-v2/fixtureGroups";
import { OptionSetSelectionType, OptionSetType, type UpsertOptionSet } from "../../../../../types-v2/optionSet";
import {
  getPremadeSelectablesForOptionSetType,
  MAX_COUNTS,
  optionSetTypeRequired,
  optionSetTypeToDescription,
  optionSetTypeToName,
  shouldDisableAdding,
} from "../../../../../utils/optionSets";
import { OptionSetContainer } from "./OptionSetContainer";
import { OptionSetCreateOption } from "./OptionSetCreateOption";
import { popTransition } from "../../../../../utils/animations";

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
          transitionProps={popTransition}

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
          disabledReason={limitReason(OptionSetType.INTENSITY, "intensity")}
        />
        <OptionSetCreateOption
          header="Colour (fixed)"
          description="Allow choosing from a fixed set of colours"
          onClick={() => onAddOptionSet(OptionSetType.COLOUR)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.COLOUR)}
          disabledReason={limitReason(OptionSetType.COLOUR, "colour")}
        />
        <OptionSetCreateOption
          header="Positions"
          description="Allow choosing a fixed set of positions"
          onClick={() => onAddOptionSet(OptionSetType.POSITION)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.POSITION)}
          disabledReason={limitReason(OptionSetType.POSITION, "position")}
        />
        <OptionSetCreateOption
          header="Custom"
          description="Set any value directly using DMX values"
          onClick={() => onAddOptionSet(OptionSetType.CUSTOM)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.CUSTOM)}
          disabledReason={limitReason(OptionSetType.CUSTOM, "custom")}
        />

        <OptionSetCreateOption
          header="Single select"
          description="Create generic selection sets that don't affect the visualiser."
          onClick={() => onAddOptionSet(OptionSetType.VALUELESS)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.VALUELESS)}
          disabledReason={limitReason(OptionSetType.VALUELESS, "single select")}
        />
        {/* <OptionSetCreateOption
          header="Multi select"
          description="Create generic selection sets that don't affect the visualiser."
          onClick={() => onAddOptionSet(OptionSetType.CUSTOM)}
          disabled={shouldDisableAdding(optionSets, OptionSetType.CUSTOM)}
        /> */}
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

/** Tooltip text for an option set type that has reached its MAX_COUNTS limit. */
const limitReason = (type: OptionSetType, label: string): string => {
  const max = MAX_COUNTS[type];
  return `Cannot add more than ${max} ${label} option set${max > 1 ? "s" : ""}`;
};
