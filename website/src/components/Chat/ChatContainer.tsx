import { ActionIcon, Paper, Transition } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";
import { ChatBox } from "./ChatBox";
import { ChatContents } from "./ChatContents";
import { ChatInfo } from "./ChatInfo";
import type { ChatMessage, ChatParticipant } from "./chat.types";
import classes from "./Chat.module.css";

// Preview data until chat messages are supported by the realtime protocol.
const currentUser: ChatParticipant = { id: "you", name: "You" };
const participants: ChatParticipant[] = [
  currentUser,
  { id: "alex", name: "Alex Morgan" },
  { id: "sofia", name: "Sofia Chen" },
  { id: "marcus", name: "Marcus Lee" },
  { id: "jamie", name: "Jamie Tan" },
];

function createPreviewMessages(): ChatMessage[] {
  const now = Date.now();
  return [
    {
      id: "preview-1",
      sender: participants[1],
      text: "Hey! Have you had a chance to check the lighting cues for the chorus?",
      sentAt: now - 4 * 60_000,
    },
    {
      id: "preview-2",
      sender: currentUser,
      text: "Yes, they look good! I've softened the fade into the next verse.",
      sentAt: now - 2 * 60_000,
    },
    {
      id: "preview-3",
      sender: participants[2],
      text: "Nice! Let's run through it together before rehearsal.",
      sentAt: now - 60_000,
    },
  ];
}

/** A chat box, positioned at the right side of the screen */
export const ChatContainer = () => {
  const [chatIsOpen, setChatIsOpen] = useState(false);
  const [messages, setMessages] = useState(createPreviewMessages);
  const [draft, setDraft] = useState("");
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const closeChat = () => {
    setChatIsOpen(false);
    launcherRef.current?.focus();
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), sender: currentUser, text, sentAt: Date.now() },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <>
      <ActionIcon
        ref={launcherRef}
        className={classes.launcher}
        onClick={() => {
          if (chatIsOpen) closeChat();
          else setChatIsOpen(true);
        }}
        size={48}
        radius="xl"
        variant="filled"
        autoContrast
        aria-label={chatIsOpen ? "Close chat" : "Open chat"}
        aria-expanded={chatIsOpen}
        aria-controls={chatIsOpen ? panelId : undefined}
      >
        <IconMessages size={24} />
      </ActionIcon>

      <Transition
        mounted={chatIsOpen}
        transition="fade-up"
        duration={200}
        timingFunction="ease"
        onEntered={() => inputRef.current?.focus()}
      >
        {(styles) => (
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
            <ChatInfo
              titleId={titleId}
              currentUser={currentUser}
              participants={participants}
              onClose={closeChat}
            />
            <ChatContents messages={messages} currentUserId={currentUser.id} />
            <ChatBox draft={draft} onDraftChange={setDraft} onSend={sendMessage} inputRef={inputRef} />
          </Paper>
        )}
      </Transition>
    </>
  );
};
