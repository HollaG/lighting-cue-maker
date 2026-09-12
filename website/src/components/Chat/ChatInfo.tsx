import { ActionIcon, Avatar, Box, Group, Text } from "@mantine/core";
import { IconChevronDown, IconMessages } from "@tabler/icons-react";
import classes from "./Chat.module.css";
import { ClientMessageType, type LiveUser } from "../../types/realtime/realtime";
import { useEffect, useState } from "react";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useDebouncedState } from "@mantine/hooks";
import { useRealtime } from "../../context/realtime";

type ChatInfoProps = {
  titleId: string;
  currentUser: LiveUser;
  participants: LiveUser[];
  onClose: () => void;
};

/** Chat heading and participant summary, without connection-status indicators. */
export function ChatInfo({ titleId, currentUser, participants, onClose }: ChatInfoProps) {
  const peers = participants.filter((participant) => participant.userId !== currentUser.userId);
  const { sendMessage } = useRealtime();

  const [internalUserName, setInternalUserName] = useDebouncedState(currentUser.name, 200);
  useEffect(() => {
    sendMessage(ClientMessageType.ClientMessageSetName, { name: internalUserName });
  }, [internalUserName, currentUser.name]);

  return (
    <header className={classes.info}>
      <Group justify="space-between" className={classes.heading}>
        <Group gap="xs">
          <IconMessages size={20} className={classes.headingIcon} />
          <Text component="h2" id={titleId} fw={600} size="lg">
            Chat
          </Text>
        </Group>
        <ActionIcon variant="subtle" color="gray" size="lg" radius="md" onClick={onClose} aria-label="Minimize chat">
          <IconChevronDown size={20} />
        </ActionIcon>
      </Group>

      <Group justify="space-between" wrap="nowrap" className={classes.participants}>
        <Group gap="sm" wrap="nowrap" className={classes.identity}>
          <Avatar name={currentUser.name} size={38} radius="xl" variant="light" />
          <Box miw={0}>
            <Group gap="6px">
              {/* <Text size="sm" fw={600} truncate>
                {currentUser.name}
              </Text> */}
              <CustomTextInput defaultValue={internalUserName} onChange={(e) => setInternalUserName(e.target.value)} />
              <Text c="dimmed" size="xs">
                (You){" "}
              </Text>
            </Group>
          </Box>
        </Group>
        {peers.length > 0 && (
          <Avatar.Group spacing="sm" className={classes.avatarGroup}>
            {peers.slice(0, 3).map((participant) => (
              <Avatar
                key={participant.userId}
                name={participant.name}
                title={participant.name}
                aria-label={participant.name}
                size={32}
                radius="xl"
                variant="light"
              />
            ))}
            {peers.length > 3 && (
              <Avatar
                size={32}
                radius="xl"
                title={peers
                  .slice(3)
                  .map((peer) => peer.name)
                  .join(", ")}
              >
                +{peers.length - 3}
              </Avatar>
            )}
          </Avatar.Group>
        )}
      </Group>
    </header>
  );
}
