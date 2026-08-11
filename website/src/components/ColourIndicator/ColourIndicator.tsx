import { Box } from "@mantine/core";

export const ColourIndicator = ({ hex }: { hex: string }) => {
  return (
    <Box
      style={{
        backgroundColor: hex,
        border: hex === "#ffffff" ? "2px solid light-dark(black, transparent)" : "",
        width: "1rem",
        height: "1rem",
        borderRadius: "4px",
      }}
    />
  );
};
