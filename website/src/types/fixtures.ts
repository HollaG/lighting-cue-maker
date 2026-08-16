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

// Helper type for 2D update
export type UpdateFixtureIn2DReq = Pick<Fixture, "id" | "posX" | "posY" | "rotZ">;

export type GetFixturesRes = {
  fixtures: Fixture[];
};

export type UpsertFixtureRes = {
  fixture: Fixture;
};

export type DeleteFixtureRes = {
  message: string;
};
