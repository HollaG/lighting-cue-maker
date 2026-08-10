import { Card, type CardProps } from "@mantine/core";
import React from "react";

export const CardBase: React.FC<{ isActive: boolean; children: React.ReactNode; shadow?: CardProps["shadow"] }> = ({
  isActive,
  children,
  shadow,
}) => {
  return (
    <Card
      withBorder
      shadow={shadow || "sm"}
      style={{
        backgroundColor: isActive ? "var(--mantine-color-lime-0)" : "var(--mantine-color-white)",
        overflow: "visible",
      }}
    >
      {children}
    </Card>
  );
};
