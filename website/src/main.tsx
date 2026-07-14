import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { createTheme, MantineProvider, TextInput } from "@mantine/core";
import classes from "./main.module.css";

const theme = createTheme({
  fontFamily: "Inter, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, monospace",
  headings: {
    fontFamily: "Inter, sans-serif",
  },
  components: {
    TextInput: TextInput.extend({
      classNames: classes,
    }),
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>,
);
