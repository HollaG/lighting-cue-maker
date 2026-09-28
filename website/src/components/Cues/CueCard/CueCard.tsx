// feature[class=Realtime] Cue card with remote form updates and cursor tracking surface

import {
  Accordion,
  Box,
  Button,
  Code,
  Collapse,
  Flex,
  Group,
  Input,
  Loader,
  Menu,
  NumberInput,
  Popover,
  px,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { CardBase } from "../CardBase";
import type { Cue, CueConfig } from "../../../types/cues";
import { useAppStore } from "../../../store/appStore";
import { type FixtureGroupConfiguration, type Item } from "../../../types/types";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconPencilAi, IconPlus } from "@tabler/icons-react";
import { useForm, type FormErrors } from "@mantine/form";
import { useDebouncedCallback, useLocalStorage } from "@mantine/hooks";
import { useUpdateCue } from "../../../query/cue/useUpdateCue";
import { useDeleteCue } from "../../../query/cue/useDeleteCue";
import {
  createDefaultValueAssignment,
  reconcileCueAssignments,
  removeCueFromRawLyrics,
} from "../../../utils/cue/cueForm";
import { useUpdateItem } from "../../../query/item/useUpdateItem";
import { notifications } from "../../../utils/notifications";
import type { Visualiser } from "../../../types/visualiser";
import type { Fixture } from "../../../types/fixtures";
import { checkCueCorrectness } from "../../../utils/cue/cueValidator";
import { ViewModeSelect, type ViewMode } from "./ViewModeSelect";
import { CueContents } from "../CueContents/CueContents";
import { CueNotices } from "../CueNotices/CueNotices";
import { useCueViewModeTracking } from "../../../hooks/realtime/useCueViewModeTracking";
import { useActiveVersionTracking } from "../../../hooks/realtime/useActiveVersionTracking";
import { useRealtimeStore } from "../../../store/realtimeStore";
import { useCreateAlternate } from "../../../query/alternate-cue/useCreateAlternate";
import { useGetAlternates } from "../../../query/alternate-cue/useGetAlternates";
import type { AlternateCue } from "../../../types/alternate-cue";
import { useUpdateAlternate } from "../../../query/alternate-cue/useUpdateAlternate";
import { alternateUpdateValues, cueFormValues } from "../../../utils/alternates";
import { useDeleteAlternate } from "../../../query/alternate-cue/useDeleteAlternate";

type FormData = Cue;

interface CueCardProps {
  cue: Cue;
  alternates: AlternateCue[];
  cueNumber: number;
  isCueSelected: boolean;
  fixtureGroups?: FixtureGroupConfiguration[];

  eventId: string; // for visualiser
  visualiser: Visualiser | null; // allow for null visualiser so that it can be loading state? TODO;
  fixtures: Fixture[];
  setOffset: React.Dispatch<React.SetStateAction<number>>; // translate the WHOLE cue cards up
  globalViewMode: ViewMode;
}

// 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000
let MARKS = [
  {
    value: -1,
    label: "Manually",
    hidden: false,
  },
  {
    value: 250,
    label: "0.25s",
    hidden: true,
  },
  {
    value: 500,
    label: "0.5s",
    hidden: true,
  },
  {
    value: 750,
    label: "0.75s",
    hidden: true,
  },
];

for (let i = 1000; i <= 10000; i += 500) {
  let hidden = false;
  if (i <= 1000) {
    hidden = true;
  } else if (i <= 1000) {
    hidden = i % 250 !== 0; // show 100, 250, 500, 750, 1000
  } else {
    hidden = i % 1000 !== 0; // show 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000
  }

  if (i === 0) continue; // skip 0, as we have "Manually" for -1

  MARKS.push({
    value: i,
    label: `${i / 1000}s`,
    hidden: hidden,
  });
}

const CueCardInternal = ({
  cue: _cue, // _cue is the ORIGINAL cue
  cueNumber,
  isCueSelected,
  fixtureGroups = [],
  setOffset,
  eventId,
  visualiser,
  fixtures,
  globalViewMode,
}: CueCardProps) => {
  const [currentViewingAlternateId, setCurrentViewingAlternateId] = useState<string | "main">("main");
  const [pendingFollowedVersionId, setPendingFollowedVersionId] = useState<string | null>(null);

  /** Main and alternate versions use different update endpoints. */
  const shouldPersist = currentViewingAlternateId === "main";

  const queryClient = useQueryClient();
  const cueOrder = useAppStore((s) => s.cueOrder);
  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);
  const userId = useRealtimeStore((s) => s.user?.userId || null);
  const followingUserId = useRealtimeStore((s) => s.followingUserId);

  useActiveVersionTracking({
    cueId: _cue.id,
    selectedVersionId: currentViewingAlternateId,
    setFollowedVersionId: (versionId) => {
      if (versionId === currentViewingAlternateId) return;
      if (versionId === "main") {
        onChangeToMain(_cue);
      } else {
        onChangeAlternateVersion(versionId);
      }
    },
  });

  const { mutateAsync: updateCue } = useUpdateCue();
  const { mutateAsync: deleteCue } = useDeleteCue();
  const { mutate: updateItem } = useUpdateItem();

  const { mutateAsync: createAlternate, isPending: isCreatingAlternate } = useCreateAlternate();
  const { alternates } = useGetAlternates({ cueId: _cue.id });
  const { mutateAsync: updateAlternate } = useUpdateAlternate();
  const { mutateAsync: deleteAlternate } = useDeleteAlternate();

  const [isCollapsed] = useLocalStorage({ key: `cue-${_cue.id}-collapsed`, defaultValue: false });
  const [isDirty, setIsDirty] = useState(false);
  const isApplyingRemoteValuesRef = useRef(false);
  const isChangingVersionRef = useRef(false);
  const isEditingTransitionTimeRef = useRef(false);

  const showLoadingIcon = isDirty || isCreatingAlternate;

  /** This is the ORIGINAL cue ID. */
  const cueId = _cue.id;

  /** The viewed cue always has the parent cue ID; alternates have a separate alternateId. */
  const cue =
    currentViewingAlternateId === "main"
      ? _cue
      : (alternates || []).find((a) => a.alternateId === currentViewingAlternateId) || _cue;

  // Track the available alternates and reset to `main` if not found.
  // Why not just do it as a side effect of `delete()`?
  // We might have upstream updates that remove an alternate. Then, we wouldn't be able to reset to main.
  useEffect(() => {
    if (currentViewingAlternateId === "main") return;
    if (!alternates || alternates.length === 0) return;
    if (!alternates.find((a) => a.alternateId === currentViewingAlternateId)) {
      //reset to main
      onChangeToMain(_cue);
    }
  }, [currentViewingAlternateId, alternates]);

  // --- Form ---------
  const initialValues: FormData = useMemo(
    () => ({
      id: cueId,
      comments: cue.comments,
      createdAt: cue.createdAt,
      updatedAt: cue.updatedAt,
      deletedAt: cue.deletedAt,
      cueConfig: cue.cueConfig ?? { mode: "unknown" },

      // default transition is Hold & Instant
      transition: cue.transition ?? { holdTimeMs: -1, transitionTimeMs: 0 },

      assignments:
        cue && cue.assignments && Object.keys(cue.assignments).length != 0
          ? // TODO(editing): we need to figure out a way to reconcile the values:
            //                example: we add a new attribute when editing. However,
            //                because cue.assignments (which contains the old set of possible attribute & their assignments)
            //                doesn't have the new attributeId, we need to somehow add it in.
            reconcileCueAssignments(cue, fixtureGroups).assignments
          : Object.fromEntries(
              fixtureGroups.map((group) => [
                group.id,
                {
                  name: group.name,
                  assignment: Object.fromEntries(
                    group.attributes.map((attribute) => [
                      attribute.id,
                      {
                        name: attribute.name,
                        type: attribute.type,
                        value: createDefaultValueAssignment(attribute),
                      },
                    ]),
                  ),
                },
              ]),
            ),
    }),
    [cue, fixtureGroups],
  );

  async function handleSave(shouldValidate = true) {
    // first, validate the form
    const validationResult = shouldValidate ? form.validate() : { hasErrors: false };

    if (validationResult.hasErrors) {
      // notifications.show({
      //   title: "Cannot save cue",
      //   message: "Please fix the errors in the cue before saving.",
      // });
      return;
    }
    const activeItemId = useAppStore.getState().activeItemId;
    if (!activeItemId) return;
    try {
      // Remove all unncessary ValueAssignments from the attributes
      const formValues = form.getValues();
      Object.values(formValues.assignments).forEach((assignment) => {
        Object.values(assignment.assignment).forEach((attributeAssignment) => {
          const type = attributeAssignment.type;
          const value = attributeAssignment.value[type];

          // only keep that value
          attributeAssignment.value = { [type]: value };
        });
      });

      if (shouldPersist) {
        await updateCue({
          cueId: cueId,
          itemId: activeItemId,
          requestBody: { ...form.getValues(), updatedBy: userId || undefined },
        });
      } else {
        await updateAlternate({
          alternateId: currentViewingAlternateId,
          requestBody: { ...alternateUpdateValues(formValues), updatedBy: userId || undefined },
        });
      }

      // re-validate the cue after saving
      // set all the alerts to be visible again
      setShowNotices(true);
      setShowWarnings(true);
      setShowErrors(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDirty(false);
    }
  }

  const debouncedSave = useDebouncedCallback(() => {
    void handleSave();
  }, 200);

  const validateCue = (values: FormData): FormErrors => {
    const errors: FormErrors = {};

    for (const group of fixtureGroups) {
      for (const attribute of group.attributes) {
        if (!attribute.metadata.required) continue;

        const assignment = values.assignments[group.id]?.assignment[attribute.id];

        const value = assignment?.value[attribute.type];
        const isEmpty =
          value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          const path = `assignments.${group.id}.assignment.${attribute.id}.value.${attribute.type}`;

          errors[path] = `${attribute.name} is required`;
        }
      }
    }

    return errors;
  };

  const form = useForm<FormData>({
    mode: "uncontrolled",
    initialValues,

    onValuesChange: () => {
      // Remote query updates must not be treated as local edits and saved back to the server.
      if (isApplyingRemoteValuesRef.current || isChangingVersionRef.current) return;

      setIsDirty(true);

      // Timing inputs save on blur so a query refresh cannot interrupt typing.
      if (isEditingTransitionTimeRef.current) return;

      debouncedSave();
    },

    validate: validateCue,
  });

  const [holdTimeMs, setHoldTimeMs] = useState(initialValues.transition.holdTimeMs);
  form.watch("transition.holdTimeMs", ({ value }) => setHoldTimeMs(value));
  const [transitionTimeMs, setTransitionTimeMs] = useState(initialValues.transition.transitionTimeMs);
  form.watch("transition.transitionTimeMs", ({ value }) => setTransitionTimeMs(value));

  const [showTransition, setShowTransition] = useState<boolean>(initialValues.cueConfig.mode !== "unknown");

  const onTransitionTimeFocus = () => {
    isEditingTransitionTimeRef.current = true;
    debouncedSave.cancel();
  };

  const onTransitionTimeBlur = () => {
    isEditingTransitionTimeRef.current = false;
    debouncedSave.cancel();
    void handleSave();
  };

  /**
   * Update the cue config
   * This must be done through controlled components and not directly through form editing.
   * Because there are no form components that support what we need
   * @param cueConfig
   */
  const onSaveCueConfig = (cueConfig: CueConfig) => {
    form.setFieldValue("cueConfig", cueConfig);
    // update the local mode
    setShowTransition(cueConfig.mode !== "unknown");
    debouncedSave.cancel();
    void handleSave(false);
  };

  // --- Handle Cue cards translation up / down when clicked ---------

  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCueSelected || !cueRef.current) {
      return;
    }
    const elementId = `ref-${cueId}`;
    const element = document.getElementById(elementId);
    if (!element) return;

    const targetTopY = element.offsetTop;
    const cardNaturalTopY = cueRef.current.offsetTop;

    // 2.375rem convert to px
    const pxOffset = px("3.375rem");

    // Because offsetTop measures an element’s layout position relative to its offset parent.
    // Scrolling changes where it appears on screen, but its layout position stays the same.
    // Hence, we need to account for the current scroll pos of the container and subtract that as well.
    const card = cueRef.current;
    const container = card?.parentElement?.parentElement?.parentElement; // The scrollable cue Stack
    const curScrollPos = container?.scrollTop || 0;

    const deltaY = targetTopY - cardNaturalTopY - Number(pxOffset) + curScrollPos;

    // setOffset(deltaY); temp cancel

    // instead of setting the offset of which the whole div should move up,
    // let this offset be the delta scroll pos of the cue list between now and desired.
    // 1. Get the current scroll position of the container

    // split logic: if deltaY is negative, then we need to "scroll down" or "move the cards up"
    //              if deltaY is positive, then we need to "scroll up" or "move the cards down"

    if (deltaY < 0) {
      // 2. get the target scroll position
      const targetScrollPos = curScrollPos + deltaY * -1;

      // 3. scroll the container to the target scroll position
      container?.scrollTo({
        top: targetScrollPos,
        behavior: "smooth",
      });
    } else {
      // Need to scroll "up" or "move the cards down"
      // Important note: it may be the case that scrolling simply doesn't work,
      // as there is no 'offset' to scroll

      // This means that we can't scroll up, so we need to insert a height element to push the whole cards down.

      // the height of this element is calculated from `targetTopY`
      // Note that first we scroll up, then move the cards down.
      const targetScrollPos = curScrollPos + deltaY * -1;

      // 3. scroll the container to the target scroll position
      container?.scrollTo({
        top: targetScrollPos,
        behavior: "smooth",
      });
    }
  }, [cueId, isCueSelected, setOffset, cueRef.current]);

  // This is required to set the z-index of the card that has the Combobox dropdown (colour select) open,
  // so that the dropdown is not hidden behind the next card.
  // this is a hack, see https://share.gemini.google/Od39OwKe7Hnw
  const [isAtLeastOneComboboxOpened, setAtLeastOneComboboxOpened] = useState<boolean>(false);

  // const onJumpToCue = () => {
  //   setSelectedCueId(cueId);

  //   const element = document.getElementById(`ref-${cueId}`);
  //   if (!element) return;

  //   const y = element.getBoundingClientRect().top + window.scrollY - 128;
  //   window.scrollTo({ top: y, behavior: "smooth" });
  // };

  // --- Handle initial save of cue if it has no assignments (a new cue) ---------

  // on the FIRST render, run a "save", so that the correct value assignments
  // are populated into the DB.
  // useEffect(() => {
  //   const needsInitialSave = !cue.assignments || Object.keys(cue.assignments).length === 0;
  //   if (!needsInitialSave) return;
  //   console.info("Cue not initialized, saving default values in DB");

  //   // Defer initial save to browser idle time so initial render and scrolling stay smooth
  //   const runSave = () => {
  //     // NOTE: Passing refetchItem / refetchCues here for now to ensure query sync,
  //     // but in the future we can save silently without refetching to prevent re-render cascades.
  //     handleSave();
  //   };

  //   if (typeof requestIdleCallback !== "undefined") {
  //     const handle = requestIdleCallback(runSave);
  //     return () => cancelIdleCallback(handle);
  //   } else {
  //     const timer = setTimeout(runSave, 100);
  //     return () => clearTimeout(timer);
  //   }
  // }, [cueRef]);

  // --- Deletion of cue ---------
  const [isDeletePopoverOpen, setDeletePopoverOpen] = useState(false);
  const handleDelete = async () => {
    try {
      const activeItemId = useAppStore.getState().activeItemId;
      const item = queryClient.getQueryData<Item>(["item", activeItemId]);
      if (!item) return;
      await deleteCue({ cueId: _cue.id, itemId: item.id });
      const updatedRawLyrics = removeCueFromRawLyrics(item.rawLyrics, _cue.id);

      // update Item to remove from rawlyrics
      // TODO @combine-updates: can probably calculate insertCueInRichContent in the backend, so we can save one query

      updateItem({
        itemId: item.id,
        requestBody: {
          rawLyrics: updatedRawLyrics,
        },
      });

      // Remove the curentlyselectedcueid
      setSelectedCueId(undefined);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Copy cue ---------
  const onCopyCue = (cueId: string, fixtureGroupIds: string[], cueNumberCopied: number) => {
    const activeItemId = useAppStore.getState().activeItemId;
    const cues = queryClient.getQueryData<Cue[]>(["cues", activeItemId]);
    const cueToCopy = (cues || []).find((c) => c.id === cueId);
    if (cueToCopy) {
      const { id: _id, ...cueWithoutId } = cueToCopy;

      if (fixtureGroupIds.length > 0) {
        // only copy those specific assignments for those fixture groups
        cueWithoutId.assignments = Object.fromEntries(
          Object.entries(cueWithoutId.assignments).filter(([groupId]) => fixtureGroupIds.includes(groupId)),
        );

        // these assignments should override the current assignments in the form
        const currentAssigments = form.getValues().assignments;

        // Rules:
        // 1. If a group is copied, then if it is in enabledGroups, copy it, otherwise remove it from enabledGroups
        // 2. If a group is not copied, do not add or remove it from this' enabledGroups
        const cueConfig = form.getValues().cueConfig;
        let finalEnabledGroups = cueConfig.mode === "normal" ? cueConfig.enabledGroups : [];

        for (const groupId of fixtureGroupIds) {
          // copy the state of the group.
          // if it is enabled in the copied cue, then enable it in this cue, otherwise disable it.
          if (cueWithoutId.cueConfig.mode === "normal" && cueWithoutId.cueConfig.enabledGroups.includes(groupId)) {
            // enable it in this cue
            if (!finalEnabledGroups.includes(groupId)) {
              finalEnabledGroups.push(groupId);
            }
          } else {
            // disable it in this cue
            finalEnabledGroups = finalEnabledGroups.filter((id) => id !== groupId);
          }
        }

        form.setValues({
          ...form.getValues(),
          cueConfig: {
            mode: cueWithoutId.cueConfig.mode,
            enabledGroups: cueWithoutId.cueConfig.mode === "normal" ? finalEnabledGroups : undefined,
          },
          assignments: {
            ...currentAssigments,
            ...cueWithoutId.assignments,
          },
          transition: cueWithoutId.transition,
        } as Partial<FormData>);

        notifications.show({
          title: `Copied cue ${cueNumberCopied}!`,
          message: ``,
        });

        // show the transition, if the copied cue has a cueConfig
        if (cueWithoutId.cueConfig.mode !== "unknown") {
          setShowTransition(true);
        } else {
          setShowTransition(false);
        }
      } else {
        notifications.show({
          title: "No fixture groups selected",
          message: "At least one fixture group to copy must be selected ",
          color: "red",
        });
      }
    } else console.error("No such cue found!");
  };

  const [query, setQuery] = useState("");
  const [copyFixtureGroupIds, setCopyFixtureGroupIds] = useState<string[]>(fixtureGroups.map((group) => group.id));
  // ALWAYS map first, so we preserve the numbering of cues (Cue 1, cue 2, cue 3...)
  let cuesIdsOtherThanThisList = cueOrder
    .map((cueId, index) => ({ value: cueId, label: `Cue ${index + 1}` }))
    .filter((c) => c.value !== cueId);
  if (query.length > 0) {
    // show the indexes-1 that match:
    //   search "1" --> show 0, 10,
    //   search "22" --> show 21,
    cuesIdsOtherThanThisList = cuesIdsOtherThanThisList.filter((cue) => cue.label.includes(query));
  }

  // --- Visual feedback on problems with cue, if any ---------
  const cueValidationResult = useMemo(() => checkCueCorrectness(cue, fixtureGroups), [cue, fixtureGroups]);
  const notices = cueValidationResult.issues.filter((issue) => issue.type === "notice");
  const warnings = cueValidationResult.issues.filter((issue) => issue.type === "warning");
  const errors = cueValidationResult.issues.filter((issue) => issue.type === "error");
  const customResults = cueValidationResult.issues.filter((issue) => issue.type === "custom");

  const [showNotices, setShowNotices] = useState<boolean>(false);
  const [showWarnings, setShowWarnings] = useState<boolean>(false);
  const [showErrors, setShowErrors] = useState<boolean>(false);

  // --- Visualiser ---------
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>({
    key: `${cueId}-viewmode`,
    defaultValue: "Table",
  });

  const onViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);

    // Realtime sync
  };

  // Capture the mount value so the card starts from its own persisted mode.
  const previousGlobalViewMode = useRef(globalViewMode);
  useEffect(() => {
    if (globalViewMode === previousGlobalViewMode.current) return;

    previousGlobalViewMode.current = globalViewMode;
    onViewModeChange(globalViewMode);
  }, [globalViewMode, onViewModeChange]);

  // control accordion panel state
  const [activeFixtureGroupId, setActiveFixtureGroupId] = useState<string | null>(null);
  const onFixtureSelect = (_fixtureId: string, fixtureGroupId: string) => {
    setActiveFixtureGroupId(fixtureGroupId);
  };

  // --- Realtime sync ---------
  // Update the form values if `updatedAt` of cue is later than the form's cue's updatedAt AND form isDirty is false AND updatedBy is not the current user.
  useEffect(() => {
    if (!shouldPersist) return; // do not care about non-main versions
    const formValues = form.getValues();

    // There is a risk here: Users losing their input data.
    // This risk is higher for text inputs: users may lose their text input data if a update comes in from another user while they're typing.
    // For other inputs, it's not likely; the debounce timing is quite short so overlaps are uncommon.
    if (cue.updatedAt > formValues.updatedAt && cue.updatedBy !== userId) {
      // There is someone else changing the inputs
      // TODO (alts) don't set the form values if the user is currently editing a different version of the cue (not the main version)

      // guard against the form's onValuesChange triggering a save, which then triggers another WebTransport message
      isApplyingRemoteValuesRef.current = true;
      try {
        form.setInitialValues(initialValues);
        form.setValues(initialValues);

        // if receiving an updated cue, always show the notices/warnings/errors again.
        // this is the correct behaviour as this path only fires when user A makes changes.
        // when user A makes changes, their client will also show the notices.
        // thus, user B should also have their client show notices
        setShowNotices(true);
        setShowWarnings(true);
        setShowErrors(true);
      } finally {
        isApplyingRemoteValuesRef.current = false;
      }
    }
  }, [cue.updatedAt, form, initialValues, isDirty, shouldPersist]);

  useCueViewModeTracking({
    activeFixtureGroupId,
    cueId: cueId,
    viewMode,
    setActiveFixtureGroupId,
    setViewMode,
  });

  useActiveVersionTracking({
    cueId,
    selectedVersionId: currentViewingAlternateId,
    setFollowedVersionId: setPendingFollowedVersionId,
  });

  // --- Version Control ---------
  const [versionQuery, setVersionQuery] = useState("");
  const [renamingAlternateId, setRenamingAlternateId] = useState<string | null>(null);
  const userAlternates = useMemo(() => (alternates || []).filter((a) => a.alternateType === "user"), [alternates]);
  // const aiAlternates = useMemo(() => (alternates || []).filter((a) => a.alternateType === "ai"), [alternates]);

  const filteredUserAlternates = useMemo(() => {
    if (versionQuery.length === 0) return userAlternates;
    return userAlternates.filter((a) => a.alternateName.toLowerCase().includes(versionQuery.toLowerCase()));
  }, [userAlternates, versionQuery]);

  // const filteredAiAlternates = useMemo(() => {
  //   if (versionQuery.length === 0) return aiAlternates;
  //   return aiAlternates.filter((a) => a.alternateName.toLowerCase().includes(versionQuery.toLowerCase()));
  // }, [aiAlternates, versionQuery]);

  // A user has one Main version and can promote an alternate into it.
  const onAddVersion = async () => {
    if (!alternates) return; // eh; not sure if this will every hit
    // copy the current cue settings
    const currentSettings = structuredClone(form.getValues());

    try {
      const alternateResp = await createAlternate({
        ...currentSettings,
        id: _cue.id,
        alternateType: "user",
        alternateName: `Version ${alternates.length + 1}`,
        updatedBy: userId || undefined,
      });

      const alternateId = alternateResp.alternateCue.alternateId;

      onChangeAlternateVersion(alternateId, alternateResp.alternateCue);
    } catch (e) {}
  };

  /**
   * Loads a version into the cue form without carrying its alternate metadata.
   * The new alternate may not be in the query cache yet, so creation passes its response.
   */
  const onChangeAlternateVersion = (newVersionId: string, newVersionCue?: Cue) => {
    const replacementCue = newVersionCue ?? (alternates || []).find((a) => a.alternateId === newVersionId);
    if (!replacementCue) return;

    // Purposely disable `onValuesChange` when changing the version.
    isChangingVersionRef.current = true;
    try {
      const replacementValues = cueFormValues(replacementCue);
      form.setInitialValues(replacementValues);
      // reset removes fields from the previous version; setValues also notifies form watchers.
      form.reset();
      form.setValues(replacementValues);
      setCurrentViewingAlternateId(newVersionId);
      setIsDirty(false);
    } finally {
      isChangingVersionRef.current = false;
    }
  };

  const onChangeToMain = (cue: Cue) => {
    onChangeAlternateVersion("main", cue);
  };

  // A followed user's alternate may arrive before its query finishes loading.
  useEffect(() => {
    if (!pendingFollowedVersionId) return;
    if (!followingUserId) {
      setPendingFollowedVersionId(null);
      return;
    }
    if (pendingFollowedVersionId === currentViewingAlternateId) {
      setPendingFollowedVersionId(null);
    } else if (pendingFollowedVersionId === "main") {
      onChangeToMain(_cue);
      setPendingFollowedVersionId(null);
    } else if (alternates?.some((alternate) => alternate.alternateId === pendingFollowedVersionId)) {
      onChangeAlternateVersion(pendingFollowedVersionId);
      setPendingFollowedVersionId(null);
    }
  }, [pendingFollowedVersionId, currentViewingAlternateId, alternates, _cue, followingUserId]);

  /**
   * Swap the current viewing version with the main verison,
   * and save the alternate in the database.
   *
   * @param _alternateId The alternate version to swap with the main version. If not provided, uses the current viewing alternate ID.
   *
   * @returns
   */
  const onSwapVersion = async (_alternateId?: string) => {
    const activeItemId = useAppStore.getState().activeItemId;
    const alternateId = _alternateId ?? currentViewingAlternateId;
    if (!activeItemId || alternateId === "main" || form.validate().hasErrors || !alternateId) return;

    const alternateVersion = structuredClone(form.getValues());
    const previousMain = structuredClone(_cue);
    debouncedSave.cancel();

    try {
      // Replace the MAIN version with the alternate.
      const { cue: savedMain } = await updateCue({
        cueId: _cue.id,
        itemId: activeItemId,
        // Must override the `cue id` when swapping cues!
        requestBody: { ...alternateVersion, id: _cue.id, updatedBy: userId || undefined },
      });

      // Replace the OLD version alternate with the main.
      await updateAlternate({
        alternateId,
        requestBody: { ...alternateUpdateValues(previousMain), updatedBy: userId || undefined },
      });

      // setCueVersions((prevVersions) => {
      //   const newVersions = [...prevVersions];
      //   newVersions[0] = savedMain;
      //   newVersions[versionIndex] = previousMain;
      //   return newVersions;
      // });

      onChangeToMain(savedMain); // switch to main version, which is now the promoted version
    } catch (error) {
      console.error(error);
    }
  };

  const onChangeVersionName = async (alternateId: string, newName: string) => {
    try {
      await updateAlternate({
        alternateId,
        requestBody: { alternateName: newName, updatedBy: userId || undefined },
      });

      setRenamingAlternateId(null);
    } catch (e) {
      // show error
      console.error(e);
    }
  };

  const onDeleteVersion = async (alternate: AlternateCue) => {
    try {
      await deleteAlternate({ alternateId: alternate.alternateId, cueId: _cue.id });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={form.onSubmit(() => debouncedSave.flush())}>
      <div
        id={`cue-card-${cueNumber}`}
        ref={cueRef}
        style={{
          transition: "all 0.3s ease",
          zIndex: isAtLeastOneComboboxOpened ? 100 : undefined, // DO NOT REMOVE
          position: "relative", // DO NOT REMOVE
          // marginTop: marginPushDownCue,
          // top: cueRefTop + 100,
        }}

        data-cursor-surface="cueCard"
        data-cursor-anchor={cueId}
      >
        <CardBase isActive={isCueSelected} shadow={isCueSelected ? "lg" : "none"}>
          <Stack gap={"md"}>
            <Group align="center" justify="space-between">
              <Group flex={1}>
                <Title
                  order={4}
                  style={{
                    backgroundColor: isCueSelected
                      ? "light-dark(var(--cue-color--light-selected), var(--cue-color--dark-selected))"
                      : "transparent",
                  }}
                >
                  {" "}
                  Cue {cueNumber}
                </Title>
                {showCueIdentifiers && (
                  <Tooltip label={`Cue ID: ${cueId}`}>
                    <Text c="dimmed" style={{ textDecoration: "underline dotted" }}>
                      {cueId.slice(0, 4)}
                    </Text>
                  </Tooltip>
                )}

                {/* {isCueSelected ? (
                <Button size="xs" variant="light" onClick={() => setSelectedCueId(undefined)}>
                  Reset view
                </Button>
              ) : (
                <Button
                  variant="transparent"
                  size="xs"

                  onClick={() => onJumpToCue()}
                >
                  Scroll to cue
                </Button>
              )} */}

                {/* <Button
                variant="transparent"
                size="xs"
                // style={{
                //   textDecoration: "underline dotted",
                // }}
                color="black"
                onClick={open}
              >
                Copy another cue
              </Button> */}

                <Menu shadow="md">
                  <Menu.Target>
                    <Button
                      variant="transparent"
                      size="xs"
                      // style={{
                      //   textDecoration: "underline dotted",
                      // }}
                      // onClick={open}
                    >
                      Copy another cue
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown mah={500} style={{ overflowY: "auto" }}>
                    <Menu.Search
                      value={query}
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search cues"
                    />
                    <Menu.Label>Copy settings for:</Menu.Label>
                    <Menu.CheckboxGroup value={copyFixtureGroupIds} onChange={setCopyFixtureGroupIds}>
                      {fixtureGroups.map((group) => (
                        <Menu.CheckboxItem key={group.id} value={group.id}>
                          {group.name}
                        </Menu.CheckboxItem>
                      ))}
                    </Menu.CheckboxGroup>
                    <Menu.Divider />
                    {cuesIdsOtherThanThisList.length > 0 ? (
                      cuesIdsOtherThanThisList.map((cue) => (
                        <Menu.Item
                          key={cue.value}
                          onClick={() => onCopyCue(cue.value, copyFixtureGroupIds, Number(cue.label.split(" ")[1]))}
                        >
                          <Group>
                            {cue.label}
                            <Text c="dimmed" fz="sm">
                              {" "}
                              {cue.value.slice(0, 4)}{" "}
                            </Text>
                          </Group>
                        </Menu.Item>
                      ))
                    ) : (
                      <Menu.Item>
                        <Text c="dimmed" size="sm" ta="center" py="xs">
                          No cues found
                        </Text>
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>

              {/* Version control */}
              {/* If no versions exist, show text "Create alt. version" */}
              {alternates && alternates.length > 0 ? (
                // <Group gap="xs">
                //   {/* <Button variant="transparent" size="xs">
                //     <Code fz="sm">
                //       {currentViewingVersionIndex === 0 ? "Main" : `Version ${currentViewingVersionIndex}`}
                //     </Code>
                //   </Button> */}
                //   <Select
                //     allowDeselect={false}
                //     style={{ width: "200px" }}
                //     value={currentViewingAlternateId}
                //     comboboxProps={{
                //       onOptionSubmit: (value) => {
                //         if (value === "add") {
                //           onAddVersion();
                //         } else if (value === "main") {
                //           onChangeToMain(_cue);
                //         } else {
                //           onChangeAlternateVersion(value);
                //         }
                //       },
                //     }}
                //     data={[
                //       { value: "main", label: "Main" },
                //       {
                //         group: "Alternatives",
                //         items: alternates.map((alternate) => ({ value: alternate.alternateId, label: alternate.alternateName })),
                //       },
                //       { group: "Actions", items: [{ value: "add", label: "Create new version" }] },
                //     ]}
                //   />
                //   <Tooltip label="Swap the main version with this version. ">
                //     <Button
                //       size="xs"
                //       variant="subtle"
                //       onClick={() => void onSwapVersion()}
                //       disabled={currentViewingAlternateId === "main"}
                //     >
                //       <IconVersions width="1rem" />
                //     </Button>
                //   </Tooltip>
                // </Group>

                <Group>
                  <Menu shadow="md" closeOnItemClick={false}>
                    <Menu.Target>
                      <Input
                        component="button"
                        type="button"
                        pointer
                        rightSection={<IconChevronDown size={16} />}
                        style={{ width: 200 }}
                      >
                        {currentViewingAlternateId === "main"
                          ? "Main"
                          : alternates.find((alternate) => alternate.alternateId === currentViewingAlternateId)
                              ?.alternateName}
                      </Input>
                    </Menu.Target>
                    <Menu.Dropdown mah={500}>
                      <Menu.Search
                        placeholder="Search versions..."
                        value={versionQuery}
                        onChange={(e) => setVersionQuery(e.target.value)}
                      />
                      <Menu.Label>Final version</Menu.Label>

                      <Menu.Item
                        onClick={() => onChangeToMain(_cue)}
                        leftSection={
                          <IconCheck
                            width="1rem"
                            style={{
                              opacity: currentViewingAlternateId === "main" ? 1 : 0,
                              transition: "opacity 0.15s",
                            }}
                          />
                        }
                      >
                        Main{" "}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Label>User alternatives</Menu.Label>
                      {filteredUserAlternates.length > 0 ? (
                        filteredUserAlternates.map((alternate) => (
                          <Menu.Sub
                            key={alternate.alternateId}
                            offset={12}
                            safeAreaPolygon={{ buffer: 12, requireIntent: false }}
                          >
                            <Menu.Sub.Target>
                              <Menu.Sub.Item
                                onClick={() => onChangeAlternateVersion(alternate.alternateId)}
                                leftSection={
                                  <IconCheck
                                    width="1rem"
                                    style={{
                                      opacity: currentViewingAlternateId === alternate.alternateId ? 1 : 0,
                                      transition: "opacity 0.15s",
                                    }}
                                  />
                                }
                                key={alternate.alternateId}
                              >
                                {alternate.alternateName}
                              </Menu.Sub.Item>
                            </Menu.Sub.Target>
                            <Menu.Sub.Dropdown>
                              <Menu.Item onClick={() => onChangeAlternateVersion(alternate.alternateId)}>
                                {" "}
                                View version{" "}
                              </Menu.Item>
                              <Menu.Divider />
                              {renamingAlternateId === alternate.alternateId ? (
                                <Box p="xs">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();

                                      const formData = new FormData(e.currentTarget);
                                      const newName = formData.get("alternateName") as string;
                                      onChangeVersionName(alternate.alternateId, newName);
                                    }}
                                  >
                                    <TextInput
                                      name="alternateName"
                                      autoFocus
                                      defaultValue={alternate.alternateName}
                                      rightSectionWidth={60}
                                      rightSection={
                                        <Button type="submit" variant="transparent" size="compact-xs">
                                          Save
                                        </Button>
                                      }
                                    />
                                  </form>
                                </Box>
                              ) : (
                                <Menu.Item
                                  onClick={() => {
                                    setRenamingAlternateId(alternate.alternateId);
                                  }}
                                >
                                  Rename
                                </Menu.Item>
                              )}

                              <Tooltip withArrow position="right" label="Swap the main version with this version.">
                                <Menu.Item onClick={() => onSwapVersion(alternate.alternateId)}> Set as Main</Menu.Item>
                              </Tooltip>
                              <Menu.Divider />
                              <Menu.Item color="red" onClick={() => onDeleteVersion(alternate)}>
                                {" "}
                                Delete{" "}
                              </Menu.Item>
                            </Menu.Sub.Dropdown>
                          </Menu.Sub>
                        ))
                      ) : (
                        <Menu.Item>
                          <Text c="dimmed" size="sm" ta="center" py="xs">
                            No versions found
                          </Text>
                        </Menu.Item>
                      )}
                      <Menu.Item
                        onClick={onAddVersion}
                        leftSection={<IconPlus size={16} />}
                        color="var(--mantine-color-lime-light-color)"
                      >
                        Create alternative
                      </Menu.Item>

                      <Menu.Divider />
                      <Menu.Label>
                        <Code>AI Alternatives (0/3)</Code>
                      </Menu.Label>
                      <Menu.Item leftSection={<IconPencilAi size={16} />} color="var(--mantine-color-lime-light-color)">
                        Generate
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              ) : (
                <Tooltip label="Experiment with different settings by creating alternative versions, without losing your original cue.">
                  <Button
                    variant="transparent"
                    size="xs"

                    onClick={onAddVersion}
                  >
                    Create alt. version
                  </Button>
                </Tooltip>
              )}
              <Group flex={1} justify="end">
                {showLoadingIcon && <Loader size="1.25rem" type="bars" />}

                <ViewModeSelect
                  props={{
                    size: "xs",
                  }}
                  viewMode={viewMode || "Table"}
                  setViewMode={setViewMode}
                />
                <Popover
                  shadow="sm"
                  withArrow
                  position="top"
                  withOverlay
                  opened={isDeletePopoverOpen}
                  trapFocus
                  onDismiss={() => setDeletePopoverOpen(false)}
                >
                  <Popover.Target>
                    <Button color="red" size="xs" variant="transparent" onClick={() => setDeletePopoverOpen(true)}>
                      Delete{" "}
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack>
                      <Text> Are you sure you want to delete this cue?</Text>
                      <Flex justify={"end"} gap="sm">
                        <Button
                          data-autofocus
                          variant="transparent"
                          // color="black"
                          onClick={() => setDeletePopoverOpen(false)}
                          size="xs"
                        >
                          Cancel
                        </Button>
                        <Button color="red" size="xs" variant="light" onClick={handleDelete}>
                          Delete
                        </Button>
                      </Flex>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>

                {/* <Tooltip label={isDirty ? "Save changes" : "Changes autosaved!"}>
                <Button variant="light" size="xs" disabled={!isDirty} type="submit">
                  {" "}
                  Save changes{" "}
                </Button>
              </Tooltip> */}
                {/* <ActionIcon variant="light" color="gray" onClick={() => setIsCollapsed((s) => !s)}>
                <IconChevronUp
                  style={{
                    transition: "transform 0.2s",
                    transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  width={"1rem"}
                />
              </ActionIcon> */}
              </Group>
            </Group>

            {/* Cue Contents */}
            <Collapse expanded={!isCollapsed}>
              <CueContents
                onDeleteCue={handleDelete}
                onCopyCue={onCopyCue}
                cue={cue}
                cueOrder={cueOrder}
                cueNumber={cueNumber}
                fixtureGroups={fixtureGroups}
                viewMode={viewMode}
                form={form}
                setIsAtLeastOneComboboxOpened={setAtLeastOneComboboxOpened}
                eventId={eventId}
                visualiser={visualiser}
                fixtures={fixtures}
                activeFixtureGroupId={activeFixtureGroupId}
                onFixtureSelect={onFixtureSelect}
                isDirty={isDirty}
                setActiveFixtureGroupId={setActiveFixtureGroupId}
                onSaveCueConfig={onSaveCueConfig}
              />
            </Collapse>
            <Collapse expanded={showTransition}>
              <SimpleGrid cols={2} spacing={0}>
                {/* TODO: sync Accordion state when following */}
                <Accordion>
                  <Accordion.Item value="holdTime">
                    <Accordion.Control>
                      Change to next cue (currently {holdTimeMs === -1 ? "manually" : `after ${holdTimeMs / 1000}s`})
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Radio.Group
                        value={holdTimeMs === -1 ? "manual" : "auto"}
                        onChange={(value) => {
                          if (value === "manual") {
                            form.setFieldValue("transition.holdTimeMs", -1);
                          } else if (holdTimeMs === -1) {
                            form.setFieldValue("transition.holdTimeMs", 100);
                          }
                        }}
                      >
                        <Group wrap="nowrap" gap="xs">
                          <Radio label="Only when manually changed" value={"manual"} style={{ flex: 1 }} />
                          <Radio.Card
                            style={{ flex: 1 }}
                            styles={{
                              card: {
                                border: 0,
                              },
                            }}
                            value="auto"
                          >
                            <Group wrap="nowrap" gap="xs">
                              <Radio.Indicator />
                              <NumberInput
                                min={1}
                                label="Change after"
                                suffix="ms"
                                defaultValue={100}
                                name="transition.holdTimeMs"
                                key={form.key("transition.holdTimeMs")}
                                {...form.getInputProps("transition.holdTimeMs")}
                                disabled={holdTimeMs === -1}
                                onFocus={onTransitionTimeFocus}
                                onBlur={onTransitionTimeBlur}
                                onKeyDown={(event) => {
                                  // Keep arrow keys in the input instead of navigating the parent radio card.
                                  if (event.key.startsWith("Arrow")) event.stopPropagation();
                                }}
                              />
                            </Group>
                          </Radio.Card>
                        </Group>
                      </Radio.Group>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
                <Accordion>
                  <Accordion.Item value="holdTime">
                    <Accordion.Control>
                      Cue transition time (currently{" "}
                      {transitionTimeMs === 0 ? "Instant" : `${transitionTimeMs / 1000}s`})
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Radio.Group
                        value={transitionTimeMs === 0 ? "instant" : "timed"}
                        onChange={(value) => {
                          if (value === "instant") {
                            form.setFieldValue("transition.transitionTimeMs", 0);
                          } else if (transitionTimeMs === 0) {
                            form.setFieldValue("transition.transitionTimeMs", 100);
                          }
                        }}
                      >
                        <Group wrap="nowrap" gap="xs">
                          <Radio label="Instant transition" value="instant" flex={1} />
                          <Radio.Card
                            flex={1}
                            styles={{
                              card: {
                                border: 0,
                              },
                            }}
                            value="timed"
                          >
                            <Group wrap="nowrap">
                              <Radio.Indicator />
                              <Box style={{ maxWidth: "200px" }}>
                                <NumberInput
                                  min={1}
                                  label="Transition over"
                                  suffix="ms"
                                  defaultValue={100}
                                  name="transition.transitionTimeMs"
                                  key={form.key("transition.transitionTimeMs")}
                                  {...form.getInputProps("transition.transitionTimeMs")}
                                  disabled={transitionTimeMs === 0}
                                  onFocus={onTransitionTimeFocus}
                                  onBlur={onTransitionTimeBlur}
                                  onKeyDown={(event) => {
                                    // Keep arrow keys in the input instead of navigating the parent radio card.
                                    if (event.key.startsWith("Arrow")) event.stopPropagation();
                                  }}
                                />
                              </Box>
                            </Group>
                          </Radio.Card>
                        </Group>
                      </Radio.Group>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </SimpleGrid>
            </Collapse>

            {/* <Group align="center" justify="center">
              <Title
                order={4}
                style={{
                  backgroundColor: isCueSelected ? "light-dark(yellow, var(--mantine-color-yellow-9))" : "transparent",
                }}
              >
                {" "}
                Cue {cueNumber}
              </Title>
              <Stack gap="xs" px="2rem">
                <Stack gap={"xs"} px="xl" justify="space-between">
                  <Slider
                    restrictToMarks
                    min={-1}
                    max={10000}
                    defaultValue={-1}
                    marks={MARKS}
                    label={(value) => {
                      if (value === -1) return "Manually";
                      else return `${value / 1000}s`;
                    }}
                  />
                  <Text fw="bold" fz="sm">
                    Cue changes after:
                  </Text>
                  <Radio.Group
                    value={holdTimeMs === -1 ? "manual" : "auto"}
                    onChange={(value) => {
                      if (value === "manual") {
                        form.setFieldValue("transition.holdTimeMs", -1);
                      } else if (holdTimeMs === -1) {
                        form.setFieldValue("transition.holdTimeMs", 100);
                      }
                    }}
                  >
                    <Group wrap="nowrap" gap="xs">
                      <Radio label="Only when manually changed" value={"manual"} style={{ flex: 1 }} />
                      <Radio.Card
                        style={{ flex: 1 }}
                        styles={{
                          card: {
                            border: 0,
                          },
                        }}
                        value="auto"
                      >
                        <Group wrap="nowrap" gap="xs">
                          <Radio.Indicator />
                          <NumberInput
                            min={1}
                            label="Change after"
                            suffix="ms"
                            defaultValue={100}
                            name="transition.holdTimeMs"
                            key={form.key("transition.holdTimeMs")}
                            {...form.getInputProps("transition.holdTimeMs")}
                            disabled={holdTimeMs === -1}
                            onFocus={onTransitionTimeFocus}
                            onBlur={onTransitionTimeBlur}
                          />
                        </Group>
                      </Radio.Card>
                    </Group>
                  </Radio.Group>
                </Stack>
                <Group gap={"xs"} c="dimmed">
                  <Divider style={{ flex: 1 }} />
                  <IconArrowRight size={18} stroke={1.5} />
                  <Divider style={{ flex: 1 }} />
                </Group>
                <Stack gap={"xs"} px="xl" justify="space-between">
                  <Text fw="bold" fz="sm">
                    Transition duration:
                  </Text>
                  <Radio.Group
                    value={transitionTimeMs === 0 ? "instant" : "timed"}
                    onChange={(value) => {
                      if (value === "instant") {
                        form.setFieldValue("transition.transitionTimeMs", 0);
                      } else if (transitionTimeMs === 0) {
                        form.setFieldValue("transition.transitionTimeMs", 100);
                      }
                    }}
                  >
                    <Group wrap="nowrap" gap="xs">
                      <Radio label="Instant transition" value="instant" flex={1} />
                      <Radio.Card
                        flex={1}
                        styles={{
                          card: {
                            border: 0,
                          },
                        }}
                        value="timed"
                      >
                        <Group>
                          <Radio.Indicator />
                          <Box style={{ maxWidth: "200px" }}>
                            <NumberInput
                              min={1}
                              label="Transition over"
                              suffix="ms"
                              defaultValue={100}
                              name="transition.transitionTimeMs"
                              key={form.key("transition.transitionTimeMs")}
                              {...form.getInputProps("transition.transitionTimeMs")}
                              disabled={transitionTimeMs === 0}
                              onFocus={onTransitionTimeFocus}
                              onBlur={onTransitionTimeBlur}
                            />
                          </Box>
                        </Group>
                      </Radio.Card>
                    </Group>
                  </Radio.Group>
                </Stack>
              </Stack>
              <Title order={4}>Cue {cueNumber + 1}</Title>
            </Group> */}

            <Stack>
              {/* <Collapse expanded={isCollapsed}>
                <Text>{generateOneLineCue(cue)}</Text>
              </Collapse> */}
              <Textarea
                label="Comments"
                minRows={1}
                variant="unstyled"
                autosize
                maxRows={4}
                name="comments"
                key={form.key("comments")}
                {...form.getInputProps("comments")}
                placeholder="Write any comments regarding this cue here..."
                styles={{
                  input: { fontSize: "16px" }, // Or use rem units like '1.25rem'
                }}
              />
            </Stack>

            {/* Only show issues when there are actually issues AND we're not in `unknown` mode, which means  */}
            {/* the user is still trying to configure the cue, do NOT spam them with warnings. */}
            {cueValidationResult.issues.length && cue.cueConfig.mode !== "unknown" ? (
              <CueNotices
                notices={notices}
                warnings={warnings}
                errors={errors}
                showNotices={showNotices}
                showWarnings={showWarnings}
                showErrors={showErrors}
                setShowNotices={setShowNotices}
                setShowWarnings={setShowWarnings}
                setShowErrors={setShowErrors}

                customResults={customResults}
                onCustomResultsClick={[() => onSaveCueConfig({ ...cue.cueConfig, mode: "blackout" })]}
              />
            ) : (
              <></>
            )}
          </Stack>
        </CardBase>
      </div>
    </form>
  );
};

// re-render if cue.updatedAt is different OR isCueSelected is false
export const CueCard = React.memo(CueCardInternal);
