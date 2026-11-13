import { Button, Flex, Popover, Stack, Text, type ButtonProps } from "@mantine/core";
import { Children, cloneElement, useState, type MouseEventHandler, type ReactElement, type ReactNode } from "react";

/** Shared "are you sure?" state: open flag, plus a confirm handler that keeps the popover open on failure. */
const useConfirm = (onConfirm: () => void | Promise<unknown>) => {
  const [opened, setOpened] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      setOpened(false);
    } catch {
      // error notif handled by api.ts; keep the popover open so they can retry or cancel
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Opens the popover, or confirms straight away when Ctrl (Cmd on Mac) is held.
   * The event is optional so a custom trigger can still call it with nothing (it then always asks).
   */
  const openOrConfirm = (e?: { ctrlKey: boolean; metaKey: boolean }) => {
    if (e && (e.ctrlKey || e.metaKey)) void handleConfirm();
    else setOpened(true);
  };

  return { opened, setOpened, isPending, handleConfirm, openOrConfirm };
};

/** The popover's body: the question, then Cancel and the confirm button. */
const ConfirmDropdown = ({
  message,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
}: {
  message: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Popover.Dropdown>
    <Stack>
      <Text>{message}</Text>
      <Flex justify="end" gap="sm">
        <Button data-autofocus variant="transparent" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="red" variant="light" size="xs" loading={isPending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Flex>
    </Stack>
  </Popover.Dropdown>
);

type ConfirmDeleteButtonProps = {
  onConfirm: () => void | Promise<unknown>;
  /** The question shown in the popover */
  message?: string;
  /** Text on the trigger button, ignored if `trigger` is given */
  label?: ReactNode;
  confirmLabel?: string;
  /** Style the default trigger button, e.g. size="xs" variant="subtle" */
  buttonProps?: ButtonProps;
  /**
   * Custom trigger (e.g. an ActionIcon). Receives a function that opens the popover; pass it the click event
   * so Ctrl/Cmd+click skips the question.
   */
  trigger?: (open: (e?: { ctrlKey: boolean; metaKey: boolean }) => void) => ReactNode;
};

/**
 * A delete button that asks "are you sure?" in a popover before calling `onConfirm`.
 * Ctrl+click (Cmd+click on Mac) skips the question and confirms straight away.
 * Owns its own open state, so call sites don't need a useState per button.
 */
export const ConfirmDeleteButton = ({
  onConfirm,
  message = "Are you sure you want to delete this?",
  label = "Delete",
  confirmLabel = "Delete",
  buttonProps,
  trigger,
}: ConfirmDeleteButtonProps) => {
  const { opened, setOpened, isPending, handleConfirm, openOrConfirm } = useConfirm(onConfirm);

  return (
    <Popover
      shadow="sm"
      withArrow
      position="top"
      withOverlay
      trapFocus
      opened={opened}
      onDismiss={() => setOpened(false)}
    >
      <Popover.Target>
        {trigger ? (
          <span>{trigger(openOrConfirm)}</span>
        ) : (
          <Button color="red" variant="subtle" size="xs" {...buttonProps} loading={isPending} onClick={openOrConfirm}>
            {label}
          </Button>
        )}
      </Popover.Target>
      <ConfirmDropdown
        message={message}
        confirmLabel={confirmLabel}
        isPending={isPending}
        onCancel={() => setOpened(false)}
        onConfirm={handleConfirm}
      />
    </Popover>
  );
};

type ConfirmDeleteProps = {
  onConfirm: () => void | Promise<unknown>;
  /** The question shown in the popover */
  message?: string;
  confirmLabel?: string;
  /**
   * The element that opens the popover when clicked, e.g. a ClickableCardBase. Must be a single element that
   * accepts `ref` (Popover.Target attaches one to position the popover) and `onClick`. Its own onClick still runs.
   */
  children: ReactElement<{ onClick?: MouseEventHandler }>;
};

/**
 * Same "are you sure?" popover as ConfirmDeleteButton, but the trigger is whatever element you pass as children.
 * No wrapper element is added, so the child keeps its own layout.
 */
export const ConfirmDelete = ({
  onConfirm,
  message = "Are you sure you want to delete this?",
  confirmLabel = "Delete",
  children,
}: ConfirmDeleteProps) => {
  const { opened, setOpened, isPending, handleConfirm, openOrConfirm } = useConfirm(onConfirm);

  // The popover is controlled, so Popover.Target won't add a click handler. Add one that opens it
  // (or confirms straight away on Ctrl/Cmd+click), keeping the child's own onClick.
  const child = Children.only(children);
  const trigger = cloneElement(child, {
    onClick: (e) => {
      child.props.onClick?.(e);
      openOrConfirm(e);
    },
  });

  return (
    <Popover
      shadow="sm"
      withArrow
      position="top"
      withOverlay
      trapFocus
      opened={opened}
      onDismiss={() => setOpened(false)}
    >
      <Popover.Target>{trigger}</Popover.Target>
      <ConfirmDropdown
        message={message}
        confirmLabel={confirmLabel}
        isPending={isPending}
        onCancel={() => setOpened(false)}
        onConfirm={handleConfirm}
      />
    </Popover>
  );
};
