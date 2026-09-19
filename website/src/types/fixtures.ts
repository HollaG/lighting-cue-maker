export type FixtureType = "par" | "bar" | "moving_head";

/**
 * A representation of a lighting fixture.
 *
 */
export type Fixture = {
  id: string;
  fixtureGroupId: string;
  name: string;
  type: FixtureType;

  /** Position in centimetres. */
  posX: number;
  posY: number;
  posZ: number;

  /** Rotation and beam angle in degrees. */
  rotX: number;
  rotY: number;
  rotZ: number;
  beamAngle: number;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type UpsertFixtureReq = Partial<Omit<Fixture, "createdAt" | "updatedAt" | "deletedAt">>;
// More specific types
export type UpdateFixtureReq = UpsertFixtureReq & { id: string };

// A top-down 2D view edits the X-Z floor plane and stores its configured rotation in rotZ.
export type UpdateFixtureIn2DReq = Pick<Fixture, "id" | "posX" | "posZ" | "rotZ">;

export type UpdateFixtureIn3DReq = Pick<Fixture, "id" | "posX" | "posY" | "posZ" | "rotX" | "rotY" | "rotZ">;

export type GetFixturesRes = {
  fixtures: Fixture[];
};

export type UpsertFixtureRes = {
  fixture: Fixture;
};

export type DeleteFixtureRes = {
  message: string;
};

// Configs for fixture attributes and how they can be represented to simulate
export type PositionOption = {
  pan: number;
  tilt: number;
};
