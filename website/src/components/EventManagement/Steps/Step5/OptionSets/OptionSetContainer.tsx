import { ActionIcon, Alert, Collapse, Divider, Group, Stack, Switch, Tooltip } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useRef, useState, type ReactNode } from "react";
import { useDeleteOptionSet } from "../../../../../query-v2/option-sets/useDeleteOptionSet";
import { useUpsertOptionSets } from "../../../../../query-v2/option-sets/useUpsertOptionSets";
import { OptionSetType, type OptionSet, type UpsertOptionSet } from "../../../../../types-v2/optionSet";
import { Logger } from "../../../../../utils/logger";
import { ConfirmDeleteButton } from "../../../../ConfirmDeleteButton/ConfirmDeleteButton";
import { CardBase } from "../../../../Cues/CardBase";
import { CustomTextInput } from "../../../../CustomTextInput/CustomTextInput";
import { IntensityOptionSet } from "./IntensityOptionSet";
import { ColourOptionSet } from "./ColourOptionSet";
import { ValuelessOptionSet } from "./ValuelessOptionSet";

const logger = new Logger("OptionSetContainer.tsx");

export const OptionSetContainer = ({
  optionSet,
  eventId,
  fixtureGroupId,
}: {
  optionSet: OptionSet;
  eventId: string;
  fixtureGroupId: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(optionSet.name);
  const [description, setDescription] = useState(optionSet.description);
  const [required, setRequired] = useState(optionSet.required);

  const { mutateAsync: upsertOptionSets } = useUpsertOptionSets(eventId, fixtureGroupId);
  const { mutateAsync: deleteOptionSet } = useDeleteOptionSet(eventId, fixtureGroupId);

  // One debounced save for all the simple fields. A debounced call only keeps its last arguments,
  // so changes are merged into pendingRef and sent together as a single upsert.
  const pendingRef = useRef<Partial<UpsertOptionSet>>({});
  const flushSave = useDebouncedCallback(
    () => {
      const patch = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(patch).length === 0) return;
      void upsertOptionSets([{ ...optionSet, ...patch }]);
    },
    { delay: 600, flushOnUnmount: true }, // leaving the step mid-typing still saves
  );

  /** Queue a field change; everything queued within the delay goes out as one upsert. */
  const save = (patch: Partial<UpsertOptionSet>) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    flushSave();
  };

  logger.info("Rendering OptionSetContainer", optionSet);

  // Switch based on the option set type
  let content: ReactNode = null;
  switch (optionSet.type) {
    case OptionSetType.INTENSITY:
      content = <IntensityOptionSet optionSet={optionSet} upsertOptionSets={upsertOptionSets} />;
      break;
    case OptionSetType.COLOUR:
      content = <ColourOptionSet optionSet={optionSet} upsertOptionSets={upsertOptionSets} />;
      break;
    case OptionSetType.VALUELESS:
      content = <ValuelessOptionSet optionSet={optionSet} upsertOptionSets={upsertOptionSets} />;
      break;
  }
  return (
    <CardBase isActive={false}>
      <Stack gap="0">
        <Group>
          <CustomTextInput
            flex={1}
            size="sm"
            required
            label="Option Set name"
            placeholder="Type name here..."
            value={name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setName(value);
              if (value.trim() !== "") save({ name: value }); // don't save empty names
            }}
            onBlur={() => flushSave.flush()}
          />

          <ConfirmDeleteButton
            message={`Delete "${optionSet.name}"? This can't be undone.`}
            onConfirm={() => deleteOptionSet(optionSet.id)}
          />
          <ActionIcon variant="subtle" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>
        <Collapse expanded={isExpanded}>
          <Stack>
            <Divider mt="md" />
            <Group>
              <CustomTextInput
                flex={1}
                size="sm"
                required
                // label="Option Set description"
                placeholder="Write a brief description of what this does"
                value={description}
                onChange={(e) => {
                  setDescription(e.currentTarget.value);
                  save({ description: e.currentTarget.value });
                }}
                onBlur={() => flushSave.flush()}
              />
              <Tooltip label="If enabled, this option set must be configured whenever at least one option set from this fixture group is configured.">
                <Switch
                  size="sm"
                  label="Required"
                  checked={required}
                  onChange={(e) => {
                    setRequired(e.currentTarget.checked);
                    save({ required: e.currentTarget.checked });
                    flushSave.flush(); // a click isn't typing, so save right away
                  }}
                />
              </Tooltip>
            </Group>

            {content}
          </Stack>
        </Collapse>
        {optionSet.selectables.length === 0 && (
          <Alert mt="md" variant="light" color="red" title="Missing values in the option set!"></Alert>
        )}
      </Stack>
    </CardBase>
  );
};
