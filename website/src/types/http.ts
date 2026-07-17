import type { Cue } from "./cues";
import type { ApiResponse } from "./server";
import type { Item, LightEventConfiguration } from "./types";

export type GetEventRes = {
  event: LightEventConfiguration;
};

export type CreateCueReq = {};
export type CreateCueRes = { cue: Cue };

export type UpdateItemReq = Partial<Item>;

export type UpdateItemRes = { item: Item };
