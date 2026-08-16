import type { CircleConfig } from "konva/lib/shapes/Circle";
import type { LineConfig } from "konva/lib/shapes/Line";
import type { RectConfig } from "konva/lib/shapes/Rect";
import type { TextConfig } from "konva/lib/shapes/Text";

export type Visualiser = {
  id: string;

  /** The view area that will be shown to users. Null when first created, but should be immediately configured (through a useEffect). */
  defaultViewport?: VisualiserViewport;
  objects2D: VisualiserObject[];
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
