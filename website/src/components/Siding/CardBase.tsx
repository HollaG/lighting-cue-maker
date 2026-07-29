import { Card, type CardProps } from "@mantine/core";
import React from "react";

export const CardBase: React.FC<{ isActive: boolean; children: React.ReactNode; shadow?: CardProps["shadow"] }> = ({
  isActive,
  children,
  shadow,
}) => {
  return (
    <Card withBorder={!isActive} shadow={shadow || "sm"} style={{ overflow: "visible" }}>
      {children}
    </Card>
  );
};
