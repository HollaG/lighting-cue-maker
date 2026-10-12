import { Accordion, Checkbox, Group, Stack, Text } from "@mantine/core";
import type { QLCEventJson } from "../../types/qlc";
import { useGetItems } from "../../query/item/useGetItems";
import type { GroupedFnList } from "./QLCConverter";
import { QLCFunctionListPreview } from "./QLCFunctionListPreview";

export const QLCEventPreview = ({
  qlcEvent,
  code,
  groupedFnList,
  enabledItems,
  setEnabledItems,
  addFunctionsToCue,
  removeFunctionFromCue,
}: {
  qlcEvent: QLCEventJson;
  code: string;
  groupedFnList: GroupedFnList;
  enabledItems: string[];
  setEnabledItems: (ids: string[]) => void;
  addFunctionsToCue?: (itemId: string, cueIndex: number, functionIds: string[]) => void;
  removeFunctionFromCue: (itemId: string, cueIndex: number, functionId: string) => void;
}) => {
  const itemsMap = Object.entries(qlcEvent);
  const { items } = useGetItems({ eventId: code });
  if (itemsMap.length === 0) return null;

  return (
    <Checkbox.Group value={enabledItems} onChange={setEnabledItems}>
      <Accordion order={3} variant="separated">
        {itemsMap.map(([itemId, cues]) => (
          <Accordion.Item value={itemId} key={itemId}>
            <Accordion.Control>
              <Group style={{ paddingRight: "2rem" }}>
                <Text style={{ flex: 1 }}> {items?.find((i) => i.id === itemId)?.name}</Text>
                <Checkbox
                  value={itemId}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  label="Include in export"
                />
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                {cues.map((cue, index) => (
                  <QLCFunctionListPreview
                    key={cue.cue.id}
                    cue={cue}
                    itemId={itemId}
                    index={index}
                    groupedFnList={groupedFnList}
                    addFunctionsToCue={addFunctionsToCue}
                    removeFunctionFromCue={removeFunctionFromCue}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Checkbox.Group>
  );
};
