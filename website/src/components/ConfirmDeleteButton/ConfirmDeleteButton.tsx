import { Button, Flex, Popover, Stack, Text, type ButtonProps } from "@mantine/core";
import { useState, type ReactNode } from "react";

type ConfirmDeleteButtonProps = {
  onConfirm: () => void | Promise<unknown>;
  /** The question shown in the popover */
  message?: string;
  /** Text on the trigger button, ignored if `trigger` is given */
  label?: ReactNode;
  confirmLabel?: string;
  /** Style the default trigger button, e.g. size="xs" variant="subtle" */
  buttonProps?: ButtonProps;
  /** Custom trigger (e.g. an ActionIcon). Receives a function that opens the popover. */
  trigger?: (open: () => void) => ReactNode;
};

/**
 * A delete button that asks "are you sure?" in a popover before calling `onConfirm`.
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
          <span>{trigger(() => setOpened(true))}</span>
        ) : (
          <Button color="red" variant="subtle" size="xs" {...buttonProps} onClick={() => setOpened(true)}>
            {label}
          </Button>
        )}
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Text>{message}</Text>
          <Flex justify="end" gap="sm">
            <Button data-autofocus variant="transparent" size="xs" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button color="red" variant="light" size="xs" loading={isPending} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </Flex>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
