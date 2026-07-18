import { type Dispatch, type SetStateAction, useMemo } from "react";
import { useFetch } from "./useFetch";
import { useRequest } from "./useRequest";
import { generateRaw } from "../utils/convertText";
import type { CreateCueReq, CreateCueRes, GetCuesRes } from "../types/http";
import type { Cue } from "../types/cues";

export function useCueState(
  eventId: string | undefined,
  activeItemId: string | undefined,
  isValidEvent: boolean,
  content: string[][],
  setContent: Dispatch<SetStateAction<string[][]>>,
  setRawLyrics: Dispatch<SetStateAction<string>>,
) {
  const { data: cuesData, refetch: refetchCues } = useFetch<GetCuesRes>(
    `/api/v1/events/${eventId}/items/${activeItemId}/cues`,
    isValidEvent && !!activeItemId,
  );
  const cues: Cue[] = cuesData?.cues ?? [];

  const { executeRequest: executeCreateCue } = useRequest<CreateCueReq, CreateCueRes>(
    `/api/v1/events/${eventId}/items/${activeItemId}/cues`,
    "POST",
  );

  // Re-derive cue order whenever the total character count of `content` changes.
  // This fires whenever a cue is embedded (word count always changes on cue insertion).
  const totalChars = content.reduce((a, line) => a + line.reduce((b, w) => b + w.length, 0), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cueOrder = useMemo(() => {
    const order: string[] = [];
    for (const line of content) {
      for (const word of line) {
        const match = word.match(/<cueId=(.*?)=cueId>/);
        if (match) order.push(match[1]);
      }
    }
    return order;
  }, [totalChars]);

  /**
   * Create a cue in the DB, then embed its ID into the lyrics content array.
   *
   * - Space: replaces the space token with `<cueId=…>` and pads it with
   *   neighbour spaces so the user can keep adding cues adjacently.
   * - Word: prefixes the word token with `<cueId=…>` so the cue is
   *   attached to that word.
   */
  const onAddCue = async (lineIndex: number, wordIndex: number, isSpace: boolean) => {
    try {
      const res = await executeCreateCue({});
      const id = res.cue.id;

      if (isSpace) {
        const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>";
        content[lineIndex][wordIndex] = cueId;

        const line = content[lineIndex];
        // Insert padding spaces — do the right side first to keep the index math simple.
        line.splice(wordIndex + 1, 0, " ");
        line.splice(wordIndex, 0, " ");
        content[lineIndex] = line;
        setContent([...content]);
      } else {
        const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>" + content[lineIndex][wordIndex];
        content[lineIndex][wordIndex] = cueId;
        setContent([...content]);
      }

      setRawLyrics(generateRaw([...content]));
      refetchCues();
    } catch (e) {}
  };

  return { cues, cueOrder, onAddCue };
}
