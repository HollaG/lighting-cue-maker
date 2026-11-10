import type { FormEvent, ReactNode } from "react";

// The wrapper's "Next step" button submits whichever step form is on screen
// (native `form` attribute). Each step saves in its onSubmit, then calls onDone.
export const STEP_FORM_ID = "event-step-form";

/**
 * Wrapper for all steps to hook into the "Next" button
 * the Next button submits the form with the respective ID.
 */
export const StepForm = ({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) => (
  <form
    id={STEP_FORM_ID}
    onSubmit={(e: FormEvent) => {
      e.preventDefault();
      onSubmit();
    }}
  >
    {children}
  </form>
);
