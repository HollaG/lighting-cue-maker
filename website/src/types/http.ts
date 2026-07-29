import type { Bump } from "./bumps";
import type { Cue } from "./cues";
import type { AttributeConfiguration, Item, LightEventConfiguration } from "./types";

export type GetEventRes = {
  event: LightEventConfiguration;
};

export type CreateEventReq = Omit<LightEventConfiguration, "id">;

export type CreateEventRes = {
  event: LightEventConfiguration;
};

export type CreateItemReq = {
  eventId: string;
  name: string;
};

export type CreateItemRes = {
  item: Item;
};

export type CreateCueReq = {};
export type CreateCueRes = {
  cue: Cue;
  //  item: Item
};

export type GetCuesReq = {};
export type GetCuesRes = { cues: Cue[] };

export type DeleteCuesRes = { message: string };

export type GetItemsRes = { items: Item[] };

export type GetItemRes = { item: Item };

export type UpdateItemReq = Partial<Item>;
export type UpdateItemRes = { item: Item };

export type UpdateCueReq = Partial<Cue>;
export type UpdateCueRes = { cue: Cue };

export type CreateBumpReq = { itemId: string; bumpConfigurationId: string };
export type CreateBumpRes = { bump: Bump };

export type UpdateEventReq = Pick<
  LightEventConfiguration,
  "name" | "uniqueCuesPerBand" | "cuesPerBand" | "description" | "externalLink"
>;
export type UpdateEventRes = CreateEventRes;

export type UpdateAttributeConfigReq = Pick<
  AttributeConfiguration,
  "metadata" | "name" | "optionPossibleValues" | "type"
>;

export type UpdateFixtureGroupConfigReq = { name: string };

export type CreateAttributeConfigReq = {
  fixtureGroupId: string;
  name: string;
};

export type GenerateQlcCollections = {
  maxFunctionId: number;
  attributeValueToFunctionMap: { [valueId: string]: string[] };
  lightEventId: string;
};

export type GenerateQlcCollectionsRes = {
  items: Item[];
};
