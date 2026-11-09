import type { FixtureTemplate, PhysicalProperties } from "../types-v2/fixtureTemplates";

/**
 * Where a fixture's heads sit in 3D. Pure functions, no three.js.
 *
 * One head = one beam. Heads come from the fixture's mode; a mode without heads is one head with every channel
 * (QLC+ behaviour, see the implementation notes). Units are metres, in the fixture's local space:
 * beams point along local +Y, heads are laid out in columns along local X and rows along local Z.
 */

/** Distance between neighbouring heads on a multi-head fixture (a 10-pixel bar ≈ 1 m). */
export const HEAD_PITCH = 0.1;
/** Height of a multi-head fixture's body. */
export const MULTI_HEAD_BODY_HEIGHT = 0.07;
/** A single-head fixture is drawn as a par can. */
export const SINGLE_HEAD_RADIUS = 0.105;
export const SINGLE_HEAD_HEIGHT = 0.104;

export type HeadLayout = {
  /** Position in the mode's heads (0 for the implicit single head). */
  index: number;
  name: string;
  /** Centre of the lens, on the body's top face. */
  position: [number, number, number];
  /** Lens size along local X and local Z. */
  size: [number, number];
};

export type FixtureBody =
  { shape: "cylinder"; radius: number; height: number } | { shape: "box"; size: [number, number, number] };

/** Number of heads in the fixture's mode. At least 1. */
export const getHeadCount = (template: FixtureTemplate | undefined, modeId: string): number => {
  const mode = template?.modes.find((m) => m.id === modeId) ?? template?.modes[0];
  return Math.max(mode?.heads.length ?? 0, 1);
};

/** Columns × rows of the head grid. Falls back to one row when the template's grid doesn't match the head count. */
export const getHeadGrid = (headCount: number, properties: PhysicalProperties | undefined) => {
  const columns = properties?.columns ?? 0;
  const rows = properties?.rows ?? 0;
  if (columns > 0 && rows > 0 && columns * rows === headCount) return { columns, rows };
  return { columns: headCount, rows: 1 };
};

export const getFixtureBody = (headCount: number, properties: PhysicalProperties | undefined): FixtureBody => {
  if (headCount === 1) return { shape: "cylinder", radius: SINGLE_HEAD_RADIUS, height: SINGLE_HEAD_HEIGHT };
  const { columns, rows } = getHeadGrid(headCount, properties);
  return { shape: "box", size: [columns * HEAD_PITCH, MULTI_HEAD_BODY_HEIGHT, rows * HEAD_PITCH] };
};

export const getHeadLayouts = (template: FixtureTemplate | undefined, modeId: string): HeadLayout[] => {
  const mode = template?.modes.find((m) => m.id === modeId) ?? template?.modes[0];
  const heads = mode?.heads ?? [];

  if (heads.length <= 1) {
    const size = SINGLE_HEAD_RADIUS * 2 * 0.85;
    return [{ index: 0, name: heads[0]?.name ?? "", position: [0, SINGLE_HEAD_HEIGHT / 2, 0], size: [size, size] }];
  }

  const { columns, rows } = getHeadGrid(heads.length, template?.properties);
  return heads.map((head, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      index,
      name: head.name,
      position: [
        (column - (columns - 1) / 2) * HEAD_PITCH,
        MULTI_HEAD_BODY_HEIGHT / 2,
        (row - (rows - 1) / 2) * HEAD_PITCH,
      ],
      // Leave a small gap between lenses so pixels read as separate.
      size: [HEAD_PITCH * 0.85, HEAD_PITCH * 0.85],
    };
  });
};

/**
 * Full beam angle in degrees. No zoom yet, so a zoom fixture uses its narrowest angle.
 * Missing lens data falls back to 10°–30° like QLC+ (the notes), i.e. 10° here.
 */
export const getBeamAngle = (properties: PhysicalProperties | undefined): number => {
  const min = properties?.minBeamAngle ?? 0;
  const max = properties?.maxBeamAngle ?? 0;
  if (min > 0) return min;
  if (max > 0) return max;
  return 10;
};
