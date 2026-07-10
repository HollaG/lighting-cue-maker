import { Accordion, Box, Button, Collapse, Container, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core"

export const HomeHeader = ({ show }: { show: boolean }) => {
  return <Collapse expanded={show}>
    <Container mt="6rem">
      <Stack>

        <Title> Lighting Cue Maker </Title>
        <Text> Create cues and play in seconds </Text>

        <Box>

          <Button> Create a new event</Button>
        </Box>
      </Stack>
    </Container>
  </Collapse>
}