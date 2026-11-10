import { Stack, Text } from "@mantine/core";
import { ClickableCardBase } from "../../../../Cues/CardBase";

/** Helper component to render the options for creation of various OptionSetType */
export const OptionSetCreateOption = ({
  header,
  description,
  onClick,
  disabled,
}: {
  header: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
    <ClickableCardBase isActive={false} disabled={disabled} onClick={() => (disabled ? undefined : onClick())}>
      <Stack gap={"0.25rem"}>
        <Text
          style={{
            fontWeight: 600,
            lineHeight: 1.3,
          }}
          fz="sm"
        >
          {header}
        </Text>
        <Text c="dimmed" fz="xs">
          {description}
        </Text>
      </Stack>
    </ClickableCardBase>
  );
};
