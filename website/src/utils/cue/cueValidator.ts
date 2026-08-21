import type { Cue } from "../../types/cues";
import { AttributeTypes, type AttributeConfiguration, type FixtureGroupConfiguration } from "../../types/types";

type CueValidationResult = {
  ok: boolean;
  issues: {
    group: { id: string; name: string }; // fixture group config
    attributes: { id: string; name: string }[]; // attribute config
    message: string;

    // notice: cue is empty
    // warning: move-in-dark enabled (only position set)
    // error: cue is invalid (preset intensity or colour not set)
    type: "warning" | "error" | "notice";
  }[];
};
type PresetAttributeType =
  typeof AttributeTypes.PRESET_INTENSITY | typeof AttributeTypes.PRESET_COLOUR | typeof AttributeTypes.PRESET_POSITION;

const hasPresetValue = (
  cue: Cue,
  fixtureGroupId: string,
  attributes: AttributeConfiguration[],
  type: PresetAttributeType,
): boolean => {
  // A preset type that the fixture group does not support should not make its cues invalid.
  if (attributes.length === 0) return true;

  return attributes.some((attribute) => {
    const value = cue.assignments[fixtureGroupId]?.assignment[attribute.id]?.value;

    switch (type) {
      case AttributeTypes.PRESET_INTENSITY: {
        const intensity = value?.[AttributeTypes.PRESET_INTENSITY];
        return typeof intensity === "number" && intensity !== 0;
      }
      case AttributeTypes.PRESET_COLOUR: {
        const colour = value?.[AttributeTypes.PRESET_COLOUR];
        return Boolean(colour?.hex);
      }
      case AttributeTypes.PRESET_POSITION: {
        const position = value?.[AttributeTypes.PRESET_POSITION];
        return Boolean(position?.id);
      }
    }
  });
};

/**
 * Validate the preset intensity, colour, and position combination for each fixture group.
 * A preset type that is not configured for the fixture group counts as present,
 * unless no configured preset has a value. In that case, the cue counts as empty.
 * Preset intensity 0 counts as absent.
 *
 * 1. Intensity, colour, and position present: valid.
 * 2. Intensity and colour present, position absent: error.
 * 3. Intensity and position present, colour absent: error.
 * 4. Colour and position present, intensity absent: error.
 * 5. Only intensity present: error.
 * 6. Only colour present: error.
 * 7. Only position present: warning.
 * 8. All absent: notice.
 */
export const checkCueCorrectness = (cue: Cue, fixtureGroups: FixtureGroupConfiguration[]): CueValidationResult => {
  const issues: CueValidationResult["issues"] = [];

  for (const group of fixtureGroups) {
    const intensityAttributes = group.attributes.filter(
      (attribute) => attribute.type === AttributeTypes.PRESET_INTENSITY,
    );
    const colourAttributes = group.attributes.filter((attribute) => attribute.type === AttributeTypes.PRESET_COLOUR);
    const positionAttributes = group.attributes.filter(
      (attribute) => attribute.type === AttributeTypes.PRESET_POSITION,
    );

    const presets = [
      {
        label: "Intensity",
        attributes: intensityAttributes,
        present: hasPresetValue(cue, group.id, intensityAttributes, AttributeTypes.PRESET_INTENSITY),
      },
      {
        label: "Colour",
        attributes: colourAttributes,
        present: hasPresetValue(cue, group.id, colourAttributes, AttributeTypes.PRESET_COLOUR),
      },
      {
        label: "Position",
        attributes: positionAttributes,
        present: hasPresetValue(cue, group.id, positionAttributes, AttributeTypes.PRESET_POSITION),
      },
    ];

    const hasConfiguredPresetValue = presets.some((preset) => preset.attributes.length > 0 && preset.present);
    const missingPresets = presets.filter((preset) => !preset.present);
    // const attributeName = missingPresets
    //   .flatMap((preset) => preset.attributes.map((attribute) => attribute.name))
    //   .join(", ");

    // Unsupported presets should not make an otherwise empty cue look populated.
    if (!hasConfiguredPresetValue) {
      issues.push({
        group: { id: group.id, name: group.name },
        attributes: missingPresets.flatMap((preset) => preset.attributes),
        message: `${group.name} will not turn on - check your ${missingPresets.flatMap((preset) => preset.label).join(" and ")}.`,
        type: "error",
      });
      continue;
    }

    if (missingPresets.length === 0) continue;

    const hasIntensity = presets[0].present;
    const hasColour = presets[1].present;
    const hasPosition = presets[2].present;

    if (!hasIntensity && !hasColour && hasPosition) {
      issues.push({
        group: { id: group.id, name: group.name },
        attributes: missingPresets.flatMap((preset) => preset.attributes),
        message: `${group.name} only has position set, are you trying to pre-move the fixtures for the next cue?`,
        type: "error",
      });
      continue;
    }

    const missingLabels = missingPresets.map((preset) => preset.label);
    issues.push({
      group: { id: group.id, name: group.name },
      attributes: missingPresets.flatMap((preset) => preset.attributes),
      message: `${group.name} ${missingLabels.join(" and ")} ${missingLabels.length === 1 ? "is" : "are"} not selected.`,
      type: "error",
    });
  }

  return {
    ok: !issues.some((issue) => issue.type === "error" || issue.type === "warning"),
    issues,
  };
};
