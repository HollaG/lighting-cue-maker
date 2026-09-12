import { Avatar, Box, Divider, Group, Text } from "@mantine/core";
import { Fragment, useEffect, useRef } from "react";
import type { ChatMessage } from "./chat.types";
import classes from "./Chat.module.css";

type ChatContentsProps = {
  messages: ChatMessage[];
  currentUserId: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Scrolls the conversation independently of the page and keeps new replies in view. */
export function ChatContents({ messages, currentUserId }: ChatContentsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <Box ref={scrollRef} className={classes.contents} role="log" aria-label="Chat messages" aria-live="polite" tabIndex={0}>
      {messages.length === 0 && (
        <Text ta="center" size="sm" c="dimmed" py="xl">No messages yet. Start the conversation.</Text>
      )}
      {messages.map((message, index) => {
        const ownMessage = message.sender.id === currentUserId;
        const date = new Date(message.sentAt);
        const previous = messages[index - 1];
        const startsDay = !previous || new Date(previous.sentAt).toDateString() !== date.toDateString();

        return (
          <Fragment key={message.id}>
            {startsDay && (
              <Divider
                className={classes.dateDivider}
                label={date.toDateString() === new Date().toDateString() ? "Today" : dateFormatter.format(date)}
                labelPosition="center"
              />
            )}
            <div className={classes.message} data-own={ownMessage || undefined}>
              {!ownMessage && <Avatar name={message.sender.name} size={32} radius="xl" variant="light" />}
              <div className={classes.messageBody}>
                <Group gap={8} className={classes.messageMeta}>
                  <Text size="xs" fw={600}>{ownMessage ? "You" : message.sender.name}</Text>
                  <Text component="time" dateTime={date.toISOString()} size="xs" c="dimmed">
                    {timeFormatter.format(date)}
                  </Text>
                </Group>
                <Text className={classes.bubble} size="sm">{message.text}</Text>
              </div>
            </div>
          </Fragment>
        );
      })}
    </Box>
  );
}
