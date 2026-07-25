import { Box } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import classes from "./App.module.css";
import { HomeHeader } from "./sections/HomeHeader/HomeHeader";
import { CreateEventWrapper } from "./sections/CreateEvent/CreateEventWrapper";
import { ChoreoEventWrapper } from "./sections/ChoreoEvent/ChoreoEventWrapper";
import { QLCConverter } from "./sections/QLCConverter/QLCConverter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "./store/appStore";
import { useEffect } from "react";

// When the app loads, if query parameter showId is not present, render a CTA
// if showId is present, load the Google Doc corresponding to that showId

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
    },
  },
});
function App() {
  const setCode = useAppStore((s) => s.setCode);

  useEffect(() => {
    // change the code if detected in URL as ?code=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      setCode(code);
    }
  }, [setCode]);

  return (
    <QueryClientProvider client={client}>
      <Box pt="xl" pb={"48rem"}>
        <Notifications />
        <Box className={classes.controlBar}>{/* <Button variant="light">Night mode</Button> */}</Box>

        <HomeHeader />

        <CreateEventWrapper />
        <ChoreoEventWrapper />
        <QLCConverter />
      </Box>
    </QueryClientProvider>
  );
}

export default App;
