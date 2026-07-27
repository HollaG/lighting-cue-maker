import { Button, Center, Collapse, Container, Divider, SimpleGrid, TagsInput, Textarea } from "@mantine/core";
import { AddFixtureGroupButton } from "../../components/FixtureGroup/AddFixtureGroupButton/AddFixtureGroupButton";
import { FixtureGroupCard } from "../../components/FixtureGroup/FixtureGroupCard";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { flatten } from "../../utils/flatten";
import type {
  AttributeConfiguration,
  BumpConfiguration,
  FixtureGroupConfiguration,
  LightEventConfiguration,
} from "../../types/types";
import { useAppStore } from "../../store/appStore";
import { useGetEvent } from "../../query/useGetEvent";
import { useCreateEvent } from "../../query/useCreateEvent";

type FormData = Omit<LightEventConfiguration, "fixtureGroups" | "id" | "bumpConfigurations"> & {
  fixtureGroups: {
    [fixtureGroupId: number]: Omit<FixtureGroupConfiguration, "attributes"> & {
      attributes: {
        [attributeId: number]: AttributeConfiguration;
      };
    };
  };

  // Actually saved as a full BumpConfiguration object in the backend, but we can modify
  // the FE to send full object data. The BE remains fully ready to support.
  bumpConfigurations: string[];
};

export const CreateEventWrapper = () => {
  const [fixtureGroupIds, setFixtureGroupIds] = useState<number[]>([]);
  const code = useAppStore((s) => s.code);
  const { isValidEvent } = useGetEvent({ code });

  const { isPending: isSubmitting, mutate: createEvent } = useCreateEvent();
  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      cuesPerBand: undefined,
      uniqueCuesPerBand: undefined,
      fixtureGroups: {},
      externalLink: "",
      description: "",
      bumpConfigurations: [],
    },
  });

  const onFormSubmit = async (v: FormData) => {
    // convert FormData into LightEventConfiguration
    if (v.cuesPerBand !== undefined && typeof v.cuesPerBand === "string") v.cuesPerBand = Number(v.cuesPerBand);
    if (v.uniqueCuesPerBand !== undefined && typeof v.uniqueCuesPerBand === "string")
      v.uniqueCuesPerBand = Number(v.uniqueCuesPerBand);
    const config = flatten(v) as Omit<LightEventConfiguration, "id">;

    console.log({ config });
    // convert all ID fields into String
    config.fixtureGroups.forEach((fixtureGroup) => {
      delete (fixtureGroup as { id?: string }).id;
      fixtureGroup.attributes.forEach((attribute) => {
        delete (attribute as { id?: string }).id;
      });
    });

    config.fixtureGroups = config.fixtureGroups.map((fixtureGroup) => ({
      ...fixtureGroup,
      attributes: fixtureGroup.attributes.filter((s) => Object.keys(s).length),
    }));

    // convert BumpConfigurations into array of { name: string }
    config.bumpConfigurations = v.bumpConfigurations.map((bumpConfiguration) => {
      return { name: bumpConfiguration } as BumpConfiguration;
    });

    createEvent(config);
  };

  if (isValidEvent) return null;
  return (
    <Collapse expanded={!isValidEvent}>
      <form onSubmit={form.onSubmit((v) => onFormSubmit(v))}>
        <Container size={"xl"}>
          <Divider my="lg" label="or, create a new event" labelPosition="center" />

          {/* <Title> Create a new event </Title> */}
          <Container ml={0} p={0}>
            <CustomTextInput
              placeholder="Type your event name here..."
              size="xxl"
              name="name"
              key={form.key("name")}
              {...form.getInputProps("name")}
            />
            <Textarea
              minRows={3}
              variant="unstyled"
              autosize
              name="description"
              key={form.key("description")}
              {...form.getInputProps("description")}
              placeholder="Type a brief description e.g. rules/remarks that choreographers can see."
              styles={{
                input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
              }}
            />
            <CustomTextInput
              label="Google Docs / OneDrive / Link"
              placeholder="Paste a link to more information, if necessary"
              name="externalLink"
              key={form.key("externalLink")}
              {...form.getInputProps("externalLink")}
            />
            <CustomTextInput
              label="How many cues per band? (optional)"
              placeholder="Enter a number..."
              name="cuesPerBand"
              type="number"
              key={form.key("cuesPerBand")}
              {...form.getInputProps("cuesPerBand")}
            />
            <CustomTextInput
              label="How many unique cues per band? (optional)"
              placeholder="Enter a number..."
              name="uniqueCuesPerBand"
              type="number"
              key={form.key("uniqueCuesPerBand")}
              {...form.getInputProps("uniqueCuesPerBand")}
            />

            <TagsInput
              name={"bumpConfigurations"}
              key={form.key("bumpConfigurations")}
              {...form.getInputProps("bumpConfigurations")}
              label="Define bump options"
              description="These are possible bumps (instantaneous changes in lighting) that you can do"
              placeholder="Type a name, then press enter to add"
              variant="unstyled"
            />
          </Container>

          <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
            {/* <FixtureGroupCard editable />
        <FixtureGroupCard editable />
        <FixtureGroupCard editable />

        <FixtureGroupCard editable /> */}

            {fixtureGroupIds.map((id, index) => (
              <FixtureGroupCard
                key={id}
                index={index}
                editable
                id={id}
                form={form}
                onDeleteFixtureGroup={(id) => {
                  setFixtureGroupIds((prev) => prev.filter((prevId) => prevId !== id));
                }}
              />
            ))}

            <AddFixtureGroupButton
              onClick={() => {
                // Date.now() keys the IDs in strictly ascending order, so we can preserve ordering.
                setFixtureGroupIds((prev) => [...prev, Date.now()]);
              }}
            />
          </SimpleGrid>

          <Center mt={"xl"}>
            <Button type="submit" color="teal" size="lg" disabled={isSubmitting}>
              {" "}
              Create Event{" "}
            </Button>
          </Center>
        </Container>{" "}
      </form>
    </Collapse>
  );
};
