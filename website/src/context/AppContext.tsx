import { createContext, useContext, useState } from "react";
import { useFetch } from "../hooks/useFetch";
import {
  type UpdateItemReq,
  type CreateCueReq,
  type CreateCueRes,
  type GetEventRes,
  type UpdateItemRes,
} from "../types/http";
import type { Item, LightEventConfiguration } from "../types/types";
import { generateRaw, generateRich } from "../utils/convertText";
import { useRequest } from "../hooks/useRequest";
import { type Cue } from "../types/cues";

type AppContextType = {
  /** The UUID code of the currently active light event, or null if none. */
  code: string | null;
  setCode: (code: string | null) => void;

  event: LightEventConfiguration | null;
  isValidEvent: boolean;

  activeItem: Item | null;
  changeActiveItem: (activeItem: Item | null) => void;

  items: Item[];
  itemName: string;
  setItemName: (name: string) => void;
  onAddItem: () => void;

  rawLyrics: string;
  setRawLyrics: (rawLyrics: string) => void;

  content: string[][];
  setContent: (content: []) => void;

  onFinishAddingLyrics: () => void;
  onBeginAddingLyrics: () => void;

  lyricInputMode: LyricMode;
  setLyricInputMode: (lyricInputMode: LyricMode) => void;

  onAddCue: (lineIndex: number, wordIndex: number, isSpace: boolean) => void;
};

type LyricMode = "raw" | "rich";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>("");
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  // Only fetch when we have a 36-char UUID. Guards against null crash.
  const isValidCode = code !== null && code.length === 36;
  const { data: fetchResp, loading, success } = useFetch<GetEventRes>(`/api/v1/events/${code}`, isValidCode);

  const isValidEvent = fetchResp !== null && success && isValidCode;

  const [lyricInputMode, setLyricInputMode] = useState<LyricMode>("raw");
  const [rawLyrics, setRawLyrics] = useState<string>("");
  const [content, setContent] = useState<string[][]>([]);

  const [cues, setCues] = useState<{ [cueId: string]: Cue }>({});

  // Items
  const [itemName, setItemName] = useState(""); // controlled component
  const { data: itemsData, refetch: refetchItems } = useFetch<{ items: Item[] }>(
    `/api/v1/events/${fetchResp?.event?.id}/items`,
    isValidEvent,
  );
  const items = itemsData?.items ?? [];

  const { executeRequest: executeCreateItem } = useRequest<{ name: string }, { item: Item }>(
    `/api/v1/events/${fetchResp?.event?.id}/items`,
    "POST",
  );

  const onAddItem = async () => {
    const res = await executeCreateItem({ name: itemName });
    if (res?.item) {
      changeActiveItem(res.item);
    }
    refetchItems();
    setItemName("");
  };

  const { executeRequest: executeCreateCueRequest } = useRequest<CreateCueReq, CreateCueRes>(
    `/api/v1/events/${code}/items/${activeItem?.id}/cues`,
    "POST",
  );

  const { executeRequest: executeUpdateItem } = useRequest<UpdateItemReq, UpdateItemRes>(
    `/api/v1/events/${code}/items/${activeItem?.id}`,
    "PATCH",
  );

  const changeActiveItem = (item: Item) => {
    setActiveItem(item);
    setRawLyrics(item.rawLyrics);
    setContent(generateRich(item.rawLyrics));
  };

  const onFinishAddingLyrics = () => {
    const content = generateRich(rawLyrics);
    setContent(content);
    setLyricInputMode("rich");

    // save
    executeUpdateItem({ rawLyrics }).then((item) => {
      refetchItems(); // refresh the list of items to include the newly added lyrics
      setActiveItem(item.item); // refresh the current active item, TODO: maybe have this selector be an index reference ?
    });
  };

  const onBeginAddingLyrics = () => {
    console.log({ content });
    // convert the rich format into raw text
    // Rules:
    setRawLyrics(generateRaw(content));
    setLyricInputMode("raw");

    // This is not actually needed! We can get the content from the raw Lyrics, so we only really need to store the raw.
    // executeUpdateItem({ content });
  };

  /**
   * Add a cue.
   *
   * If it's a space, then insert [cue_id=uuid] where the space is, and add 2 spaces before and after it
   * If it's a word, then insert [cue_id=uuid] before the word and bracket it like [cue_id=uuid]word
   *
   * TODO: Should we use a object type instead??
   * TODO: Since we want to support other types e.g. One-shots,
   *       we should have a controllable variable that directs the onclick event towards each handler.
   *       This will let us control the behaviour of the onclick event,
   *
   * @param lineIndex
   * @param wordIndex
   */
  const onAddCue = async (lineIndex: number, wordIndex: number, isSpace: boolean) => {
    // TODO: show loading

    // First, we need to add a cue to the database, so we can get the cue_id.

    try {
      const res = await executeCreateCueRequest({});
      const id = res.cue.id;

      setCues((prev) => ({ ...prev, [id]: res.cue }));

      // if thing is a word, then
      if (isSpace) {
        // convert the space into [cueId=uuid]
        let cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>";
        content[lineIndex][wordIndex] = cueId;

        // add 2 " " on the left and right of this item in this line
        let line = content[lineIndex];

        // first, do the "right side" of the index, so we can do the "left" with less math
        line.splice(wordIndex + 1, 0, " ");
        line.splice(wordIndex, 0, " ");

        content[lineIndex] = line;
        setContent(content);
      } else {
        let cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>" + content[lineIndex][wordIndex];
        content[lineIndex][wordIndex] = cueId;
        setContent(content);
      }
    } catch (e) {}
  };

  return (
    <AppContext.Provider
      value={{
        code,
        setCode,
        event: fetchResp?.event || null,
        isValidEvent,
        activeItem,
        changeActiveItem,
        items,
        itemName,
        setItemName,
        onAddItem,
        rawLyrics,
        setRawLyrics,
        content,
        setContent,
        onFinishAddingLyrics,
        lyricInputMode,
        setLyricInputMode,
        onAddCue,
        onBeginAddingLyrics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to consume the global app context.
 * Must be used inside <AppProvider>.
 */
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
