import type { GroupConfig } from "konva/lib/Group";
import type { Fixture, PositionOption } from "../types/fixtures";
import type { Euler, Vector3 } from "three";
import type { ValueAssignment } from "../types/cues";
import { AttributeTypes } from "../types/types";

export const fixtureRepresentationTo2DShapeProps = (fixture: Fixture): GroupConfig => {
  const { posX, posZ, rotY } = fixture;

  return {
    x: posX,
    y: posZ,
    rotation: rotY,
  };
};

export const shapePropsToFixtureRepresentation = (shapeProps: GroupConfig, fixture: Fixture): Fixture => {
  const { x, y, rotation } = shapeProps;

  return {
    ...fixture,
    posX: x ?? 0,
    posZ: y ?? 0,
    rotY: rotation ?? 0,
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**************** 3D ***************/
export const PLANE_SIZE = 20;
export const GRID_SIZE = 0.6; // size of one 'square' in the grid, in metres

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

/**
 * Convert from a ThreeJS reoresentation into a Database representation.
 *
 * @param position
 * @param rotation
 * @param fixture
 * @returns
 */
export const convert3DPropsToFixtureRepresentation = (
  position: Vector3,
  rotation: Euler,
  fixture: Fixture,
): Fixture => {
  const positionArray: [number, number, number] = [position.x, position.y, position.z];
  const rotationArray: [number, number, number] = [rotation.x, rotation.y, rotation.z];
  const [posX, posY, posZ] = convert3DPositionToStored(positionArray);
  const [rotX, rotY, rotZ] = convert3DRotationToStored(rotationArray);

  return {
    ...fixture,
    posX,
    posY,
    posZ,
    rotX,
    rotY,
    rotZ,
  };
};

/**
 * Interpolate between values.
 *
 * @param type
 * @param assignment
 * @param target
 * @param t
 * @param total
 * @returns
 */
export const lerp = (
  type: AttributeTypes,
  assignment: ValueAssignment,
  target: ValueAssignment,
  t: number,
  total: number,
): ValueAssignment => {
  // some cases don't have lerp. These cases are:
  const lerpTypes: AttributeTypes[] = [
    AttributeTypes.PRESET_COLOUR,
    AttributeTypes.PRESET_INTENSITY,
    AttributeTypes.PRESET_POSITION,
  ];
  if (!lerpTypes.includes(type)) {
    return target;
  }

  if (total <= 0 || t >= total) {
    return target;
  }

  switch (type) {
    case AttributeTypes.PRESET_COLOUR: {
      const startColour = assignment[type];
      const endColour = target[type];
      return {
        ...assignment,
        [type]: {
          name: endColour?.name ?? startColour?.name ?? "",
          // If no colour is assigned, falback to the PREVIOUS colour, then fallback to black (cos that's "OFF" state)
          hex: lerpColor(
            startColour?.hex || endColour?.hex || "#000000",
            endColour?.hex || startColour?.hex || "#ffffff",
            t,
            total,
          ),
        },
      };
    }
    case AttributeTypes.PRESET_INTENSITY: {
      // lerp between the two numbers
      const currentValue = assignment[type] || 0;
      const targetValue = target[type] || 0;
      const newValue = currentValue + (targetValue - currentValue) * (t / total);
      return {
        ...assignment,
        [type]: newValue,
      };
    }

    default:
      return target;
  }
};

/** Interpolate #RRGGBB colours in RGB space; t and total use the same time unit. */
const lerpColor = (startHex: string, endHex: string, t: number, total: number): string => {
  if (total <= 0 || t >= total) return endHex;
  if (t <= 0) return startHex;

  const progress = t / total;
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(startHex.slice(offset, offset + 2), 16);
    const end = parseInt(endHex.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * progress)
      .toString(16)
      .padStart(2, "0");
  });

  return `#${channels.join("")}`;
};

/** Interpolate pan and tilt in degrees, taking the shortest rotation on each axis. */
export const lerpPosition = (
  start: PositionOption,
  end: PositionOption | undefined,
  t: number,
  total: number,
): PositionOption => {
  if (!end) return start;
  if (total <= 0 || t >= total) return end;
  if (t <= 0) return start;

  const progress = t / total;
  // Wrap differences to [-180, 180); double modulo also handles negative angles.
  const panDelta = ((((end.pan - start.pan + 180) % 360) + 360) % 360) - 180;
  const tiltDelta = ((((end.tilt - start.tilt + 180) % 360) + 360) % 360) - 180;

  return {
    pan: start.pan + panDelta * progress,
    tilt: start.tilt + tiltDelta * progress,
  };
};
