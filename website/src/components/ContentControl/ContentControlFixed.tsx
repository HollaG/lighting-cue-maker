import { Group, Title, Button, Box, NumberInput, Flex, useMantineColorScheme, SegmentedControl } from "@mantine/core";
import { useAppStore, type InputMode } from "../../store/appStore";

// const getIndicatorText = (
//   inputTimingMode: IndicatorTimingMode,
//   inputMode: InputMode,
//   bumpDefault?: BumpConfiguration | null,
// ) => {
//   if (inputMode === "raw") return "Edit lyrics";
//   if (inputMode === "cue") return "Configure cues";
//   if (inputMode === "bump") {
//     return `Configure bump: ${bumpDefault?.name}`;
//   }
//   if (inputMode === "timing") {
//     return `Configure ${inputTimingMode} beats`;
//   }
// };

export const ContentControlFixed = ({
  // eventId,
  deleteExtraSpaces,
  // onFinishAddingLyrics,
  showTitle = true,
}: {
  eventId: string;
  deleteExtraSpaces: () => void;
  onFinishAddingLyrics: (switchTo: InputMode) => void;
  showTitle: boolean;
}) => {
  // deprecated other input modes
  // only raw and cue are supported now

  const inputMode = useAppStore((s) => s.inputMode);
  // const previousInputMode = useAppStore((s) => s.previousInputMode);
  // const inputTimingMode = useAppStore((s) => s.inputTimingMode);
  const setInputMode = useAppStore((s) => s.setInputMode);
  const timingIndicatorNumber = useAppStore((s) => s.indicatorNumber);
  const setTimingIndicatorNumber = useAppStore((s) => s.setIndicatorNumber);
  // const instantBumpMode = useAppStore((s) => s.instantAddBumpMode);
  // const setInstantBumpMode = useAppStore((s) => s.setInstantAddBumpMode);
  // const setInputTimingMode = useAppStore((s) => s.setInputTimingMode);
  // const setCurrentlySelectedCueId = useAppStore((s) => s.setCurrentlySelectedCueId);
  // const setCurrentlySelectedBumpId = useAppStore((s) => s.setCurrentlySelectedBumpId);
  // const { event: evt } = useGetEvent({ eventId: eventId });

  // const handleMenuItemClick = (action: () => void) => {
  //   action();
  //   setCurrentlySelectedCueId(undefined);
  //   setCurrentlySelectedBumpId(undefined);
  //   setTimeout(() => {
  //     document.getElementById("focus-trap-lyrics")?.focus({ preventScroll: true });
  //   }, 0);
  // };

  // const revert = (e: React.MouseEvent<HTMLButtonElement>) => {
  //   e.stopPropagation();
  //   if (inputMode === "raw") {
  //     onFinishAddingLyrics(previousInputMode);
  //   } else {
  //     // save
  //     setInputMode(previousInputMode);
  //   }
  // };

  const { colorScheme } = useMantineColorScheme();

  return (
    <Group>
      {showTitle ? (
        <Title order={3} flex={1}>
          Lyrics
        </Title>
      ) : (
        <></>
      )}

      <Flex flex={1} />
      {inputMode == "raw" && (
        <Group>
          <Button
            size="xs"
            variant="subtle"
            color={colorScheme === "dark" ? "white" : "black"}
            onClick={deleteExtraSpaces}
          >
            Remove extra line breaks
          </Button>
        </Group>
      )}
      {/* {timingIndicatorNumber} */}

      {inputMode === "timing" ? (
        <Box style={{ maxWidth: "75px" }}>
          <NumberInput
            description="Beat to add"
            value={timingIndicatorNumber}
            onChange={(e) => setTimingIndicatorNumber(Number(e))}
            min={0}
            max={8}
          />
        </Box>
      ) : (
        <></>
      )}

      {/* <Menu shadow="md" width={"200px"} position="bottom-end">
        <Menu.Target>
          <Box style={{ width: "250px" }}>
            <Select
              comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
              description={
                <span style={{ display: "flex" }}>
                  <span style={{ flex: 1 }}>Editor mode</span>

                  <Tooltip
                    label={`Go back to ${getIndicatorText(inputTimingMode, previousInputMode, instantBumpMode)}`}
                  >
                    <Button onClick={revert} size="compact-xs" variant="transparent" color="grey" py={0}>
                      ⇄ {"  "}recently used
                    </Button>
                  </Tooltip>
                </span>
              }
              width={"200px"}
              data={[getIndicatorText(inputTimingMode, inputMode, instantBumpMode) || ""]}
              value={getIndicatorText(inputTimingMode, inputMode, instantBumpMode) || ""}
              readOnly
            />
          </Box>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item onClick={() => handleMenuItemClick(() => setInputMode("raw"))}> Edit lyrics</Menu.Item>
          <Menu.Item onClick={() => handleMenuItemClick(() => onFinishAddingLyrics("cue"))}> Configure cues</Menu.Item>
          {evt?.bumpConfigurations && evt.bumpConfigurations.length ? (
            <Menu.Sub>
              <Menu.Sub.Target>
                <Menu.Sub.Item> Configure bumps</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown>
                {evt.bumpConfigurations.map((bumpConfig) => (
                  <Menu.Item
                    onClick={() =>
                      handleMenuItemClick(() => {
                        setInstantBumpMode(bumpConfig);
                        onFinishAddingLyrics("bump");
                      })
                    }
                    key={bumpConfig.id}
                  >
                    {bumpConfig.name}
                  </Menu.Item>
                ))}
              </Menu.Sub.Dropdown>
            </Menu.Sub>
          ) : null}
          <Menu.Sub>
            <Menu.Sub.Target>
              <Menu.Sub.Item> Configure timing indicators</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>
              <Menu.Item
                onClick={() =>
                  handleMenuItemClick(() => {
                    setInputMode("timing");
                    setInputTimingMode("main");
                  })
                }
              >
                Main beats
              </Menu.Item>
              <Menu.Label> Main beats are the 1,2,3,4 of bars</Menu.Label>

              <Menu.Item
                onClick={() =>
                  handleMenuItemClick(() => {
                    setInputMode("timing");
                    setInputTimingMode("sub");
                  })
                }
              >
                Sub-beats
              </Menu.Item>
              <Menu.Label> Sub-beats are the divisions between main beats</Menu.Label>
            </Menu.Sub.Dropdown>
          </Menu.Sub>
        </Menu.Dropdown>
      </Menu> */}

      <SegmentedControl
        data={[
          { label: "Lyric mode", value: "raw" },
          { label: "Cue mode", value: "cue" },
        ]}

        value={inputMode}
        onChange={(value) => setInputMode(value as InputMode)}
      />

      {/* <Input.Wrapper label="Input mode" mx={0}>
                    <Select
                      comboboxProps={{ transitionProps: { transition: "pop", duration: 100 } }}
                      data={InputModes}
                      value={inputMode}
                      onChange={(value) => setInputMode(value as InputMode)}
                    />
                  </Input.Wrapper> */}
    </Group>
  );
};
