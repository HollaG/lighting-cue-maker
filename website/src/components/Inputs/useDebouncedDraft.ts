import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useDebouncedCallback } from "@mantine/hooks";

/** The input's own handlers. Each runs before the draft's handler of the same name. */
export type DraftEventHandlers<E extends HTMLElement> = {
  onFocus?: (e: FocusEvent<E>) => void;
  onBlur?: (e: FocusEvent<E>) => void;
  onKeyDown?: (e: KeyboardEvent<E>) => void;
};

export type UseDebouncedDraftOptions<T, Raw, E extends HTMLElement = HTMLElement> = DraftEventHandlers<E> & {
  /** The saved value. Shown whenever the input isn't focused, so changes from elsewhere (refetch, undo) show up. */
  value: T;
  onSave: (value: T) => void;
  /** What's typed → the value to save, or null if it isn't valid (then nothing is saved). */
  parse: (raw: Raw) => T | null;
  /** How long typing has to pause before saving. */
  debounceMs?: number;
  /** Enter saves and leaves the input. Turn off for multi-line inputs, where Enter is a new line. */
  commitOnEnter?: boolean;
};

/**
 * The logic behind the Debounced* inputs: keeps what's typed locally and saves it after a pause in typing, and on
 * blur / Enter.
 * - Only valid values are saved (see `parse`); on blur the saved value comes back.
 * - Escape drops what hasn't been saved yet (a debounced save that already went out stays).
 * - A save that would change nothing is skipped.
 * - A pending save still goes out if the input unmounts (e.g. its drawer closes).
 *
 * `Raw` is what the input hands back (e.g. `string | number` for a NumberInput); `T` is what gets saved.
 * Returns props to spread onto the input; `onChange` takes the raw value, not the event.
 */
export const useDebouncedDraft = <T extends Raw, Raw, E extends HTMLElement = HTMLElement>({
  value,
  onSave,
  parse,
  debounceMs = 500,
  commitOnEnter = true,
  onFocus,
  onBlur,
  onKeyDown,
}: UseDebouncedDraftOptions<T, Raw, E>) => {
  /** What's being typed; null when not editing. */
  const [draft, setDraft] = useState<Raw | null>(null);
  /** Set by Escape so the blur that follows doesn't save. */
  const cancelRef = useRef(false);

  // Mantine calls the latest version of this callback, so it compares against the latest `value`.
  const debouncedSave = useDebouncedCallback(
    (next: T) => {
      if (next !== value) onSave(next);
    },
    { delay: debounceMs, flushOnUnmount: true },
  );

  const commit = () => {
    debouncedSave.cancel();
    const next = draft === null ? null : parse(draft);
    setDraft(null);
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    if (next !== null && next !== value) onSave(next);
  };

  return {
    value: draft ?? value,
    onFocus: (e: FocusEvent<E>) => {
      onFocus?.(e);
      setDraft(value);
    },
    onChange: (raw: Raw) => {
      setDraft(raw);
      const next = parse(raw);
      if (next === null)
        debouncedSave.cancel(); // invalid: don't send the previous keystroke's value either
      else debouncedSave(next);
    },
    onBlur: (e: FocusEvent<E>) => {
      onBlur?.(e);
      commit();
    },
    onKeyDown: (e: KeyboardEvent<E>) => {
      onKeyDown?.(e);
      if (e.key === "Enter" && commitOnEnter) e.currentTarget.blur();
      if (e.key === "Escape") {
        cancelRef.current = true;
        e.currentTarget.blur();
      }
    },
  };
};

/** Text → the value to save: trimmed if `trim`, and null when empty unless `allowEmpty`. */
export const parseText = (raw: string, { trim, allowEmpty }: { trim: boolean; allowEmpty: boolean }) => {
  const text = trim ? raw.trim() : raw;
  return text === "" && !allowEmpty ? null : text;
};
