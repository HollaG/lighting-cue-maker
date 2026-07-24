import { Button, Center, Collapse, Container, Divider, SimpleGrid, Textarea } from "@mantine/core";
import { AddFixtureGroupButton } from "../../components/FixtureGroup/AddFixtureGroupButton/AddFixtureGroupButton";
import { FixtureGroupCard } from "../../components/FixtureGroup/FixtureGroupCard";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { flatten } from "../../utils/flatten";
import { useRequest } from "../../hooks/useRequest";
import type { AttributeConfiguration, FixtureGroupConfiguration, LightEventConfiguration } from "../../types/types";
import { useAppStore } from "../../store/appStore";
import type { CreateEventRes } from "../../types/http";
import { useGetEvent } from "../../query/useGetEvent";

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
  const code = useAppStore((s) => s.code);
  const { isValidEvent } = useGetEvent({ code });
  const setCode = useAppStore((s) => s.setCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeRequest } = useRequest<FormData, CreateEventRes>("/api/v1/events", "POST");
  const setActiveItemId = useAppStore((s) => s.setActiveItemId);
  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      cuesPerBand: undefined,
      uniqueCuesPerBand: undefined,
      fixtureGroups: {},
      externalLink: "",
      description: "",
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

    setIsSubmitting(true);
    try {
      const result = await executeRequest(config);
      if (result?.event?.id) {
        // set this ID as the event
        setCode(result.event.id);
        setActiveItemId("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidEvent) return;
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
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {" "}
              Create Event{" "}
            </Button>
          </Center>
        </Container>{" "}
      </form>
    </Collapse>
  );
};
