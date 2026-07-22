import { Group, Button } from "@mantine/core";
import { useAppStore } from "../../../store/appStore";
import { useState, useEffect } from "react";

export const InputRawLyrics = () => {
  const rawLyrics = useAppStore((s) => s.rawLyrics);
  const setRawLyrics = useAppStore((s) => s.setRawLyrics);
  const onFinishAddingLyrics = useAppStore((s) => s.onFinishAddingLyrics);

  const [internalRawLyrics, setInternalRawLyrics] = useState<string>("");
  const onClickFinishAddingLyricsButton = () => {
    setRawLyrics(internalRawLyrics);
    onFinishAddingLyrics();
  };

  useEffect(() => {
    setInternalRawLyrics(rawLyrics);
  }, [rawLyrics]);

  const deleteExtraSpaces = () => {
    setInternalRawLyrics(internalRawLyrics.replaceAll("\n\n\n", "\n\n"));
  };

  return (
    <Group>
      <Button size="xs" variant="subtle" color="black" onClick={deleteExtraSpaces}>
        Remove extra line breaks
      </Button>
      <Button size="xs" color="green" onClick={() => onClickFinishAddingLyricsButton()}>
        {" "}
        Finish adding
      </Button>
    </Group>
  );
};
