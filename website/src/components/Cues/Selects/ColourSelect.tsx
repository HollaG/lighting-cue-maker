import { Box, Button, Combobox, Group, InputBase, Text, useCombobox } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import type { Cue } from "../../../types/cues";
import type { ColourOption } from "../../../types/types";

interface ColourSelectProps {
  name: string;
  colourOptions: ColourOption[];
  fieldName: string;
  form: UseFormReturnType<Cue>;
  defaultValue?: ColourOption;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  setIsAtLeastOneComboboxOpened: (value: boolean) => void;
}

export function ColourSelect({
  colourOptions,
  name,
  fieldName,
  form,
  defaultValue,
  required = false,
  disabled = false,
  readOnly = false,
  setIsAtLeastOneComboboxOpened,
}: ColourSelectProps) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setIsAtLeastOneComboboxOpened(false);
    },
    onDropdownOpen: () => setIsAtLeastOneComboboxOpened(true),
  });

  // Search text is transient; the complete ColourOption remains in the form.
  const [search, setSearch] = useState(defaultValue?.name || "");
  const formPath = fieldName;
  const shouldFilterOptions = colourOptions.every((item) => item.hex !== search);
  const filteredOptions = shouldFilterOptions
    ? colourOptions.filter((item) => item.name.toLowerCase().includes(search.toLowerCase().trim()))
    : colourOptions;

  const options = filteredOptions.map((item) => (
    <Combobox.Option value={item.name} key={item.hex} disabled={disabled || readOnly}>
      <ColourSelectOption {...item} />
    </Combobox.Option>
  ));

  // @ts-ignore Mantine's watcher value is narrower than its generic callback type.
  form.watch(formPath, ({ value }: { value: ColourOption }) => {
    if (value) {
      setSearch(value.name);
    }
  });

  const getCommittedValue = () =>
    formPath.split(".").reduce((current: any, key) => (current ? current[key] : undefined), form.getValues() as any) as
      | ColourOption
      | undefined;

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(value) => {
        if (disabled || readOnly) return;

        const selected = colourOptions.find((item) => item.name === value);
        form.setFieldValue(formPath, selected ?? { name: value, hex: "" });
        setSearch(value);
        combobox.closeDropdown();
      }}
      styles={{ dropdown: { zIndex: 99 } }}
    >
      <Combobox.Target targetType="input">
        <div>
          <InputBase
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            label={name}
            rightSection={<Combobox.Chevron />}
            value={search}
            onChange={(event) => {
              if (readOnly) return;

              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
              setSearch(event.currentTarget.value);
            }}
            onClick={() => {
              if (readOnly) return;

              combobox.openDropdown();
              setSearch("");
            }}
            onFocus={() => {
              if (readOnly) return;

              combobox.openDropdown();
              setSearch("");
            }}
            onBlur={() => {
              combobox.closeDropdown();
              setSearch(getCommittedValue()?.name ?? "");
            }}
            placeholder="Search value"
            rightSectionPointerEvents="none"
            leftSection={
              <Box
                style={{
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "4px",
                  backgroundColor: getCommittedValue()?.hex,
                  border:
                    getCommittedValue()?.hex === "#ffffff" ? "2px solid light-dark(black, transparent)" : "",
                }}
              />
            }
          />
          <Button
            size="xs"
            variant="transparent"
            color="gray"
            disabled={disabled || readOnly}
            onClick={() => {
              setSearch("");
              form.setFieldValue(formPath, { hex: "", name: "" });
            }}
          >
            Clear
          </Button>
        </div>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options.length > 0 ? options : <Combobox.Empty>Nothing found</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function ColourSelectOption({ hex, name }: ColourOption) {
  return (
    <Group>
      <Box
        style={{
          backgroundColor: hex,
          border: hex === "#ffffff" ? "2px solid light-dark(black, transparent)" : "",
          width: "20px",
          height: "20px",
          borderRadius: "4px",
        }}
      />
      <Text>{name}</Text>
    </Group>
  );
}
