import { NumberInput, type NumberInputProps } from "@mantine/core";
import { useDebouncedDraft } from "./useDebouncedDraft";

type DebouncedNumberInputProps = Omit<NumberInputProps, "value" | "defaultValue" | "onChange"> & {
  value: number;
  onSave: (value: number) => void;
  debounceMs?: number;
};

/**
 * A NumberInput that saves after a pause in typing, and on blur / Enter (rules on useDebouncedDraft).
 * An empty value, a non-number or one below `min` is never saved. Other NumberInput props pass through;
 * onFocus / onBlur / onKeyDown run before the input's own.
 */
export const DebouncedNumberInput = ({
  value,
  onSave,
  debounceMs,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: DebouncedNumberInputProps) => {
  const { min } = props;
  const draft = useDebouncedDraft<number, string | number, HTMLInputElement>({
    value,
    onSave,
    debounceMs,
    onFocus,
    onBlur,
    onKeyDown,
    parse: (raw) => {
      if (raw === "") return null;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || (min !== undefined && n < min)) return null;
      return n;
    },
  });

  return <NumberInput {...props} {...draft} />;
};
