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
    backgroundColour = isActive ? "var(--mantine-color-dark-7)" : "var(--mantine-color-dark-7)";
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
        borderColor: isActive ? "light-dark(var(--mantine-color-lime-0), var(--mantine-color-lime-5))" : undefined,
      }}
    >
      {children}
    </Card>
  );
};
