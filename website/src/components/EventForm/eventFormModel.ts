import { AttributeTypes, BooleanOptions } from "../../types/types";
import type { CreateEventReq, UpdateEventReq } from "../../types/http";
import type {
  AttributeConfiguration,
  AttributeTypesOptions,
  BumpConfiguration,
  ColourOption,
  FixtureGroupConfiguration,
  LightEventConfiguration,
  PresetPositionOption,
} from "../../types/types";

export type EventFormMode = "create" | "edit";
export type EventFormKey = string;

// For any types that differ from the Form and the Backend
// This may occur due to a different way of configuring the BE values:
//   for example, configuring number values in the BE may require string values in the FE Form.
export type EventFormAttributeOptions = Omit<
  AttributeTypesOptions,
  typeof AttributeTypes.SLIDER_PRESETS | typeof AttributeTypes.PRESET_INTENSITY | typeof AttributeTypes.PRESET_POSITION
> & {
  [AttributeTypes.SLIDER_PRESETS]?: string[];
  [AttributeTypes.PRESET_INTENSITY]?: string[];
  [AttributeTypes.PRESET_POSITION]?: string[];
};

export type EventFormAttribute = Omit<AttributeConfiguration, "id" | "metadata" | "optionPossibleValues"> & {
  /** Stable frontend identity. Always generated locally. */
  clientId: EventFormKey;
  /** Backend ID. Undefined when this attribute only exists in the form. */
  id?: string;
  /** Values shaped for form controls, which can differ from the persisted domain types. */
  optionPossibleValues: EventFormAttributeOptions;
  metadata: {
    placeholder?: string;
    required?: "true" | "false"; // STRING!!
    defaultValue?: string | string[] | ColourOption | PresetPositionOption | boolean | number;
  };
};

export type EventFormFixtureGroup = Omit<FixtureGroupConfiguration, "id" | "attributes"> & {
  /** Stable frontend identity. Always generated locally. */
  clientId: EventFormKey;
  /** Backend ID. Undefined when this fixture group only exists in the form. */
  id?: string;
  attributeOrder: EventFormKey[];
  attributes: Record<EventFormKey, EventFormAttribute>;
};

export type EventFormValues = {
  name: string;
  cuesPerBand?: number | string;
  uniqueCuesPerBand?: number | string;
  externalLink: string;
  description: string;
  bumpConfigurations: string[];
  fixtureGroupOrder: EventFormKey[];
  fixtureGroups: Record<EventFormKey, EventFormFixtureGroup>;
};

export type EventFormProps = {
  mode: EventFormMode;
  initialValues?: EventFormValues;
  isSubmitting?: boolean;
  submitLabel?: string;
  bumpConfigurationsReadOnly?: boolean;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

let lastGeneratedTimestamp = 0;

/**
 * Produces a timestamp-based form key. The monotonic fallback prevents two
 * additions in the same millisecond from receiving the same key.
 */
export const createEventFormKey = (): EventFormKey => {
  lastGeneratedTimestamp = Math.max(Date.now(), lastGeneratedTimestamp + 1);
  return String(lastGeneratedTimestamp);
};

export const createEmptyEventFormValues = (): EventFormValues => ({
  name: "",
  cuesPerBand: undefined,
  uniqueCuesPerBand: undefined,
  externalLink: "",
  description: "",
  bumpConfigurations: [],
  fixtureGroupOrder: [],
  fixtureGroups: {},
});

export const createEmptyEventFormAttribute = (attributeCount: number): EventFormAttribute => {
  const clientId = createEventFormKey();

  return {
    clientId,
    id: undefined,
    name: "",
    type: AttributeTypes.NONE,
    metadata: {},
    optionPossibleValues: {
      [AttributeTypes.SELECT]: [],
      [AttributeTypes.MULTISELECT]: [],
      [AttributeTypes.COLOUR]: [],
      [AttributeTypes.SLIDER]: { min: 0, max: 100 },
      [AttributeTypes.SLIDER_PRESETS]: [],
      [AttributeTypes.BOOLEAN]: BooleanOptions.UNCHECKED,
      [AttributeTypes.PRESET_INTENSITY]: [],
      [AttributeTypes.PRESET_COLOUR]: [],
      [AttributeTypes.PRESET_POSITION]: [],
      [AttributeTypes.TEXT]: "",
      [AttributeTypes.NONE]: null,
    },
    order: attributeCount,
  };
};

export const createEmptyEventFormFixtureGroup = (fixtureGroupCount: number): EventFormFixtureGroup => {
  const clientId = createEventFormKey();

  return {
    clientId,
    id: undefined,
    name: "",
    attributeOrder: [],
    attributes: {},
    order: fixtureGroupCount,
  };
};

/** Converts backend event data into the shared stable-key form shape. */
export const eventToEventFormValues = (event: LightEventConfiguration): EventFormValues => {
  const fixtureGroups: Record<EventFormKey, EventFormFixtureGroup> = {};
  const fixtureGroupOrder: EventFormKey[] = [];

  const orderedFixtureGroups = [...event.fixtureGroups].sort((a, b) => a.order - b.order);

  for (const fixtureGroup of orderedFixtureGroups) {
    const fixtureGroupClientId = createEventFormKey();
    const attributes: Record<EventFormKey, EventFormAttribute> = {};
    const attributeOrder: EventFormKey[] = [];

    const orderedAttributes = [...fixtureGroup.attributes].sort((a, b) => a.order - b.order);

    for (const attribute of orderedAttributes) {
      const attributeClientId = createEventFormKey();
      attributeOrder.push(attributeClientId);
      attributes[attributeClientId] = {
        ...attribute,
        clientId: attributeClientId,
        id: attribute.id,
        optionPossibleValues: attributeOptionsToFormAttributeOptions(attribute.optionPossibleValues),
        metadata: attributeMetadataToFormAttributeMetadata(attribute.metadata),
      };
    }

    fixtureGroupOrder.push(fixtureGroupClientId);
    fixtureGroups[fixtureGroupClientId] = {
      clientId: fixtureGroupClientId,
      id: fixtureGroup.id,
      name: fixtureGroup.name,
      attributeOrder,
      attributes,
      order: fixtureGroup.order,
    };
  }

  const result = {
    name: event.name,
    cuesPerBand: event.cuesPerBand,
    uniqueCuesPerBand: event.uniqueCuesPerBand,
    externalLink: event.externalLink ?? "",
    description: event.description ?? "",
    bumpConfigurations: event.bumpConfigurations.map((bump: BumpConfiguration) => bump.name),
    fixtureGroupOrder,
    fixtureGroups,
  };

  console.log("eventToEventFormValues", { event, result });
  return result;
};

/** Removes frontend-only identity and produces the create-event API payload. */
export const eventFormValuesToCreateRequest = (values: EventFormValues): CreateEventReq => ({
  name: values.name,
  description: values.description,
  externalLink: values.externalLink,
  cuesPerBand: values.cuesPerBand === undefined || values.cuesPerBand === "" ? undefined : Number(values.cuesPerBand),
  uniqueCuesPerBand:
    values.uniqueCuesPerBand === undefined || values.uniqueCuesPerBand === ""
      ? undefined
      : Number(values.uniqueCuesPerBand),
  bumpConfigurations: values.bumpConfigurations.map((name) => ({ name })),
  fixtureGroups: values.fixtureGroupOrder.map((fixtureGroupClientId) => {
    const fixtureGroup = values.fixtureGroups[fixtureGroupClientId];

    return {
      name: fixtureGroup.name,
      attributes: fixtureGroup.attributeOrder.map((attributeClientId) => {
        const {
          clientId: _clientId,
          id: _id,
          metadata,
          optionPossibleValues,
          ...attribute
        } = fixtureGroup.attributes[attributeClientId];
        return {
          ...attribute,
          metadata: formAttributeMetadataToAttributeMetadata(metadata),
          optionPossibleValues: formAttributeOptionsToAttributeOptions(attribute.type, optionPossibleValues),
        };
      }),

      order: fixtureGroup.order,
    };
  }),
});

/**
 * Produces the aggregate event PATCH payload. Backend IDs are retained for
 * existing records and omitted for records that only exist in the form.
 */
export const eventFormValuesToUpdateRequest = (values: EventFormValues): UpdateEventReq => ({
  name: values.name,
  description: values.description,
  externalLink: values.externalLink,
  cuesPerBand: values.cuesPerBand === undefined || values.cuesPerBand === "" ? undefined : Number(values.cuesPerBand),
  uniqueCuesPerBand:
    values.uniqueCuesPerBand === undefined || values.uniqueCuesPerBand === ""
      ? undefined
      : Number(values.uniqueCuesPerBand),
  fixtureGroups: values.fixtureGroupOrder.map((fixtureGroupClientId, fixtureGroupIndex) => {
    const fixtureGroup = values.fixtureGroups[fixtureGroupClientId];

    return {
      ...(fixtureGroup.id ? { id: fixtureGroup.id } : {}),
      name: fixtureGroup.name,
      order: fixtureGroupIndex,
      attributes: fixtureGroup.attributeOrder.map((attributeClientId, attributeIndex) => {
        const attribute = fixtureGroup.attributes[attributeClientId];

        return {
          ...(attribute.id ? { id: attribute.id } : {}),
          name: attribute.name,
          type: attribute.type,
          metadata: formAttributeMetadataToAttributeMetadata(attribute.metadata),
          optionPossibleValues: formAttributeOptionsToAttributeOptions(attribute.type, attribute.optionPossibleValues),
          order: attributeIndex,
        };
      }),
    };
  }),
});

const formAttributeMetadataToAttributeMetadata = (
  metadata: EventFormAttribute["metadata"],
): AttributeConfiguration["metadata"] => ({
  placeholder: metadata.placeholder,
  required: metadata.required === "true",
  defaultValue: metadata.defaultValue,
});

/** Keeps only the option supported by the selected attribute type. */
const formAttributeOptionsToAttributeOptions = (
  type: AttributeConfiguration["type"],
  options: EventFormAttributeOptions,
): AttributeTypesOptions => {
  switch (type) {
    case AttributeTypes.SELECT:
      return { [AttributeTypes.SELECT]: options[AttributeTypes.SELECT] ?? [] };
    case AttributeTypes.MULTISELECT:
      return { [AttributeTypes.MULTISELECT]: options[AttributeTypes.MULTISELECT] ?? [] };
    case AttributeTypes.COLOUR:
      return { [AttributeTypes.COLOUR]: options[AttributeTypes.COLOUR] ?? [] };
    case AttributeTypes.SLIDER:
      return { [AttributeTypes.SLIDER]: options[AttributeTypes.SLIDER] ?? { min: 0, max: 100 } };
    case AttributeTypes.SLIDER_PRESETS:
      return {
        [AttributeTypes.SLIDER_PRESETS]: options[AttributeTypes.SLIDER_PRESETS]
          ? options[AttributeTypes.SLIDER_PRESETS]!.map(Number).sort((a, b) => a - b)
          : [],
      };
    case AttributeTypes.BOOLEAN:
      return { [AttributeTypes.BOOLEAN]: options[AttributeTypes.BOOLEAN] ?? BooleanOptions.UNCHECKED };

    case AttributeTypes.PRESET_INTENSITY:
      return {
        [AttributeTypes.PRESET_INTENSITY]: options[AttributeTypes.PRESET_INTENSITY]
          ? options[AttributeTypes.PRESET_INTENSITY]!.map(Number).sort((a, b) => a - b)
          : [],
      };
    case AttributeTypes.PRESET_COLOUR:
      return { [AttributeTypes.PRESET_COLOUR]: options[AttributeTypes.PRESET_COLOUR] ?? [] };
    case AttributeTypes.PRESET_POSITION:
      return {
        [AttributeTypes.PRESET_POSITION]: (options[AttributeTypes.PRESET_POSITION] ?? []).map((position) => ({
          // IMPORTANT NOTE: When creating a new position, the pan and tilt will be set later.
          pan: 0,
          tilt: 0,
          name: position,
        })),
      };
    case AttributeTypes.TEXT:
    case AttributeTypes.NONE:
      return {};
  }
};

const attributeOptionsToFormAttributeOptions = (options: AttributeTypesOptions): EventFormAttributeOptions => ({
  ...options,
  [AttributeTypes.SLIDER_PRESETS]: (options[AttributeTypes.SLIDER_PRESETS] ?? []).map(String),
  [AttributeTypes.PRESET_INTENSITY]: (options[AttributeTypes.PRESET_INTENSITY] ?? []).map(String),
  [AttributeTypes.PRESET_POSITION]: (options[AttributeTypes.PRESET_POSITION] ?? []).map(
    (position) => position.name,
    //   {
    //   pan: String(position.pan),
    //   tilt: String(position.tilt),
    //   name: position.name,
    // }
  ),
});

const attributeMetadataToFormAttributeMetadata = (
  metadata: AttributeConfiguration["metadata"],
): EventFormAttribute["metadata"] => ({
  placeholder: metadata.placeholder,
  required: metadata.required ? "true" : "false",
  defaultValue: metadata.defaultValue,
});
