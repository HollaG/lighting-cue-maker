import type { PresenceInformation } from "../../types/realtime/presence";
import type { ServerMessagePresenceUpdateData } from "../../types/realtime/realtime";

export const convertServerPresenceInformation = (presence: ServerMessagePresenceUpdateData): PresenceInformation => {
  return presence;
};
