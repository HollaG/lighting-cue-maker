import { useState, useMemo } from "react";
import { Button, Center, FloatingIndicator, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import type { Item } from "../../types/types";
import classes from "./ItemSelect.module.css";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

interface ItemSelectProps {
  items: Item[];
  eventId: string | null;
  refetchItems: (options?: RefetchOptions) => Promise<QueryObserverResult<NoInfer<Item[]>, Error>>;
}

export const ItemSelect = ({ items, eventId, refetchItems }: ItemSelectProps) => {
  const activeItemId = useAppStore((s) => s.activeItemId);
  const changeActiveItem = useAppStore((s) => s.changeActiveItem);
  const itemName = useAppStore((s) => s.itemName);
  const setItemName = useAppStore((s) => s.setItemName);
  const onAddItem = useAppStore((s) => s.onAddItem);

  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({});

  const setControlRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (controlsRefs[id] !== node) {
      setControlsRefs((prev) => ({ ...prev, [id]: node }));
    }
  };

  const controls = useMemo(() => {
    return items.map((item) => (
      <UnstyledButton
        key={item.id}
        className={classes.control}
        ref={setControlRef(item.id)}
        onClick={() => changeActiveItem(item.id)}
        mod={{ active: activeItemId === item.id }}
        p={"xs"}
      >
        <span className={classes.controlLabel}>{item.name}</span>
      </UnstyledButton>
    ));
  }, [items, activeItemId, changeActiveItem]);

  if (items.length !== 0) {
    return (
      <>
        {/* <Group justify="center"> */}
        <div className={classes.root} ref={setRootRef}>
          {controls}

          <FloatingIndicator
            target={activeItemId ? controlsRefs[activeItemId] : null}
            parent={rootRef}
            className={classes.indicator}
          />
        </div>

        <Center mt="sm">
          <Text size="sm"> Please select an item, or add a new item/band/act: </Text>
          <TextInput
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            ml={"md"}
            placeholder="Your item name"
            rightSectionWidth={"80px"}
            rightSection={
              <Button size="xs" variant="transparent" onClick={() => onAddItem(eventId, refetchItems)}>
                Add item
              </Button>
            }
          />
        </Center>
      </>
    );
  }

  return (
    <Center mt={"xl"}>
      <Stack>
        <Text size="sm"> to get started, enter your item/band/act&apos;s name: </Text>
        <TextInput
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          ml={"md"}
          placeholder="Your item name"
          rightSectionWidth={"80px"}
          rightSection={
            <Button size="xs" variant="transparent" onClick={() => onAddItem(eventId, refetchItems)}>
              Add item
            </Button>
          }
        />
      </Stack>
    </Center>
  );
};
