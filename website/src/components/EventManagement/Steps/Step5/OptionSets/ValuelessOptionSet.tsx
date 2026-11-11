import { TagsInput } from "@mantine/core";
import {
  type OptionSet,
  type UpsertOptionSet,
  type ValuelessSelectable,
  SelectableType,
} from "../../../../../types-v2/optionSet";

/** Option set for Valueless Type: each tag is one option. No effect on DMX. */
export const ValuelessOptionSet = ({
  optionSet,
  upsertOptionSets,
}: {
  optionSet: OptionSet;
  upsertOptionSets: (optionSets: UpsertOptionSet[]) => Promise<unknown>;
}) => {
  // For a Valueless option set, all selectables must be of type ValuelessSelectable
  const options = optionSet.selectables.filter((s): s is ValuelessSelectable => s.type === SelectableType.VALUELESS);

  const onChange = (tags: string[]) => {
    const names = [...new Set(tags.map((t) => t.trim()).filter((t) => t !== ""))];

    // Keep the existing selectable (and its id) for a name that is still there, so cues that picked it keep it.
    // Tag order is the option order.
    const selectables: ValuelessSelectable[] = names.map(
      (name) =>
        options.find((s) => s.name === name) ?? {
          id: crypto.randomUUID(),
          name,
          fixtureIds: "all",
          type: SelectableType.VALUELESS,
        },
    );

    // The server rejects defaults that aren't in selectables, so drop defaults whose tag was removed.
    const ids = new Set(selectables.map((s) => s.id));
    void upsertOptionSets([
      {
        ...optionSet,
        selectables,
        defaultSelectableIds: optionSet.defaultSelectableIds.filter((id) => ids.has(id)),
      },
    ]);
  };

  return (
    <TagsInput
      label="Options"
      placeholder="Press enter to add"
      value={options.map((s) => s.name)}
      onChange={onChange}
    />
  );
};
