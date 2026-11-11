import type { TransitionOverride } from "@mantine/core";

/**
 * Quick "pop" for dropdowns, menus and popovers.
 * Use as `transitionProps={popTransition}`, or `comboboxProps={{ transitionProps: popTransition }}` on Select-like inputs.
 */
export const popTransition: TransitionOverride = { transition: "pop", duration: 100 };
