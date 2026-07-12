import { Accordion, Box, Button, Collapse, Container, Group, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core"

import classes from "./HomeHeader.module.css"
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput"

export const HomeHeader = ({ show }: { show: boolean }) => {
  return <Collapse expanded={show}>
    <Container mt="6rem">
      <Stack>

        <Title className={classes.header}> Lighting Cue Maker </Title>
        <Stack gap={0}>
          <Group>
            <Text className={classes.subHeader}> Create unified cue sheets </Text>
          </Group>
          <Group>
            <Text className={classes.subHeader}> Visually intuitive cue markings </Text>
          </Group>
          <Group>
            <Text className={classes.subHeader}> Export to QLC+ </Text>
          </Group>
        </Stack>

        <Box my={2}></Box>

        <Group>
          <CustomTextInput
            label="Have an event code?"
            placeholder="Input placeholder"
          />
          <Box>
            <Button variant="subtle"> Open event </Button>
          </Box>
        </Group>
      </Stack>
    </Container>
  </Collapse>
}