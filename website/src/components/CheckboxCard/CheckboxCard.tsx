import { Checkbox, Group, Text } from "@mantine/core";
import classes from "./CheckboxCard.module.css";

export const CheckboxCard = ({
  name,
  description,

  value,
}: {
  name: string;
  description?: string;

  value: string;
}) => {
  return (
    <Checkbox.Card className={classes.root} value={value}>
      <Group wrap="nowrap" align="flex-start">
        <Checkbox.Indicator />

        <div>
          <Text className={classes.label}>{name}</Text>
          {description && <Text className={classes.description}>{description}</Text>}
        </div>
      </Group>
    </Checkbox.Card>
  );
};
