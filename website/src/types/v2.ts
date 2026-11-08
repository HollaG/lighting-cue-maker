/**
 * CueSketch v2 data model.
 *
 * Roles:
 *  - LD (lighting designer) sets up: fixture templates, patched fixtures, fixture groups,
 *    option sets, selectables, and export mappings.
 *  - Users pick selectables per cue, and may override single fixtures.
 *
 * Software-agnostic: nothing here is QLC+-specific. Importers (e.g. .qxf) convert into
 * these types; exporters (e.g. .qxw) read from them.
 */

import type { CueTransition } from "./cues";

// ─── IDs ─────────────────────────────────────────────────────────────────────

export type EventId = string;
export type TemplateId = string;
export type TemplateChannelId = string;
export type FixtureId = string;
export type FixtureGroupId = string;
export type OptionSetId = string;
export type SelectableId = string;
export type NoteFieldId = string;
export type CueId = string;

/** A colour as "#RRGGBB". */
export type HexColour = string;

type Timestamps = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. FIXTURE TEMPLATES (what a light model IS; ≈ a QLC+ .qxf file)
// ═════════════════════════════════════════════════════════════════════════════

export const FixtureKind = {
  PAR: "par",
  BAR: "bar",
  MOVING_HEAD: "moving_head",
  SCANNER: "scanner",
  STROBE: "strobe",
  DIMMER: "dimmer",
  HAZER: "hazer",
  OTHER: "other",
} as const;
export type FixtureKind = (typeof FixtureKind)[keyof typeof FixtureKind];

/**
 * What a channel does, in CueSketch's own neutral terms.
 * Coarse/fine is a separate flag on the channel, not part of the type.
 */
export const ChannelType = {
  // intensity
  MASTER_DIMMER: "masterDimmer",
  DIMMER: "dimmer",
  // colour mixing
  RED: "red",
  GREEN: "green",
  BLUE: "blue",
  WHITE: "white",
  AMBER: "amber",
  UV: "uv",
  LIME: "lime",
  INDIGO: "indigo",
  CYAN: "cyan",
  MAGENTA: "magenta",
  YELLOW: "yellow",
  CTO: "cto",
  // colour, other
  COLOUR_WHEEL: "colourWheel",
  COLOUR_MACRO: "colourMacro",
  // position
  PAN: "pan",
  TILT: "tilt",
  PAN_TILT_SPEED: "panTiltSpeed",
  // beam
  SHUTTER: "shutter", // includes strobe
  IRIS: "iris",
  FOCUS: "focus",
  ZOOM: "zoom",
  FROST: "frost",
  GOBO_WHEEL: "goboWheel",
  GOBO_ROTATION: "goboRotation",
  PRISM: "prism",
  PRISM_ROTATION: "prismRotation",
  // misc
  EFFECT: "effect",
  MAINTENANCE: "maintenance",
  NO_FUNCTION: "noFunction",
  /** Not recognised; can only be set as an individual value. */
  CUSTOM: "custom",
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

/**
 * One labelled DMX value range on a channel, e.g. 1–255 "Strobe slow to fast".
 * `meaning` is optional: imported files often leave ranges unlabelled.
 */
export type ChannelCapability = {
  from: number; // DMX value 0–255
  to: number; // DMX value 0–255, >= from, ranges must not overlap
  description: string;

  /** Neutral meaning, e.g. "shutterOpen", "strobeSlowToFast", "colour", "gobo". */
  meaning?: string;
  /** For colour-wheel/macro ranges. */
  colour?: HexColour;
  colour2?: HexColour;
  /** For gobo ranges. */
  imageUrl?: string;
  /** Physical values when known (e.g. Hz for strobe, degrees for zoom), interpolated across from→to. */
  physical?: { from: number; to: number; unit: "Hz" | "deg" | "%" | "faces" };
};

export type TemplateChannel = {
  id: TemplateChannelId; // stable within the template; modes refer to it
  name: string;
  type: ChannelType;
  /** Fine (LSB) channel of a 16-bit pair. Pairs with the coarse channel of the same type. */
  fine: boolean;
  defaultValue: number; // 0–255
  capabilities: ChannelCapability[];

  /** Original preset/type from the imported file (e.g. "IntensityRed"), kept for re-export. */
  sourcePreset?: string;
};

/** A cell of a multi-cell fixture; lists channel offsets within its mode. */
export type TemplateHead = {
  channelOffsets: number[];
};

/** A DMX layout of the fixture. Channel order = offset order (0-based). */
export type TemplateMode = {
  name: string;
  channelIds: TemplateChannelId[];
  /** Empty = treat the whole mode as one head. */
  heads: TemplateHead[];
};

export type PhysicalProperties = {
  lens: { degreesMin: number; degreesMax: number }; // fixed lens: min === max
  panMaxDeg: number; // 0 if no pan
  tiltMaxDeg: number; // 0 if no tilt
  /** Columns × rows of heads, for bars and panels. */
  layout: { columns: number; rows: number };
  dimensionsMm?: { width: number; height: number; depth: number };
  weightKg?: number;
  powerW?: number;
  /** Visualiser calibration (%). */
  maxBrightness: number;
};

export type FixtureTemplate = {
  id: TemplateId;
  name: string;
  manufacturer: string;
  model: string;
  kind: FixtureKind;

  channels: TemplateChannel[];
  modes: TemplateMode[];
  physical: PhysicalProperties;

  /** 3D model for the visualiser. */
  modelUrl?: string;

  /** Where it came from, for re-export and "update from library". */
  source?: {
    format: "qlc-qxf" | "gdtf" | "manual";
    /** Original file content, kept so round-trips lose nothing. */
    originalFile?: string;
  };
};

/** A snapshot of a template stored on the event (JSON). Fixtures point at these. */
export type EventFixtureTemplate = FixtureTemplate & {
  /** The library template it was copied from, if any. */
  libraryTemplateId?: TemplateId;
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. EVENT + PATCHED FIXTURES (the actual lights on stage)
// ═════════════════════════════════════════════════════════════════════════════

export type EventV2 = Timestamps & {
  id: EventId;
  name: string;
  description: string;
  externalLink?: string;
  metadata?: Record<string, unknown>;

  /** JSON column. Copied from the library when the LD adds a fixture type. */
  fixtureTemplates: EventFixtureTemplate[];
};

export type Vec3 = { x: number; y: number; z: number };

export type PatchedFixture = Timestamps & {
  id: FixtureId;
  eventId: EventId;
  name: string; // e.g. "Wash L1"

  templateId: TemplateId; // id within event.fixtureTemplates
  modeName: string;

  universe: number; // 0-based
  address: number; // DMX start address, 1–512

  positionCm: Vec3;
  rotationDeg: Vec3;
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. FIXTURE GROUPS (cue card headers; home of option sets and effect layouts)
// ═════════════════════════════════════════════════════════════════════════════

/** Where one head sits in the group's grid (for pattern effects) and its order (for movement effects). */
export type GroupGridCell = {
  fixtureId: FixtureId;
  head: number; // head index within the fixture, 0 for single-head fixtures
  column: number;
  row: number;
};

export type FixtureGroup = Timestamps & {
  id: FixtureGroupId;
  eventId: EventId;
  name: string; // e.g. "Wash"

  fixtureIds: FixtureId[];

  /** Suggested from stage positions; the LD can adjust. Cell order = movement propagation order. */
  grid: { columns: number; rows: number; cells: GroupGridCell[] };

  order: number; // position in the cue card
  hidden?: boolean; // e.g. to hide the built-in "All" group
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. OPTION SETS + NOTE FIELDS (what users can pick inside a group)
// ═════════════════════════════════════════════════════════════════════════════

export const SelectionType = {
  SINGLE: "single",
  MULTI: "multi",
  TOGGLE: "toggle", // exactly one selectable: on/off
} as const;
export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType];

export type OptionSet = Timestamps & {
  id: OptionSetId;
  groupId: FixtureGroupId;
  name: string; // e.g. "Colour"

  selectionType: SelectionType;
  /** Used when the group is active but the user picked nothing. Empty = contributes nothing. */
  defaultSelectableIds: SelectableId[];
  /**
   * Export write order (default 0). Higher priority = written later into the console's cue
   * (e.g. a QLC+ Collection), like v1's "Always lowest / Always highest". What "later" means
   * for the output is up to the console (QLC+: last wins on LTP channels, highest value on HTP).
   */
  priority: number;

  /** Which pre-made it started from, if any (only affects the editor UI). */
  template?: "intensity" | "colour";
  order: number;
};

/** Free text for the LD, e.g. "Comments". Not exported to the console. */
export type NoteField = Timestamps & {
  id: NoteFieldId;
  groupId: FixtureGroupId | null; // null = applies to the whole cue
  name: string;
  placeholder?: string;
  order: number;
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. SELECTABLES (the options inside an option set)
// ═════════════════════════════════════════════════════════════════════════════

export const SelectableKind = {
  INTENSITY: "intensity",
  COLOUR: "colour",
  CUSTOM: "custom",
  EFFECT_PATTERN: "effectPattern",
  EFFECT_MOVEMENT: "effectMovement",
} as const;
export type SelectableKind = (typeof SelectableKind)[keyof typeof SelectableKind];

type SelectableBase = Timestamps & {
  id: SelectableId;
  optionSetId: OptionSetId;
  name: string; // e.g. "Red", "50%", "Rainbow chase"
  order: number; // sequence within the set; also the order exported into the console's cue (e.g. QLC+ Collection).
  // The preview treats later as winning on overlapping channels; the console may differ (QLC+: highest value wins on intensity/colour).
  /** "all" = every fixture in the group, including ones added later. */
  fixtures: "all" | FixtureId[];
};

/**
 * Brightness, per fixture:
 *  - master dimmer present → master = percent (per-head dimmers opened fully, like QLC+ RGB Matrix)
 *  - only per-head dimmers (ChannelType.DIMMER) → those = percent
 *  - no dimmer at all (e.g. RGB-only pars) → scales the colour channels instead
 */
export type IntensitySelectable = SelectableBase & {
  kind: typeof SelectableKind.INTENSITY;
  percent: number; // 0–100
};

/**
 * Hue at full brightness; brightness comes only from IntensitySelectable. Per fixture:
 *  - RGB → direct; CMY → QLC+-style CMYK conversion (black part dropped)
 *  - white / amber / UV / lime / indigo channels used when present
 *  - colour wheel only → nearest capability colour
 *  - no colour channels → skipped
 */
export type ColourSelectable = SelectableBase & {
  kind: typeof SelectableKind.COLOUR;
  colour: HexColour; // RGB / CMY / W / A / UV values are worked out per fixture
};

/** Value for every selected fixture that has a channel of this type. */
export type CommonChannelValue = { channelType: ChannelType; fine?: boolean; value: number };
/** Value for one fixture's specific channel; overrides common values. */
export type IndividualChannelValue = { channelId: TemplateChannelId; value: number };

export type CustomSelectable = SelectableBase & {
  kind: typeof SelectableKind.CUSTOM;
  common: CommonChannelValue[];
  individual: {
    [fixtureId: FixtureId]: IndividualChannelValue[];
  };
};

/*
 * Effects are for PREVIEW and labelling only. On export they map to an effect the LD
 * built in the console (QLC+ RGB Matrix / EFX), so CueSketch exposes a small, simple subset.
 */

export type EffectSpeed = "slow" | "medium" | "fast";

/** Curated patterns that also work on a single row of fixtures. */
export const PatternEffect = {
  CHASE: "chase", // QLC+ Stripes
  FILL: "fill", // QLC+ Fill Unfill
  FROM_CENTRE: "fromCentre", // QLC+ Fill Unfill From Center
  ALTERNATE: "alternate", // QLC+ Alternate / Even-Odd
  WAVE: "wave", // QLC+ Waves
  RANDOM: "random", // QLC+ Random Fill Column
  TWINKLE: "twinkle", // QLC+ Confetti / TwinkleFox
  RAINBOW: "rainbow", // QLC+ Gradient
  STROBE: "strobe", // QLC+ Strobe
} as const;
export type PatternEffect = (typeof PatternEffect)[keyof typeof PatternEffect];

/** ≈ QLC+ RGB Matrix (preview only). Uses the group's grid. */
export type EffectPatternSelectable = SelectableBase & {
  kind: typeof SelectableKind.EFFECT_PATTERN;
  effect: PatternEffect;
  target: "colour" | "intensity";
  /** 1–2 colours; ignored by effects that make their own (rainbow). */
  colours: HexColour[];
  speed: EffectSpeed;
  reverse: boolean;
};

export const MovementShape = {
  CIRCLE: "circle",
  FIGURE_EIGHT: "figureEight",
  SWEEP: "sweep", // QLC+ Line
  SQUARE: "square",
} as const;
export type MovementShape = (typeof MovementShape)[keyof typeof MovementShape];

/** ≈ QLC+ EFX (preview only). Moves pan/tilt; uses the group's grid order for "wave". */
export type EffectMovementSelectable = SelectableBase & {
  kind: typeof SelectableKind.EFFECT_MOVEMENT;
  shape: MovementShape;
  size: "small" | "medium" | "large";
  speed: EffectSpeed;
  /** together = all fixtures in sync (QLC+ Parallel); wave = offset along the group order (QLC+ Asymmetric). */
  spread: "together" | "wave";
};

export type Selectable =
  IntensitySelectable | ColourSelectable | CustomSelectable | EffectPatternSelectable | EffectMovementSelectable;

// ═════════════════════════════════════════════════════════════════════════════
// 6. CUES (what users fill in)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A single-fixture override, picked from the same option set (intensity or colour only).
 * Shows the "check with your lighting designer" warning when it overlaps a selectable.
 */
export type FixtureOverride = {
  fixtureId: FixtureId;
  optionSetId: OptionSetId;
  selectableId: SelectableId;
};

export type CueV2 = {
  id: CueId;
  comments: string;
  transition: CueTransition;

  mode: "normal" | "blackout";
  /** Inactive groups contribute nothing (they do not force fixtures off). */
  activeGroupIds: FixtureGroupId[];
  /** Chosen selectables per option set. Missing key = use the option set's default. */
  selections: Record<OptionSetId, SelectableId[]>;
  notes: Record<NoteFieldId, string>;
  overrides: FixtureOverride[];

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Source of the live update, for collaboration. */
  updatedBy?: string;
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. RESOLVED OUTPUT (computed, not stored; read by the visualiser and exporters)
// ═════════════════════════════════════════════════════════════════════════════

/** Static channel values per fixture, after priorities and overrides. */
export type ResolvedChannelValues = Record<FixtureId, Record<TemplateChannelId, number>>;

export type ResolvedCue = {
  cueId: CueId;
  values: ResolvedChannelValues;
  /** Effects running in this cue, in application order. */
  effects: (EffectPatternSelectable | EffectMovementSelectable)[];
  /** Where a user override collides with a selectable (drives the warning). */
  conflicts: { fixtureId: FixtureId; overriddenBy: SelectableId; override: FixtureOverride }[];
};

// ═════════════════════════════════════════════════════════════════════════════
// 8. EXPORT (per console; QLC+ first)
// ═════════════════════════════════════════════════════════════════════════════

export type ExporterId = "qlc" | (string & {});

/** Path 1: a selectable maps to existing console functions (scenes, matrices, EFX). */
export type SelectableExportMapping = {
  exporterId: ExporterId;
  selectableId: SelectableId;
  consoleFunctionIds: string[];
};

/** Path 2: needed only when cues contain overrides that must be generated. */
export type FixtureExportLink = {
  exporterId: ExporterId;
  fixtureId: FixtureId;
  consoleFixtureId: string;
};

export type ExportSettings = {
  exporterId: ExporterId;
  selectableMappings: SelectableExportMapping[];
  fixtureLinks: FixtureExportLink[];
};
