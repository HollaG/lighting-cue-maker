// feature[class=Realtime] Presence information and lookup types

import type { ServerMessagePresenceUpdateData } from "./realtime";

export type PresenceInformation = ServerMessagePresenceUpdateData;
export type PresenceInformationMap = Record<string, PresenceInformation>;
