import type { CircleConfig } from "konva/lib/shapes/Circle";
import type { LineConfig } from "konva/lib/shapes/Line";
import type { RectConfig } from "konva/lib/shapes/Rect";
import type { TextConfig } from "konva/lib/shapes/Text";
import { AttributeTypes } from "./types";
import type { PositionOption } from "./fixtures";
import type { Visualiser3DCameraView, Visualiser3DEnvironment, Visualiser3DObject } from "./visualiser3d";

/**
 * The 2D and 3D overall visualiser type.
 * This is what is saved in the database.
 */
export type Visualiser = {
  id: string;

  /** [2D] The view area that will be shown to users. Null when first created, but should be immediately configured (through a useEffect). */
  defaultViewport?: VisualiserViewport;
  /** [2D] The list of helper (non fixture) objects */
  objects2D: VisualiserObject[];

  /** [3D] The configuration for the 3D view */
  config3D?: Visualiser3DEnvironment;

  /** [3D] The default camera view */
  defaultCameraView?: Visualiser3DCameraView;

  /** [3D] The list of helper (non fixture) objects */
  objects3D: Visualiser3DObject[];

  /** Map certain editable attributes e.g. pan and tilt from a key decided by event creation
   * to hard values that the VisualiserObjects can decode
   * Note: there is potential for memory leak: if a fixture group gets deleted, the mapping here won't get deleted.
   * However, it is small enough to not worry about it.
   *
   */
  fixtureAttributeMapping: FixtureAttributeMapping;
};

export type FixtureAttributeMapping = {
  [fixtureGroupId: string]: {
    // add other attributes later
    [AttributeTypes.PRESET_POSITION]?: {
      [positionOptionId: string]: {
        [fixtureId: string]: PositionOption;
      };
    };
  };
};

/**
 * Define how others view the visualiser.
 * Scale the viewport such that the view is the same, regardless
 * of actual viewport size  
 *  *
 */
export type VisualiserViewport = {
  x: number;
  y: number;
  width: number;
  height: number;

  scale: number; // scale of the viewport, 1 = 100%. The user might have purposely zoomed out.

  // originalWidth: number; // px of the original visualiser
  // originalHeight: number; // px of the original visualiser
};

export type UpsertVisualiserReq = Partial<Visualiser> & { eventId: string };

export type GetOrCreateVisualiserRes = {
  visualiser: Visualiser;
};

export type UpsertVisualiserRes = GetOrCreateVisualiserRes;

export type KonvaObject = {
  // base properties
  id: string; // uuid generated
  // x: number;
  // y: number;
  name: string;
};

export interface VisualiserRectangle extends KonvaObject {
  props: RectConfig;
  type: "rectangle";
}

export interface VisualiserCircle extends KonvaObject {
  props: CircleConfig;
  type: "circle";
}

export interface VisualiserLine extends KonvaObject {
  type: "line";
  props: LineConfig;
}

export interface VisualiserText extends KonvaObject {
  type: "text";
  props: TextConfig;
}

export type VisualiserObject = VisualiserRectangle | VisualiserCircle | VisualiserLine | VisualiserText;
export type VisualiserTypes = "rectangle" | "circle" | "line" | "text";
