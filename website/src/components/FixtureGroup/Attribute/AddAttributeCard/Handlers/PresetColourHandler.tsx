import { Box, Button, Center, ColorInput, Group, Menu, Stack } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useEffect, useRef, useState } from "react";
import { AttributeTypes, type ColourOption } from "../../../../../types/types";
import { CustomTextInput } from "../../../../CustomTextInput/CustomTextInput";
import { ColourIndicator } from "../../../../ColourIndicator/ColourIndicator";

// need to specify hex code
export const PresetColourHandler = ({
  initialColours,
  opvFieldName,
  form,
}: {
  initialColours: ColourOption[];
  opvFieldName: string;
  form: UseFormReturnType<any>;
}) => {
  // list of colours
  opvFieldName = `${opvFieldName}.${AttributeTypes.PRESET_COLOUR}`;

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

  const onAddNewColourOption = (index: number, id = Date.now().toString()) => {
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

  const onQuickAddColourOptions = (type: "whiteamber" | "rgb" | "cmy" | "limeuv" | "all") => {
    let colours: ColourOption[] = [];
    switch (type) {
      case "whiteamber":
        colours.push({ hex: "#ffffff", name: "White" }, { hex: "#ffbf00", name: "Amber" });
        break;
      case "rgb":
        colours.push(
          { hex: "#ff0000", name: "Red" },
          { hex: "#00ff00", name: "Green" },
          { hex: "#0000ff", name: "Blue" },
        );
        break;
      case "cmy":
        colours.push(
          { hex: "#00ffff", name: "Cyan" },
          { hex: "#ff00ff", name: "Magenta" },
          { hex: "#ffff00", name: "Yellow" },
        );
        break;
      case "limeuv":
        colours.push({ hex: "#BFFF00", name: "Lime" }, { hex: "#7F00FF", name: "UV / Purple" });
        break;
      case "all":
        colours.push(
          { hex: "#ffffff", name: "White" },
          { hex: "#ffbf00", name: "Amber" },
          { hex: "#ff0000", name: "Red" },
          { hex: "#00ff00", name: "Green" },
          { hex: "#0000ff", name: "Blue" },
          { hex: "#00ffff", name: "Cyan" },
          { hex: "#ff00ff", name: "Magenta" },
          { hex: "#ffff00", name: "Yellow" },
          { hex: "#7F00FF", name: "UV / Purple" },
        );

        break;
    }

    // Special case:
    // If there is ONE existing option, and it is empty, then we can just replace that one option with the new options
    let length = colorInputIds.length;
    if (colorInputIds.length === 1) {
      const existingOption = opvFieldName
        .split(".")
        .reduce((value, fieldName) => value?.[fieldName], form.getValues())?.[0];
      if (existingOption?.hex === "" && existingOption?.name === "") {
        onDeleteColourOption(0);

        length = 0; // immediate update because state update is delayed
      }
    }

    const now = Date.now();
    colours.forEach((colour, index) => {
      onAddNewColourOption(length + index, (now + index).toString());
      form.setFieldValue(`${opvFieldName}.${length + index}`, colour);
    });
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
        <Group>
          <Button type="button" variant="subtle" size="xs" onClick={() => onAddNewColourOption(colorInputIds.length)}>
            {" "}
            Add another colour
          </Button>
          <Menu>
            <Menu.Target>
              <Button variant="subtle" size="xs">
                Quick add{" "}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => onQuickAddColourOptions("all")}>Add all</Menu.Item>
              <Menu.Divider />
              <Menu.Item
                onClick={() => onQuickAddColourOptions("whiteamber")}
                leftSection={
                  <Group gap={0}>
                    <Box style={{ width: "1rem", height: "1rem" }}></Box>
                    <ColourIndicator hex="#ffffff" />
                    <ColourIndicator hex="#ffbf00" />
                  </Group>
                }
              >
                White Amber
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAddColourOptions("rgb")}
                leftSection={
                  <Group gap={0}>
                    <ColourIndicator hex="#ff0000" />
                    <ColourIndicator hex="#00ff00" />
                    <ColourIndicator hex="#0000ff" />
                  </Group>
                }
              >
                Red Green Blue
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAddColourOptions("cmy")}
                leftSection={
                  <Group gap={0}>
                    <ColourIndicator hex="#00ffff" />
                    <ColourIndicator hex="#ff00ff" />
                    <ColourIndicator hex="#ffff00" />
                  </Group>
                }
              >
                Cyan Magenta Yellow
              </Menu.Item>
              <Menu.Item
                onClick={() => onQuickAddColourOptions("limeuv")}
                leftSection={
                  <Group gap={0}>
                    <Box style={{ width: "1rem", height: "1rem" }}></Box>
                    <ColourIndicator hex="#BFFF00" />
                    <ColourIndicator hex="#7F00FF" />
                  </Group>
                }
              >
                Lime UV
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Center>
    </Stack>
  );
};
