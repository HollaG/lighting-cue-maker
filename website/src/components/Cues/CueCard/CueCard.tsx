import {
  ActionIcon,
  Box,
  Button,
  Collapse,
  Flex,
  Group,
  Loader,
  Menu,
  Popover,
  px,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { CardBase } from "../CardBase";
import type { Cue, CueConfig } from "../../../types/cues";
import { useAppStore } from "../../../store/appStore";
import { type FixtureGroupConfiguration, type Item } from "../../../types/types";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronUp } from "@tabler/icons-react";
import { useForm, type FormErrors } from "@mantine/form";
import { useDebouncedCallback, useLocalStorage } from "@mantine/hooks";
import { useUpdateCue } from "../../../query/useUpdateCue";
import { useDeleteCue } from "../../../query/useDeleteCue";
import {
  createDefaultValueAssignment,
  reconcileCueAssignments,
  removeCueFromRawLyrics,
} from "../../../utils/cue/cueForm";
import { useUpdateItem } from "../../../query/useUpdateItem";
import { notifications } from "../../../utils/notifications";
import type { Visualiser } from "../../../types/visualiser";
import type { Fixture } from "../../../types/fixtures";
import { checkCueCorrectness } from "../../../utils/cue/cueValidator";
import { ViewModeSelect, type ViewMode } from "./ViewModeSelect";
import { BeforeCueEdit } from "./BeforeCueEdit/BeforeCueEdit";
import { CueContents } from "../CueContents/CueContents";
import { CueNotices } from "../CueNotices/CueNotices";

type FormData = Cue;

interface CueCardProps {
  cue: Cue;
  cueNumber: number;
  isCueSelected: boolean;
  fixtureGroups?: FixtureGroupConfiguration[];

  eventId: string; // for visualiser
  visualiser: Visualiser | null; // allow for null visualiser so that it can be loading state? TODO;
  fixtures: Fixture[];
  setOffset: React.Dispatch<React.SetStateAction<number>>; // translate the WHOLE cue cards up
  globalViewMode: ViewMode;
}

const CueCardInternal = ({
  cue,
  cueNumber,
  isCueSelected,
  fixtureGroups = [],
  setOffset,
  eventId,
  visualiser,
  fixtures,
  globalViewMode,
}: CueCardProps) => {
  const queryClient = useQueryClient();
  const cueOrder = useAppStore((s) => s.cueOrder);
  const setSelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  const showCueIdentifiers = useAppStore((s) => s.showCueIdentifiers);

  const { mutateAsync: updateCue } = useUpdateCue();
  const { mutateAsync: deleteCue } = useDeleteCue();
  const { mutate: updateItem } = useUpdateItem();

  const [isCollapsed, setIsCollapsed] = useLocalStorage({ key: `cue-${cue.id}-collapsed`, defaultValue: false });
  const [isDirty, setIsDirty] = useState(false);

  // --- Form ---------
  const initialValues: FormData = useMemo(
    () => ({
      id: cue.id,
      comments: cue.comments,
      createdAt: cue.createdAt,
      updatedAt: cue.updatedAt,
      deletedAt: cue.deletedAt,
      cueConfig: cue.cueConfig ?? { mode: "unknown" },

      assignments: (cue && cue.assignments && Object.keys(cue.assignments).length != 0
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
                      // value: {
                      //   // TODO: check `metadata` instead for default values
                      //   // [AttributeTypes.TEXT]: "",
                      //   // [AttributeTypes.SELECT]: "",
                      //   // [AttributeTypes.MULTISELECT]: [],
                      //   // [AttributeTypes.COLOUR]: { hex: "", name: "" },
                      //   // [AttributeTypes.SLIDER]: 0,
                      //   [AttributeTypes.BOOLEAN]:
                      //     attribute.optionPossibleValues[AttributeTypes.BOOLEAN] === "checkedDefault",
                      //   // [AttributeTypes.NONE]: null,
                      // },
                    },
                  ]),
                ),
              },
            ]),
          )) as any,
    }),
    [cue, fixtureGroups],
  );

  const enabledFixtureGroups = useMemo(
    () =>
      fixtureGroups.filter((group) =>
        cue.cueConfig.mode === "normal" ? cue.cueConfig.enabledGroups.includes(group.id) : true,
      ),
    [cue.cueConfig, fixtureGroups],
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

      await updateCue({
        cueId: cue.id,
        itemId: activeItemId,
        requestBody: form.getValues(),
      });

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
      setIsDirty(true);
      debouncedSave();
    },

    validate: validateCue,
  });

  /**
   * Update the cue config
   * This must be done through controlled components and not directly through form editing.
   * Because there are no form components that support what we need
   * @param cueConfig
   */
  const onSaveCueConfig = (cueConfig: CueConfig) => {
    form.setFieldValue("cueConfig", cueConfig);
    debouncedSave.cancel();
    void handleSave(false);
  };

  // --- Handle Cue cards translation up / down when clicked ---------

  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCueSelected || !cueRef.current) {
      return;
    }
    const elementId = `ref-${cue.id}`;
    const element = document.getElementById(elementId);
    if (!element) return;

    const targetTopY = element.offsetTop;
    const cardNaturalTopY = cueRef.current.offsetTop;

    // 2.375rem convert to px
    const pxOffset = px("3.375rem");
    const deltaY = targetTopY - cardNaturalTopY - Number(pxOffset);

    // setTranslateDistance(`${deltaY}px`);
    // console.log("setting offset to ", deltaY);
    setOffset(deltaY);

    // return () => setOffset(0);
  }, [isCueSelected]);

  // This is required to set the z-index of the card that has the Combobox dropdown (colour select) open,
  // so that the dropdown is not hidden behind the next card.
  // this is a hack, see https://share.gemini.google/Od39OwKe7Hnw
  const [isAtLeastOneComboboxOpened, setAtLeastOneComboboxOpened] = useState<boolean>(false);

  const onJumpToCue = () => {
    setSelectedCueId(cue.id);

    const element = document.getElementById(`ref-${cue.id}`);
    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

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
      await deleteCue({ cueId: cue.id });
      const updatedRawLyrics = removeCueFromRawLyrics(item.rawLyrics, cue.id);

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
        } as Partial<FormData>);

        notifications.show({
          title: `Copied cue ${cueNumberCopied}!`,
          message: ``,
        });
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
    .filter((c) => c.value !== cue.id);
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
    key: `${cue.id}-viewmode`,
    defaultValue: "Table",
  });

  // Capture the mount value so the card starts from its own persisted mode.
  const previousGlobalViewMode = useRef(globalViewMode);
  useEffect(() => {
    if (globalViewMode === previousGlobalViewMode.current) return;

    previousGlobalViewMode.current = globalViewMode;
    setViewMode(globalViewMode);
  }, [globalViewMode, setViewMode]);

  // control accordion panel state
  const [activeFixtureGroupId, setActiveFixtureGroupId] = useState<string | null>(null);
  const onFixtureSelect = (_fixtureId: string, fixtureGroupId: string) => {
    setActiveFixtureGroupId(fixtureGroupId);
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
      >
        <CardBase isActive={isCueSelected} shadow={isCueSelected ? "lg" : "none"}>
          {(cue.cueConfig?.mode ?? "unknown") !== "unknown" ? (
            <Stack gap={"md"}>
              <Group>
                <Title
                  order={4}
                  style={{
                    backgroundColor: isCueSelected
                      ? "light-dark(yellow, var(--mantine-color-yellow-9))"
                      : "transparent",
                  }}
                >
                  {" "}
                  Cue {cueNumber}
                </Title>
                {showCueIdentifiers && (
                  <Tooltip label={`Cue ID: ${cue.id}`}>
                    <Text c="dimmed" style={{ textDecoration: "underline dotted" }}>
                      {cue.id.slice(0, 4)}
                    </Text>
                  </Tooltip>
                )}
                {isCueSelected ? (
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
                )}

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
                  <Menu.Dropdown mah={300} style={{ overflowY: "auto" }}>
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

                <Box flex={1}>{/* <Text>{simplifyCues(cue)}</Text> */}</Box>

                {isDirty && <Loader size="1.25rem" type="bars" />}

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
                <ActionIcon variant="light" color="gray" onClick={() => setIsCollapsed((s) => !s)}>
                  <IconChevronUp
                    style={{
                      transition: "transform 0.2s",
                      transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    width={"1rem"}
                  />
                </ActionIcon>
              </Group>

              {/* Cue Contents */}
              <Collapse expanded={!isCollapsed}>
                <CueContents
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

              {cueValidationResult.issues.length ? (
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
          ) : (
            <BeforeCueEdit
              cue={cue}
              cueOrder={cueOrder}
              cueConfig={cue.cueConfig}
              cueNumber={cueNumber}
              fixtureGroups={fixtureGroups}
              onSaveCueConfig={onSaveCueConfig}
              onCopyCue={onCopyCue}
            />
          )}
        </CardBase>
      </div>
    </form>
  );
};

// re-render if cue.updatedAt is different OR isCueSelected is false
export const CueCard = React.memo(CueCardInternal);
