/**
 * Fixed, synthetic scenes for the visualiser bench: no server data, the same scene every run, so numbers compare
 * across machines and across optimization steps.
 */
import { ChannelRole, ChannelType, type Channel, type FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { Visualiser3DCameraView, Visualiser3DObject } from "../../../types-v2/visualiser";

export const SPOT_COUNTS = [0, 8, 30, 60, 100] as const;
export const LED_HEAD_COUNTS = [0, 64, 256, 1024] as const;
/** Heads per LED bar. 1024 heads = 64 bars. */
export const HEADS_PER_BAR = 16;

export type BenchSceneConfig = {
  spots: number;
  ledHeads: number;
  /** Editor gets up to 8 shadow casters (StagePreview3D's cap); viewer gets none, as today. */
  mode: "editor" | "viewer";
};

export const BENCH_CAMERA: Visualiser3DCameraView = { position: [0, 7, 14], target: [0, 1, 0], fov: 70 };

const timestamps = { createdAt: "", updatedAt: "", deletedAt: null };

const channel = (id: string, type: ChannelType): Channel => ({
  id,
  name: type,
  defaultValue: 0,
  capabilities: [],
  type,
  role: ChannelRole.COARSE,
});

const SPOT_TEMPLATE: FixtureTemplate = {
  ...timestamps,
  id: "bench-spot",
  name: "Bench spot",
  manufacturer: "Bench",
  model: "Spot",
  type: "par",
  channels: [
    channel("spot-dim", ChannelType.DIMMER),
    channel("spot-r", ChannelType.RED),
    channel("spot-g", ChannelType.GREEN),
    channel("spot-b", ChannelType.BLUE),
  ],
  // No heads = one head with every channel.
  modes: [{ id: "spot-mode", name: "4ch", channelIds: ["spot-dim", "spot-r", "spot-g", "spot-b"], heads: [] }],
  properties: {
    columns: 1,
    rows: 1,
    maxPan: 0,
    maxTilt: 0,
    minBeamAngle: 25,
    maxBeamAngle: 25,
    brightnessModifier: 1,
  },
  modelUrl: "",
  importType: "custom",
  rawSource: "",
};

const barChannels = Array.from({ length: HEADS_PER_BAR }, (_, head) => [
  channel(`bar-${head}-r`, ChannelType.RED),
  channel(`bar-${head}-g`, ChannelType.GREEN),
  channel(`bar-${head}-b`, ChannelType.BLUE),
]).flat();

const BAR_TEMPLATE: FixtureTemplate = {
  ...timestamps,
  id: "bench-bar",
  name: "Bench LED bar",
  manufacturer: "Bench",
  model: `Bar ${HEADS_PER_BAR}`,
  type: "bar_pixel",
  channels: barChannels,
  modes: [
    {
      id: "bar-mode",
      name: `${HEADS_PER_BAR * 3}ch`,
      channelIds: barChannels.map((c) => c.id),
      heads: Array.from({ length: HEADS_PER_BAR }, (_, head) => ({
        name: `Pixel ${head + 1}`,
        channelIndexes: [head * 3, head * 3 + 1, head * 3 + 2],
      })),
    },
  ],
  properties: {
    columns: HEADS_PER_BAR,
    rows: 1,
    maxPan: 0,
    maxTilt: 0,
    minBeamAngle: 20,
    maxBeamAngle: 20,
    brightnessModifier: 1,
  },
  modelUrl: "",
  importType: "custom",
  rawSource: "",
};

export const BENCH_TEMPLATES = [SPOT_TEMPLATE, BAR_TEMPLATE];

const fixture = (
  id: string,
  template: FixtureTemplate,
  [x, y, z]: [number, number, number],
  name: string,
): PatchedFixture => ({
  ...timestamps,
  id,
  eventId: "bench",
  fixtureTemplateId: template.id,
  modeId: template.modes[0].id,
  name,
  // Stored in cm.
  posX: x * 100,
  posY: y * 100,
  posZ: z * 100,
  // Beams point along local +Y; turn them to point down.
  rotX: 180,
  rotY: 0,
  rotZ: 0,
});

/** Lays `count` items out in a centred grid of rows along X. */
const grid = (count: number, spacingX: number, spacingZ: number, y: number, z0: number) => {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, i): [number, number, number] => [
    ((i % columns) - (columns - 1) / 2) * spacingX,
    y,
    z0 + (Math.floor(i / columns) - (rows - 1) / 2) * spacingZ,
  ]);
};

export const getBenchFixtures = ({ spots, ledHeads }: BenchSceneConfig): PatchedFixture[] => {
  // Spots on a 6 m high grid, narrow enough that 100 of them still fit over the 20 m stage.
  const spotSpacing = Math.min(1.8, 16 / Math.max(1, Math.ceil(Math.sqrt(spots))));
  const spotFixtures = grid(spots, spotSpacing, spotSpacing, 6, 0).map((position, i) =>
    fixture(`spot-${i}`, SPOT_TEMPLATE, position, `Spot ${i + 1}`),
  );

  const bars = Math.ceil(ledHeads / HEADS_PER_BAR);
  const barFixtures = grid(bars, 2, 1, 4, 0).map((position, i) =>
    fixture(`bar-${i}`, BAR_TEMPLATE, position, `LED bar ${i + 1}`),
  );

  return [...spotFixtures, ...barFixtures];
};

/** A riser, boxes and people, so shadow errors are visible. */
export const BENCH_OBJECTS: Visualiser3DObject[] = [
  {
    id: "riser",
    name: "Riser",
    type: "cuboid",
    props: { position: [0, 0.25, -3], rotation: [0, 0, 0], size: [6, 0.5, 2], color: "#8ac" },
  },
  {
    id: "box-left",
    name: "Box left",
    type: "cuboid",
    props: { position: [-5, 0.5, 1], rotation: [0, 0.4, 0], size: [1, 1, 1], color: "#ca8" },
  },
  {
    id: "box-right",
    name: "Box right",
    type: "cuboid",
    props: { position: [5, 0.75, 0], rotation: [0, -0.3, 0], size: [1, 1.5, 1], color: "#a8c" },
  },
  ...[-3, -1, 1, 3].map(
    (x, i): Visualiser3DObject => ({
      id: `human-${i}`,
      name: `Human ${i + 1}`,
      type: "default_human",
      props: { position: [x, 1.75 / 2, 1 + (i % 2)], rotation: [0, 0, 0] },
    }),
  ),
  {
    id: "human-riser",
    name: "Human on riser",
    type: "default_human",
    props: { position: [0, 0.5 + 1.75 / 2, -3], rotation: [0, 0, 0] },
  },
];

// --- DMX ---

export type BenchEffect = "static" | "chase" | "fade";

/** Step length of the chase, and how often the fade updates (the current pattern clock's 30 Hz). */
export const CHASE_STEP_MS = 500;
export const FADE_TICK_MS = 1000 / 30;

const PALETTE: [number, number, number][] = [
  [255, 40, 40],
  [40, 255, 80],
  [60, 90, 255],
  [255, 200, 40],
  [220, 60, 255],
  [255, 255, 255],
];

const hueToRgb = (hue: number): [number, number, number] => {
  const h = ((hue % 1) + 1) % 1;
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
};

/** DMX values per fixture at `timeMs`. `static` is a fixed colour per fixture. */
export const getBenchDmx = (
  fixtures: PatchedFixture[],
  effect: BenchEffect,
  timeMs: number,
): Record<string, (number | null)[]> => {
  const step = Math.floor(timeMs / CHASE_STEP_MS);
  const colourAt = (cell: number, cellCount: number): [number, number, number] => {
    if (effect === "fade") return hueToRgb(timeMs / 4000 + cell / cellCount);
    const offset = effect === "chase" ? step : 0;
    return PALETTE[(cell + offset) % PALETTE.length];
  };

  const result: Record<string, (number | null)[]> = {};
  fixtures.forEach((f, i) => {
    if (f.fixtureTemplateId === SPOT_TEMPLATE.id) {
      result[f.id] = [255, ...colourAt(i, fixtures.length)];
    } else {
      result[f.id] = Array.from({ length: HEADS_PER_BAR }, (_, head) =>
        colourAt(i * HEADS_PER_BAR + head, HEADS_PER_BAR * 4),
      ).flat();
    }
  });
  return result;
};
