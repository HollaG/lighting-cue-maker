import {
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  FileButton,
  Flex,
  Grid,
  Group,
  Menu,
  MultiSelect,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { Fragment, useEffect, useState } from "react";
import { AttributeTypes, type AttributeConfiguration, type LightEventConfiguration } from "../../types/types";
import { IconArrowRightBar, IconDownload } from "@tabler/icons-react";
import type { QLCEventJson, QLCFunction } from "../../types/qlc";
import {
  ADV_MAP_ALL_VALUE,
  ADV_MAP_KEY,
  ADV_MAP_ONE_VALUE,
  ADV_ORDER_ANY_VALUE,
  ADV_ORDER_FIRST_VALUE,
  ADV_ORDER_KEY,
  ADV_ORDER_LAST_VALUE,
  extractQLCFunctionsToJSON,
  generateAndInsertPreviewCollections,
  generatePreview,
  isQlcMappable,
} from "../../utils/qlc";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useRequest } from "../../hooks/useRequest";
import TextButton from "../../components/TextButton/TextButton";
import { useGetEvent } from "../../query/useGetEvent";
import { notifications } from "../../utils/notifications";
import { QLCEventPreview } from "./QLCEventPreview";
import { useLocalStorage } from "@mantine/hooks";

const COLUMN_SPANS = [2, 3, 1, 4, 2];

export type QlcFormType = {
  mappings: {
    [attributeIdAndValue: string]: string[];
  };
  advancedOptions: {
    [attributeIdAndValueAndOptionKey: string]: string;
  };
};

export type GroupedFnList = {
  group: string;
  items: { value: string; label: string }[]; // Function ID
}[];
export const QLCConverter = ({ event }: { event: LightEventConfiguration }) => {
  const activeItemId = useAppStore((s) => s.activeItemId);
  const [file, setFile] = useState<File | null>(null);
  const [fileXml, setFileXml] = useState<string | null>(null);

  const [functionList, setFunctionList] = useState<{ [fnId: string]: QLCFunction }>({});
  const [groupedFnList, setGroupedFnList] = useState<GroupedFnList>();

  const [preview, setPreview] = useLocalStorage<QLCEventJson>({
    defaultValue: {},
    key: "qlc-preview",
  });

  const form = useForm<QlcFormType>({
    mode: "uncontrolled",
    initialValues: {
      mappings: {},
      advancedOptions: {},
    },
    onValuesChange: (values) => {
      window.localStorage.setItem("qlc-mapping", JSON.stringify(values));
    },
  });

  // const {} = useFetch(`/api/v1/qlc/generate?lightEventId=${event?.id}`, false)
  const { executeRequest } = useRequest<unknown, { items: any[] }>(`/api/v1/qlc/${event?.id}/generate`, "POST");

  useEffect(() => {
    if (!file) return;
    file.text().then((xml) => {
      setFileXml(xml);
      const fnList = extractQLCFunctionsToJSON(xml);
      setFunctionList(
        fnList.reduce((acc, fn) => (fn.ID ? { ...acc, [fn.ID]: fn } : acc), {} as { [fnId: string]: QLCFunction }),
      );

      // set up the groupedFnList, group by Type
      const grouped = fnList.reduce(
        (acc, fn) => {
          const fnType = fn.Type ?? "Unknown";
          const fnId = fn.ID ?? "";
          const fnName = fn.Name ?? "";
          if (!acc[fnType]) {
            acc[fnType] = [];
          }
          acc[fnType].push({
            label: fnName,
            value: fnId,
          });
          return acc;
        },
        {} as Record<string, { value: string; label: string }[]>,
      );
      setGroupedFnList(
        Object.entries(grouped)
          .map(([group, items]) => ({ group, items }))
          .reverse(),
      );

      // if the values is an empty object, reload from localstorage if any
      if (Object.keys(form.getValues()).length === 0) {
        loadFromLocalstorage();
      }
    });
  }, [file]);

  function loadFromLocalstorage() {
    const storedValue = window.localStorage.getItem("qlc-mapping");
    if (storedValue) {
      try {
        form.setValues(JSON.parse(storedValue));
      } catch (e) {
        console.error("Failed to parse stored value", e);
      }
    }
  }

  async function exportPreviewToQlc() {
    if (!fileXml) {
      notifications.show({
        title: "No QLC+ file selected",
        message: "Please upload a QLC+ file",
        color: "red",
      });
      return;
    }
    const res = await executeRequest({});

    const highestFnId = Object.keys(functionList)
      .map(Number)
      .reduce((a, b) => Math.max(a, b), 0);

    const fileStr = fileXml;
    const resultXml = generateAndInsertPreviewCollections(fileStr, preview, res?.items ?? [], highestFnId + 1);

    if (!resultXml) {
      console.error("[exportToQlc] XML generation failed — check console for details");
      return;
    }

    const blob = new Blob([resultXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(".qxw", "") ?? "workspace"}-preview-${Date.now()}.qxw`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const onGeneratePreview = async () => {
    if (!fileXml) return;
    const values = form.getValues();

    console.log({ values });
    const res = await executeRequest({});

    if (!res) {
      // alert error
      notifications.show({
        title: "Error",
        message: "Failed to generate preview",
        color: "red",
      });
      return;
    }
    const json = generatePreview(res.items, values.mappings, values.advancedOptions, functionList);
    setPreview(json);
  };

  const addFunctionsToCue = (itemId: string, cueIndex: number, functionIds: string[]) => {
    setPreview((prev) => {
      const item = prev[itemId];
      if (!item) return prev;

      const newItems = [...item];
      const cue = newItems[cueIndex];
      if (!cue) return prev;

      newItems[cueIndex] = {
        ...cue,
        qlcFunctions: [...cue.qlcFunctions, ...functionIds.map((fnId) => functionList[fnId])],
      };

      return {
        ...prev,
        [itemId]: newItems,
      };
    });
  };

  const removeFunctionFromCue = (itemId: string, cueIndex: number, functionId: string) => {
    setPreview((prev) => {
      const item = prev[itemId];
      if (!item) return prev;

      const newItems = [...item];
      const cue = newItems[cueIndex];
      if (!cue) return prev;

      newItems[cueIndex] = {
        ...cue,
        qlcFunctions: cue.qlcFunctions.filter((qlcFn) => qlcFn.ID !== functionId),
      };

      return {
        ...prev,
        [itemId]: newItems,
      };
    });
  };

  if (!event || !activeItemId) return null;

  return (
    <>
      {/* <Container size={"xl"} mt="xl"></Container> */}

      <Container size={"xl"}>
        <Stack gap="xs">
          <Title order={3}>This app supports direct export to QLC+!</Title>
          <Text>
            Assign each attribute to one or more QLC+ functions. The app will then create QLC+ Collections corresponding
            to each cue, and fill the Collection with the QLC+ Function that you've selected.
          </Text>
          <Text>
            For example, if a Cue 1 in ItemName has Wash→Intensity→100%, mapped to "QLC Dimmer 1" and Wash→Colour→Red,
            mapped to "QLC Colour 1", the exported cue "ItemName 01" will contain "QLC Dimmer 1" and "QLC Colour 1".
          </Text>
        </Stack>
        <Stack my="lg">
          <Group>
            <FileButton onChange={setFile} accept=".qxw">
              {(props) => (
                <Button size="sm" {...props} color="green">
                  Upload .qxw file
                </Button>
              )}
            </FileButton>
            {file && <Text>Selected: {file.name}</Text>}
            {!file && <Text> Please select a QLC+ file!</Text>}
          </Group>
        </Stack>
      </Container>

      <Container fluid>
        <SimpleGrid cols={2} spacing={"lg"} px="xl">
          <Grid>
            <form>
              <Grid.Col span={12}>
                <Flex gap="md">
                  <Title order={3} flex={1}>
                    Mappings
                  </Title>
                  <Button
                    disabled={!file}
                    ml={"auto"}
                    size="xs"
                    color="gray"
                    variant="light"
                    onClick={loadFromLocalstorage}
                  >
                    Reload saved data
                  </Button>
                </Flex>
                <Stack>
                  <Grid columns={12}>
                    {event?.fixtureGroups.map((fixtureGroup, index) => (
                      <Fragment key={fixtureGroup.id}>
                        <Grid.Col span={12} mt={"lg"}>
                          <Stack>
                            <Text>
                              Group {index + 1}: {fixtureGroup.name}
                            </Text>
                            <Divider />
                          </Stack>
                        </Grid.Col>
                        {fixtureGroup.attributes
                          .filter((v) => isQlcMappable(v.type))
                          .map((attribute) => (
                            <OptList
                              key={attribute.id}
                              attribute={attribute}
                              groupedFnList={groupedFnList ?? []}
                              form={form}
                            />
                          ))}
                      </Fragment>
                    ))}
                  </Grid>
                </Stack>
              </Grid.Col>
            </form>
          </Grid>
          <Stack>
            <Group>
              <Title order={3} flex={1}>
                Preview
              </Title>
              <Button size="xs" variant="light" color="lime" onClick={onGeneratePreview}>
                Generate preview
              </Button>
            </Group>
            <Stack>
              <QLCEventPreview
                code={event.id}
                qlcEvent={preview}
                groupedFnList={groupedFnList || []}
                removeFunctionFromCue={removeFunctionFromCue}
                addFunctionsToCue={addFunctionsToCue}
              />
              <Center>
                <Button
                  color="green"
                  rightSection={<IconDownload width={"1rem"} />}
                  onClick={() => exportPreviewToQlc()}
                >
                  {" "}
                  Export{" "}
                </Button>
              </Center>
            </Stack>
          </Stack>
        </SimpleGrid>
      </Container>
    </>
  );
};

const OptList = ({
  attribute,
  groupedFnList,
  form,
}: {
  attribute: AttributeConfiguration;
  groupedFnList: GroupedFnList;
  form: UseFormReturnType<QlcFormType>;
}) => {
  if (!isQlcMappable(attribute.type)) return null;

  switch (attribute.type) {
    case AttributeTypes.BOOLEAN:
      // return a Yes and No
      return (
        <>
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text>{attribute.name}</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>Yes</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`mappings.${attribute.id}|true`} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="true" form={form} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text>{}</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>No</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`mappings.${attribute.id}|false`} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="false" form={form} />
          </Grid.Col>
        </>
      );
    case AttributeTypes.SELECT:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.SELECT]?.map((val, index) => (
            <Fragment key={val}>
              <Grid.Col span={COLUMN_SPANS[0]}>
                <Text>{index === 0 ? attribute.name : ""}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[1]}>
                <Text>{val}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[2]}>
                <IconArrowRightBar width={"1rem"} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[3]}>
                <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`mappings.${attribute.id}|${val}`} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[4]}>
                <AdvancedMappingMenu attributeId={attribute.id} value={val} form={form} />
              </Grid.Col>
            </Fragment>
          ))}

          {/* For none selected option */}
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>Not selected</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect
              groupedFnList={groupedFnList}
              form={form}
              inputId={`mappings.${attribute.id}|${"not-selected"}`}
            />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="not-selected" form={form} />
          </Grid.Col>
        </>
      );

    case AttributeTypes.MULTISELECT:
      return (
        <>
          {(attribute.optionPossibleValues[AttributeTypes.MULTISELECT] || []).map((val, index) => (
            <Fragment key={val}>
              <Grid.Col span={COLUMN_SPANS[0]}>
                <Text>{index === 0 ? attribute.name : ""}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[1]}>
                <Text>{val}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[2]}>
                <IconArrowRightBar width={"1rem"} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[3]}>
                <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`mappings.${attribute.id}|${val}`} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[4]}>
                <AdvancedMappingMenu attributeId={attribute.id} value={val} form={form} />
              </Grid.Col>
            </Fragment>
          ))}
          {/* For none selected option */}
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>Not selected</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect
              groupedFnList={groupedFnList}
              form={form}
              inputId={`mappings.${attribute.id}|${"not-selected"}`}
            />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="not-selected" form={form} />
          </Grid.Col>
        </>
      );

    case AttributeTypes.COLOUR:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.COLOUR]?.map((colourOption, index) => (
            <Fragment key={colourOption.hex}>
              <Grid.Col span={COLUMN_SPANS[0]}>
                <Text>{index === 0 ? attribute.name : ""}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[1]}>
                <Group key={index}>
                  <Box
                    style={{
                      width: "1rem",
                      height: "1rem",
                      backgroundColor: colourOption.hex,

                      // TODO @nightmode
                      border: colourOption.hex === "#ffffff" ? "1px solid black" : "",
                    }}
                  />
                  <Text> {colourOption.name} </Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[2]}>
                <IconArrowRightBar width={"1rem"} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[3]}>
                <FunctionSelect
                  groupedFnList={groupedFnList}
                  form={form}
                  inputId={`mappings.${attribute.id}|${colourOption.hex}`}
                />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[4]}>
                <AdvancedMappingMenu attributeId={attribute.id} value={colourOption.hex} form={form} />
              </Grid.Col>
            </Fragment>
          ))}
          {/* For none selected option */}
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>Not selected</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect
              groupedFnList={groupedFnList}
              form={form}
              inputId={`mappings.${attribute.id}|${"not-selected"}`}
            />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="not-selected" form={form} />
          </Grid.Col>
        </>
        // <Group>
        //   <Stack style={{ maxWidth: COLUMN_WIDTHS[1] }}>
        //     {attribute.optionPossibleValues[AttributeTypes.COLOUR].map((colourOption, index) => (
        //       <Group key={index}>
        //         <Box style={{ maxWidth: "1rem", height: "1rem", backgroundColor: colourOption.hex }} />
        //         <Text> {colourOption.name} </Text>
        //       </Group>
        //     ))}
        //   </Stack>
        //   <Stack style={{ maxWidth: COLUMN_WIDTHS[2] }}>
        //     {attribute.optionPossibleValues[AttributeTypes.COLOUR].map((colourOption, index) => (
        //       <IconArrowRightBar width={"1rem"} />
        //     ))}
        //   </Stack>
        // </Group>
      );

    case AttributeTypes.SLIDER_PRESETS: {
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.SLIDER_PRESETS]?.map((val, index) => (
            <Fragment key={val}>
              <Grid.Col span={COLUMN_SPANS[0]}>
                <Text>{index === 0 ? attribute.name : ""}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[1]}>
                <Text>{val}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[2]}>
                <IconArrowRightBar width={"1rem"} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[3]}>
                <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`mappings.${attribute.id}|${val}`} />
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[4]}>
                <AdvancedMappingMenu attributeId={attribute.id} value={val} form={form} />
              </Grid.Col>
            </Fragment>
          ))}
          {/* For none selected option */}
          <Grid.Col span={COLUMN_SPANS[0]}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[1]}>
            <Text>Not selected</Text>
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[2]}>
            <IconArrowRightBar width={"1rem"} />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[3]}>
            <FunctionSelect
              groupedFnList={groupedFnList}
              form={form}
              inputId={`mappings.${attribute.id}|${"not-selected"}`}
            />
          </Grid.Col>
          <Grid.Col span={COLUMN_SPANS[4]}>
            <AdvancedMappingMenu attributeId={attribute.id} value="not-selected" form={form} />
          </Grid.Col>
        </>
      );
    }
    default:
      return null;
  }
};

const AdvancedMappingMenu = ({
  attributeId,
  value,
  form,
}: {
  attributeId: string;
  value: string | number;
  form: UseFormReturnType<QlcFormType>;
}) => {
  const keyPrefix = `advancedOptions.${attributeId}|${value}`;
  const mappingTypeKey = `${keyPrefix}|${ADV_MAP_KEY}`;
  const functionPriorityKey = `${keyPrefix}|${ADV_ORDER_KEY}`;

  const [isMapTypeEnabled, setIsMapTypeEnabled] = useState<boolean>(false);
  const [isFunctionPriorityEnabled, setIsFunctionPriorityEnabled] = useState<boolean>(false);

  // Advanced options is "enabled" whenever it exists
  form.watch(mappingTypeKey, ({ value }) => {
    setIsMapTypeEnabled(true);
  });
  form.watch(functionPriorityKey, ({ value }) => {
    setIsFunctionPriorityEnabled(true);
  });

  const isAdvancedOptionsEnabled = isMapTypeEnabled || isFunctionPriorityEnabled;

  return (
    <Box>
      <Menu shadow="md" width={325} closeOnItemClick={false}>
        <Menu.Target>
          <Button
            fullWidth
            variant={isAdvancedOptionsEnabled ? "light" : "subtle"}
            color={isAdvancedOptionsEnabled ? "lime" : "gray"}
          >
            Advanced
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Mapping type</Menu.Label>
          <Menu.RadioGroup key={form.key(mappingTypeKey)} {...form.getInputProps(mappingTypeKey)}>
            <Menu.RadioItem value={ADV_MAP_ALL_VALUE}>Map to all selected functions (default)</Menu.RadioItem>
            <Menu.RadioItem value={ADV_MAP_ONE_VALUE}>Map to one random function</Menu.RadioItem>
          </Menu.RadioGroup>
          <Menu.Divider />
          <Menu.Label>Function priority</Menu.Label>
          <Menu.RadioGroup key={form.key(functionPriorityKey)} {...form.getInputProps(functionPriorityKey)}>
            <Menu.RadioItem value={ADV_ORDER_ANY_VALUE}>No specific priority (default)</Menu.RadioItem>
            <Menu.RadioItem value={ADV_ORDER_FIRST_VALUE}>Always lowest</Menu.RadioItem>
            <Menu.RadioItem value={ADV_ORDER_LAST_VALUE}>Always highest</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
};

export const FunctionSelect = ({
  groupedFnList,
  form,
  inputId,
}: {
  groupedFnList: GroupedFnList;
  form: UseFormReturnType<QlcFormType>;
  inputId: string;
}) => {
  // useEffect(() => {
  //   // if the attribute is not in the form, add it with default values
  //   form.setFieldValue(inputId, {
  //     advancedOptions: {},
  //     fnIds: [],
  //   });
  // }, []);

  const key = `${inputId}`;
  return (
    <MultiSelect
      searchable
      data={groupedFnList}
      width={"100%"}
      {...form.getInputProps(key)}
      key={form.key(key)}
      placeholder="Select one or more QLC+ functions..."
    />
  );
};
