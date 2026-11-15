/**
 * Fixed, synthetic scenes for the visualiser bench: no server data, the same scene every run, so numbers compare
 * across machines and across optimization steps.
 */
import { ChannelRole, ChannelType, type Channel, type FixtureTemplate } from "../../../types-v2/fixtureTemplates";
import type { PatchedFixture } from "../../../types-v2/patchedFixture";
import type { Visualiser3DCameraView, Visualiser3DObject } from "../../../types-v2/visualiser";
import type { Grid } from "../../../types-v2/fixtureGroups";
import { BlendMode, SelectableType, type PatternSelectable } from "../../../types-v2/optionSet";
import type { ActivePattern } from "../../../effects/pattern/patternPlayer";

export const SPOT_COUNTS = [0, 8, 30, 60, 100] as const;
export const LED_HEAD_COUNTS = [0, 64, 256, 1024] as const;
/** Heads per LED bar. 1024 heads = 64 bars. */
export const HEADS_PER_BAR = 16;

export type BenchSceneConfig = {
  spots: number;
  ledHeads: number;
  /** Editor gets up to 8 shadow casters (StagePreview3D's cap); viewer gets none, as today. */
  mode: "editor" | "viewer";
  /** 4× multisampling on the solid pass (R3F's default). The haze pass never uses it. */
  msaa: boolean;
  /**
   * "table": the light table with shared shadow storage, as the real visualiser uses; every spot casts a shadow.
   * "three": the old path, one three.js light per head, for comparison.
   */
  lighting: "three" | "table";
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

// --- DMX and effects ---

export type BenchEffect = "static" | "chase" | "fade";

/** Chase: hard steps. Fade: steps that fade for their whole length, so a fade is running every frame. */
const EFFECT_TIMING = {
  chase: { stepDuration: 500, fadeInDuration: 0, fadeOutDuration: 0 },
  fade: { stepDuration: 400, fadeInDuration: 400, fadeOutDuration: 400 },
} as const;

const PALETTE: [number, number, number][] = [
  [255, 40, 40],
  [40, 255, 80],
  [60, 90, 255],
  [255, 200, 40],
  [220, 60, 255],
  [255, 255, 255],
];

/** Static DMX: a fixed colour per head, full intensity. The patterns run on top of this. */
export const getBenchDmx = (fixtures: PatchedFixture[]): Record<string, (number | null)[]> => {
  const result: Record<string, (number | null)[]> = {};
  fixtures.forEach((f, i) => {
    result[f.id] =
      f.fixtureTemplateId === SPOT_TEMPLATE.id
        ? [255, ...PALETTE[i % PALETTE.length]]
        : Array.from({ length: HEADS_PER_BAR }, (_, head) => PALETTE[(i + head) % PALETTE.length]).flat();
  });
  return result;
};

/** One column-chase pattern over the spots' grid and one over the bars' grid (a row per bar). */
export const getBenchPatterns = (fixtures: PatchedFixture[], effect: BenchEffect): ActivePattern[] => {
  if (effect === "static") return [];
  const spots = fixtures.filter((f) => f.fixtureTemplateId === SPOT_TEMPLATE.id);
  const bars = fixtures.filter((f) => f.fixtureTemplateId === BAR_TEMPLATE.id);

  const spotColumns = Math.max(1, Math.ceil(Math.sqrt(spots.length)));
  const spotGrid: Grid = {
    cols: spotColumns,
    rows: Math.max(1, Math.ceil(spots.length / spotColumns)),
    cells: spots.map((f, i) => ({ fixtureId: f.id, head: 0, col: i % spotColumns, row: Math.floor(i / spotColumns) })),
  };
  const barGrid: Grid = {
    cols: HEADS_PER_BAR,
    rows: Math.max(1, bars.length),
    cells: bars.flatMap((f, row) =>
      Array.from({ length: HEADS_PER_BAR }, (_, head) => ({ fixtureId: f.id, head, col: head, row })),
    ),
  };

  const pattern = (id: string, grid: Grid, hex: string): ActivePattern => ({
    grid,
    selectable: {
      id,
      name: id,
      type: SelectableType.EFFECT_PATTERN,
      fixtureIds: "all",
      effect: "columnChase",
      colours: [{ name: id, hex }],
      blendMode: BlendMode.NORMAL,
      colourMode: "rgb",
      ...EFFECT_TIMING[effect],
    } as PatternSelectable,
  });
  return [
    ...(spots.length > 0 ? [pattern("bench-spots", spotGrid, "#40a0ff")] : []),
    ...(bars.length > 0 ? [pattern("bench-bars", barGrid, "#ff40d0")] : []),
  ];
};
