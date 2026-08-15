export type FixtureType = "par" | "bar" | "moving_head";

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

export type UpsertFixtureReq = Omit<Fixture, "id" | "createdAt" | "updatedAt" | "deletedAt"> & {
  id?: string;
};

export type GetFixturesRes = {
  fixtures: Fixture[];
};

export type UpsertFixtureRes = {
  fixture: Fixture;
};

export type DeleteFixtureRes = {
  message: string;
};
