import { useState } from "react";
import { generateRaw } from "../utils/convertText";

export type LyricMode = "raw" | "rich";

export function useLyricsState() {
  const [rawLyrics, setRawLyrics] = useState<string>("");
  const [content, setContent] = useState<string[][]>([]);
  const [lyricInputMode, setLyricInputMode] = useState<LyricMode>("raw");

  /**
   * Switch back to raw-editing mode.
   * Converts the current rich `content` array back to a plain string so the
   * textarea is pre-populated with the most recent version of the lyrics.
   */
  const onBeginAddingLyrics = () => {
    setRawLyrics(generateRaw(content));
    setLyricInputMode("raw");
  };

  return {
    rawLyrics,
    setRawLyrics,
    content,
    setContent,
    lyricInputMode,
    setLyricInputMode,
    onBeginAddingLyrics,
  };
}
