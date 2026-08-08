import { Box, Button, Divider, Group, MultiSelect, Stack, Text } from "@mantine/core";
import type { QLCFunction } from "../../types/qlc";
import type { Cue } from "../../types/cues";
import type { GroupedFnList } from "./QLCConverter";
import { notifications } from "../../utils/notifications";
import { useState } from "react";
import { generateOneLineCue } from "../../utils/cueUtils";
import { useGetEvent } from "../../query/useGetEvent";
import { useAppStore } from "../../store/appStore";

export const QLCFunctionListPreview = ({
  cue,
  itemId,
  index,
  groupedFnList,
  addFunctionsToCue,
  removeFunctionFromCue,
}: {
  cue: { cue: Cue; qlcFunctions: QLCFunction[] };
  itemId: string;
  index: number;
  groupedFnList: GroupedFnList;
  addFunctionsToCue?: (itemId: string, cueIndex: number, functionIds: string[]) => void;
  removeFunctionFromCue: (itemId: string, cueIndex: number, functionId: string) => void;
}) => {
  const code = useAppStore((s) => s.code);
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const { event } = useGetEvent({ eventId: code });

  const handleAdd = () => {
    if (selectedFunctionIds.length === 0) return;
    addFunctionsToCue?.(itemId, index, selectedFunctionIds);
    setSelectedFunctionIds([]);
  };

  if (!event) return <></>;

  return (
    <Stack gap={"sm"}>
      <Group>
        <Text fw="bold" flex={1}>
          Cue {index + 1}
        </Text>{" "}
        <Text>{generateOneLineCue(cue.cue, event?.fixtureGroups)}</Text>
      </Group>
      <Divider />
      <Stack px="sm" gap="xs">
        {cue.qlcFunctions.map((qlcFunction) => (
          <Group key={`${cue.cue.id}-${qlcFunction.Name ?? qlcFunction.ID}`}>
            <Text flex={1}>{qlcFunction.Name}</Text>

            <Button
              size="sm"
              variant="transparent"
              color="red"
              onClick={() => {
                if (!qlcFunction.ID) {
                  notifications.show({
                    title: "Function ID not found",
                    message: "Please manually delete the function in QLC+",
                    color: "red",
                  });
                  return;
                }
                removeFunctionFromCue(itemId, index, qlcFunction.ID);
              }}
            >
              Delete
            </Button>
          </Group>
        ))}
        <Group align="end">
          <Box flex={1}>
            <MultiSelect
              size="sm"
              searchable
              data={groupedFnList}
              width={"100%"}
              label="Add more functions"
              placeholder="Select one or more QLC+ functions..."
              value={selectedFunctionIds}
              onChange={setSelectedFunctionIds}
            />
          </Box>
          <Button variant="subtle" size="sm" onClick={handleAdd}>
            Add
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
};
