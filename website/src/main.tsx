import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { createTheme, MantineProvider, Text, TextInput } from "@mantine/core";
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
    Text: Text.extend({
      vars: (theme, props) => {
        if (props.variant === "lyric") {
          return {
            root: {
              "--text-fz": "inherit",
              "fontFamily": theme.fontFamilyMonospace ?? "monospace",
            },
          };
        }
        return { root: {} };
      },
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
