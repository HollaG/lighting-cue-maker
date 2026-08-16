import { Box, Button, Center, Container, Group, Loader, Scroller, Stack, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query/useGetEvent";

import type { Fixture } from "../../types/fixtures";
import { useGetOrCreateVisualiser } from "../../query/useGetOrCreateVisualiser";

import { useState } from "react";
import { StagePreview2D, VisualisationFixtureGroupCard } from "../../components/Visualiser/Stage/2D/StagePreview2D";

export const UpdateVisualisationPage = () => {
  const { eventId } = useParams({ from: "/events/$eventId/visuals/update/" });

  const { event } = useGetEvent({ eventId });
  const { visualiser } = useGetOrCreateVisualiser({ eventId });

  const navigate = useNavigate();

  // TODO: decide if we should use one API call then pass the filtered fixtures by fixtureGroupConfigId into <FixtureGroupCard>
  // Get around needing another API call:
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);

  console.log({ allFixtures });
  return (
    <Stack align="center">
      <Container size="xl" mt="4rem">
        <Group mb="2rem">
          <Button
            type="button"
            leftSection={<IconArrowLeft width="1rem" />}
            variant="transparent"
            onClick={() => navigate({ to: `/events/${eventId}` })}
          >
            Back to event
          </Button>
        </Group>
      </Container>
      <Container size="xl">
        {event && visualiser ? (
          <Stack style={{ position: "relative", width: "100%" }}>
            <Title>
              Create visualisation for <span style={{ textDecoration: "underline" }}>{event?.name}</span>
            </Title>

            <Scroller>
              <Group style={{ flexWrap: "nowrap" }}>
                {event.fixtureGroups.map((fixtureGroup, index) => (
                  <VisualisationFixtureGroupCard
                    key={fixtureGroup.id}
                    fixtureGroup={fixtureGroup}
                    index={index}
                    setAllFixtures={setAllFixtures}
                  />
                ))}
              </Group>
            </Scroller>
          </Stack>
        ) : (
          <Center>
            <Loader />{" "}
          </Center>
        )}
      </Container>
      <Container fluid style={{ width: "100%", maxHeight: "85vh" }}>
        <Box>
          {event && visualiser ? (
            <StagePreview2D eventId={eventId} visualiser={visualiser} fixtures={allFixtures} />
          ) : null}
        </Box>
      </Container>
    </Stack>
  );
};
