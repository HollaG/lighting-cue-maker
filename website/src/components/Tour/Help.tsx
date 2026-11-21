import { Button, Divider, Group, Kbd, Stack, Title, Tooltip } from "@mantine/core";
import { useAppStore } from "../../store/appStore";

export const HelpContent = () => {
  const onCloseHelp = useAppStore((state) => state.setIsHelpDialogOpen);
  const setEventTourActive = useAppStore((state) => state.setEventTourActive);
  const closeAllDrawers = useAppStore((state) => state.closeAllDrawers);

  const startIntroductionTour = () => {
    onCloseHelp(false);
    closeAllDrawers(); // start from a clean page: step 0 points at the "Change item" button
    setEventTourActive(true, 0);
  };

  return (
    <Stack>
      <Title order={5}>Visualiser help</Title>
      <Stack gap="xs">
        <span>
          <Kbd>Left-click</Kbd> and <Kbd>Drag</Kbd> to rotate the view
        </span>
        <span>
          <Kbd>Right-click</Kbd> and <Kbd>Drag</Kbd> to pan the view around
        </span>
        <span>
          <Kbd>Scroll</Kbd> to zoom in and out.
        </span>
      </Stack>
      <Divider />
      <Title order={5}>Tours</Title>
      <Group>
        <Button onClick={startIntroductionTour} variant="light">
          Introduction
        </Button>
        <Tooltip label="Work in progress">
          <Button onClick={() => onCloseHelp(false)} variant="light" disabled>
            Advanced: Cues
          </Button>
        </Tooltip>

        <Tooltip label="Work in progress">
          <Button onClick={() => onCloseHelp(false)} variant="light" disabled>
            Advanced: Timeline
          </Button>
        </Tooltip>
      </Group>
    </Stack>
  );
};
