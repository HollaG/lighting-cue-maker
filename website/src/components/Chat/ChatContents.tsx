import { Avatar, Box, Divider, Group, Text } from "@mantine/core";
import { Fragment, useEffect, useRef } from "react";
import classes from "./Chat.module.css";
import type { ChatMessageData } from "../../types/realtime/chat";
import { useRealtimeStore } from "../../store/realtimeStore";

type ChatContentsProps = {
  messages: ChatMessageData[];
  currentUserId: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Scrolls the conversation independently of the page and keeps new replies in view. */
export function ChatContents({ messages, currentUserId }: ChatContentsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = useRealtimeStore((state) => state.user);
  const seenUserMap = useRealtimeStore((state) => state.seenUserMap);
  // const otherUsers = useRealtimeStore((state) => state.connectedUsers.filter((u) => u.userId !== currentUser?.userId));

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <Box
      ref={scrollRef}
      className={classes.contents}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      tabIndex={0}
    >
      {messages.length === 0 && (
        <Text ta="center" size="sm" c="dimmed" py="xl">
          No messages yet.
        </Text>
      )}
      {messages.map((message, index) => {
        const ownMessage = message.fromId === currentUserId;
        const date = new Date(message.sentAt);
        const previous = messages[index - 1];
        const startsDay = !previous || new Date(previous.sentAt).toDateString() !== date.toDateString();

        return (
          <Fragment key={message.messageId}>
            {startsDay && (
              <Divider
                className={classes.dateDivider}
                label={date.toDateString() === new Date().toDateString() ? "Today" : dateFormatter.format(date)}
                labelPosition="center"
              />
            )}
            <div className={classes.message} data-own={ownMessage || undefined}>
              {!ownMessage && (
                <Avatar name={seenUserMap[message.fromId]?.name || "Unknown"} size={32} radius="xl" variant="light" />
              )}
              <div className={classes.messageBody}>
                <Group gap={8} className={classes.messageMeta}>
                  <Text size="xs" fw={600}>
                    {ownMessage ? "" : currentUser?.name || "Unknown"}
                  </Text>
                  <Text component="time" dateTime={date.toISOString()} size="xs" c="dimmed">
                    {timeFormatter.format(date)}
                  </Text>
                </Group>
                <Text className={classes.bubble} size="sm">
                  {message.content.map((block, blockIndex) => (block.type === "text" ? block.text : null)).join("")}
                </Text>
              </div>
            </div>
          </Fragment>
        );
      })}
    </Box>
  );
}
