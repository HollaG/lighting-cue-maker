import { Card, useMantineColorScheme, type CardProps } from "@mantine/core";
import React from "react";

export const CardBase: React.FC<{ isActive: boolean; children: React.ReactNode; shadow?: CardProps["shadow"] }> = ({
  isActive,
  children,
  shadow,
}) => {
  const { colorScheme } = useMantineColorScheme();
  let backgroundColour;
  if (colorScheme === "dark") {
    backgroundColour = isActive ? "var(--mantine-primary-color-light)" : "var(--mantine-color-dark-7)";
  }
  if (colorScheme === "light") {
    backgroundColour = isActive ? "var(--mantine-color-lime-0)" : "var(--mantine-color-white)";
  }

  return (
    <Card
      withBorder
      shadow={shadow || "sm"}
      style={{
        backgroundColor: backgroundColour,
        overflow: "visible",
      }}
    >
      {children}
    </Card>
  );
};
