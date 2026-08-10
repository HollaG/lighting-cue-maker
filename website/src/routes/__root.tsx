import * as React from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Box } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

export const Route = createRootRoute({
  component: RootComponent,
});
const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
    },
  },
});

function RootComponent() {
  return (
    <React.Fragment>
      {/* <div>Hello "__root"!</div> */}

      <QueryClientProvider client={client}>
        <Box pt="xl" pb={"48rem"}>
          <Notifications />
          {/* <Box className={classes.controlBar}>
            <Button variant="light">Night mode</Button>
            </Box> */}

          <Outlet />
        </Box>
      </QueryClientProvider>
    </React.Fragment>
  );
}
