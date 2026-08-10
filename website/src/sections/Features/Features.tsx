import { Box, Center, Container, FloatingIndicator, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import classes from "./Features.module.css";
import { CreateSection, DesignSection, ExportSection, MarkSection, RunSection } from "./FeatureSections";

const FEATURE_STEPS = ["Create", "Mark", "Design", "Export", "Run"] as const;
type FeatureStep = (typeof FEATURE_STEPS)[number];

export const Features = () => {
  const [activeStep, setActiveStep] = useState<FeatureStep>("Create");
  const [stepsRootRef, setStepsRootRef] = useState<HTMLDivElement | null>(null);
  const [stepRefs, setStepRefs] = useState<Record<FeatureStep, HTMLButtonElement | null>>({
    Create: null,
    Mark: null,
    Design: null,
    Export: null,
    Run: null,
  });

  const setStepRef = (step: FeatureStep) => (node: HTMLButtonElement | null) => {
    setStepRefs((current) => (current[step] === node ? current : { ...current, [step]: node }));
  };

  return (
    <>
      <Center>
        <div className={classes.stepsRoot} ref={setStepsRootRef}>
          {FEATURE_STEPS.map((step) => (
            <UnstyledButton
              key={step}
              ref={setStepRef(step)}
              className={classes.stepControl}
              mod={{ active: activeStep === step }}
              onClick={() => setActiveStep(step)}
            >
              <span className={classes.stepLabel}>{step}</span>
            </UnstyledButton>
          ))}
          <FloatingIndicator target={stepRefs[activeStep]} parent={stepsRootRef} className={classes.stepIndicator} />
        </div>
      </Center>
      <Container size="lg">
        <Box className={classes.content} p="lg">
          <Box display={activeStep === "Create" ? "block" : "none"}>{<CreateSection />}</Box>
          <Box display={activeStep === "Mark" ? "block" : "none"}>{<MarkSection />}</Box>
          <Box display={activeStep === "Design" ? "block" : "none"}>{<DesignSection />}</Box>
          <Box display={activeStep === "Export" ? "block" : "none"}>{<ExportSection />}</Box>
          <Box display={activeStep === "Run" ? "block" : "none"}>{<RunSection />}</Box>
        </Box>
      </Container>
    </>
  );
};
