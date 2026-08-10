export type RecentEvent = {
  eventId: string;
  eventName: string;
  lastOpenedAt: number;
};

export const STORAGE_KEY = "lighting-cue-maker:recent-events:v1";
const MAX_RECENT_EVENTS = 5;

export const getRecentEvents = (): RecentEvent[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (event): event is RecentEvent =>
        typeof event === "object" &&
        event !== null &&
        typeof event.eventId === "string" &&
        typeof event.eventName === "string" &&
        typeof event.lastOpenedAt === "number",
    );
  } catch {
    return [];
  }
};

export const saveRecentEvent = (event: Pick<RecentEvent, "eventId" | "eventName">) => {
  if (typeof window === "undefined") return;

  const recentEvents = getRecentEvents();
  const updatedEvents: RecentEvent[] = [
    {
      ...event,
      lastOpenedAt: Date.now(),
    },
    ...recentEvents.filter((recentEvent) => recentEvent.eventId !== event.eventId),
  ].slice(0, MAX_RECENT_EVENTS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
  } catch {
    // Recent-event history is optional and should never prevent the editor from loading.
  }
};

export const formatDate = (timestamp: number): string => {
  // return today, yesterday, or the date in a human-readable format
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    return "Today";
  } else if (diff < 2 * oneDay) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
};
