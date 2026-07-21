import type { Cue } from "./cues";
import type { ApiResponse } from "./server";
import type { Item, LightEventConfiguration } from "./types";

export type GetEventRes = {
  event: LightEventConfiguration;
};

export type CreateCueReq = {};
export type CreateCueRes = { cue: Cue };

export type GetCuesReq = {};
export type GetCuesRes = { cues: Cue[] };

export type UpdateItemReq = Partial<Item>;

export type UpdateItemRes = { item: Item };

export type UpdateCueReq = Partial<Cue>;
export type UpdateCueRes = { cue: Cue };

export type GenerateQlcCollections = {
  maxFunctionId: number;
  attributeValueToFunctionMap: { [valueId: string]: string[] };
  lightEventId: string;
};

export type GenerateQlcCollectionsRes = {
  items: Item[];
};
