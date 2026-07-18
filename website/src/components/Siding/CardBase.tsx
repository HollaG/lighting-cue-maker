import { Card } from "@mantine/core";
import React from "react";

export const CardBase: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({ isActive, children }) => {
  return (
    <Card withBorder={!isActive} shadow="sm">
      {children}
    </Card>
  );
};
