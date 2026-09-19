import type { GroupConfig } from "konva/lib/Group";
import type { Fixture } from "../types/fixtures";

export const fixtureRepresentationTo2DShapeProps = (fixture: Fixture): GroupConfig => {
  const { posX, posZ, rotZ } = fixture;

  return {
    x: posX,
    y: posZ,
    rotation: rotZ,
  };
};

export const shapePropsToFixtureRepresentation = (shapeProps: GroupConfig, fixture: Fixture): Fixture => {
  const { x, y, rotation } = shapeProps;

  return {
    ...fixture,
    posX: x ?? 0,
    posZ: y ?? 0,
    rotZ: rotation ?? 0,
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Converts a fixture's stored centimetres to Three.js metres.
 * X-Z is the floor plane and Y is vertical in both representations.
 * @param fixture The fixture to convert.
 * @returns The 3D position as a tuple of [x, y, z].
 */
export const getFixture3DPosition = (fixture: Fixture): [number, number, number] => {
  return [fixture.posX, fixture.posY, fixture.posZ].map(convertStoredPositionTo3DView) as [number, number, number];
};

export const getFixture3DRotation = (fixture: Fixture): [number, number, number] => {
  return [fixture.rotX, fixture.rotY, fixture.rotZ].map(convertStoredRotationTo3DView) as [number, number, number];
};

export const convertStoredPositionTo3DView = (pos: number) => {
  return pos / 100; // Convert from cm to m
};

export const convertStoredRotationTo3DView = (rot: number) => {
  return (rot * Math.PI) / 180; // Convert from degrees to radians
};

export const convert3DPositionToStored = ([x, y, z]: [number, number, number]) => {
  return [x, y, z].map((p) => p * 100); // Convert from m to cm
};

export const convert3DRotationToStored = ([rotX, rotY, rotZ]: [number, number, number]) => {
  return [rotX, rotY, rotZ].map((r) => (r * 180) / Math.PI); // Convert from radians to degrees
};
