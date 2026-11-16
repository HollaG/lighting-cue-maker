import { TextInput, type TextInputProps } from "@mantine/core";
import type { ComponentType } from "react";
import { parseText, useDebouncedDraft } from "./useDebouncedDraft";

type DebouncedTextInputProps = Omit<TextInputProps, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onSave: (value: string) => void;
  debounceMs?: number;
  /** Save the text trimmed. Default true. */
  trim?: boolean;
  /** Allow saving an empty value (after trimming). Default false, so e.g. a name can't be blanked. */
  allowEmpty?: boolean;
  /** The input to render, e.g. CustomTextInput. Default: Mantine's TextInput. */
  inputComponent?: ComponentType<TextInputProps>;
};

/**
 * A TextInput that saves after a pause in typing, and on blur / Enter (rules on useDebouncedDraft).
 * onFocus / onBlur / onKeyDown run before the input's own.
 */
export const DebouncedTextInput = ({
  value,
  onSave,
  debounceMs,
  trim = true,
  allowEmpty = false,
  inputComponent: Input = TextInput,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: DebouncedTextInputProps) => {
  const { onChange, ...draft } = useDebouncedDraft<string, string, HTMLInputElement>({
    value,
    onSave,
    debounceMs,
    onFocus,
    onBlur,
    onKeyDown,
    parse: (raw) => parseText(raw, { trim, allowEmpty }),
  });

  return <Input {...props} {...draft} onChange={(e) => onChange(e.currentTarget.value)} />;
};
