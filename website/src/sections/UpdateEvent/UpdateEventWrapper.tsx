import { Button, Center, Collapse, Container, Divider, Group, SimpleGrid, TagsInput, Textarea } from "@mantine/core";
import { EditFixtureGroupCard } from "../../components/FixtureGroup/EditFixtureGroupCard";
import { CustomTextInput } from "../../components/CustomTextInput/CustomTextInput";
import { useForm } from "@mantine/form";
import { useEffect, useMemo } from "react";
import type {
  AttributeConfiguration,
  AttributeTypesOptions,
  BumpConfiguration,
  FixtureGroupConfiguration,
  LightEventConfiguration,
} from "../../types/types";
import { AttributeTypes, BooleanOptions } from "../../types/types";
import { useAppStore } from "../../store/appStore";
import { useGetEvent } from "../../query/useGetEvent";
import { useUpdateEvent } from "../../query/useUpdateEvent";
import { notifications } from "@mantine/notifications";

/**
 * The form shape mirrors CreateEventWrapper's FormData, but uses real UUIDs as keys
 * instead of Date.now() timestamps.
 */
type EditFormData = {
  name: string;
  cuesPerBand?: number;
  uniqueCuesPerBand?: number;
  externalLink: string;
  description: string;
  bumpConfigurations: string[]; // read-only display, just names
  fixtureGroups: {
    [fixtureGroupId: string]: {
      name: string;
      attributes: {
        [attributeId: string]: AttributeConfiguration;
      };
    };
  };
};

/**
 * Converts backend LightEventConfiguration into the nested-object form shape
 * that Mantine's useForm expects (reverse of the `flatten` utility used during create).
 */
function eventToFormData(event: LightEventConfiguration): EditFormData {
  const fixtureGroups: EditFormData["fixtureGroups"] = {};

  for (const fg of event.fixtureGroups) {
    const attributes: { [attributeId: string]: AttributeConfiguration } = {};
    for (const attr of fg.attributes) {
      // Ensure optionPossibleValues has all keys so the form inputs work
      const opv: AttributeTypesOptions = {
        [AttributeTypes.SELECT]: attr.optionPossibleValues?.[AttributeTypes.SELECT] ?? [],
        [AttributeTypes.MULTISELECT]: attr.optionPossibleValues?.[AttributeTypes.MULTISELECT] ?? [],
        [AttributeTypes.COLOUR]: attr.optionPossibleValues?.[AttributeTypes.COLOUR] ?? [],
        [AttributeTypes.SLIDER]: attr.optionPossibleValues?.[AttributeTypes.SLIDER] ?? { min: 0, max: 100 },
        [AttributeTypes.BOOLEAN]: attr.optionPossibleValues?.[AttributeTypes.BOOLEAN] ?? BooleanOptions.UNCHECKED,
        [AttributeTypes.TEXT]: attr.optionPossibleValues?.[AttributeTypes.TEXT] ?? "",
        [AttributeTypes.NONE]: attr.optionPossibleValues?.[AttributeTypes.NONE] ?? null,
      };
      attributes[attr.id] = {
        ...attr,
        optionPossibleValues: opv,
      };
    }
    fixtureGroups[fg.id] = {
      name: fg.name,
      attributes,
    };
  }

  return {
    name: event.name,
    cuesPerBand: event.cuesPerBand,
    uniqueCuesPerBand: event.uniqueCuesPerBand,
    externalLink: event.externalLink ?? "",
    description: event.description ?? "",
    bumpConfigurations: event.bumpConfigurations.map((b: BumpConfiguration) => b.name),
    fixtureGroups,
  };
}

export const UpdateEventWrapper = () => {
  const code = useAppStore((s) => s.code);
  const isEditing = useAppStore((s) => s.isEditing);
  const setIsEditing = useAppStore((s) => s.setIsEditing);
  const { event, isValidEvent } = useGetEvent({ code });

  const { mutate: updateEvent, isPending: isSubmittingEvent } = useUpdateEvent();

  // Compute initial values from the event (memoized so we don't re-compute on every render)
  const initialValues = useMemo<EditFormData>(() => {
    if (!event) {
      return {
        name: "",
        cuesPerBand: undefined,
        uniqueCuesPerBand: undefined,
        externalLink: "",
        description: "",
        bumpConfigurations: [],
        fixtureGroups: {},
      };
    }
    return eventToFormData(event);
  }, [event]);

  const form = useForm<EditFormData>({
    mode: "uncontrolled",
    initialValues,
  });

  // When the event data changes (e.g. after initial fetch), reset the form
  useEffect(() => {
    if (event) {
      form.setValues(eventToFormData(event));
    }
  }, [event]);

  // Derive fixture group IDs and their attribute IDs from the event
  const fixtureGroupMeta = useMemo(() => {
    if (!event) return [];
    return event.fixtureGroups.map((fg: FixtureGroupConfiguration) => ({
      id: fg.id,
      attributeIds: fg.attributes.map((attr: AttributeConfiguration) => attr.id),
    }));
  }, [event]);

  const onSaveEventDetails = () => {
    if (!event) return;
    const v = form.getValues();

    const cuesPerBand =
      v.cuesPerBand !== undefined && typeof v.cuesPerBand === "string" ? Number(v.cuesPerBand) : v.cuesPerBand;
    const uniqueCuesPerBand =
      v.uniqueCuesPerBand !== undefined && typeof v.uniqueCuesPerBand === "string"
        ? Number(v.uniqueCuesPerBand)
        : v.uniqueCuesPerBand;

    updateEvent(
      {
        eventId: event.id,
        requestBody: {
          name: v.name,
          description: v.description,
          externalLink: v.externalLink,
          cuesPerBand,
          uniqueCuesPerBand,
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: "Saved",
            message: "Event details updated successfully.",
            color: "teal",
          });
        },
      },
    );
  };

  const shouldShow = isValidEvent && isEditing;

  if (!shouldShow) return null;

  return (
    <Collapse expanded={shouldShow}>
      <Container size={"xl"}>
        <Divider my="lg" label="editing event" labelPosition="center" />

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
              input: { fontSize: "16px" },
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
            label="Bump options (read-only)"
            description="Editing bump configurations is not yet supported"
            placeholder="Bumps defined for this event"
            variant="unstyled"
            readOnly
          />
        </Container>

        <Center mt={"md"}>
          <Group>
            <Button color="teal" size="md" onClick={onSaveEventDetails} loading={isSubmittingEvent}>
              Save event details
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="transparent">
              Finish editing
            </Button>
          </Group>
        </Center>

        <Divider my="lg" label="fixture groups" labelPosition="center" />

        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
          {fixtureGroupMeta.map((fg, index) => (
            <EditFixtureGroupCard
              key={fg.id}
              fixtureGroupId={fg.id}
              attributeIds={fg.attributeIds}
              form={form}
              index={index}
            />
          ))}
        </SimpleGrid>

        <Center mt={"xl"}>
          <Group>
            <Button variant="subtle" color="gray" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </Group>
        </Center>
      </Container>
    </Collapse>
  );
};
