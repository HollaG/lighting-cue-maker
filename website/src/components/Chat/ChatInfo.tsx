// feature[class=Realtime] Participant summary and display name editing

import { ActionIcon, Avatar, Box, Button, Group, HoverCard, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconMessages } from "@tabler/icons-react";
import classes from "./Chat.module.css";
import { ClientMessageType, type LiveUser } from "../../types/realtime/realtime";
import { useEffect } from "react";
import { CustomTextInput } from "../CustomTextInput/CustomTextInput";
import { useDebouncedState } from "@mantine/hooks";
import { useRealtime } from "../../context/realtime";
import { getColorFromId } from "../../utils/presence/cursorColors";
import { useRealtimeStore } from "../../store/realtimeStore";

type ChatInfoProps = {
  titleId: string;
  currentUser: LiveUser;
  participants: LiveUser[];
  onClose: () => void;
};
const SHOW_MAX_PEERS = 1;

/** Chat heading and participant summary, without connection-status indicators. */
export function ChatInfo({ titleId, currentUser, participants, onClose }: ChatInfoProps) {
  const peers = participants.filter((participant) => participant.userId !== currentUser.userId);
  const { sendMessage } = useRealtime();

  // Following information
  // Can follow: user must not be following someone
  const setFollowingUserId = useRealtimeStore((state) => state.setFollowingUserId);
  const followingUserId = useRealtimeStore((state) => state.followingUserId);
  const followingMap = useRealtimeStore((state) => state.followingMap);

  const [internalUserName, setInternalUserName] = useDebouncedState(currentUser.name, 200);
  useEffect(() => {
    sendMessage(ClientMessageType.ClientMessageSetName, { name: internalUserName });
  }, [internalUserName, currentUser.name]);

  const displayedPeers = peers.slice(0, SHOW_MAX_PEERS);
  const hiddenPeers = peers.slice(SHOW_MAX_PEERS);

  const onFollow = (userId: string | null) => {
    setFollowingUserId(userId);
  };

  const FollowButton = ({ userId }: { userId: string }) => {
    if (userId === followingUserId) {
      // change to unfollow
      return (
        <Button variant="light" size="xs" onClick={() => onFollow(null)}>
          Unfollow
        </Button>
      );
    }

    if (followingMap[userId]) {
      // this user is already following someone else
      // will follow the "Master" instead?
      return (
        <Button variant="subtle" size="xs" onClick={() => onFollow(followingMap[userId])} disabled>
          Follow view
        </Button>
      );
    } else {
      return (
        <Button variant="subtle" size="xs" onClick={() => onFollow(userId)}>
          Follow view
        </Button>
      );
    }
  };

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
        {peers.length > 0 ? (
          <Avatar.Group spacing="sm" className={classes.avatarGroup}>
            {displayedPeers.map((participant) => (
              <HoverCard shadow="md" position="top" withArrow key={participant.userId}>
                <HoverCard.Target>
                  <Avatar
                    name={participant.name}
                    title={participant.name}
                    aria-label={participant.name}
                    size={32}
                    radius="xl"
                    variant="light"
                    color={getColorFromId(participant.userId)}
                  />
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Stack>
                    <Group gap="xs" align="center">
                      <Avatar
                        key={participant.userId}
                        name={participant.name}
                        title={participant.name}
                        aria-label={participant.name}
                        size={32}
                        radius="xl"
                        variant="light"
                        color={getColorFromId(participant.userId)}
                      />
                      <Text size="sm" fw={600}>
                        {participant.name}
                      </Text>
                      <FollowButton userId={participant.userId} />
                    </Group>
                  </Stack>
                </HoverCard.Dropdown>
              </HoverCard>
            ))}
            {hiddenPeers.length > 0 && (
              <HoverCard shadow="md" position="top" withArrow>
                <HoverCard.Target>
                  <Avatar size={32} radius="xl" title={hiddenPeers.map((peer) => peer.name).join(", ")}>
                    +{hiddenPeers.length}
                  </Avatar>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Stack>
                    {hiddenPeers.map((peer, index) => (
                      <Group gap="xs" align="center" key={peer.userId}>
                        <Avatar
                          name={peer.name}
                          title={peer.name}
                          aria-label={peer.name}
                          size={32}
                          radius="xl"
                          variant="light"
                          color={getColorFromId(peer.userId)}
                        />
                        <Text size="sm" fw={600} flex={1} truncate>
                          {peer.name}
                        </Text>
                        <FollowButton userId={peer.userId} />
                      </Group>
                    ))}
                  </Stack>
                </HoverCard.Dropdown>
              </HoverCard>
            )}
          </Avatar.Group>
        ) : (
          <Text fz="xs" c="dark.1">
            No one's online
          </Text>
        )}
        <Group gap="sm" wrap="nowrap" className={classes.identity}>
          <Box miw={0}>
            <Group gap="6px">
              {/* <Text size="sm" fw={600} truncate>
                {currentUser.name}
              </Text> */}
              <CustomTextInput
                defaultValue={internalUserName}
                onChange={(e) => setInternalUserName(e.target.value)}
                // style={{ textAlign: "right" }}
                styles={{
                  input: {
                    textAlign: "right",
                    fieldSizing: "content",
                  },
                }}
              />
              <Text c="dimmed" size="xs">
                (You)
              </Text>
            </Group>
          </Box>
          <Avatar
            name={currentUser.name}
            size={38}
            radius="xl"
            variant="light"
            color={getColorFromId(currentUser.userId)}
          />
        </Group>
      </Group>
    </header>
  );
}
