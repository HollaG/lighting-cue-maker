import { Button, Group, Text } from "@mantine/core";
import { IconArrowNarrowRightDashed, IconCheckFilled } from "@tabler/icons-react";

type Step = {
  name: string;
};

/**
 * Custom stepper component that uses buttons as the core navigation mechanism.
 * The active index is controlled by the parent component.
 */
export const CustomStepper = ({
  steps,
  activeIndex,

  onStepClick,
  canGoToStep,
}: {
  steps: Step[];
  activeIndex: number;

  showUnknownNext?: boolean;

  onStepClick: (index: number) => void;
  canGoToStep?: (index: number) => boolean;
}) => {
  return (
    <Group>
      <Text fw="bold" fz="sm">
        Start
      </Text>
      <IconArrowNarrowRightDashed width="1rem" />

      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isCompleted = index < activeIndex;
        return (
          <Group key={step.name}>
            <Button
              size="xs"
              variant={isActive ? "outline" : isCompleted ? "light" : "transparent"}
              onClick={() => {
                if (canGoToStep?.(index)) {
                  onStepClick(index);
                }
              }}

              disabled={canGoToStep ? !canGoToStep(index) : false}

              rightSection={isCompleted ? <IconCheckFilled width="1rem" /> : undefined}
            >
              {step.name}
            </Button>
            {index === steps.length - 1 ? null : <IconArrowNarrowRightDashed width="1rem" />}
          </Group>
        );
      })}
    </Group>
  );
};
