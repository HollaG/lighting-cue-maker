/* oxlint-disable react/only-export-components -- TanStack route modules export route metadata with their component. */
import * as React from "react";
import { Outlet, createRootRoute, useMatch } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionIcon, Box, useMantineColorScheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconMoon, IconSun } from "@tabler/icons-react";
import classes from "./__root.module.css";

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
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  // The event page is a full-screen visualiser, so the floating toggle would sit on top of it.
  // Only the event page itself (not /edit or /run): `shouldThrow: false` returns undefined on other routes.
  const isEventPage = !!useMatch({ from: "/events/$eventId/", shouldThrow: false });

  return (
    <React.Fragment>
      {/* <div>Hello "__root"!</div> */}

      <QueryClientProvider client={client}>
        {/* <Box pt="xl" pb={"48rem"}> */}
        <Box style={{ height: "stretch" }}>
          <Notifications />
          {/* <Box className={classes.controlBar}>
            <Button variant="light">Night mode</Button>
            </Box> */}

          <Outlet />
        </Box>
      </QueryClientProvider>

      {!isEventPage && (
        <Box className={classes.colorSchemeToggle}>
          <ActionIcon variant="light" onClick={toggleColorScheme} size="xl" radius="xl">
            {colorScheme === "dark" ? <IconSun width="1.25rem" /> : <IconMoon width="1.25rem" />}
          </ActionIcon>
        </Box>
      )}
    </React.Fragment>
  );
}
