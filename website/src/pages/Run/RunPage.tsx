import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetEvent } from "../../query/useGetEvent";
import { useGetItems } from "../../query/useGetItems";
import { useGetItem } from "../../query/useGetItem";
import { useEffect, useMemo, useState } from "react";
import { useGetCues } from "../../query/useGetCues";
import { useGetOrCreateVisualiser } from "../../query/useGetOrCreateVisualiser";
import { useGetFixturesByEventId } from "../../query/useGetFixtures";
import { Accordion, Box, Button, Divider, Flex, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useFullscreenDocument } from "@mantine/hooks";

import classes from "./RunPage.module.css";
import { CueControls } from "../../components/RunPageComponents/CueControls";
import { ItemControls } from "../../components/RunPageComponents/ItemControls";
import { getCueOrder } from "../../utils/cue/cueForm";
import type { Item } from "../../types/types";
import { RichContent } from "../../components/RichContent/RichContent";
import { generateRich } from "../../utils/convertText";
import { StaticStagePreview2D } from "../../components/Visualiser/Stage/2D/StagePreview2D";
import { CustomCoverLoader } from "../../components/Loader/CustomCoverLoader";
import { IconArrowLeft, IconMinimize } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import type { Cue } from "../../types/cues";
import { FixtureGroupSection } from "../../components/Cues/FixtureGroupSection";

export const RunPage = () => {
  const { eventId } = useParams({
    from: "/events/$eventId/run/",
  });

  const [itemId, setItemId] = useState<string | null>(null);

  const { event } = useGetEvent({ eventId });
  const { items, isItemsLoading } = useGetItems({ eventId });
  const { item } = useGetItem({ itemId: itemId ?? undefined });
  const { cues } = useGetCues({ itemId: itemId ?? undefined });
  const { visualiser } = useGetOrCreateVisualiser({ eventId });
  const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

  const navigate = useNavigate();

  console.log(items, isItemsLoading);

  // head into fullscreen on page load
  const { toggle, fullscreen } = useFullscreenDocument();
  useEffect(() => {
    if (!fullscreen) {
      toggle();
    }
  }, []); // skip the fullscreen dep

  // --- State controls for the run mode ---------

  // TODO: decide if want to sync to the existing store
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(0);

  const cueOrder = useMemo(() => (item?.rawLyrics ? getCueOrder(item?.rawLyrics) : []), [item?.rawLyrics]);
  const currentCue = useMemo(
    () => (cues && cues.length > 0 ? cues.find((cue) => cue.id === cueOrder[currentCueIndex]) : undefined),
    [cues, currentCueIndex, cueOrder],
  );
  const nextCue = useMemo(
    () => (cues && cues.length > 0 ? cues.find((cue) => cue.id === cueOrder[currentCueIndex + 1]) : undefined),
    [cues, currentCueIndex, cueOrder],
  );

  const onSelectCue = (cueIndex: number) => {
    setCurrentCueIndex(cueIndex);

    // Scroll into view
    // NOT for when selecting via the RichContent, only by the button controls
    const newCurrentCue = cues?.find((cue) => cue.id === cueOrder[cueIndex]);
    if (newCurrentCue) {
      const cueId = newCurrentCue.id;
      const element = document.getElementById(`ref-${cueId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const onSelectCueId = (cueId: string) => {
    const index = cueOrder?.findIndex((c) => c === cueId);
    if (index !== undefined && index >= 0) {
      setCurrentCueIndex(index);
    }
  };

  const onSelectItem = (item: Item) => {
    setItemId(item.id);
    setCurrentCueIndex(0); // reset cue index when changing items
  };

  const returnToEvent = () => {
    navigate({ to: `/events/${eventId}` });
  };

  // --- Cue information ---------
  // --- Form ---------
  const initialValues: Cue = useMemo(
    () => ({
      assignments: {},
      comments: "",
      createdAt: new Date(),
      deletedAt: new Date(),
      id: "",
      updatedAt: new Date(),
    }),
    [],
  );
  const form = useForm<Cue>({
    mode: "uncontrolled",
    initialValues,
  });

  // watch cue changes and update form values accordingly
  useEffect(() => {
    if (currentCue) {
      form.setValues(currentCue);
    }
  }, [currentCue]);

  return (
    <Flex style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <div className={classes.grid}>
        <div className={classes.lyrics}>
          {itemId ? (
            <Stack>
              <Group>
                <Box>
                  <Button
                    type="button"
                    leftSection={<IconArrowLeft width="1rem" />}
                    variant="transparent"
                    onClick={returnToEvent}
                  >
                    Back to event
                  </Button>
                </Box>
                <Flex flex={1} />
                <Box>
                  <Button
                    type="button"
                    leftSection={<IconMinimize width="1rem" />}
                    variant="transparent"
                    onClick={toggle}
                  >
                    {fullscreen ? "Exit" : "Enter"} fullscreen
                  </Button>
                </Box>
              </Group>
              <Title order={3}>Lyrics</Title>

              <RichContent
                eventId={eventId}
                itemId={itemId}
                content={generateRich(item?.rawLyrics ?? "")}
                setCurrentlySelectedCueId={(cueId: string | undefined) => onSelectCueId(cueId ?? "")}
                currentlySelectedCueId={currentCue?.id}
                indicatorNumber={0} // not used in run mode
                inputMode={"disabled"}
                inputTimingMode={"main"} // not used in run mode
                showCues={false} // disables onclick

                instantAddBumpMode={null}
              />
            </Stack>
          ) : (
            <Stack align="center" justify="center" style={{ height: "stretch" }}>
              <Text> Please select an item!</Text>
              {items && (
                <ItemControls key="select-in-lyrics" items={items} currentItem={item} onSelectItem={onSelectItem} />
              )}
            </Stack>
          )}
        </div>
        <div className={classes.visualiser}>
          {/* TODO: add 3d support */}
          {visualiser && (
            <CustomCoverLoader isLoading={itemId === null} content={<div>Please select a cue!</div>}>
              <Box>
                <StaticStagePreview2D
                  eventId={eventId}
                  visualiser={visualiser}
                  fixtures={fixtures}
                  activeFixtureGroupId={"0"}
                  fixtureGroupsAssignment={currentCue?.assignments ?? {}}
                  isLoading={false}
                  onFixtureSelect={() => {}}
                />

                <Stack
                  style={{
                    position: "absolute",
                    bottom: "1rem",
                    right: "1rem",
                    backgroundColor: "var(--mantine-color-lime-light)",
                    padding: "0.5rem",
                    borderRadius: "0.5rem",
                    align: "end",
                    justify: "end",
                  }}
                  gap="0"
                >
                  <Text style={{ textAlign: "end", fontWeight: "bold" }}>{item?.name}</Text>
                  <Text style={{ textAlign: "end" }}>Cue {currentCueIndex + 1}</Text>
                </Stack>
              </Box>
            </CustomCoverLoader>
          )}
        </div>
        <div className={classes.settings}>
          {event && (
            <Accordion multiple defaultValue={event.fixtureGroups.map((group) => group.id) ?? []}>
              {event.fixtureGroups.map((group, index) => (
                <Accordion.Item key={group.id} value={group.id}>
                  <Accordion.Control>
                    <Group>
                      {group.name}
                      <Flex flex={1} />
                      {/* {activeFixtureGroupId === group.id && ( */}
                      {/* <Box
                      style={{
                        backgroundColor: "var(--mantine-color-lime-4)",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        border: "2px solid black",
                      }}
                      mr="md"
                    /> */}
                      {/* )} */}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <FixtureGroupSection
                      showFieldsetWrapper={false}

                      key={group.id}
                      group={group}
                      index={index + 1}
                      form={form}
                      setIsAtLeastOneComboboxOpened={() => {}}

                      // disabled={true}
                      readOnly
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </div>
        <div className={classes.controls}>
          <SimpleGrid cols={2} style={{ width: "stretch" }}>
            <Stack style={{ width: "stretch", align: "start" }} gap="xs">
              <Title order={4}>Comments</Title>
              <Text>{currentCue?.comments || "-"}</Text>
            </Stack>
            <Stack style={{ width: "stretch", align: "start" }} gap="xs">
              <Title order={4}>Next cue comments</Title>
              <Text>{nextCue?.comments || "-"}</Text>
            </Stack>
          </SimpleGrid>

          <CueControls
            cues={cues || []}
            currentCueIndex={currentCueIndex}
            cueOrder={cueOrder}
            onSelectCue={onSelectCue}
          />
          <Box style={{ width: "stretch" }}>
            <Divider />
          </Box>
          {items && <ItemControls items={items} currentItem={item} onSelectItem={onSelectItem} />}
        </div>
        <div className={classes.preview}>
          {visualiser && (
            <Box>
              <CustomCoverLoader isLoading={itemId === null} content={<div>Please select a cue!</div>}>
                <StaticStagePreview2D
                  eventId={eventId}
                  visualiser={visualiser}
                  fixtures={fixtures}
                  activeFixtureGroupId={"0"}
                  fixtureGroupsAssignment={nextCue?.assignments ?? {}}
                  isLoading={false}
                  onFixtureSelect={() => {}}
                />
                {cues && (
                  <Stack
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      backgroundColor: "var(--mantine-color-lime-light)",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                    }}
                    gap="0"
                  >
                    <Text fz="xs">
                      Next: Cue {currentCueIndex + 2 > cues.length ? cues.length : currentCueIndex + 2}
                    </Text>
                  </Stack>
                )}
              </CustomCoverLoader>
            </Box>
          )}
        </div>
      </div>
    </Flex>
  );
};
