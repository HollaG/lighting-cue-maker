// A component that takes in children + isLoading prop and
// a. applies a mask over the children
// b. shows a loading spinner in the middle of the children
import { Box, LoadingOverlay } from "@mantine/core";
import type { PropsWithChildren } from "react";

type CustomCoverLoaderProps = PropsWithChildren<{
  isLoading: boolean;
}>;

export const CustomCoverLoader = ({ children, isLoading }: CustomCoverLoaderProps) => {
  return (
    <Box pos="relative" aria-busy={isLoading}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} loaderProps={{ type: "bars" }} />
      {children}
    </Box>
  );
};
