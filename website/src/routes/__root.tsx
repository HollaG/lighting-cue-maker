import * as React from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
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

      <Box className={classes.colorSchemeToggle}>
        <ActionIcon variant="light" onClick={toggleColorScheme} size="xl" radius="xl">
          {colorScheme === "dark" ? <IconSun width="1.25rem" /> : <IconMoon width="1.25rem" />}
        </ActionIcon>
      </Box>
    </React.Fragment>
  );
}
