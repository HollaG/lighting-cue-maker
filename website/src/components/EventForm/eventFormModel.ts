import { AttributeTypes, BooleanOptions } from "../../types/types";
import type { CreateEventReq } from "../../types/http";
import type {
  AttributeConfiguration,
  BumpConfiguration,
  FixtureGroupConfiguration,
  LightEventConfiguration,
} from "../../types/types";

export type EventFormMode = "create" | "edit";
export type EventFormKey = string;

export type EventFormAttribute = Omit<AttributeConfiguration, "id"> & {
  /** Stable frontend identity. Always generated locally. */
  clientId: EventFormKey;
  /** Backend ID. Undefined when this attribute only exists in the form. */
  id?: string;
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
      [AttributeTypes.BOOLEAN]: BooleanOptions.UNCHECKED,
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

  for (const fixtureGroup of event.fixtureGroups) {
    const fixtureGroupClientId = createEventFormKey();
    const attributes: Record<EventFormKey, EventFormAttribute> = {};
    const attributeOrder: EventFormKey[] = [];

    for (const attribute of fixtureGroup.attributes) {
      const attributeClientId = createEventFormKey();
      attributeOrder.push(attributeClientId);
      attributes[attributeClientId] = {
        ...attribute,
        clientId: attributeClientId,
        id: attribute.id,
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

  return {
    name: event.name,
    cuesPerBand: event.cuesPerBand,
    uniqueCuesPerBand: event.uniqueCuesPerBand,
    externalLink: event.externalLink ?? "",
    description: event.description ?? "",
    bumpConfigurations: event.bumpConfigurations.map((bump: BumpConfiguration) => bump.name),
    fixtureGroupOrder,
    fixtureGroups,
  };
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
        const { clientId: _clientId, id: _id, ...attribute } = fixtureGroup.attributes[attributeClientId];
        return attribute;
      }),
      order: fixtureGroup.order,
    };
  }),
});
