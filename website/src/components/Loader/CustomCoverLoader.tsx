// A component that takes in children + isLoading prop and
// a. applies a mask over the children
// b. shows a loading spinner in the middle of the children
import { Box, LoadingOverlay, type OverlayProps } from "@mantine/core";
import type { PropsWithChildren } from "react";

type CustomCoverLoaderProps = PropsWithChildren<{
  isLoading: boolean;
  content?: React.ReactNode;
  overlayProps?: OverlayProps;
}>;

export const CustomCoverLoader = ({ children, isLoading, content, overlayProps }: CustomCoverLoaderProps) => {
  return (
    <Box pos="relative" aria-busy={isLoading}>
      <LoadingOverlay
        visible={isLoading}
        overlayProps={{ blur: 2, ...overlayProps }}
        loaderProps={{ type: "bars", children: content }}
      />
      {children}
    </Box>
  );
};
