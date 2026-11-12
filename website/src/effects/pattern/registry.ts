import { createEffectRegistry } from "../createEffectRegistry";
import type { PatternEffectDefinition } from "./patternEffect";

/** Every file in ./effects is registered automatically. Adding an effect = adding a file there. */
export const patternEffects = createEffectRegistry<PatternEffectDefinition>(
  import.meta.glob<{ default: PatternEffectDefinition }>("./effects/*.ts", { eager: true }),
);

/** `undefined` for an unknown id (e.g. an effect file that was removed); callers skip it. */
export const getPatternEffect = (id: string): PatternEffectDefinition | undefined => patternEffects.get(id);

/** For the LD's effect picker, sorted by name. */
export const listPatternEffects = (): PatternEffectDefinition[] =>
  [...patternEffects.values()].sort((a, b) => a.name.localeCompare(b.name));
