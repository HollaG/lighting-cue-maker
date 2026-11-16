import { Textarea, type TextareaProps } from "@mantine/core";
import { parseText, useDebouncedDraft } from "./useDebouncedDraft";

type DebouncedTextareaProps = Omit<
  TextareaProps,
  "value" | "defaultValue" | "onChange" | "onFocus" | "onBlur" | "onKeyDown"
> & {
  value: string;
  onSave: (value: string) => void;
  debounceMs?: number;
  /** Save the text trimmed. Default false. */
  trim?: boolean;
  /** Allow saving an empty value (after trimming). Default true. */
  allowEmpty?: boolean;
};

/**
 * A Textarea that saves after a pause in typing, and on blur (rules on useDebouncedDraft).
 * Enter is a new line here, not a save.
 */
export const DebouncedTextarea = ({
  value,
  onSave,
  debounceMs,
  trim = false,
  allowEmpty = true,
  ...props
}: DebouncedTextareaProps) => {
  const { onChange, ...draft } = useDebouncedDraft<string, string>({
    value,
    onSave,
    debounceMs,
    commitOnEnter: false,
    parse: (raw) => parseText(raw, { trim, allowEmpty }),
  });

  return <Textarea {...props} {...draft} onChange={(e) => onChange(e.currentTarget.value)} />;
};
