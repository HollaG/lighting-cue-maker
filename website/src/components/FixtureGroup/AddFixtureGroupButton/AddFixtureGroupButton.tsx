import { Button, Center, Stack, Text, type ButtonProps } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import classes from "./AddFixtureGroupButton.module.css"


// TODO: adjust color in Night mode
export const AddFixtureGroupButton = (props: ButtonProps & React.ComponentProps<'button'>) => {
  return <Button variant="light" {...props} classNames={classes} style={{
    height: '200px'
  }}>
    <Stack className={classes.inner} gap="0">
      <Center>
        <IconPlus />

      </Center>
      <Text> Add option group </Text>
    </Stack>
  </Button>
}