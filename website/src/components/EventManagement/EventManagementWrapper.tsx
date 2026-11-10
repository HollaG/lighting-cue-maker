import { Button, Center, Group, Stack, Stepper } from "@mantine/core";
import { useIsMutating } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Step1 } from "./Steps/Step1/Step1";
import { Step2 } from "./Steps/Step2/Step2";
import { Step3 } from "./Steps/Step3/Step3";
import { Step4 } from "./Steps/Step4/Step4";
import { Step5 } from "./Steps/Step5/Step5";
import { STEP_FORM_ID, StepForm } from "./Steps/StepForm";

const STEPS: {
  label: string;
  description: string;
}[] = [
  {
    label: "Event details",
    description: "Basic event details",
  },
  {
    label: "Fixtures",
    description: "Manage lights",
  },
  {
    label: "Fixture groups",
    description: "Configure fixture groupings",
  },
  {
    label: "Fixture placements",
    description: "Set up your stage simulation",
  },
  {
    label: "Fixture presets",
    description: "Set up your presets for easy selection",
  },
];

/**
 * Create mode: no `eventId`, only Step 1 is reachable. Saving it creates the event and
 * switches to edit mode (/events/{id}/edit?step=1).
 *
 * Edit mode: `eventId` and `step` come from the URL, so a refresh keeps both.
 */
export const EventManagementWrapper = ({ eventId, step = 0 }: { eventId?: string; step?: number }) => {
  const navigate = useNavigate();

  const active = eventId ? Math.min(Math.max(Math.trunc(step), 0), STEPS.length - 1) : 0;

  const goToStep = (id: string, next: number, replace = false) =>
    navigate({ to: "/events/$eventId/edit", params: { eventId: id }, search: { step: next }, replace });

  const nextStep = () => {
    if (eventId && active < STEPS.length - 1) goToStep(eventId, active + 1);
  };
  const prevStep = () => {
    if (eventId && active > 0) goToStep(eventId, active - 1);
  };

  // Covers every step's save, so the steps don't have to report it.
  const isSavingStep1 =
    useIsMutating({
      mutationKey: ["event-config-1"],
    }) > 0;

  const isSavingStep2 =
    useIsMutating({
      mutationKey: ["event-config-2"],
    }) > 0;
  const isSavingStep3 =
    useIsMutating({
      mutationKey: ["event-config-3"],
    }) > 0;
  const isSavingStep4 =
    useIsMutating({
      mutationKey: ["event-config-4"],
    }) > 0;
  const isSavingStep5 =
    useIsMutating({
      mutationKey: ["event-config-5"],
    }) > 0;

  const isNextLoading = isSavingStep1 || isSavingStep2 || isSavingStep3 || isSavingStep4 || isSavingStep5;

  const onGoToEvent = () => {
    // url: /events/${eventId}
    if (eventId) {
      navigate({ to: "/events/$eventId", params: { eventId } });
    }
  };
  return (
    <Stack px={"4rem"} gap="2rem" style={{ maxWidth: "125rem", margin: "auto" }}>
      <Stepper
        active={active}
        onStepClick={(index) => eventId && goToStep(eventId, index)}
        // Edit mode can jump to any step; create mode has to save Step 1 first.
        allowNextStepsSelect={!!eventId}
      >
        {STEPS.map((step, index) => (
          <Stepper.Step key={index} label={step.label} description={active === index ? step.description : undefined}>
            {index === 0 ? (
              <Step1
                eventId={eventId ?? null}
                // replace on create, so the browser's back button doesn't return to an empty create form
                onDone={(id) => goToStep(id, 1, !eventId)}
              />
            ) : index === 1 ? (
              // TODO: save the fixtures before moving on
              eventId ? (
                <Step2
                  eventId={eventId}

                  onDone={() => goToStep(eventId, 2)}
                />
              ) : null
            ) : index === 2 ? (
              eventId ? (
                <Step3 onDone={() => goToStep(eventId, 3)} eventId={eventId} />
              ) : null
            ) : index === 3 ? (
              eventId ? (
                <StepForm onSubmit={nextStep}>
                  <Step4 onDone={() => goToStep(eventId, 4)} eventId={eventId} />
                </StepForm>
              ) : null
            ) : (
              <StepForm onSubmit={() => alert("unimpl")}>
                <Step5 onDone={() => {}} eventId={eventId!} />
              </StepForm>
            )}
          </Stepper.Step>
        ))}

        <Stepper.Completed>Completed, click back button to get to previous step</Stepper.Completed>
      </Stepper>
      <Center>
        <Group>
          <Button variant="subtle" onClick={prevStep} disabled={active === 0}>
            Back
          </Button>
          {active !== STEPS.length - 1 ? (
            <Button type="submit" form={STEP_FORM_ID} loading={isNextLoading}>
              Next step
            </Button>
          ) : (
            <Button onClick={onGoToEvent}> Go to event</Button>
          )}
        </Group>
      </Center>
    </Stack>
  );
};
