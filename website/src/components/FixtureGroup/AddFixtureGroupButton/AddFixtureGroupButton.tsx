import { Button, Center, Stack, Text, type ButtonProps } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import classes from "./AddFixtureGroupButton.module.css";

export const AddFixtureGroupButton = (props: ButtonProps & React.ComponentProps<"button">) => {
  return (
    <Button
      variant="light"
      {...props}
      classNames={classes}
      style={{
        height: "200px",
      }}
    >
      <Stack className={classes.inner} gap="0">
        <Center>
          <IconPlus />
        </Center>
        <Text fw="bold"> Add fixture group </Text>
        <Text
          style={{ color: "light-dark(var(--mantine-color-lime-9), var(--mantine-color-lime-3))" }}
          fz="sm"
          mt={"0.25rem"}
        >
          A fixture group consists of one or more
          <br />
          lighting devices that are controlled together.{" "}
        </Text>
      </Stack>
    </Button>
  );
};
