import { Box, Button, Container, Divider } from "@mantine/core";
import { useState } from "react";
import { Notifications } from "@mantine/notifications";

import classes from "./App.module.css";
import { HomeHeader } from "./sections/HomeHeader/HomeHeader";
import { CreateEventWrapper } from "./sections/CreateEvent/CreateEventWrapper";

// When the app loads, if query parameter showId is not present, render a CTA
// if showId is present, load the Google Doc corresponding to that showId
function App() {
  const [count, setCount] = useState(0);

  return (
    <Box py={"xl"}>
      <Notifications />
      <Box className={classes.controlBar}>
        <Button variant="light">Night mode</Button>
      </Box>

      <HomeHeader show />

      <CreateEventWrapper />
    </Box>
  );
}

export default App;
