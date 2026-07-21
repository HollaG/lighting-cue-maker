import { Box, Button, Container, Divider } from "@mantine/core";
import { useState } from "react";
import { Notifications } from "@mantine/notifications";
import { AppProvider, useAppContext } from "./context/AppContext";

import classes from "./App.module.css";
import { HomeHeader } from "./sections/HomeHeader/HomeHeader";
import { CreateEventWrapper } from "./sections/CreateEvent/CreateEventWrapper";
import { ChoreoEventWrapper } from "./sections/ChoreoEvent/ChoreoEventWrapper";
import { QLCConverter } from "./sections/QLCConverter/QLCConverter";

// When the app loads, if query parameter showId is not present, render a CTA
// if showId is present, load the Google Doc corresponding to that showId
function App() {
  return (
    <AppProvider>
      <Box pt="xl" pb={"48rem"}>
        <Notifications />
        <Box className={classes.controlBar}>
          <Button variant="light">Night mode</Button>
        </Box>

        <HomeHeader />

        <CreateEventWrapper />
        <ChoreoEventWrapper />
        <QLCConverter />
      </Box>
    </AppProvider>
  );
}

export default App;
