import {
  Button,
  Center,
  Collapse,
  Container,
  Divider,
  SimpleGrid,
} from "@mantine/core";
import { AddFixtureGroupButton } from "../../components/FixtureGroup/AddFixtureGroupButton/AddFixtureGroupButton";
import { FixtureGroupCard } from "../../components/FixtureGroup/FixtureGroupCard";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { flatten } from "../../utils/flatten";
import { useRequest } from "../../hooks/useRequest";
import type { AttributeConfiguration, FixtureGroupConfiguration, LightEventConfiguration } from "../../types/types";
import { useAppStore } from "../../store/appStore";

type FormData = Omit<LightEventConfiguration, "fixtureGroups" | "id"> & {
  fixtureGroups: {
    [fixtureGroupId: number]: Omit<FixtureGroupConfiguration, "attributes"> & {
      attributes: {
        [attributeId: number]: AttributeConfiguration;
      };
    };
  };
};

export const CreateEventWrapper = () => {
  const [fixtureGroupIds, setFixtureGroupIds] = useState<number[]>([]);
  const isValidEvent = useAppStore((s) => s.isValidEvent);
  const { executeRequest } = useRequest("/api/v1/events", "POST");

  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      cuesPerBand: undefined,
      uniqueCuesPerBand: undefined,
      fixtureGroups: {},
    },
  });

  const onFormSubmit = (v: FormData) => {
    // convert FormData into LightEventConfiguration
    if (v.cuesPerBand !== undefined && typeof v.cuesPerBand === "string") v.cuesPerBand = Number(v.cuesPerBand);
    if (v.uniqueCuesPerBand !== undefined && typeof v.uniqueCuesPerBand === "string")
      v.uniqueCuesPerBand = Number(v.uniqueCuesPerBand);
    const config = flatten(v) as Omit<LightEventConfiguration, "id">;

    // convert all ID fields into String
    config.fixtureGroups.forEach((fixtureGroup) => {
      delete (fixtureGroup as { id?: string }).id;
      fixtureGroup.attributes.forEach((attribute) => {
        delete (attribute as { id?: string }).id;
      });
    });

    executeRequest(config);
  };
  return (
    <Collapse expanded={!isValidEvent}>
      <form onSubmit={form.onSubmit((v) => onFormSubmit(v))}>
        <Container size={"xl"}>
          <Divider my="lg" label="or, create a new event" labelPosition="center" />

          {/* <Title> Create a new event </Title> */}
          <CustomTextInput
            placeholder="Type your event name here..."
            size="xxl"
            name="name"
            key={form.key("name")}
            {...form.getInputProps("name")}
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
            <Button type="submit" size="lg">
              {" "}
              Create Event{" "}
            </Button>
          </Center>
        </Container>{" "}
      </form>
    </Collapse>
  );
};
