import { StrictMode } from "react";
import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import {
  ColorSchemeScript,
  createTheme,
  MantineProvider,
  Text,
  TextInput,
  type CSSVariablesResolver,
} from "@mantine/core";
import classes from "./main.module.css";
import ReactDOM from "react-dom/client";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { createRouter, RouterProvider } from "@tanstack/react-router";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const theme = createTheme({
  primaryColor: "lime",

  fontFamily: "Inter, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, monospace",
  headings: {
    fontFamily: "Space Grotesk, sans-serif",
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
              fontFamily: theme.fontFamilyMonospace ?? "monospace",
            },
          };
        }
        return { root: {} };
      },
    }),
  },
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-text": "#f8f9fa",
  },
});

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
        <RouterProvider router={router} />
        <ColorSchemeScript />
      </MantineProvider>
    </StrictMode>,
  );
}
