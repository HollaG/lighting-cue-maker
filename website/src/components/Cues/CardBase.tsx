import { Card, useMantineColorScheme, type CardProps } from "@mantine/core";
import React from "react";
import classes from "./CardBase.module.css";

export const CardBase: React.FC<{
  isActive: boolean;
  children: React.ReactNode;
  shadow?: CardProps["shadow"];
  /** Merged over the card's own style, so it can override e.g. `overflow` or set a height. */
  style?: React.CSSProperties;
}> = ({ isActive, children, shadow, style }) => {
  const { colorScheme } = useMantineColorScheme();
  let backgroundColour;
  if (colorScheme === "dark") {
    backgroundColour = isActive ? "var(--mantine-color-dark-7)" : "var(--mantine-color-dark-7)";
  }
  if (colorScheme === "light") {
    backgroundColour = isActive ? "var(--mantine-color-lime-light)" : "var(--mantine-color-white)";
  }

  return (
    <Card
      withBorder
      shadow={shadow || "sm"}
      style={{
        backgroundColor: backgroundColour,
        overflow: "visible",
        // borderColor: isActive ? "light-dark(var(--mantine-color-lime-0), var(--mantine-color-yellow-9))" : undefined,
        borderColor: isActive
          ? "light-dark(var(--cue-color--light-selected), var(--cue-color--dark-selected))"
          : undefined,
        ...style,
      }}
    >
      {children}
    </Card>
  );
};

/**
 * CardBase that behaves like a button: a real <button> (keyboard and screen readers work), with hover, pressed,
 * focus, active (selected) and disabled states. Styles live in CardBase.module.css.
 */
export const ClickableCardBase = ({
  isActive = false,
  children,
  shadow,
  onClick,
  disabled = false,
}: {
  isActive?: boolean;
  children: React.ReactNode;
  shadow?: CardProps["shadow"];
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}) => (
  <Card
    component="button"
    type="button"
    withBorder
    shadow={shadow}
    className={classes.clickable}
    onClick={onClick}
    disabled={disabled}
    aria-pressed={isActive}
    data-active={isActive || undefined}
    data-disabled={disabled || undefined}
  >
    {children}
  </Card>
);
