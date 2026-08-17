import { Box, Button, Center, Container, Flex, Group, Loader, Scroller, Stack, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query/useGetEvent";

import { useGetOrCreateVisualiser } from "../../query/useGetOrCreateVisualiser";

import { StagePreview2D } from "../../components/Visualiser/Stage/2D/StagePreview2D";
import { VisualisationFixtureGroupCard } from "../../components/Visualiser/Controls/VisualiserControl";
import { useGetFixturesByEventId } from "../../query/useGetFixtures";

export const UpdateVisualisationPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/visuals/update/" });

  const { event } = useGetEvent({ eventId });
  const { visualiser } = useGetOrCreateVisualiser({ eventId });

  const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

  const navigate = useNavigate();

  return (
    <Box>
      {/* <Box style={{ width: "100%" }}> */}
      <Container size="xl" mt="4rem">
        <Group mb="2rem" style={{ width: "stretch" }}>
          <Box>
            <Button
              type="button"
              leftSection={<IconArrowLeft width="1rem" />}
              variant="transparent"
              onClick={() => navigate({ to: `/events/${eventId}` })}
            >
              Back to event
            </Button>
          </Box>
        </Group>
      </Container>
      {/* </Box> */}
      {event && visualiser ? (
        // <Box style={{ width: "100%" }}>
        <Container mt="2rem" size="xl">
          <Stack style={{ position: "relative", width: "100%" }}>
            <Title>
              Create visualisation for <span style={{ textDecoration: "underline" }}>{event?.name}</span>
            </Title>

            {/* <Scroller>
              <Group style={{ flexWrap: "nowrap" }}>
                {event.fixtureGroups.map((fixtureGroup, index) => (
                  <VisualisationFixtureGroupCard key={fixtureGroup.id} fixtureGroup={fixtureGroup} index={index} />
                ))}
              </Group>
            </Scroller> */}
          </Stack>
        </Container>
      ) : (
        // </Box>
        <Center>
          <Loader />{" "}
        </Center>
      )}
      <Container mt="2rem" fluid style={{ width: "100%", maxHeight: "85vh" }}>
        <Box>
          {event && visualiser && fixtures ? (
            <StagePreview2D
              eventId={eventId}
              visualiser={visualiser}
              fixtures={fixtures}
              fixtureGroups={event.fixtureGroups}
            />
          ) : null}
        </Box>
      </Container>
    </Box>
  );
};
