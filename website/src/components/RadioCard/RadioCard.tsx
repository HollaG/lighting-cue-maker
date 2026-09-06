import { Checkbox, Group, Radio, Text } from "@mantine/core";
import classes from "./RadioCard.module.css";

export const RadioCard = ({
  name,
  description,

  value,
}: {
  name: string;
  description?: string;

  value: string;
}) => {
  return (
    <Radio.Card className={classes.root} value={value}>
      <Group wrap="nowrap" align="flex-start">
        <Radio.Indicator />

        <div>
          <Text className={classes.label}>{name}</Text>
          {description && <Text className={classes.description}>{description}</Text>}
        </div>
      </Group>
    </Radio.Card>
  );
};
