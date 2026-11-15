/**
 * Where the pattern effect player writes each frame: every fixture's lens materials and head lights, written directly,
 * with no React render per frame. One registry per canvas, given to fixtures through HeadSinkContext.
 */
import { createContext } from "react";
import * as THREE from "three";
import type { HeadColour, HeadDecoder } from "../../../utils/visualiser-v2-decoder";

/** What a head's light needs to be written to: a three.js light, or an entry of the light table. */
export type HeadLightTarget = { color: THREE.Color; intensity: number };

export type FixtureSink = {
  decoder: HeadDecoder;
  /** Scratch output for `decoder.decode`, one per head. */
  colours: HeadColour[];
  /** Per head, in head order. */
  lenses: (THREE.MeshBasicMaterial | null)[];
  lights: (HeadLightTarget | null)[];
  /** Puts back what the fixture's own props say (its static DMX), for when the player stops writing to it. */
  restore: () => void;
};

export class HeadSinkRegistry {
  readonly sinks = new Map<string, FixtureSink>();
  /** Changes on every register/unregister, so the player knows to write to a newly mounted fixture. */
  version = 0;

  register(fixtureId: string, sink: FixtureSink) {
    this.sinks.set(fixtureId, sink);
    this.version++;
    return () => {
      if (this.sinks.get(fixtureId) === sink) this.sinks.delete(fixtureId);
      this.version++;
    };
  }
}

export const HeadSinkContext = createContext<HeadSinkRegistry | null>(null);

/** An unlit lens is this dark grey; a lit one lerps towards the head's colour by intensity. */
export const LENS_OFF_COLOUR = new THREE.Color("#111111");
const scratch = new THREE.Color();

/**
 * Shows one head: lens colour and light colour + intensity. `colour` is the head's colour at full brightness, in the
 * renderer's working (linear) space, as THREE.Color makes it from a hex string. Same result as the fixture's props.
 */
export const writeHead = (
  lens: THREE.MeshBasicMaterial | null | undefined,
  light: HeadLightTarget | null | undefined,
  colour: THREE.Color,
  intensity: number,
) => {
  if (lens) lens.color.copy(LENS_OFF_COLOUR).lerp(colour, intensity / 100);
  if (light) {
    light.color.copy(colour);
    light.intensity = intensity;
  }
};

/** writeHead from a decoded HeadColour (0–255 sRGB). */
export const writeHeadColour = (
  lens: THREE.MeshBasicMaterial | null | undefined,
  light: HeadLightTarget | null | undefined,
  { r, g, b, intensity }: HeadColour,
) => writeHead(lens, light, scratch.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace), intensity);
