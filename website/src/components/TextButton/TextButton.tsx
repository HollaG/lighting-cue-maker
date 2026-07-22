import { Button, type ButtonProps } from "@mantine/core";
import classes from "./TextButton.module.css";

export const TextButton = ({
  variant = "transparent",
  classNames,
  onClick,
  ...props
}: ButtonProps & { onClick: () => void }) => {
  return (
    <Button
      variant={variant}
      classNames={{
        root: classes.root,
        ...(typeof classNames === "object" ? classNames : {}),
      }}
      {...props}
      onClick={onClick}
      p={0}
    />
  );
};

export default TextButton;
