import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PatternPlayer } from "../../effects/pattern/patternPlayer";
import { writeHeadColour, type HeadSinkRegistry } from "./Elements/headSinks";

/** A compiled cue's pattern effects and when they started (performance.now() time). */
export type PatternEffectPlayback = { player: PatternPlayer; startedAt: number };

/**
 * Plays pattern effects inside the canvas: once per frame, just before it renders, works out the state at the current
 * cue time and writes it straight into the fixtures' lenses and lights. A slow frame just shows the current state;
 * missed steps are not replayed. Nothing re-renders in React while effects run.
 */
export const PatternEffectRunner = ({
  playback,
  registry,
}: {
  playback: PatternEffectPlayback;
  registry: HeadSinkRegistry;
}) => {
  const { player, startedAt } = playback;
  // The registry version last written to. A different one means a fixture mounted or came back: write everything.
  const writtenVersion = useRef(-1);

  // When this player stops (another cue, no effects), give the fixtures back their own static values.
  useEffect(
    () => () => {
      writtenVersion.current = -1;
      for (const fixtureId of player.values.keys()) registry.sinks.get(fixtureId)?.restore();
    },
    [player, registry],
  );

  // Negative priority: runs before the scene is drawn (the haze pipeline draws at priority 1).
  useFrame(() => {
    const changed = player.evaluate(performance.now() - startedAt);
    if (!changed && writtenVersion.current === registry.version) return;
    writtenVersion.current = registry.version;

    for (const [fixtureId, values] of player.values) {
      const sink = registry.sinks.get(fixtureId);
      if (!sink) continue;
      sink.decoder.decode(values, sink.colours);
      for (let i = 0; i < sink.colours.length; i++) writeHeadColour(sink.lenses[i], sink.lights[i], sink.colours[i]);
    }
  }, -1);

  return null;
};
