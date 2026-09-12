export const CURSOR_COLORS = [
  "red",
  "pink",
  // "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  // "lime",
  // "green",
  // "yellow",
  // "orange",
] as const;

export const getColorFromId = (id: string) => {
  // stably generate a color from the peer's ID, so that each peer has a consistent color across all clients
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % CURSOR_COLORS.length;
  return CURSOR_COLORS[colorIndex];
};
