import { Box, Stack, Text, Tooltip } from "@mantine/core";
import { ClickableCardBase } from "../../../../Cues/CardBase";

/** Helper component to render the options for creation of various OptionSetType */
export const OptionSetCreateOption = ({
  header,
  description,
  onClick,
  disabled,
  disabledReason,
}: {
  header: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  /** Shown on hover while `disabled`, to explain why the option can't be added. */
  disabledReason?: string;
}) => {
  return (
    <Tooltip label={disabledReason} disabled={!disabled || !disabledReason} withArrow>
      {/* A disabled <button> gets no mouse events, so the tooltip listens on this wrapper instead. */}
      <Box>
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
      </Box>
    </Tooltip>
  );
};
