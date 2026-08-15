import type { CircleConfig } from "konva/lib/shapes/Circle";
import type { LineConfig } from "konva/lib/shapes/Line";
import type { RectConfig } from "konva/lib/shapes/Rect";
import type { TextConfig } from "konva/lib/shapes/Text";

export type Visualiser = {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  objects2D: VisualiserObject[];
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
