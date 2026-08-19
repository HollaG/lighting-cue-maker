import { Alert, Box, Button, Center, Container, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useGetEvent } from "../../query/useGetEvent";

import { useGetOrCreateVisualiser } from "../../query/useGetOrCreateVisualiser";

import { StagePreview2D } from "../../components/Visualiser/Stage/2D/StagePreview2D";
import { useGetFixturesByEventId } from "../../query/useGetFixtures";

export const UpdateVisualisationPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/visuals/update/" });

  const { event } = useGetEvent({ eventId });
  const { visualiser } = useGetOrCreateVisualiser({ eventId });
  const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

  const navigate = useNavigate();

  const { from } = useSearch({ from: "/events/$eventId/visuals/update/" });

  return (
    <Box>
      {/* <Box style={{ width: "100%" }}> */}
      <Container size="xl" mt="4rem">
        <Group mb="2rem" style={{ width: "stretch" }}>
          <Box>
            {from === "create" ? (
              <Button
                type="button"
                leftSection={<IconArrowLeft width="1rem" />}
                variant="transparent"
                onClick={() => navigate({ to: `/events/${eventId}` })}
              >
                Back to event
              </Button>
            ) : (
              <Button
                type="button"
                leftSection={<IconArrowLeft width="1rem" />}
                variant="transparent"
                onClick={() => navigate({ to: `/events/${eventId}/edit` })}
              >
                Back to edit event
              </Button>
            )}
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
            <Alert title="Usage guide" icon={<IconInfoCircle />}>
              <Stack>
                <Text>
                  {" "}
                  Add fixtures for each fixture group and set their orientation, as given by the arc. Users will see
                  these fixtures and can interact with them to set up the cue.{" "}
                </Text>
                <Text>
                  Add stage elements for any physical stage objects (e.g. the stage itself) that you want to represent.
                </Text>
                <Text>
                  Once you've added all your objects, position the viewport how you want users to see it, then click
                  "Save viewport". The dashed rectangle represents the viewport that users will see.
                </Text>
                <Text>You can also zoom in/out to change the scale of the viewport.</Text>
              </Stack>
            </Alert>

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
