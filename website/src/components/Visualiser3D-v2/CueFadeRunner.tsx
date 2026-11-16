import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PatchedFixture } from "../../types-v2/patchedFixture";
import type { FixtureTemplate } from "../../types-v2/fixtureTemplates";
import type { DmxValuesByFixtureId } from "../../utils/visualiser-v2-resolver";
import {
  blendFadeValues,
  getFadeProfile,
  resolveFadeValues,
  resolveFadeValuesInto,
  type FadeProfile,
} from "../../utils/visualiser-v2-fade";
import { writeHeadColour, type HeadSinkRegistry } from "./Elements/headSinks";
import type { PatternEffectPlayback } from "./PatternEffectRunner";
import { useFrameGate } from "./frameGate";

/**
 * A change of selected cue, to fade over. Made by useResolvedDmx: a new object for every change of cue, never for an
 * edit of the same cue.
 */
export type CueFade = {
  /** The OUTGOING cue's transition time: a cue's time is how long it takes to go from it to the next cue. 0 = snap. */
  durationMs: number;
  /** performance.now() time the new cue's values arrived. */
  startedAt: number;
};

type FadingFixture = {
  profile: FadeProfile;
  /** Where the fade starts. Rewritten every frame when `fromOutgoing`, else fixed. */
  from: number[];
  /** The outgoing cue's effect writes this fixture: `from` follows that effect while it fades out. */
  fromOutgoing: boolean;
  out: number[];
};
type ActiveFade = {
  fade: CueFade;
  fixtures: Map<string, FadingFixture>;
  /** The outgoing cue's effects, kept playing until the fade ends. Null if no fixture starts from them. */
  outgoing: PatternEffectPlayback | null;
};
type ShownProps = { staticValues: DmxValuesByFixtureId | undefined; playback: PatternEffectPlayback | null };

/**
 * Plays cue fades inside the canvas, the same way PatternEffectRunner plays effects: once per frame, before the
 * draw, it writes straight into the fixtures' lenses and lights, so nothing re-renders in React while a fade runs.
 *
 * - From: what was on screen when the cue changed (mid-fade or mid-effect included), so nothing jumps.
 * - To: the new cue's live values: its pattern effects' output if it has any, else its static values. An effect in the
 *   new cue fades in while it's already running, and an edit during the fade is followed.
 * - Dimmer, colour mixing and position slide; channels that work in ranges (colour wheel, gobo, strobe, custom) snap
 *   at the start (see visualiser-v2-fade.ts).
 * - Runs after the effect player (-1) and before the light table and lenses (0.5, 0.6), so it has the last word.
 * When the fade ends, the fixtures' own props (and the effect player) take over again.
 */
export const CueFadeRunner = ({
  fade,
  dmxValuesByFixtureId,
  effectPlayback,
  fixtures,
  fixtureTemplates,
  registry,
}: {
  fade: CueFade | null;
  /** Static values with overrides: what the fixtures' props show. */
  dmxValuesByFixtureId: DmxValuesByFixtureId | undefined;
  effectPlayback: PatternEffectPlayback | null | undefined;
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
  registry: HeadSinkRegistry;
}) => {
  const invalidate = useThree((state) => state.invalidate);
  const gate = useFrameGate();

  const active = useRef<ActiveFade | null>(null);
  /** The last fade handled, so a re-render with the same fade (an edit, a refetch) doesn't restart it. */
  const handledFade = useRef<CueFade | null>(null);
  /** The props as of the last commit. While a new fade starts, they still say what was showing before it. */
  const shown = useRef<ShownProps>({ staticValues: dmxValuesByFixtureId, playback: effectPlayback ?? null });

  const fixturesById = useMemo(() => new Map(fixtures.map((f) => [f.id, f])), [fixtures]);
  const templatesById = useMemo(() => new Map(fixtureTemplates.map((t) => [t.id, t])), [fixtureTemplates]);

  /** Hands the fixtures back: static ones to their props; effect ones are rewritten by the effect player. */
  const stop = useCallback(() => {
    const ending = active.current;
    if (!ending) return;
    active.current = null;
    const player = shown.current.playback?.player;
    for (const fixtureId of ending.fixtures.keys()) {
      if (!player?.values.has(fixtureId)) registry.sinks.get(fixtureId)?.restore();
    }
    registry.touch();
    invalidate();
  }, [registry, invalidate]);

  // Layout effect: runs after the commit with the new cue's props, before the next frame is drawn.
  useLayoutEffect(() => {
    if (fade !== handledFade.current) {
      handledFade.current = fade;
      if (fade && fade.durationMs > 0) {
        active.current = startFade(fade, active.current, shown.current, registry, fixturesById, templatesById);
        invalidate();
      } else {
        stop(); // snap: also ends a fade that was still running
      }
    }
    shown.current = { staticValues: dmxValuesByFixtureId, playback: effectPlayback ?? null };
  });

  // Unmounting mid-fade: give the fixtures back.
  useEffect(() => () => stop(), [stop]);

  // After the effect player (-1), before the light table (0.5) and lenses (0.6).
  useFrame(() => {
    const running = active.current;
    if (!running || !gate.draw) return; // a skipped frame: the gate already asked for the next one

    const now = performance.now();
    const progress = Math.min((now - running.fade.startedAt) / running.fade.durationMs, 1);
    const { staticValues, playback } = shown.current;
    // The outgoing effects keep running on their own clock while they fade out. Nothing else plays them any more:
    // their PatternEffectRunner went with the old cue.
    const outgoing = running.outgoing;
    if (outgoing) outgoing.player.evaluate(now - outgoing.startedAt);

    for (const [fixtureId, fixture] of running.fixtures) {
      const sink = registry.sinks.get(fixtureId);
      if (!sink) continue;
      if (fixture.fromOutgoing && outgoing) {
        resolveFadeValuesInto(fixture.from, outgoing.player.values.get(fixtureId), fixture.profile);
      }
      const target = playback?.player.values.get(fixtureId) ?? staticValues?.[fixtureId];
      blendFadeValues(fixture.out, fixture.from, target, fixture.profile, progress);
      sink.decoder.decode(fixture.out, sink.colours);
      for (let i = 0; i < sink.colours.length; i++) writeHeadColour(sink.lenses[i], sink.lights[i], sink.colours[i]);
    }

    if (progress < 1) invalidate();
    else stop(); // this frame already shows the target
  }, -0.5);

  return null;
};

/**
 * Sets up the start of a fade for every fixture that follows DMX (selected fixtures in the editor don't).
 * Each fixture starts from, in order:
 * 1. the running fade's last output (a cue change mid-fade), held still;
 * 2. the outgoing cue's effects, which keep playing while they fade out;
 * 3. the outgoing cue's static values.
 * A fixture with none of those (nothing was showing) just snaps to the new cue.
 */
const startFade = (
  fade: CueFade,
  running: ActiveFade | null,
  before: ShownProps,
  registry: HeadSinkRegistry,
  fixturesById: Map<string, PatchedFixture>,
  templatesById: Map<string, FixtureTemplate>,
): ActiveFade => {
  const fixtures = new Map<string, FadingFixture>();
  let usesOutgoing = false;
  for (const fixtureId of registry.sinks.keys()) {
    const patched = fixturesById.get(fixtureId);
    const profile = patched && getFadeProfile(templatesById.get(patched.fixtureTemplateId), patched.modeId);
    if (!profile) continue;

    const midFade = running?.fixtures.get(fixtureId)?.out;
    const fromOutgoing = !midFade && !!before.playback?.player.values.has(fixtureId);
    const source = midFade ?? before.playback?.player.values.get(fixtureId) ?? before.staticValues?.[fixtureId];
    if (!source) continue;

    usesOutgoing ||= fromOutgoing;
    const from = resolveFadeValues(source, profile);
    fixtures.set(fixtureId, { profile, from, fromOutgoing, out: [...from] });
  }
  return { fade, fixtures, outgoing: usesOutgoing ? before.playback : null };
};
