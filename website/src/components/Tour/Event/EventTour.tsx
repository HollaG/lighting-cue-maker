import { Alert, Button, Kbd, Stack, Text, Tour } from "@mantine/core";
import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../../../store/appStore";
import { useLocalStorage } from "@mantine/hooks";
import { useGetItem } from "../../../query-v2/items/useGetItem";
import { getCueOrder } from "../../../utils/cue/cueForm";
import { sanitize } from "../../../utils/sanitize";
import { Logger } from "../../../utils/logger";

import styles from "./EventTour.module.css";

const logger = new Logger("EventTour");

/**
 * Steps where the tour's own Next button is enabled: the ones whose Alert has a Next button, plus the last step
 * (its button is "Close"). Every other step moves on by itself once the user does the action.
 */
const STEPS_WITH_NEXT = new Set([4, 6, 8, 9, 10, 11]);

/** Handle the tour for an event.
 *
 * Event step IDs:
 *
 * `tour-event-{stepId}
 *
 */
export const EventTour = ({ eventId }: { eventId: string }) => {
  // check if user is new (directly read not thru effect so we get the intiial value)
  const isUserNew = useMemo(() => !localStorage.getItem(`${eventId}-last-hidden-time`), [eventId]);
  const [selectedItemId] = useLocalStorage({
    key: `${eventId}-item-selected`,
    defaultValue: "",
    getInitialValueInEffect: false, // read storage on the first render, not in an effect
  });

  const active = useAppStore((s) => s.tour.event.active);
  const setActive = useAppStore((s) => s.setEventTourActive);
  const step = useAppStore((s) => s.tour.event.step);
  const setStep = useAppStore((s) => s.setEventTourStep);

  // track steps
  // step 0 -> 1 critiera
  const isEventDetailsDrawerOpen = useAppStore((s) => s.isEventDetailsDrawerOpen);

  // step 2 critiera
  const isLyricsDrawerOpen = useAppStore((s) => s.isLyricsDrawerOpen);

  const advanceEventTour = useAppStore((s) => s.advanceEventTour);

  // step 3
  const inputMode = useAppStore((s) => s.inputMode);

  // step 6
  const isCuesDrawerOpen = useAppStore((s) => s.isCuesDrawerOpen);
  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  // The first cue in the cues drawer: cue order is the order of the markers in the lyrics (same as Cues.tsx).
  const { item } = useGetItem(eventId, selectedItemId);
  const firstCueId = useMemo(() => getCueOrder(sanitize(item?.rawLyrics ?? ""))[0], [item?.rawLyrics]);

  // Step 8
  const selectedCueId = useAppStore((s) => s.currentlySelectedCueId);

  // Step 10
  const closeAllDrawers = useAppStore((s) => s.closeAllDrawers);

  // --- Auto Advance ---------
  // Step 0 -> 1
  // criteria: event details drawer is open BEFORE the tour has begun
  useEffect(() => {
    if (step === 0 && isEventDetailsDrawerOpen) advanceEventTour();
  }, [isEventDetailsDrawerOpen, step]);

  // Step 1 -> 0
  // critiera: user closes the modal, but has not selected an item
  useEffect(() => {
    if (step === 1 && !isEventDetailsDrawerOpen && !selectedItemId) setStep(0);
  }, [step, isEventDetailsDrawerOpen, selectedItemId]);

  // Step 1 -> 2
  // critiera: the modal closes AND the user has selected an item
  useEffect(() => {
    if (step === 1 && !isEventDetailsDrawerOpen && selectedItemId) advanceEventTour();
  }, [step, isEventDetailsDrawerOpen, selectedItemId]);

  // Auto-advance: step 2 -> 3.1
  // criteria: drawer is open
  useEffect(() => {
    if (step === 2 && isLyricsDrawerOpen) {
      // wait for drawer to fully open
      setTimeout(() => {
        advanceEventTour();
      }, 300);
    }
  }, [step, isLyricsDrawerOpen]);

  // Auto-advance: step 3.1 --> 3
  // critiera: user is in Lyric mode
  useEffect(() => {
    if (step === 3 && inputMode === "raw") advanceEventTour();
  }, [step, inputMode]);

  // Manual advance: step 3 -> 4
  // Critiera: user clicks the Next button in the tour AND there is some text in the lyrics
  // TODO!!!!

  // Auto advance: step 4 -> 5
  // Critiera: user switches to Cue mode
  useEffect(() => {
    if (step === 5 && inputMode === "cue") advanceEventTour();
  }, [step, inputMode]);

  // Manual advance: step 5 -> 6
  // Critiera: user clicks the Next button in the tour AND there is at least one cue in the lyrics
  // TODO!!!

  // Auto advance: step 6 -> 7
  // Criteria: user opens the cues drawer
  useEffect(() => {
    if (step === 7 && isCuesDrawerOpen) {
      // force deselect all cues
      setSelectedCueId(undefined);

      // wait for drawer to fully open
      setTimeout(() => {
        advanceEventTour(); // this will auto-scroll to the first cue
      }, 300);

      // ALSO: Select the first cue in the list (if there is one) then immeidately unselect it
      // This is to force the cues drawer to scroll to the top.
      // if (firstCueId) {
      //   setSelectedCueId(firstCueId);
      //   // Unselect on the next frame, not right away: in the same tick React would batch both updates, the card's
      //   // `isSelected` would never flip to true, and its scroll-into-view effect wouldn't run.
      //   requestAnimationFrame(() => setSelectedCueId(undefined));
      // }
    }
  }, [step, isCuesDrawerOpen, firstCueId, setSelectedCueId]);

  // CANCEL CANCEL, we cannot detect when the user previews a cue through manual click
  // Auto/Manual advance: step 7 -> 8
  // critiera: the cue goes from being not previewed to previewd.
  // NOTE: when the user edits something in step 7, the cue will auto preview. However, what we're looking for
  // is it going from not previewed to previewed
  // The user also has the option to press next anyway
  // const previouslyPreviewedCueId = useRef<string | undefined>(undefined);
  // useEffect(() => {
  //   // Read the previous value, then always record the current one (also outside step 8), so that on entering
  //   // step 8 the ref already holds whatever was selected before, not a stale value.
  //   const previous = previouslyPreviewedCueId.current;
  //   previouslyPreviewedCueId.current = selectedCueId;
  //   if (step !== 8) return;

  //   // Falsy, not `=== undefined`: unpreviewing a cue sets it to "" (CueCard's onPreview).
  //   if (!previous && selectedCueId) {
  //     advanceEventTour();

  //     // Help to close all open drawers
  //     setIsCuesDrawerOpen(false);
  //     setIsLyricsDrawerOpen(false);
  //   }
  // }, [step, selectedCueId]);

  // Step 10 (visualiser): close every drawer so the visualiser is in view.
  // On entering the step, not in a button, so both the Tour's own Next and the Next in the alert do it.
  useEffect(() => {
    if (step === 10) closeAllDrawers();
  }, [step, closeAllDrawers]);

  // log the step
  useEffect(() => {
    logger.debug(`Tour advanced to step (0-indexed): ${step}`);
  }, [step]);
  return (
    <Tour
      active={active}
      step={step}
      onStepChange={setStep}
      onClose={() => setActive(false)}
      withOverlayInteraction
      closeOnEscape={false}
      withKeyboardNavigation={false} // ← / → would go Back / Next past the rules below

      classNames={{
        // Back is always hidden; Next is hidden unless this step allows it (see STEPS_WITH_NEXT).
        navigation: STEPS_WITH_NEXT.has(step) ? styles.navigation : `${styles.navigation} ${styles.nextHidden}`,
      }}
    >
      {/* Step 0: Select an item */}
      <Tour.Step target="#tour-event-0" title="Select an item">
        <Stack>
          <Text>Click here to select or create an item. </Text>
        </Stack>
      </Tour.Step>
      <Tour.Step target="#tour-event-1" title="Select an item">
        <Stack>
          <Text>You can choose your item if it's here, or create a new item in the text box.</Text>
          <Alert>Please select or create an item to continue.</Alert>
        </Stack>
      </Tour.Step>
      <Tour.Step target="#tour-event-2" title="Add your lyrics">
        <Stack>
          The engineer needs to know what lyrics you'll be singing on stage. Open the lyrics section to add your lyrics.
          <Alert>Please open the Lyrics section.</Alert>
        </Stack>
      </Tour.Step>

      {/* Redirection step: Select the 'lyrics mode' */}
      <Tour.Step target="#tour-event-redirect-3-1" title="Select lyric mode">
        <Stack>
          You can add your lyrics in "Lyric Mode". Let's switch to Lyric Mode first. Click the "Lyric Mode" button to
          switch to Lyric Mode.
          <Alert>Please switch to Lyric Mode.</Alert>
        </Stack>
      </Tour.Step>
      <Tour.Step target="#tour-event-3" title="Add your lyrics">
        <Stack>
          Before you can begin adding cues, add your lyrics that will be sung on stage. <br />
          <br />
          Add all your lyrics now before proceeding. You can find them from websites like Genius.com.
          <br />
          <Alert>
            Please add your lyrics, then click{" "}
            <Button variant="transparent" size="xs" onClick={() => advanceEventTour()}>
              Next
            </Button>{" "}
            when you are done.
          </Alert>
        </Stack>
      </Tour.Step>

      <Tour.Step target="#tour-event-redirect-3-1" title="Select cue mode">
        <Stack>
          Now that you've added your lyrics, let's switch to Cue Mode. Click the "Cue Mode" button to switch to Cue
          Mode.
          <Alert>Please switch to Cue Mode.</Alert>
        </Stack>
      </Tour.Step>
      <Tour.Step target="#tour-event-3" title="Add your cues">
        <Stack>
          Now you're in Cue Mode. Here, you can add cues to your lyrics.
          <br />
          <br />
          Click on any word or space to add a cue at that point.
          <br />
          <Alert>
            Please add your cues, then click{" "}
            <Button variant="transparent" size="xs" onClick={() => advanceEventTour()}>
              Next
            </Button>{" "}
            when you are done.
          </Alert>
        </Stack>
      </Tour.Step>

      <Tour.Step target="#tour-event-6" title="View your cues">
        <Stack>
          Let's set up each cue now. Click "Show Cues" to see all the cues you added.
          <Alert>Please open the Cues section.</Alert>
        </Stack>
      </Tour.Step>
      {/* Manual cue */}
      <Tour.Step target="#tour-event-7" title="Set up your cues" position="left">
        <Stack>
          Each cue has a multitude of settings you can set. These settings help you to achieve your own vision. Let's
          try setting up the first cue.
          <Alert>
            Please set up your cue by selecting some options, then click{" "}
            <Button variant="transparent" size="xs" onClick={() => advanceEventTour()}>
              Next
            </Button>{" "}
            when you are done.
          </Alert>
        </Stack>
      </Tour.Step>

      {/* Manual advance or when user toggles preview OFF --> ON */}
      {/* Note: it can already be ON. */}
      <Tour.Step target="#tour-event-8" title="Preview your cue" position="right">
        <Stack>
          You can preview a cue in the visualiser by clicking the Cue Number.
          <br /> When selected, this cue will be shown in the Visualiser.
          <Alert>
            Please click
            <Button
              variant="transparent"
              size="xs"
              onClick={() => advanceEventTour()} // the step 10 effect closes the drawers
            >
              Next
            </Button>{" "}
            after you have selected the "Preview" button.
          </Alert>
        </Stack>
      </Tour.Step>

      <Tour.Step target="#tour-event-9" title="Preview your cue" position="right">
        <Stack>
          Let's take a look at the visualiser now.
          <br />
          The visualiser is where you can check your cue design.
          <span>
            <Kbd>Right-click</Kbd> and <Kbd>Drag</Kbd> to rotate the view
          </span>
          <span>
            <Kbd>Left-click</Kbd> and <Kbd>Drag</Kbd> to pan the view around
          </span>
          <span>
            <Kbd>Scroll</Kbd> to zoom in and out.
          </span>
          <Alert>
            Please try moving around the visualiser, then click{" "}
            <Button variant="transparent" size="xs" onClick={() => advanceEventTour()}>
              Next
            </Button>{" "}
            when you are done.
          </Alert>
        </Stack>
      </Tour.Step>
      <Tour.Step title="Tour complete!">
        <Stack>
          Congratulations! You now know how to program and preview your cues.
          <br />
          <br />
          Please proceed to finish your item's lighting plan now.
          <br />
          <br />
          There are more advanced tours you can take to learn more. To access them, click the "Help" button in the
          bottom left corner of the screen.
        </Stack>
      </Tour.Step>
    </Tour>
  );
};
