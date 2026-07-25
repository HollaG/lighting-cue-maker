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
  MultiSelect,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useAppStore } from "../../store/appStore";
import { Fragment, useEffect, useState } from "react";
import { AttributeTypes, type AttributeConfiguration } from "../../types/types";
import { IconArrowRightBar } from "@tabler/icons-react";
import {
  extractQLCFunctionsToJSON,
  generateAndInsertCollections,
  isQlcMappable,
  type QLCFunction,
} from "../../types/qlc";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useRequest } from "../../hooks/useRequest";
import TextButton from "../../components/TextButton/TextButton";
import { useGetEvent } from "../../query/useGetEvent";

const COLUMN_SPANS = [2, 3, 1, 6];

type GroupedFnList = {
  group: string;
  items: { value: string; label: string }[]; // Function ID
}[];
export const QLCConverter = () => {
  const code = useAppStore((s) => s.code);
  const { event } = useGetEvent({ code });
  const activeItemId = useAppStore((s) => s.activeItemId);
  const [file, setFile] = useState<File | null>(null);

  const [functionList, setFunctionList] = useState<{ [fnId: string]: QLCFunction }>({});
  const [groupedFnList, setGroupedFnList] = useState<GroupedFnList>();

  const [showExport, setShowExport] = useState(false);
  const form = useForm<{
    [attributeId: string]: string[]; // function IDs
  }>({
    mode: "uncontrolled",
    initialValues: {},
    onValuesChange: (values) => {
      window.localStorage.setItem("qlc-mapping", JSON.stringify(values));
    },
  });

  // const {} = useFetch(`/api/v1/qlc/generate?lightEventId=${event?.id}`, false)
  const { executeRequest } = useRequest<unknown, { items: any[] }>(`/api/v1/qlc/${event?.id}/generate`, "POST");

  useEffect(() => {
    if (!file) return;
    file.text().then((xml) => {
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
        console.log("Failed to parse stored value", e);
      }
    }
  }

  async function exportToQlc() {
    const values = form.getValues();
    const res = await executeRequest({});

    const highestFnId = Object.keys(functionList)
      .map(Number)
      .reduce((a, b) => Math.max(a, b), 0);

    const fileStr = await file!.text();
    const resultXml = generateAndInsertCollections(fileStr, (res?.items ?? []) as any, values, highestFnId + 1);

    if (!resultXml) {
      console.error("[exportToQlc] XML generation failed — check console for details");
      return;
    }

    const blob = new Blob([resultXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file!.name.replace(".qxw", "")}-generated-${Date.now()}.qxw`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!event || !activeItemId) return null;

  return (
    <Container size={"xl"} mt="xl">
      <Divider
        my="lg"
        label={
          <Group gap="xs">
            <div>configure this event for QLC+ export</div>
            <TextButton size="xs" onClick={() => setShowExport((prev) => !prev)}>
              for LDs, click here
            </TextButton>
          </Group>
        }
        labelPosition="center"
      />
      <Collapse expanded={showExport}>
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
        <Stack mt="lg">
          <Group>
            <FileButton onChange={setFile} accept=".qxw">
              {(props) => (
                <Button size="sm" {...props}>
                  Upload .qxw file
                </Button>
              )}
            </FileButton>
            {file && <Text>Selected: {file.name}</Text>}
            {!file && <Text> Please select a QLC+ file!</Text>}
          </Group>
        </Stack>

        <Grid>
          <form>
            <Grid.Col span={12}>
              <Flex gap="md">
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
                          <OptList2
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
          <Grid.Col span={12}>
            <Center>
              <Box>
                <Button disabled={!file} onClick={exportToQlc}>
                  Export
                </Button>
              </Box>
            </Center>
          </Grid.Col>
          {/* <Stack>
          <Stack gap={0}>
            <Text> Available QLC+ functions </Text>
            <Text>
              {" "}
              For each possible attribute value, select a corresponding QLC+ function. For example, for Spots--
              {">Intensity>100"}, select the function that sets the Spots fixture group's intensity to full
            </Text>
          </Stack>
        </Stack> */}
          {/* <Grid.Col span={4}>
          <Stack>
            <Stack gap={0}>
              <Text> Output in QLC </Text>
              <Text>
                Preview the output of each cue in QLC+. Each cue will be saved as a collection of applicable functions.
              </Text>
            </Stack>
          </Stack>
        </Grid.Col> */}
        </Grid>
      </Collapse>
    </Container>
  );
};

// /**
//  *
//  * @param option the Function ID as a string
//  * @returns
//  */
// const renderMultiSelectOption: MultiSelectProps['renderOption'] = ({ option }) => (
//   <Group gap="sm">
//     <Avatar src={usersData[option.value].image} size={36} radius="xl" />
//     <div>
//       <Text size="sm">{option.value}</Text>
//       <Text size="xs" opacity={0.5}>
//         {usersData[option.value].email}
//       </Text>
//     </div>
//   </Group>
// );

const OptList2 = ({
  attribute,
  groupedFnList,
  form,
}: {
  attribute: AttributeConfiguration;
  groupedFnList: GroupedFnList;
  form: UseFormReturnType<{ [attributeId: string]: string[] }>;
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
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|true`} />
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
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|false`} />
          </Grid.Col>
        </>
      );
    case AttributeTypes.SELECT:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.SELECT].map((val, index) => (
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
                <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|${val}`} />
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
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|${"not-selected"}`} />
          </Grid.Col>
        </>
      );

    case AttributeTypes.MULTISELECT:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.MULTISELECT].map((val, index) => (
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
                <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|${val}`} />
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
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|${"not-selected"}`} />
          </Grid.Col>
        </>
      );

    case AttributeTypes.COLOUR:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.COLOUR].map((colourOption, index) => (
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
                  inputId={`${attribute.id}|${colourOption.hex}`}
                />
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
            <FunctionSelect groupedFnList={groupedFnList} form={form} inputId={`${attribute.id}|${"not-selected"}`} />
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

    default:
      return null;
  }
};

const FunctionSelect = ({
  groupedFnList,
  form,
  inputId,
}: {
  groupedFnList: GroupedFnList;
  form: UseFormReturnType<{ [attributeId: string]: string[] }>;
  inputId: string;
}) => {
  return (
    <MultiSelect
      searchable
      data={groupedFnList}
      width={"100%"}
      {...form.getInputProps(inputId)}
      key={form.key(inputId)}
      placeholder="Select one or more QLC+ functions..."
    />
  );
};
