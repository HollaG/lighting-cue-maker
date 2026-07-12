import { TextInput, type TextInputProps } from "@mantine/core"
import classes from "./CustomTextInput.module.css"

export const CustomTextInput = (props: TextInputProps) => {
  return <TextInput
    variant="unstyled"
    classNames={classes}
    {...props}
  />
}