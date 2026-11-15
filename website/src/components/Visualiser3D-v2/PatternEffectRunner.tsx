import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PatternPlayer } from "../../effects/pattern/patternPlayer";
import { writeHeadColour, type HeadSinkRegistry } from "./Elements/headSinks";
import { useFrameGate } from "./frameGate";

/** A compiled cue's pattern effects and when they started (performance.now() time). */
export type PatternEffectPlayback = { player: PatternPlayer; startedAt: number };

/**
 * Plays pattern effects inside the canvas: once per frame, just before it renders, works out the state at the current
 * cue time and writes it straight into the fixtures' lenses and lights. A slow frame just shows the current state;
 * missed steps are not replayed. Nothing re-renders in React while effects run.
 *
 * With frameloop="demand" it asks for frames itself: every frame while a fade runs, and one wake-up at the next step
 * while a step holds, so a held step costs nothing.
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
  const invalidate = useThree((state) => state.invalidate);
  const wakeUpTimer = useRef<number | undefined>(undefined);
  const gate = useFrameGate();

  // When this player stops (another cue, no effects), give the fixtures back their own static values.
  useEffect(
    () => () => {
      writtenVersion.current = -1;
      for (const fixtureId of player.values.keys()) registry.sinks.get(fixtureId)?.restore();
      invalidate(); // the props may not have changed, so R3F wouldn't draw the restored values by itself
    },
    [player, registry, invalidate],
  );

  // Draw the first frame of a new player; stop the pending wake-up when it goes.
  useEffect(() => {
    invalidate();
    return () => window.clearTimeout(wakeUpTimer.current);
  }, [player, invalidate]);

  // Negative priority: runs before the scene is drawn (the haze pipeline draws at priority 1).
  useFrame(() => {
    if (!gate.draw) return; // this frame won't be drawn (frame cap); the gate already asked for the next one
    const timeMs = performance.now() - startedAt;
    const changed = player.evaluate(timeMs);

    // Ask for the next frame that can look different.
    window.clearTimeout(wakeUpTimer.current);
    const delay = player.nextChangeDelay(timeMs);
    if (delay <= 0) invalidate();
    else if (Number.isFinite(delay)) wakeUpTimer.current = window.setTimeout(() => invalidate(), delay);

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
