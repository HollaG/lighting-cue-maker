import {
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  Group,
  Scroller,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { useAppContext } from "../../context/AppContext";
import { useState } from "react";
import { useRequest } from "../../hooks/useRequest";
import { useFetch } from "../../hooks/useFetch";

export const ChoreoEventWrapper = () => {
  const { isValidEvent, event } = useAppContext();

  const [itemName, setItemName] = useState("");

  const { executeRequest: createItem } = useRequest<{ name: string }>(`/api/v1/events/${event.id}/items`, "POST")
  const { data } = useFetch(`/api/v1/events/${event.id}/items`, isValidEvent)
  console.log({ data })
  const onAddItem = async () => {
    const res = await createItem({ name: itemName });
  };

  return (
    <Collapse expanded={isValidEvent}>
      <Container size={"xl"}>
        <Divider my="lg" label="create your lighting plan" labelPosition="center" />
        <Scroller>
          <Group gap={"xs"} wrap="nowrap">
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              after now
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              before now
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              horses
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              exco band
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {" "}
              MY DAWGS
            </Button>
          </Group>
        </Scroller>
        <Center mt={"md"}>
          <Text size="sm"> or add a new item/band/act: </Text>
          <TextInput
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            size="sm"
            ml={"md"}
            placeholder="Your item name"
            rightSectionWidth={"80px"}
            rightSection={
              <Button size="xs" variant="transparent" onClick={onAddItem}>
                Add item
              </Button>
            }
          />
        </Center>
      </Container>
      <SimpleGrid cols={2}>
        <Box></Box>
        <Box></Box>
      </SimpleGrid>
    </Collapse>
  );
};
