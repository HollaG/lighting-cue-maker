import { Accordion, Box, Button, Center, Collapse, Container, Group, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core"

import classes from "./HomeHeader.module.css"
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput"
import { useEffect, useState } from "react"
import { useAppContext } from "../../context/AppContext"

export const HomeHeader = () => {
  const { code, setCode } = useAppContext()

  return <Collapse expanded={true}>
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

        <Center>
          <Stack style={{ alignItems: 'center' }}>
            <Title order={4}>Have an event code? </Title>

            <Box style={{
              minWidth: "40em",
              // maxWidth: "80%"
            }}>
              <CustomTextInput
                // variant="filled"
                size="lg"
                // label="Have an event code?"
                placeholder="Paste or type code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                styles={{
                  input: {
                    textAlign: 'center'
                  }
                }}
              />
            </Box>
            {/* <Box>
            <Button variant="subtle"> Open event </Button>
          </Box> */}
          </Stack>

        </Center>
        <Box my={2}></Box>
      </Stack>
    </Container>
  </Collapse>
}