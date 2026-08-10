import { Box, Button, Center, Container, Group, Popover, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { CustomTextInput } from "../components/CustomTextInput/CustomTextInput";
import { api } from "../lib/api";
import classes from "./HomePage.module.css";
import { Features } from "../sections/Features/Features";
import type { GetEventRes } from "../types/http";
import { notifications } from "../utils/notifications";
import { formatDate, getRecentEvents, type RecentEvent } from "../utils/recentEvents";

export const HomePage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [recentEvents] = useState<RecentEvent[]>(getRecentEvents());

  const onEnterEvent = async () => {
    if (code.length === 36) {
      const res = await api.get<GetEventRes>(`/api/v1/events/${code}`);
      if (res.event) {
        navigate({ to: "/events/create" });
        return;
      }
    }

    notifications.show({
      title: "Event not found",
      message: "The event code you entered does not exist. Please check the code and try again.",
      color: "red",
    });
  };

  return (
    <>
      <Container mt="6rem" size="lg" mb="3rem">
        <Stack gap="3rem" align="center">
          <Center>
            <Title fz="4rem" className={classes.header} order={1} fw="900">
              Lighting Cue Maker
            </Title>
          </Center>
          <Center>
            <Text fz="2rem" style={{ textAlign: "center" }}>
              Your all-in-one solution for creating and <br />
              managing lighting cues
            </Text>
          </Center>

          <Center>
            <Group gap={0} wrap="nowrap">
              <Button
                leftSection={<IconPlus width="2rem" />}
                color="lime.9"
                onClick={() => navigate({ to: "/events/create" })}
                mr="md"
                size="xl"
              >
                Create new event
              </Button>
              <Popover position="bottom" withArrow shadow="md" withOverlay width={500}>
                <Popover.Target>
                  <Button variant="transparent" size="xl">
                    Have a code?
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        onEnterEvent();
                      }}
                    >
                      <Group>
                        <Box flex={1}>
                          <CustomTextInput
                            required
                            label="Event code"
                            placeholder="Type code here..."
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                          />
                        </Box>
                        <Button variant="subtle" type="submit">
                          Enter
                        </Button>
                      </Group>
                    </form>

                    <Text fz="sm" fw="600">
                      Past events
                    </Text>
                    {recentEvents.map((event) => (
                      <Button
                        key={event.eventId}
                        display="flex"
                        style={{ height: "fit-content" }}
                        styles={{ inner: { width: "stretch", justifyContent: "space-between" } }}
                        w="full"
                        variant="white"
                        color="black"
                        rightSection={<IconArrowRight width="1rem" />}
                        onClick={() => navigate({ to: "/events/$eventId", params: { eventId: event.eventId } })}
                      >
                        <Stack align="start" flex={1} style={{ width: "100%" }} gap={0}>
                          <Text fw="600">{event.eventName}</Text>
                          <Text c="dimmed">{formatDate(event.lastOpenedAt)}</Text>
                        </Stack>
                      </Button>
                    ))}
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Group>
          </Center>
        </Stack>
      </Container>

      <Features />
    </>
  );
};
