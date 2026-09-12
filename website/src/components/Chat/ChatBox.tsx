import { ActionIcon, Text, Textarea } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { Ref } from "react";
import classes from "./Chat.module.css";

type ChatBoxProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  inputRef: Ref<HTMLTextAreaElement>;
};

/** Reply composer. Enter sends; Shift+Enter inserts a new line. */
export function ChatBox({ draft, onDraftChange, onSend, inputRef }: ChatBoxProps) {
  return (
    <form
      className={classes.composer}
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <div className={classes.inputRow}>
        <Textarea
          ref={inputRef}
          className={classes.textarea}
          classNames={{ input: classes.textareaInput }}
          aria-label="Chat message"
          placeholder="Write a reply…"
          variant="unstyled"
          autosize
          minRows={2}
          maxRows={4}
          maxLength={2000}
          value={draft}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <ActionIcon type="submit" size={38} radius="xl" variant="filled" autoContrast disabled={!draft.trim()} aria-label="Send message">
          <IconArrowRight size={21} />
        </ActionIcon>
      </div>
      <Text size="xs" c="dimmed" mt={8}>Preview only · Messages are not shared</Text>
    </form>
  );
}
