import {
  Box,
  Button,
  Center,
  Container,
  Divider,
  FileButton,
  Flex,
  Grid,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Text,
  Title,
  type MultiSelectProps,
} from "@mantine/core";
import { useAppContext } from "../../context/AppContext";
import { useEffect, useState } from "react";
import { AttributeTypes, type AttributeConfiguration } from "../../types/types";
import { IconArrowRight, IconArrowRightBar } from "@tabler/icons-react";
import {
  convertNumberToMinimally2Digits,
  extractQLCFunctionsToJSON,
  handleAddFunction,
  type QLCFunction,
} from "../../types/qlc";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useFetch } from "../../hooks/useFetch";
import { useRequest } from "../../hooks/useRequest";
import type { GenerateQlcCollectionsRes } from "../../types/http";
import { getCueOrder, getValueFromValueAssignment } from "../../utils/cueUtils";

const COLUMN_SPANS = [2, 3, 1, 6];
const needsQlcMap = (type: AttributeTypes) => {
  if (
    (
      [
        AttributeTypes.BOOLEAN,
        AttributeTypes.COLOUR,
        AttributeTypes.MULTISELECT,
        AttributeTypes.SELECT,
      ] as AttributeTypes[]
    ).includes(type)
  )
    return true;
  return false;
};

type GroupedFnList = {
  group: string;
  items: { value: string; label: string }[]; // Function ID
}[];
export const QLCConverter = () => {
  const { event } = useAppContext();
  const [file, setFile] = useState<File | null>(null);

  const [functionList, setFunctionList] = useState<{ [fnId: string]: QLCFunction }>({});
  const [groupedFnList, setGroupedFnList] = useState<GroupedFnList>();

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
  const { executeRequest } = useRequest<unknown, GenerateQlcCollectionsRes>(
    `/api/v1/qlc/${event?.id}/generate`,
    "POST",
  );

  useEffect(() => {
    if (!file) return;
    file.text().then((xml) => {
      const fnList = extractQLCFunctionsToJSON(xml);
      setFunctionList(fnList.reduce((acc, fn) => ({ ...acc, [fn.ID]: fn }), {}));

      // set up the groupedFnList, group by Type
      const grouped = fnList.reduce(
        (acc, fn) => {
          if (!acc[fn.Type]) {
            acc[fn.Type] = [];
          }
          acc[fn.Type].push({
            label: fn.Name,
            value: fn.ID,
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

  console.log({ functionList, groupedFnList });

  function loadFromLocalstorage() {
    const storedValue = window.localStorage.getItem("qlc-mapping");
    if (storedValue) {
      try {
        form.setValues(JSON.parse(window.localStorage.getItem("qlc-mapping")!));
      } catch (e) {
        console.log("Failed to parse stored value");
      }
    }
  }

  async function exportToQlc() {
    const values = form.getValues();

    const res = await executeRequest({});

    const highestFnId = Object.keys(functionList)
      .map(Number)
      .reduce((a, b) => Math.max(a, b), 0);

    let resString = "";
    let fnIdCounter = highestFnId + 1;

    console.log("------------ BEGIN QLC+ CONFIG ----------");
    console.log({
      values,
    });
    for (const [index, item] of (res?.items || []).entries()) {
      const { cues, id, name, rawLyrics } = item;

      if (!rawLyrics) continue;
      if (!cues || cues.length === 0) continue;

      const cueOrder = getCueOrder(rawLyrics);

      for (const [cueIndex, cueId] of cueOrder.entries()) {
        const cue = cues.find((cue) => cue.id === cueId);

        if (!cue) {
          console.error(`Cue was in cueOrder but not in the overall cue list`);
        }

        resString += `\n<Function ID="${fnIdCounter}" Type="Collection" Path="Generated/${name}" Name="${name} ${convertNumberToMinimally2Digits(
          cueIndex + 1,
        )}">`;

        fnIdCounter++;

        let stepNumber = 0;

        // For this cue, find all set values
        const { assignments } = cue;

        // Flat-map the assignments until we get to FixtureGroupAssignment:
        const completeAttributeList = Object.values(assignments).map((v) => v.assignment);
        const completeAttributeMap = completeAttributeList.reduce(
          (prev, cur) => ({
            ...prev,
            ...cur,
          }),
          {},
        );

        // for every attributeID (every key), find if the user mapped the combination
        // ${attributeId}:${attributeValue}
        // to a QLC+ function.
        for (let attrId of Object.keys(completeAttributeMap)) {
          // skip non-qlc-mappable
          const attr = completeAttributeMap[attrId];
          if (!needsQlcMap(attr.type)) continue;
          const selectedValue = getValueFromValueAssignment(attr.type, attr.value);

          if (Array.isArray(selectedValue)) {
            for (let v of selectedValue) {
              const keyString = `${attrId}|${v}`;
              const qlcFunctionId = values[keyString];

              if (!qlcFunctionId) {
                console.error("No QLC+ function found for attribute ID: " + attrId + " and value: " + v, { attr });
                continue;
              }

              resString += `\n<Step Number="${stepNumber}">${qlcFunctionId}</Step>`;
              stepNumber++;
            }
          } else {
            const keyString = `${attrId}|${selectedValue}`;
            const qlcFunctionId = values[keyString];

            if (!qlcFunctionId) {
              console.error("No QLC+ function found for attribute ID: " + attrId + " and value: " + selectedValue);
              continue;
            }
            resString += `\n<Step Number="${stepNumber}">${qlcFunctionId}</Step>`;
            stepNumber++;
          }
        }
        resString += `\n</Function>`;
      }
    }

    const fileStr = await file.text();
    const resultXml = handleAddFunction(fileStr, resString);

    // download the resultXml as a .qxw file with the filename:
    // ${fileName}-generated-${new Date().toString()}.qxw

    const blob = new Blob([resultXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(".qxw", "")}-generated-${Date.now()}.qxw`;
    a.click();
    URL.revokeObjectURL(url);
    //

    console.log({ resString });
  }

  return (
    <Container size={"xl"}>
      <Divider my="lg" label="configure this event for QLC+ export" labelPosition="center" />
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
          <Grid.Col span={8}>
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
              {/* <Stack gap={0}>
                <Text> Configured attribute options </Text>
                <Text> Note: string inputs are not available for automatic configuration</Text>
              </Stack> */}

              {/* {event?.fixtureGroups.map((fixtureGroup, index) => (
            <Stack key={fixtureGroup.id}>
              <Text fw={700}>
                Group {index + 1}: {fixtureGroup.name}
              </Text>
              {fixtureGroup.attributes.filter(needsQlcMap).map((attribute, attrIndex) => (
                <Group key={attribute.id} style={{ alignItems: "start" }}>
                  <Text style={{ width: COLUMN_WIDTHS[0] }}>{attribute.name}</Text>
                  <OptionList attribute={attribute} />
                </Group>
              ))}
            </Stack>
          ))} */}

              <Grid columns={12}>
                {event?.fixtureGroups.map((fixtureGroup, index) => (
                  <>
                    <Grid.Col span={12} mt={"lg"}>
                      <Stack>
                        <Text>
                          Group {index + 1}: {fixtureGroup.name}
                        </Text>
                        <Divider />
                      </Stack>
                    </Grid.Col>
                    {fixtureGroup.attributes
                      .filter((v) => needsQlcMap(v.type))
                      .map((attribute, attrIndex) => (
                        <OptList2 key={attribute.id} attribute={attribute} groupedFnList={groupedFnList} form={form} />
                      ))}
                  </>
                ))}
              </Grid>
            </Stack>
          </Grid.Col>
        </form>
        <Grid.Col span={8}>
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
  if (!needsQlcMap(attribute.type)) return <></>;

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
        // <Group>
        //   <Stack style={{ maxWidth: COLUMN_WIDTHS[1] }}>
        //     <Text> Yes </Text>
        //     <Text> No </Text>
        //   </Stack>
        //   <Stack style={{ maxWidth: COLUMN_WIDTHS[2] }}>
        //     <IconArrowRightBar width={"1rem"} />
        //     <IconArrowRightBar width={"1rem"} />
        //   </Stack>
        // </Group>
      );
    case AttributeTypes.SELECT:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.SELECT].map((val, index) => (
            <>
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
            </>
          ))}
        </>
      );

    case AttributeTypes.MULTISELECT:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.MULTISELECT].map((val, index) => (
            <>
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
            </>
          ))}
        </>
      );

    case AttributeTypes.COLOUR:
      return (
        <>
          {attribute.optionPossibleValues[AttributeTypes.COLOUR].map((colourOption, index) => (
            <>
              <Grid.Col span={COLUMN_SPANS[0]}>
                <Text>{index === 0 ? attribute.name : ""}</Text>
              </Grid.Col>
              <Grid.Col span={COLUMN_SPANS[1]}>
                <Group key={index}>
                  <Box style={{ width: "1rem", height: "1rem", backgroundColor: colourOption.hex }} />
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
            </>
          ))}
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
      return <></>;
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
