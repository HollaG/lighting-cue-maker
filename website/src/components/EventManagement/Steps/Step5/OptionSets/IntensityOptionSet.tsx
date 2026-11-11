import { TagsInput } from "@mantine/core";
import {
  type OptionSet,
  type UpsertOptionSet,
  type IntensitySelectable,
  SelectableType,
} from "../../../../../types-v2/optionSet";

/** Option set for Intensity Type */
export const IntensityOptionSet = ({
  optionSet,
  upsertOptionSets,
}: {
  optionSet: OptionSet;
  upsertOptionSets: (optionSets: UpsertOptionSet[]) => Promise<unknown>;
}) => {
  // Note that for an Intensity option set, all selectables must be of type IntensitySelectable
  const intensities = optionSet.selectables.filter(
    (s): s is IntensitySelectable => s.type === SelectableType.INTENSITY,
  );

  const onChange = (tags: string[]) => {
    const percents = [
      ...new Set(
        tags
          .filter((t) => t.trim() !== "")
          .map(Number)
          .filter((n) => Number.isFinite(n))
          .map((n) => Math.min(100, Math.max(0, n))),
      ),
    ].sort((a, b) => a - b);

    const selectables = percents.map(
      (percent) =>
        intensities.find((s) => s.percent === percent) ?? {
          id: crypto.randomUUID(),
          name: `${percent}%`,
          fixtureIds: "all" as const,
          type: SelectableType.INTENSITY,
          percent,
        },
    );

    // const ids = new Set(selectables.map((s) => s.id));
    void upsertOptionSets([
      {
        ...optionSet,
        selectables: selectables.sort((a, b) => a.percent - b.percent),
      },
    ]);
  };

  return (
    <TagsInput
      label="Options"
      description="Percentages from 0 to 100"
      placeholder="Press enter to add (numbers only)"
      value={intensities.map((s) => String(s.percent))}
      onChange={onChange}
    />
  );
};
