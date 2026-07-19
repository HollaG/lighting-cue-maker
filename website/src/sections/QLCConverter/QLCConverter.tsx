import { Container, Divider, SimpleGrid, Stack, Text } from "@mantine/core";
import { useAppContext } from "../../context/AppContext";

export const QLCConverter = () => {
  const { event } = useAppContext();
  console.log(event);
  return (
    <Container size={"xl"}>
      <Divider my="lg" label="configure this event for QLC+ export" labelPosition="center" />
      <SimpleGrid cols={3}>
        <Stack>
          <Stack gap={0}>
            <Text> Configured attribute options </Text>
            <Text> Note: string inputs are not available for automatic configuration</Text>
          </Stack>
        </Stack>

        <Stack>
          <Stack gap={0}>
            <Text> Available QLC+ functions </Text>
            <Text>
              {" "}
              For each possible attribute value, select a corresponding QLC+ function. For example, for Spots--
              {">Intensity>100"}, select the function that sets the Spots fixture group's intensity to full
            </Text>
          </Stack>
        </Stack>

        <Stack>
          <Stack gap={0}>
            <Text> Output in QLC </Text>
            <Text>
              Preview the output of each cue in QLC+. Each cue will be saved as a collection of applicable functions.
            </Text>
          </Stack>
        </Stack>
      </SimpleGrid>
    </Container>
  );
};
