import { useEffect, useState } from "react";
import { AttributeTypes, type FixtureGroupConfiguration } from "../../types/types";
import {
  Accordion,
  AngleSlider,
  Box,
  Button,
  Center,
  Collapse,
  Flex,
  Group,
  Menu,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import type { Stage } from "konva/lib/Stage";
import { useDeleteFixture } from "../../query/useDeleteFixture";
import { useGetFixtures } from "../../query/useGetFixtures";
import { useUpsertFixture } from "../../query/useUpsertFixtures";
import { useUpsertVisualiser } from "../../query/useUpsertVisualiser";
import { useAppStore } from "../../store/appStore";
import type { UpsertFixtureReq, UpdateFixtureReq, Fixture, FixtureType } from "../../types/fixtures";
import type { Visualiser, FixtureAttributeMapping } from "../../types/visualiser";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";

export const Visualiser3DControls = ({
  fixtureGroups,
  eventId,
}: {
  fixtureGroups: FixtureGroupConfiguration[];
  eventId: string;
}) => {
  const [fixtureAccordionValue, setFixtureAccordionValue] = useState<string | null>(null);
  const [stageElementAccordionValue, setStageElementAccordionValue] = useState<string | null>(null);

  return (
    <Stack>
      <Text fw="bold"> Fixtures </Text>
      <Accordion value={fixtureAccordionValue} onChange={setFixtureAccordionValue}>
        {fixtureGroups.map((fixtureGroup, index) => (
          <VisualiserFixtureSection
            key={fixtureGroup.id}
            fixtureGroup={fixtureGroup}
            index={index}
            setFixtureAccordionValue={setFixtureAccordionValue}
            // stageRef={stageRef}
            // visualiser={visualiser}
            // eventId={eventId}
          />
        ))}
      </Accordion>
    </Stack>
  );
};

const VisualiserFixtureSection = ({
  fixtureGroup,
  index,
  setFixtureAccordionValue,
  // stageRef,
  // visualiser,
  // eventId,
}: {
  // visualiser: Visualiser;
  fixtureGroup: FixtureGroupConfiguration;
  index: number;
  setFixtureAccordionValue: (value: string | null) => void;
  // stageRef: React.RefObject<Stage | null>;
  // eventId: string;
}) => {
  const selectedElementId = useAppStore((state) => state.activeObjectId);

  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });
  const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();

  const { isPending: isCreateFixturePending, mutateAsync: upsertFixture } = useUpsertFixture();

  // TODO: unused var
  const { isPending: _isDeletePending, mutateAsync: deleteFixture } = useDeleteFixture();

  const onAddFixture = () => {};
  const onUpdateFixture = (fixture: UpdateFixtureReq) => {};
  const onDeleteFixture = (fixture: Fixture) => {};

  // const onAddFixture = async () => {
  //   // upsert a new fixture with default values into the fixtures array for this fixture group
  //   const stage = stageRef.current;
  //   // Convert the desired screen position to world coordinates, like the other stage elements.
  //   const x = stage ? (32 - stage.x()) / stage.scaleX() : 32;
  //   const y = stage ? (60 - stage.y()) / stage.scaleY() : 60;

  //   const fixture: UpsertFixtureReq = {
  //     ...DEFAULT_FIXTURE,
  //     fixtureGroupId: fixtureGroup.id,
  //     posX: x,
  //     posY: y,
  //   };

  //   // Get the stage ref
  //   await upsertFixture(fixture);
  // };

  // const onUpdateFixture = async (fixture: UpdateFixtureReq) => {
  //   await upsertFixture(fixture);
  // };

  // const onDeleteFixture = async (fixture: Fixture) => {
  //   await deleteFixture({ fixtureId: fixture.id, fixtureGroupId: fixture.fixtureGroupId });
  // };

  // If the selectedElementId is IN this fixture group, expand it:

  // useEffect(() => {
  //   if (fixtures.some((fixture) => fixture.id === selectedElementId)) {
  //     setFixtureAccordionValue(fixtureGroup.id);
  //   }
  // }, [fixtureGroup.id, fixtures, selectedElementId, setFixtureAccordionValue]);

  const getFixtureTextLabel = (fixture: Fixture, index: number) => {
    switch (fixture.type) {
      case "par":
        return `${index + 1}. Static light `;
      case "moving_head":
        return `${index + 1}. Moving light`;
      case "bar":
        return `${index + 1}. Bar light`;
      default:
        return `${index + 1}. Fixture`;
    }
  };

  // For handling special attributes like pan/tilt
  // const hasPresetPositionAttribute = fixtureGroup.attributes.some(
  //   (attr) => attr.type === AttributeTypes.PRESET_POSITION,
  // );

  /**
   * Does this fixtureGroup have a PresetPosition configured? If so, does this fixture support it?
   */
  const hasPresetPositionAttribute = fixtureGroup.attributes.some(
    (attr) => attr.type === AttributeTypes.PRESET_POSITION,
  );
  const fixtureTypeSupportsPosition = (fixtureType: FixtureType) => fixtureType === "moving_head";

  const presetPositionOptions = hasPresetPositionAttribute
    ? (fixtureGroup.attributes.find((attr) => attr.type === AttributeTypes.PRESET_POSITION)?.optionPossibleValues[
        AttributeTypes.PRESET_POSITION
      ] ?? [])
    : [];

  // Debounce and save
  // const [fixtureAttributeMapping, setFixtureAttributeMapping] = useState<FixtureAttributeMapping>(
  //   visualiser.fixtureAttributeMapping ?? {},
  // );

  // shared
  const previewFixtureId = useAppStore((state) => state.previewFixtureId);
  const setPreviewFixtureId = useAppStore((state) => state.setPreviewFixtureId);
  const previewPositionId = useAppStore((state) => state.previewPositionId);
  const togglePreviewPositionId = useAppStore((state) => state.togglePreviewPositionId);
  const setPreviewPosition = useAppStore((state) => state.setPreviewPosition);

  const [isEditingSpecialAttributes, setIsEditingSpecialAttributes] = useState(false);

  const getPosition = (fixtureId: string, positionOptionId: string, fixtureGroupId: string) => {
    // return (
    //   fixtureAttributeMapping[fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[positionOptionId]?.[fixtureId] ?? {
    //     pan: 0,
    //     tilt: 0,
    //   }
    // );

    return { pan: 0, tilt: 0 }; // Placeholder
  };

  // const onPositionAttributeInput = (
  //   fixtureId: string,
  //   positionOptionId: string,
  //   fixtureGroupId: string,
  //   {
  //     pan,
  //     tilt,
  //   }: {
  //     pan?: number;
  //     tilt?: number;
  //   },
  // ) => {
  //   // Update the fixtureAttributeMapping state with the new pan/tilt values for the given fixtureId and positionOptionId
  //   setFixtureAttributeMapping((prev) => {
  //     const newMapping = { ...prev };

  //     if (!newMapping[fixtureGroupId]) {
  //       newMapping[fixtureGroupId] = {};
  //     }

  //     if (!newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]) {
  //       newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION] = {};
  //     }

  //     if (!newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId]) {
  //       newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId] = {};
  //     }

  //     const existingPan =
  //       newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId]?.pan ?? 0;
  //     const existingTilt =
  //       newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId]?.tilt ?? 0;

  //     newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId] = {
  //       pan: pan ?? existingPan,
  //       tilt: tilt ?? existingTilt,
  //     };

  //     return newMapping;
  //   });

  //   // Update the store
  //   setPreviewPosition(positionOptionId, { pan, tilt });
  // };

  /** Debounce the saving of position settings */
  // const debouncedSave = useDebouncedCallback((fixtureAttributeMapping: FixtureAttributeMapping) => {
  //   upsertVisualiser({
  //     id: visualiser.id,
  //     eventId,
  //     fixtureAttributeMapping,
  //   });
  // }, 500);

  // useEffect(() => {
  //   debouncedSave(fixtureAttributeMapping);
  // }, [fixtureAttributeMapping, debouncedSave]);

  return (
    <Accordion.Item value={fixtureGroup.id}>
      <Accordion.Control>
        Group {index + 1}: {fixtureGroup.name} ({fixtures.length})
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          {fixtures.map((fixture, index) => (
            <Stack key={fixture.id}>
              <Flex>
                <Text
                  style={{
                    backgroundColor:
                      selectedElementId === fixture.id ? "light-dark(yellow, var(--dark-yellow))" : "transparent",
                  }}
                >
                  {getFixtureTextLabel(fixture, index)}
                </Text>
                <Flex flex={1} />
                <Menu shadow="sm" width={250} alignItemsLabels="all">
                  <Menu.Target>
                    <Button size="xs" variant="transparent">
                      Options
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Select fixture type</Menu.Label>
                    <Menu.Item onClick={() => onUpdateFixture({ ...fixture, type: "par" })}>Static light</Menu.Item>
                    <Menu.Item onClick={() => onUpdateFixture({ ...fixture, type: "moving_head" })}>
                      Moving light
                    </Menu.Item>
                    <Menu.Item onClick={() => onUpdateFixture({ ...fixture, type: "bar" })}>Bar light</Menu.Item>

                    <Menu.Divider />
                    <Menu.Label>Configure attributes</Menu.Label>
                    {hasPresetPositionAttribute && fixtureTypeSupportsPosition(fixture.type) && (
                      <Menu.Item
                        onClick={() => {
                          setIsEditingSpecialAttributes(true);
                          setPreviewFixtureId(fixture.id);
                        }}
                      >
                        Set pan & tilt corresponding to cue selection
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item color="red" onClick={() => onDeleteFixture(fixture)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>{" "}
              </Flex>

              {/* Special Attribute: Position */}
              {hasPresetPositionAttribute && fixtureTypeSupportsPosition(fixture.type) && (
                <Collapse expanded={isEditingSpecialAttributes && previewFixtureId === fixture.id}>
                  <Stack>
                    <Text fw="bold"> Positions </Text>
                    {presetPositionOptions.map((option, index) => (
                      <Group key={option.id} style={{ flexWrap: "nowrap" }}>
                        {/* <Text style={{ flexShrink: 1 }}>
                          {index + 1}. {option.name}
                        </Text>
                        <Flex flex={1} />
                        <Button
                          color="lime"
                          variant={option.id === previewPositionId ? "filled" : "transparent"}
                          size="xs"
                          onClick={() =>
                            togglePreviewPositionId(
                              option.id,
                              getPosition(fixture.id, option.id, fixture.fixtureGroupId),
                            )
                          }
                        >
                          Preview
                        </Button>
                        <Box style={{ width: "40px" }}>
                          <Popover withArrow shadow="md">
                            <Popover.Target>
                              <AngleSlider
                                size={40}
                                thumbSize={8}
                                value={
                                  fixtureAttributeMapping[fixture.fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[
                                    option.id
                                  ]?.[fixture.id]?.pan || 0
                                }
                                onChange={(e) =>
                                  onPositionAttributeInput(fixture.id, option.id, fixture.fixtureGroupId, {
                                    pan: e,
                                  })
                                }
                                formatLabel={(value) => `${value}°`}
                                marks={[{ value: 0, label: "Pan" }]}
                              />
                            </Popover.Target>
                            <Popover.Dropdown>
                              <CustomTextInput
                                required
                                type="number"
                                label={"Pan"}
                                value={
                                  fixtureAttributeMapping[fixture.fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[
                                    option.id
                                  ]?.[fixture.id]?.pan || 0
                                }
                                onChange={(e) =>
                                  onPositionAttributeInput(fixture.id, option.id, fixture.fixtureGroupId, {
                                    pan: Number(e.target.value),
                                  })
                                }
                              />
                            </Popover.Dropdown>
                          </Popover>
                        </Box>
                        <Box style={{ width: "40px" }}>
                          <Popover withArrow shadow="md">
                            <Popover.Target>
                              <AngleSlider
                                size={40}
                                thumbSize={8}
                                value={
                                  fixtureAttributeMapping[fixture.fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[
                                    option.id
                                  ]?.[fixture.id]?.tilt || 0
                                }
                                onChange={(value) =>
                                  onPositionAttributeInput(fixture.id, option.id, fixture.fixtureGroupId, {
                                    tilt: value,
                                  })
                                }
                                formatLabel={(value) => `${value}°`}
                                marks={[{ value: 0, label: "Tilt" }]}
                              />
                            </Popover.Target>
                            <Popover.Dropdown>
                              <CustomTextInput
                                required
                                type="number"
                                label={"Tilt"}
                                value={
                                  fixtureAttributeMapping[fixture.fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[
                                    option.id
                                  ]?.[fixture.id]?.tilt || 0
                                }
                                onChange={(e) =>
                                  onPositionAttributeInput(fixture.id, option.id, fixture.fixtureGroupId, {
                                    tilt: Number(e.target.value),
                                  })
                                }
                              />
                            </Popover.Dropdown>
                          </Popover>
                        </Box> */}
                      </Group>
                    ))}
                    {/* <Center>
                      <Button size="xs" variant="light">
                        Save
                      </Button>
                    </Center> */}
                  </Stack>
                </Collapse>
              )}
            </Stack>
          ))}
          <Center>
            <Button
              variant="subtle"
              size="xs"
              onClick={onAddFixture}
              loading={isCreateFixturePending}
              loaderProps={{ type: "bars" }}
            >
              {" "}
              Add a fixture{" "}
            </Button>
          </Center>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
