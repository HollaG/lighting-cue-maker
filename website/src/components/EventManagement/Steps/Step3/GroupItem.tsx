import { Button, Divider, Group, MultiSelect, Stack, Textarea } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useState } from "react";
import { useDeleteFixtureGroup } from "../../../../query-v2/fixture-groups/useDeleteFixtureGroup";
import { useUpsertFixtureGroups } from "../../../../query-v2/fixture-groups/useUpsertFixtureGroups";
import type { FixtureGroup, UpsertFixtureGroup } from "../../../../types-v2/fixtureGroups";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { CardBase } from "../../../Cues/CardBase";
import { CustomTextInput } from "../../../CustomTextInput/CustomTextInput";
import { FixtureItem } from "./FixtureItem";

export const GroupItem = ({
  group,
  multiselectData,
  eventId,
  fixtures,

  isSelected,
  setIsSelected,
}: {
  eventId: string;
  group: FixtureGroup;
  fixtures: PatchedFixture[];
  multiselectData: {
    group: string;
    items: {
      value: string;
      label: string;
    }[];
  }[];

  isSelected: boolean;
  setIsSelected: () => void;
}) => {
  const [selectedNewFixtureIds, setSelectedNewFixtureIds] = useState<string[]>([]);

  const { mutateAsync: deleteFixtureGroup } = useDeleteFixtureGroup(eventId);
  const { mutateAsync: upsertFixtureGroups, isPending: isUpserting } = useUpsertFixtureGroups(eventId);

  // handle saving the text fields
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);

  const saveName = useDebouncedCallback(
    (name: string) => {
      if (name.trim() === "") return; // don't save empty names
      void upsertFixtureGroups([{ ...group, name }]);
    },
    { delay: 600, flushOnUnmount: true }, // leaving the step mid-typing still saves
  );

  const saveDescription = useDebouncedCallback(
    (description: string) => {
      if (description.trim() === "") return; // don't save empty names

      void upsertFixtureGroups([{ ...group, description }]);
    },
    { delay: 600, flushOnUnmount: true },
  );

  // filter out fixtures that are already in the group, so the user can't add them again
  const filteredMultiselectData = multiselectData.map((optionGroup) => ({
    ...optionGroup,
    items: optionGroup.items.map((item) => ({ ...item, disabled: group.fixtureIds.includes(item.value) })),
  }));

  const onAddFixturesToGroup = async () => {
    const updatedGroup: UpsertFixtureGroup = {
      ...group,
      fixtureIds: [...group.fixtureIds, ...selectedNewFixtureIds],
    };
    await upsertFixtureGroups([updatedGroup]);

    // clear the selection so the user can add more fixtures
    setSelectedNewFixtureIds([]);
    setIsSelected(); // select the group when the user adds fixtures
  };

  const onRemoveFixtureFromGroup = async (fixtureId: string) => {
    const updatedGroup: UpsertFixtureGroup = {
      ...group,
      fixtureIds: group.fixtureIds.filter((id) => id !== fixtureId),
    };
    await upsertFixtureGroups([updatedGroup]);
    setIsSelected(); // select the group when the user removes fixtures
  };

  return (
    <CardBase isActive={isSelected}>
      <Stack gap="xs">
        <Group>
          {/* <Text fw="semibold">{gr.name}</Text> */}
          <CustomTextInput
            placeholder="Group name"
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              saveName(e.currentTarget.value);
              setIsSelected(); // select the group when the user starts typing
            }}
            onBlur={() => saveName.flush()} // save right away when the field loses focus
            flex={1}
          />
          <Button variant={isSelected ? "light" : "subtle"} size="xs" onClick={() => setIsSelected()}>
            Manage grid
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={() => {
              deleteFixtureGroup(group.id);
              setIsSelected(); // deselect the group when it's deleted
            }}
          >
            Delete{" "}
          </Button>
          {/* <Button size="xs" variant="light" loading={isUpserting}>
            {" "}
            Save{" "}
          </Button> */}
        </Group>
        <Textarea
          minRows={1}
          variant="unstyled"
          autosize
          value={description}
          onChange={(e) => {
            setDescription(e.currentTarget.value);
            saveDescription(e.currentTarget.value);
            setIsSelected(); // select the group when the user starts typing
          }}
          onBlur={() => saveDescription.flush()}
          // name="description"
          // key={form.key("description")}
          // {...form.getInputProps("description")}
          placeholder="Description of what this group is for, what it does"
          // styles={{ input: { fontSize: "16px" } }}
        />
        <Divider />
        <Group>
          <MultiSelect
            data={filteredMultiselectData}
            // disabled={isPatchedFixturesLoading}
            placeholder="Pick fixtures"
            searchable
            value={selectedNewFixtureIds}
            onChange={setSelectedNewFixtureIds}
            flex={1}
            size="xs"
          />
          <Button
            variant="subtle"
            size="xs"
            disabled={selectedNewFixtureIds.length === 0}
            onClick={onAddFixturesToGroup}
          >
            Add to group
          </Button>
        </Group>
        <Stack gap="xs">
          {fixtures.map((fixture) => (
            <FixtureItem
              key={fixture.id}
              fixture={fixture}
              rightSection={
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => {
                    onRemoveFixtureFromGroup(fixture.id);
                  }}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </Stack>
      </Stack>
    </CardBase>
  );
};
