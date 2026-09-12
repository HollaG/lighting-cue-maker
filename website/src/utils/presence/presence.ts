import type { PresenceInformation } from "../../types/presence";
import type { ServerMessagePresenceUpdateData } from "../../types/realtime";

export const convertServerPresenceInformation = (presence: ServerMessagePresenceUpdateData): PresenceInformation => {
  return presence;
};
