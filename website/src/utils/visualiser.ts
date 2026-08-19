import type { GroupConfig } from "konva/lib/Group";
import type { Fixture } from "../types/fixtures";

export const fixtureRepresentationTo2DShapeProps = (fixture: Fixture): GroupConfig => {
  const { posX, posY, rotZ } = fixture;

  return {
    x: posX,
    y: posY,
    rotation: rotZ,
  };
};

export const shapePropsToFixtureRepresentation = (shapeProps: GroupConfig, fixture: Fixture): Fixture => {
  const { x, y, rotation } = shapeProps;

  return {
    ...fixture,
    posX: x ?? 0,
    posY: y ?? 0,
    rotZ: rotation ?? 0,
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
