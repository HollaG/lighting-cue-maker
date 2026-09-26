import { useEffect, useState } from "react";
import { AttributeTypes, type FixtureGroupConfiguration } from "../../types/types";
import {
  Accordion,
  AngleSlider,
  Box,
  Button,
  Center,
  Collapse,
  Divider,
  Flex,
  Group,
  Menu,
  Popover,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useDeleteFixture } from "../../query/useDeleteFixture";
import { useGetFixtures } from "../../query/useGetFixtures";
import { useUpsertFixture } from "../../query/useUpsertFixtures";
import { useAppStore } from "../../store/appStore";
import type { UpdateFixtureReq, Fixture, FixtureType, UpsertFixtureReq } from "../../types/fixtures";
import type { Visualiser3DEnvironment, Visualiser3DObject, Visualiser3DObjectTypes } from "../../types/visualiser3d";
import type { CameraControls } from "@react-three/drei";
import { useDebouncedCallback, useDidUpdate } from "@mantine/hooks";
import type { FixtureAttributeMapping, Visualiser } from "../../types/visualiser";
import { useUpsertVisualiser } from "../../query/useUpsertVisualiser";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";

interface ObjectMenuProps {
  obj: Visualiser3DObject;
}
interface StaticObjectMenuProps extends ObjectMenuProps {}
interface EditableObjectMenuProps extends ObjectMenuProps {
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (updatedElement: Visualiser3DObject) => void;
  onDuplicateElement: (elementId: string) => void;
}

const ObjectMenu = (props: EditableObjectMenuProps | StaticObjectMenuProps) => {
  const { obj } = props;
  const isEditable = "onDeleteElement" in props && "onUpdateElement" in props;
  // const isText = obj.type === "text";
  // const [opened, { close, open }] = useDisclosure(false);
  // const [text, setText] = useState(isText ? (obj.props.text ?? "") : "");

  // const onSubmitTextChange = () => {
  //   if (obj.type !== "text") return;

  //   if (isEditable) {
  //     props.onUpdateElement({
  //       ...obj,
  //       props: {
  //         ...obj.props,
  //         text,
  //       },
  //     });
  //   }
  // };
  return (
    <>
      {/* <Modal opened={opened} onClose={close} title="Change text content" centered>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isText) return;
            onSubmitTextChange();
            close();
          }}
        >
          <Stack>
            <CustomTextInput
              label="New text"
              placeholder="Enter the new text content..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <Flex justify={"end"}>
              <Box>
                <Button variant="light" type="submit">
                  {" "}
                  Submit{" "}
                </Button>
              </Box>
            </Flex>
          </Stack>
        </form>
      </Modal> */}
      {isEditable ? (
        <Menu shadow="sm" width={250} alignItemsLabels="all">
          <Menu.Target>
            <Button size="xs" variant="transparent">
              Options
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {/* {isText ? <Menu.Label> Element options </Menu.Label> : null} */}
            {/* <Popover opened={opened} position="right">
            <Popover.Target> */}
            {/* {isText ? <Menu.Item onClick={open}>Change Text</Menu.Item> : null} */}
            {/* <Button> Change text</Button> */}
            {/* </Popover.Target>
            <Popover.Dropdown>
              <Box onMouseEnter={open} onMouseLeave={close}>
                <CustomTextInput label="New text" />
              </Box>
            </Popover.Dropdown>
          </Popover> */}
            {/* <Menu.Label>Display options</Menu.Label>
            <Menu.CheckboxItem>Stroke</Menu.CheckboxItem>
            <Menu.CheckboxItem>Fill</Menu.CheckboxItem>
            <Menu.Item>Change colour</Menu.Item>
            <Menu.Divider /> */}
            <Menu.Item onClick={() => props.onDuplicateElement(obj.id)}>Duplicate</Menu.Item>
            <Menu.Item color="red" onClick={() => props.onDeleteElement(obj.id)}>
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : (
        <></>
      )}
    </>
  );
};
export const Visualiser3DControls = ({
  cameraRef,

  visualiser,
  fixtureGroups,
  eventId,
  environment,
  onEnvironmentChange,

  stageElements,
  onAddElement,
  onDuplicateElement,
  onUpdateElement,
  onDeleteElement,
}: {
  // meta
  cameraRef: React.RefObject<CameraControls | null>;
  visualiser: Visualiser;

  // directly related to fixtures
  fixtureGroups: FixtureGroupConfiguration[];
  eventId: string;
  environment: Visualiser3DEnvironment;
  onEnvironmentChange: (environment: Visualiser3DEnvironment) => void;

  // non-fixtures
  stageElements: Visualiser3DObject[];
  onAddElement?: (newElementType: Visualiser3DObjectTypes) => void;
  onUpdateElement?: (updatedElement: Visualiser3DObject) => void;
  onDuplicateElement?: (elementId: string) => void;
  onDeleteElement?: (elementId: string) => void;
}) => {
  const [fixtureAccordionValue, setFixtureAccordionValue] = useState<string | null>(null);
  const [stageElementAccordionValue, setStageElementAccordionValue] = useState<string | null>(null);

  const cuboids = stageElements.filter((el) => el.type === "cuboid");
  const humans = stageElements.filter((el) => el.type === "default_human");

  return (
    <Stack>
      <Text fw="bold">Environment controls</Text>
      <Stack>
        <Group w="100%">
          <Text style={{ width: "120px" }} fw="semibold">
            Haze
          </Text>
          <Slider
            flex={1}

            min={0}
            max={1}
            step={0.05}
            value={environment.haze}
            onChange={(value) => onEnvironmentChange({ ...environment, haze: value })}
          />
        </Group>
        <Group w="100%">
          <Text style={{ width: "120px" }} fw="semibold">
            Ambient light
          </Text>
          <Slider
            flex={1}
            label={(value) => `${value * 100} %`}
            min={0}
            max={1}
            step={0.05}
            value={environment.ambientLight}
            onChange={(value) => onEnvironmentChange({ ...environment, ambientLight: value })}
          />
        </Group>
      </Stack>
      <Divider />
      <Text fw="bold"> Fixtures </Text>
      <Accordion value={fixtureAccordionValue} onChange={setFixtureAccordionValue}>
        {fixtureGroups.map((fixtureGroup, index) => (
          <VisualiserFixtureSection
            key={fixtureGroup.id}
            fixtureGroup={fixtureGroup}
            index={index}
            setFixtureAccordionValue={setFixtureAccordionValue}
            cameraRef={cameraRef}
            visualiser={visualiser}
            eventId={eventId}
          />
        ))}
      </Accordion>
      {onAddElement ? (
        <>
          <Text fw="bold">Stage Elements</Text>
          <Accordion value={stageElementAccordionValue} onChange={setStageElementAccordionValue}>
            <VisualiserObjectSection
              key="cuboids"
              title="Cuboids"
              itemLabel="Cuboid"
              itemType="cuboid"
              objects={cuboids}

              onAddElement={onAddElement}
              onDeleteElement={onDeleteElement}
              onUpdateElement={onUpdateElement}
              setStageElementAccordionValue={setStageElementAccordionValue}
              onDuplicateElement={onDuplicateElement}
            />
            <VisualiserObjectSection
              key="humans"
              title="Humans"
              itemLabel="Human"
              itemType="default_human"
              objects={humans}

              onAddElement={onAddElement}
              onDeleteElement={onDeleteElement}
              onUpdateElement={onUpdateElement}
              setStageElementAccordionValue={setStageElementAccordionValue}
              onDuplicateElement={onDuplicateElement}
            />
          </Accordion>
        </>
      ) : (
        <></>
      )}
      {/* {} */}
    </Stack>
  );
};

const DEFAULT_FIXTURE: UpsertFixtureReq = {
  beamAngle: 0,

  name: " ",
  fixtureGroupId: "",
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  type: "par",
  maxBrightness: 200,
};

const VisualiserFixtureSection = ({
  fixtureGroup,
  index,
  cameraRef,
  setFixtureAccordionValue,
  // stageRef,
  visualiser,
  eventId,
}: {
  visualiser: Visualiser;
  fixtureGroup: FixtureGroupConfiguration;
  index: number;
  setFixtureAccordionValue: (value: string | null) => void;
  cameraRef: React.RefObject<CameraControls | null>;
  eventId: string;
}) => {
  const selectedElementId = useAppStore((state) => state.activeObjectId);
  const setSelectedElementId = useAppStore((state) => state.setActiveObjectId);

  const { fixtures } = useGetFixtures({ fixtureGroupId: fixtureGroup.id });

  const { isPending: isCreateFixturePending, mutateAsync: upsertFixture } = useUpsertFixture();
  const { mutateAsync: upsertVisualiser } = useUpsertVisualiser();

  // TODO: unused var
  const { isPending: _isDeletePending, mutateAsync: deleteFixture } = useDeleteFixture();

  const onAddFixture = async () => {
    // upsert a new fixture with default values into the fixtures array for this fixture group
    const fixture: UpsertFixtureReq = {
      ...DEFAULT_FIXTURE,
      fixtureGroupId: fixtureGroup.id,
    };

    const result = await upsertFixture(fixture);

    // set the camera to focus on this fixture
    if (cameraRef.current) {
      cameraRef.current.setLookAt(0, 2, 5, 0, 0, 0, true);
    }

    // "Select" the new fixture
    setSelectedElementId(result.fixture.id);
  };

  const onUpdateFixture = async (fixture: UpdateFixtureReq) => {
    await upsertFixture(fixture);
  };

  const onDeleteFixture = async (fixture: Fixture) => {
    await deleteFixture({ fixtureId: fixture.id, fixtureGroupId: fixture.fixtureGroupId });
    if (selectedElementId === fixture.id) {
      setSelectedElementId(null);
    }
  };

  const onDuplicateFixture = async (fixture: Fixture) => {
    const newFixture: UpsertFixtureReq = {
      ...fixture,
      name: `${fixture.name} (copy)`,
      fixtureGroupId: fixture.fixtureGroupId,
    };

    delete newFixture.id; // Remove the id so that a new one is generated

    const result = await upsertFixture(newFixture);
    setSelectedElementId(result.fixture.id);
  };

  // If the selectedElementId is IN this fixture group, expand it:
  useEffect(() => {
    if (fixtures.some((fixture) => fixture.id === selectedElementId)) {
      setFixtureAccordionValue(fixtureGroup.id);
    }
  }, [fixtureGroup.id, fixtures, selectedElementId, setFixtureAccordionValue]);

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

  // --- POSITION SPECIAL ---------

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
  const [fixtureAttributeMapping, setFixtureAttributeMapping] = useState<FixtureAttributeMapping>(
    visualiser.fixtureAttributeMapping ?? {},
  );

  // shared
  const previewFixtureId = useAppStore((state) => state.previewFixtureId);
  const setPreviewFixtureId = useAppStore((state) => state.setPreviewFixtureId);
  const previewPositionId = useAppStore((state) => state.previewPositionId);
  const togglePreviewPositionId = useAppStore((state) => state.togglePreviewPositionId);
  const setPreviewPosition = useAppStore((state) => state.setPreviewPosition);

  const getPosition = (fixtureId: string, positionOptionId: string, fixtureGroupId: string) => {
    return (
      fixtureAttributeMapping[fixtureGroupId]?.[AttributeTypes.PRESET_POSITION]?.[positionOptionId]?.[fixtureId] ?? {
        pan: 0,
        tilt: 0,
      }
    );

    // return { pan: 0, tilt: 0 }; // Placeholder
  };

  const onPositionAttributeInput = (
    fixtureId: string,
    positionOptionId: string,
    fixtureGroupId: string,
    {
      pan,
      tilt,
    }: {
      pan?: number;
      tilt?: number;
    },
  ) => {
    // Update the fixtureAttributeMapping state with the new pan/tilt values for the given fixtureId and positionOptionId
    setFixtureAttributeMapping((prev) => {
      const newMapping = { ...prev };

      if (!newMapping[fixtureGroupId]) {
        newMapping[fixtureGroupId] = {};
      }

      if (!newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]) {
        newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION] = {};
      }

      if (!newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId]) {
        newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId] = {};
      }

      const existingPan =
        newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId]?.pan ?? 0;
      const existingTilt =
        newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId]?.tilt ?? 0;

      newMapping[fixtureGroupId][AttributeTypes.PRESET_POSITION]![positionOptionId][fixtureId] = {
        pan: pan ?? existingPan,
        tilt: tilt ?? existingTilt,
      };

      return newMapping;
    });

    // Update the store
    setPreviewPosition(positionOptionId, { pan, tilt });
  };

  /** Debounce the saving of position settings */
  const debouncedSave = useDebouncedCallback((fixtureAttributeMapping: FixtureAttributeMapping) => {
    upsertVisualiser({
      id: visualiser.id,
      eventId,
      fixtureAttributeMapping,
    });
  }, 500);

  useDidUpdate(() => {
    debouncedSave(fixtureAttributeMapping);
  }, [fixtureAttributeMapping, debouncedSave]);

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
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedElementId(fixture.id)}
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
                    <Menu.Label>Configure dynamic attributes</Menu.Label>
                    {hasPresetPositionAttribute && fixtureTypeSupportsPosition(fixture.type) && (
                      <Menu.Item
                        onClick={() => {
                          setPreviewFixtureId(previewFixtureId === fixture.id ? null : fixture.id);
                          if (previewFixtureId !== fixture.id) {
                            setSelectedElementId(fixture.id);
                          }
                        }}
                      >
                        Set pan & tilt for each position
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item onClick={() => onDuplicateFixture(fixture)}>Duplicate</Menu.Item>

                    <Menu.Item color="red" onClick={() => onDeleteFixture(fixture)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>{" "}
              </Flex>

              {/* Special Attribute: Position */}
              {hasPresetPositionAttribute && fixtureTypeSupportsPosition(fixture.type) && (
                <Collapse expanded={previewFixtureId === fixture.id}>
                  <Stack>
                    <Text fw="bold"> Positions </Text>
                    {presetPositionOptions.map((option, index2) => (
                      <Group key={option.id} style={{ flexWrap: "nowrap" }}>
                        <Text style={{ flexShrink: 1 }}>
                          {index2 + 1}. {option.name}
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
                        </Box>
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

const VisualiserObjectSection = ({
  title,
  itemLabel,
  itemType,
  objects,

  setStageElementAccordionValue,
  onDeleteElement,
  onUpdateElement,
  onAddElement,
  onDuplicateElement,
}: {
  title: string;
  itemLabel: string;
  itemType: Visualiser3DObjectTypes;
  objects: Visualiser3DObject[];

  setStageElementAccordionValue: (value: string | null) => void;

  onAddElement?: (newElementType: Visualiser3DObjectTypes) => void;
  onDeleteElement?: (elementId: string) => void;
  onUpdateElement?: (updatedElement: Visualiser3DObject) => void;
  onDuplicateElement?: (elementId: string) => void;
}) => {
  // if (!objects.length) return null;

  // If the selectedElementId is IN this fixture group, expand it:
  const selectedElementId = useAppStore((state) => state.activeObjectId);
  const setSelectedElementId = useAppStore((state) => state.setActiveObjectId);

  useEffect(() => {
    if (objects.some((obj) => obj.id === selectedElementId)) {
      setStageElementAccordionValue(title);
    }
  }, [objects, selectedElementId, setStageElementAccordionValue, title]);

  return (
    <Accordion.Item value={title}>
      <Accordion.Control>
        {title} ({objects.length})
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          {objects.map((obj, index) => (
            <Flex key={obj.id}>
              <Text
                style={{
                  backgroundColor:
                    selectedElementId === obj.id ? "light-dark(yellow, var(--dark-yellow))" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedElementId(obj.id)}
              >
                {itemLabel} {index + 1}
              </Text>

              <Flex style={{ flex: 1 }} />

              <ObjectMenu
                obj={obj}
                onDeleteElement={onDeleteElement}
                onUpdateElement={onUpdateElement}
                onDuplicateElement={onDuplicateElement}
              />
            </Flex>
          ))}
          {onAddElement && (
            <Center>
              <Button variant="subtle" size="xs" onClick={() => onAddElement(itemType)}>
                Add {itemLabel}
              </Button>
            </Center>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
