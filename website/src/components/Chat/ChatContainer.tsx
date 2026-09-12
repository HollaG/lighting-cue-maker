import { ActionIcon, Indicator, Loader, Paper, Transition } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { useEffect, useId, useRef, useState } from "react";
import { ChatBox } from "./ChatBox";
import { ChatContents } from "./ChatContents";
import { ChatInfo } from "./ChatInfo";
import classes from "./Chat.module.css";
import { ClientMessageType, type LiveUser } from "../../types/realtime/realtime";
import { useRealtimeStore } from "../../store/realtimeStore";
import type { ChatMessageData } from "../../types/realtime/chat";
import { useRealtime } from "../../context/realtime";

// Preview data until chat messages are supported by the realtime protocol.

// function createPreviewMessages(): ChatMessageData[] {
//   const now = Date.now();
//   return [
//     {
//       messageId: "preview-1",
//       fromId: participants[1].userId,
//       text: "Hey! Have you had a chance to check the lighting cues for the chorus?",
//       sentAt: now - 4 * 60_000,
//     },
//     {
//       messageId: "preview-2",
//       sender: currentUser,
//       text: "Yes, they look good! I've softened the fade into the next verse.",
//       sentAt: now - 2 * 60_000,
//     },
//     {
//       messageId: "preview-3",
//       sender: participants[2],
//       text: "Nice! Let's run through it together before rehearsal.",
//       sentAt: now - 60_000,
//     },
//   ];
// }

/** A chat box, positioned at the right side of the screen */
export const ChatContainer = () => {
  const [chatIsOpen, setChatIsOpen] = useState(false);
  const { sendMessage: sendToServer } = useRealtime();
  const currentUser = useRealtimeStore((state) => state.user);
  const participants = useRealtimeStore((state) => state.connectedUsers);
  // const [messages, setMessages] = useState(createPreviewMessages);
  const messages = useRealtimeStore((state) => state.messageHistory);

  const [messageCountSinceLastOpen, setMessageCountSinceLastOpen] = useState(messages.length);

  const [draft, setDraft] = useState("");
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const openChat = () => {
    setChatIsOpen(true);
    setMessageCountSinceLastOpen(messages.length);
  };

  useEffect(() => {
    if (chatIsOpen) setMessageCountSinceLastOpen(messages.length);
  }, [messages.length, chatIsOpen, setMessageCountSinceLastOpen]);

  const closeChat = () => {
    setChatIsOpen(false);
    launcherRef.current?.focus();
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    // setMessages((current) => [...current, { id: crypto.randomUUID(), sender: currentUser, text, sentAt: Date.now() }]);
    // send the message to the server
    const message: ChatMessageData = {
      content: [{ type: "text", text: text }],
      fromId: currentUser?.userId ?? "",
      messageId: crypto.randomUUID(),
      sentAt: Date.now(),
    };
    sendToServer(ClientMessageType.ClientMessageChatMessage, message);
    // send the message to the server
    // sendMessageToServer(message);

    setDraft("");
    inputRef.current?.focus();
  };

  const unreadCount = messages.length - messageCountSinceLastOpen;

  return (
    <>
      <Indicator
        color="red"
        inline
        disabled={unreadCount === 0}
        label={unreadCount}
        size={16}
        className={classes.launcher}
        offset={4}
      >
        <ActionIcon
          ref={launcherRef}

          onClick={() => {
            if (chatIsOpen) closeChat();
            else openChat();
          }}
          size={48}
          radius="lg"
          variant="filled"
          autoContrast
          aria-label={chatIsOpen ? "Close chat" : "Open chat"}
          aria-expanded={chatIsOpen}
          aria-controls={chatIsOpen ? panelId : undefined}
        >
          <IconMessages size={24} />
        </ActionIcon>
      </Indicator>

      <Transition
        mounted={chatIsOpen}
        transition="fade-up"
        duration={200}
        timingFunction="ease"
        onEntered={() => inputRef.current?.focus()}
      >
        {(styles) =>
          currentUser ? (
            <Paper
              id={panelId}
              role="region"
              aria-labelledby={titleId}
              className={classes.panel}
              style={styles}
              onKeyDown={(event) => {
                // Chat typing must not trigger the event page's keyboard shortcuts.
                event.stopPropagation();
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeChat();
                }
              }}
            >
              <ChatInfo titleId={titleId} currentUser={currentUser} participants={participants} onClose={closeChat} />
              <ChatContents messages={messages} currentUserId={currentUser.userId} />
              <ChatBox draft={draft} onDraftChange={setDraft} onSend={sendMessage} inputRef={inputRef} />
            </Paper>
          ) : (
            <Loader />
          )
        }
      </Transition>
    </>
  );
};
