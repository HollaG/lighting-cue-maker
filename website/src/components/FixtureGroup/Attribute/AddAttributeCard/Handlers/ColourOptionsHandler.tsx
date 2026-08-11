import { Box, Button, Center, ColorInput, Group, Stack } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useEffect, useRef, useState } from "react";
import { AttributeTypes, type ColourOption } from "../../../../../types/types";
import { CustomTextInput } from "../../../../CustomTextInput/CustomTextInput";

// need to specify hex code
export const ColourOptionsHandler = ({
  initialColours,
  opvFieldName,
  form,
}: {
  initialColours: ColourOption[];
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  // list of colours
  opvFieldName = `${opvFieldName}.${AttributeTypes.COLOUR}`;

  const [colorInputIds, setColorInputIds] = useState<string[]>(() =>
    initialColours.length > 0 ? initialColours.map((_, index) => `existing-colour-${index}`) : [Date.now().toString()],
  );
  const initializedEmptyColour = useRef(false);

  useEffect(() => {
    if (initialColours.length > 0 || initializedEmptyColour.current) return;
    initializedEmptyColour.current = true;

    form.setFieldValue(`${opvFieldName}.0`, {
      hex: "",
      name: "",
    });
  }, [form, initialColours.length, opvFieldName]);

  const onAddNewColourOption = (index: number) => {
    const id = Date.now().toString();
    setColorInputIds((prev) => [...prev, id]);

    // init the field value for this colour
    form.setFieldValue(`${opvFieldName}.${index}`, {
      hex: "",
      name: "",
    });
  };

  const onDeleteColourOption = (index: number) => {
    setColorInputIds((prev) => prev.filter((_, i) => i !== index));
    form.removeListItem(`${opvFieldName}`, index);
  };
  return (
    <Stack>
      {colorInputIds.map((colorInputId, index) => (
        <Group key={colorInputId}>
          <Box flex={5}>
            <ColorInput
              variant="unstyled"
              label="Colour"
              withAsterisk
              placeholder="Input placeholder"
              name={`${opvFieldName}.${index}.hex`}
              key={form.key(`${opvFieldName}.${index}.hex`)}
              {...form.getInputProps(`${opvFieldName}.${index}.hex`)}
              withEyeDropper={false}
              swatches={[
                "#ffffff",
                "#ffbf00",
                "#ff0000",
                "#00ff00",
                "#0000ff",
                "#00ffff",
                "#ff00ff",
                "#ffff00",
                "#7F00FF",
                "#FFC0CB",
                "#fd7e14",
              ]}
            />
          </Box>
          <Box flex={5}>
            <CustomTextInput
              label="Colour name"
              placeholder="e.g. Red"
              withAsterisk
              name={`${opvFieldName}.${index}.name`}
              key={form.key(`${opvFieldName}.${index}.name`)}
              {...form.getInputProps(`${opvFieldName}.${index}.name`)}
            />
          </Box>
          <Box flex={1}>
            <Button
              type="button"
              variant="transparent"
              size="xs"
              color="red"
              onClick={() => onDeleteColourOption(index)}
            >
              {" "}
              Remove option
            </Button>
          </Box>
        </Group>
      ))}
      <Center>
        <Button type="button" variant="subtle" size="xs" onClick={() => onAddNewColourOption(colorInputIds.length)}>
          {" "}
          Add another colour
        </Button>
      </Center>
    </Stack>
  );
};
