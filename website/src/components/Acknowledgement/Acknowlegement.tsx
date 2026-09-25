import { Anchor, Divider, Group, Stack, Text } from "@mantine/core";

export const Acknowledgement = () => {
  return (
    <Stack pb="4rem" gap="xl">
      <Divider label="Acknowledgements" />
      <Text color="var(--mantine-color-gray-6)" style={{ textAlign: "center" }}>
        This website was made by{" "}
        <Anchor href="https://www.linkedin.com/in/marcussoh1/" target="_blank" rel="noopener noreferrer" style={{}}>
          Marcus Soh
        </Anchor>
        , and is open-source. View the{" "}
        <Anchor href="https://github.com/hollag/lighting-cue-maker" target="_blank" rel="noopener noreferrer">
          GitHub Repository
        </Anchor>
      </Text>
      <Group justify="center" style={{ width: "stretch" }}>
        <Text size="sm" fw={400}>
          {" "}
          Other projects:{" "}
        </Text>
        <Group gap="xs">
          <Anchor size="sm" href="https://tutreg.com" target="_blank" rel="noopener noreferrer">
            tutreg.com
          </Anchor>
          <Divider orientation="vertical" />
          <Anchor size="sm" href="https://resi-wash.com" target="_blank" rel="noopener noreferrer">
            ResiWash
          </Anchor>
          <Divider orientation="vertical" />
          <Anchor
            size="sm"
            href="https://chromewebstore.google.com/detail/simpleshopping/plnplpfflofeemhiakppmjmmkbicdecb?authuser=0&hl=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            SimpleShopping
          </Anchor>
        </Group>
      </Group>
      <Divider label="Acknowledgements" />
    </Stack>
  );
};
